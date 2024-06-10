import os
import torch
from tqdm import tqdm
from .static.sam.predictor_for_app import Predictor

def print_pretty_header():
    # Use a consistent width for the border
    width = 68
    print("*" * width)
    print("*" + "Use arg --data-dir to specify the data directory".center(width - 2) + "*")
    print("*" + "data directory should end with 'data'".center(width - 2) + "*")
    print("*" + "readme.md for more information".center(width - 2) + "*")
    print("*" * width)


def process_images(images_dir, model_type):
    predictor = Predictor(model_type=model_type)
    
    for root, dirs, files in os.walk(images_dir):
        print(f"Processing directory: {root}")
        for file in tqdm(files, desc="Processing images"):
            if file.lower().endswith(('.png', '.jpg')):
                image_path = os.path.join(root, file)
                mask = predictor.set_image(image_path)
                image_embedding = predictor.predictor.image_embedding
                
                embedding_ext = 'embedding.pth'
                embeddings_dir = image_path.replace(file, '').replace('images', 'embeddings')
                embedding_file = file.rsplit('.', 1)[0] + '.' + embedding_ext
                
                os.makedirs(embeddings_dir, exist_ok=True)
                torch.save(image_embedding, os.path.join(embeddings_dir, embedding_file))