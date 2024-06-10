import torch
import numpy as np
import cv2
import os
from typing import Optional, Tuple
from .build_sam import sam_model_registry


class SAM_Predictor():
    def __init__(self, model_type = 'SAM_ViT_L', device = torch.device("cpu")):
        self.device = device
        curr_dir = os.path.dirname(os.path.abspath(__file__))
        if model_type == 'SAM_ViT_L':
            self.model_type = 'vit_l'
            self.ckpt_path = os.path.join(curr_dir, '../sam_ckpt/sam_vit_l_0b3195.pth')
        elif model_type == 'SAM_ViT_B':
            self.model_type = 'vit_b'
            self.ckpt_path = os.path.join(curr_dir, '../sam_ckpt/sam_vit_b_01ec64.pth')
        elif model_type == 'SAM_ViT_H':
            self.model_type = 'vit_h'
            self.ckpt_path = os.path.join(curr_dir, '../sam_ckpt/sam_vit_h_4b8939.pth')

        build_sam = sam_model_registry[self.model_type]
        self.model = build_sam(checkpoint=self.ckpt_path).to(self.device)

        self.image = None
        self.image_embedding = None
        self.input_size = 1024
        self.input_img_height = 1024
        self.input_img_width = 1024

    def _preprocess_image(self, image_path) -> np.ndarray:
        image = cv2.imread(image_path)
        self.input_img_height, self.input_img_width = image.shape[:2]
        image = cv2.resize(image, (1024, 1024))
        return image
    
    def _get_image_embedding(self):
        assert self.image_embedding is not None, "Current Mode is predicting from embedding, but image embedding is not set"
        return self.image_embedding

    @torch.no_grad()
    def _get_image_embedding_from_image(self):
        assert self.image is not None, "Current Mode is predicting from image, but image is not set"
        input_image_torch = torch.as_tensor(self.image, device=self.device)
        input_image_torch = input_image_torch.permute(2, 0, 1).contiguous()[None, :, :, :]
        input_image = self.model.preprocess(input_image_torch)
        self.image_embedding = self.model.image_encoder(input_image)
        return self.image_embedding

    @torch.no_grad()
    def _predict_torch(
        self,
        point_coords: Optional[torch.Tensor],
        point_labels: Optional[torch.Tensor],
        boxes: Optional[torch.Tensor] = None,
        mask_input: Optional[torch.Tensor] = None,
        multimask_output: bool = False,
        return_logits: bool = False,
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:

        if point_coords is not None:
            points = (point_coords, point_labels)
        else:
            points = None

        # Embed prompts
        sparse_embeddings, dense_embeddings = self.model.prompt_encoder(
            points=points,
            boxes=boxes,
            masks=mask_input,
        )

        # Predict masks
        low_res_masks, iou_predictions = self.model.mask_decoder(
            image_embeddings=self.image_embedding,
            image_pe=self.model.prompt_encoder.get_dense_pe(),
            sparse_prompt_embeddings=sparse_embeddings,
            dense_prompt_embeddings=dense_embeddings,
            multimask_output=multimask_output,
        )
        # Upscale the masks to the original image resolution
        masks = self.model.postprocess_masks(low_res_masks, (1024, 1024), (self.input_img_height, self.input_img_width))

        if not return_logits:
            masks = masks > self.model.mask_threshold

        return masks, iou_predictions, low_res_masks
    
    def set_image(self, image_path: str) -> bool:
        image = self._preprocess_image(image_path)
        assert image.shape == (self.input_size, self.input_size, 3), f"Image shape should be (xxx, xxx, 3), but got {image.shape}"
        assert image.dtype == np.uint8, f"Image dtype should be np.uint8, but got {image.dtype}"
        self.image = image
        self.image_embedding = self._get_image_embedding_from_image()
        if image_path.endswith('.png'):
            os.makedirs(os.path.dirname(image_path.replace('image.png', 'embedding.pth').replace('images', 'embeddings')), exist_ok=True)
            torch.save(self.image_embedding, image_path.replace('image.png', 'embedding.pth').replace('images', 'embeddings'))
        else:
            os.makedirs(os.path.dirname(image_path.replace('image.jpg', 'embedding.pth').replace('images', 'embeddings')), exist_ok=True)
            torch.save(self.image_embedding, image_path.replace('image.jpg', 'embedding.pth').replace('images', 'embeddings'))

    def set_embedding(self, image_embedding_path: str, image_path: str) -> bool:
        image = self._preprocess_image(image_path)
        image_embedding = torch.load(image_embedding_path, map_location=self.device)
        assert image_embedding.shape == (1, 256, 64, 64), f"Image embedding shape should be (1, 256, 64, 64), but got {image_embedding.shape}"
        assert image_embedding.dtype == torch.float32, f"Image embedding dtype should be torch.Tensor, but got {image_embedding.dtype}"
        self.image_embedding = image_embedding
        self.image_embedding = self._get_image_embedding()

    def predict(
        self,
        point_coords: Optional[np.ndarray] = None,
        point_labels: Optional[np.ndarray] = None,
        multimask_output: bool = False,
        return_logits: bool = False,
        ) -> np.ndarray:
            
        coords_torch, labels_torch, box_torch, mask_input_torch = None, None, None, None

        if point_coords is not None:
            assert point_labels is not None, "point_labels must be supplied if point_coords is supplied." 
            for coord in point_coords:
                coord[0] = coord[0] / self.input_img_width * 1024
                coord[1] = coord[1] / self.input_img_height * 1024
            coords_torch = torch.as_tensor(point_coords, dtype=torch.float, device=self.device)
            labels_torch = torch.as_tensor(point_labels, dtype=torch.int, device=self.device)
            coords_torch, labels_torch = coords_torch[None, :, :], labels_torch[None, :]

        masks, iou_predictions, low_res_masks = self._predict_torch(
            coords_torch,
            labels_torch,
            box_torch, 
            mask_input_torch,
            multimask_output,
            return_logits=return_logits,
        )
        return masks
    
    def reset_predictor(self) -> None:
        """Resets the currently set image and image embedding."""
        self.image = None
        self.image_embedding = None
        
        