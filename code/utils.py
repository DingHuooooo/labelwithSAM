import os
import torch
from tqdm import tqdm
from .static.sam.predictor_for_app import Predictor

def print_pretty_header():
    # Use a consistent width for the border
    print()
    width = 74
    print("*" * width)
    print("*" + "Please specify the data directory using an absolute path.".center(width - 2) + "*")
    print("*" + "Ensure the directory structure meets the required specifications.".center(width - 2) + "*")
    print("*" + "Refer to the readme.md for more detailed information.".center(width - 2) + "*")
    print("*" * width)
    print()


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
import numpy as np
def print_numpy_data(path):
    # 使用 allow_pickle=True 安全加载包含对象的 NumPy 文件
    data = np.load(path, allow_pickle=True)
    print(data)