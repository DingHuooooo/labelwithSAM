import numpy as np
import cv2
import torch
from .models.sam_predictor import SAM_Predictor

class Predictor():
    def __init__(self, model_type='SAM_ViT_L'):
        self.image_path = None
        self.embedding_path = None
        self.model_type = model_type
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.predictor = SAM_Predictor(model_type=self.model_type, device=self.device)


    def set_image(self, image_path):
        self.image_path = image_path
        self.predictor.set_image(image_path)

    def set_embedding(self, embedding_path):
        self.embedding_path = embedding_path
        self.predictor.set_embedding(embedding_path)

    def predict(self, points) -> np.ndarray:
        if points is not None:
                point_coords = np.array([[point['x'], point['y']] for point in points])
                point_labels = np.array([1 if point['type'] == 'positive' else 0 for point in points])
        else:
            point_coords = None
            point_labels = None
        
        mask = self.predictor.predict(point_coords=point_coords, point_labels=point_labels)
        mask_array = mask.squeeze().numpy().astype(np.uint8)  # 确保mask是2D
        mask_array = self._post_process(mask_array)

        return mask_array
    
    def reset_predictor(self):
        self.predictor.reset_predictor()

    def _post_process(self, mask):
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8, ltype=cv2.CV_32S)
        for i in range(1, num_labels):  
            if stats[i, cv2.CC_STAT_AREA] < 100:
                mask[labels == i] = 0

        mask = cv2.medianBlur(mask, 5)
        mask = cv2.GaussianBlur(mask, (5, 5), 0)
        mask = cv2.medianBlur(mask, 5)
        mask[mask > 0] = 1
        
        return mask
