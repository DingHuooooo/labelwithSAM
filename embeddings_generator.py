import os
import torch
from static.sam.predictor_for_app import Predictor
from tqdm import tqdm


if __name__ == '__main__':
    predictor = Predictor(model_type='SAM_ViT_L')
    images_dir = r'data\images\test'
    for root, dirs, files in os.walk(images_dir):
        print(root, dirs, files)
        for file in tqdm(files):
            if file.endswith('.png'):
                image_path = os.path.join(root, file)
                mask = predictor.set_image(image_path)
                image_embedding = predictor.predictor.image_embedding
                os.makedirs(os.path.dirname(image_path.replace('image.png', 'embedding.pth').replace('images', 'embeddings')), exist_ok=True)
                torch.save(image_embedding, image_path.replace('image.png', 'embedding.pth').replace('images', 'embeddings'))
            if file.endswith('.jpg'):
                image_path = os.path.join(root, file)
                mask = predictor.set_image(image_path)
                image_embedding = predictor.predictor.image_embedding
                os.makedirs(os.path.dirname(image_path.replace('image.jpg', 'embedding.pth').replace('images', 'embeddings')), exist_ok=True)
                torch.save(image_embedding, image_path.replace('image.jpg', 'embedding.pth').replace('images', 'embeddings'))