import os
import cv2
import numpy as np
import base64
import io
import argparse
from flask import Flask, render_template, request, send_from_directory, jsonify
from natsort import natsorted

from .static.sam.predictor_for_app import Predictor

app = Flask(__name__)
points = []
mask = None
image_path = None
embedding_path = None
predictor = Predictor()

proj_dir = None

def create_app():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-dir', type=str, help='end with data')

    assert parser.parse_args().data_dir is not None, "Please provide data directory"
    assert os.path.exists(parser.parse_args().data_dir), "Data directory does not exist"
    assert os.path.basename(os.path.normpath(parser.parse_args().data_dir)) == 'data', "Data directory should end with data"

    args = parser.parse_args()
    global proj_dir
    normalized_path = os.path.normpath(args.data_dir).replace(os.sep, '/')
    data_index = normalized_path.find('/data')
    before_data = normalized_path[:data_index]
    app.config['DATA_DIR'] = before_data
    proj_dir = before_data

    return app

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data/<category>/<path:filename>')
def custom_static(category, filename):
    proj_dir = app.config['DATA_DIR']
    if category in ['images', 'masks']:
        full_path = os.path.join(proj_dir, 'data', category, filename)
        return send_from_directory(os.path.join(proj_dir, 'data', category), filename)
    else:
        return "Invalid category", 404

@app.route('/single_image_annotation', methods=['GET'])
def single_image_annotation():
    return render_template('single_image_annotation.html')

@app.route('/searchDirs', methods=['GET'])
def search_dirs():
    global proj_dir
    dirs = natsorted([dir for dir in os.listdir(os.path.join(proj_dir, 'data/images'))])
    return jsonify({'dirs': dirs, 'images_dir': proj_dir})

@app.route('/searchImagePaths', methods=['GET'])
def search_image_paths():
    global proj_dir
    dir_path = request.args.get('dir', '')
    full_path = os.path.join(proj_dir, 'data/images', dir_path)
    # image_paths = [f for f in os.listdir(full_path) if f.endswith('.png') and os.path.exists(os.path.join(full_path, f).replace('image.png', 'embedding.pth').replace('images', 'embeddings'))]
    # image_paths = [f for f in os.listdir(full_path) if f.endswith('.png')]
    # jpg and png
    image_paths = [f for f in os.listdir(full_path) if f.endswith('.png') or f.endswith('.jpg')]
    image_paths = natsorted(image_paths)
    return jsonify({'imagePaths': image_paths})

@app.route('/selectImage', methods=['POST'])
def select_image():
    global image_path, embedding_path, points, proj_dir
    predictor.reset_predictor()
    data = request.get_json()
    image_path = os.path.join(proj_dir, data.get('imagePath'))
    if image_path.endswith('.png'):
        mask_path = image_path.replace('image.png', 'mask.png').replace('images', 'masks')
        embedding_path = image_path.replace('image.png', 'embedding.pth').replace('images', 'embeddings')
        points_path = image_path.replace('image.png', 'points.npy').replace('images', 'points')
    else:
        # end with jpg
        mask_path = image_path.replace('image.jpg', 'mask.png').replace('images', 'masks')
        embedding_path = image_path.replace('image.jpg', 'embedding.pth').replace('images', 'embeddings')
        points_path = image_path.replace('image.jpg', 'points.npy').replace('images', 'points')

    if os.path.exists(points_path):
        points = np.load(points_path, allow_pickle=True)
    else:
        points = []

    if os.path.exists(embedding_path):
        predictor.set_embedding(embedding_path, image_path)
    else:
        predictor.set_image(image_path)

    return jsonify({"message": "Success receive image path", "mask_path": os.path.relpath(mask_path, proj_dir) if os.path.exists(mask_path) else None, "embendding_generated": "true"}), 200

@app.route('/getPoint', methods=['POST'])
def add_point():
    global points
    points = []
    points_data = request.json.get('data')
    x_coordinates = [point['x'] for point in points_data]
    y_coordinates = [point['y'] for point in points_data]
    point_labels = [point['type'] for point in points_data]
    for x, y, label in zip(x_coordinates, y_coordinates, point_labels):
        points.append({'x': x, 'y': y, 'type': label})
    mask_data = get_mask()  
    return jsonify({'message': 'Success receive points', 'mask_data': mask_data})

def get_mask():
    global points, mask, image_path, embedding_path
    mask_array = predictor.predict(points=points)
    mask = mask_array * 255
    red_mask = np.zeros((mask_array.shape[0], mask_array.shape[1], 3), dtype=np.uint8)
    red_mask[:, :, 0] = 0  
    red_mask[:, :, 1] = 0           
    red_mask[:, :, 2] = mask           
    _, buffer = cv2.imencode('.png', red_mask)
    mask_data = base64.b64encode(buffer).decode('utf-8')
    return mask_data

@app.route('/clearPointandMask', methods=['GET'])
def clear_points():
    global points, mask
    points = []
    mask = None
    return jsonify({'message': 'Success clear points'})

@app.route('/saveMask', methods=['POST'])
def save_mask():
    global image_path, points
    data = request.get_json()
    img = decode_data(data['imageData'])
    _, binary_img = cv2.threshold(img, 2, 1, cv2.THRESH_BINARY)
    os.makedirs(f'{os.path.join(os.path.dirname(image_path))}'.replace('images', 'masks'), exist_ok=True)
    os.makedirs(f'{os.path.join(os.path.dirname(image_path))}'.replace('images', 'points'), exist_ok=True)
    if image_path.endswith('.png'):
        mask_path = f'{os.path.join(os.path.dirname(image_path),os.path.basename(image_path))}'.replace('image.png', 'mask.png').replace('images', 'masks')
        points_path = f'{os.path.join(os.path.dirname(image_path),os.path.basename(image_path))}'.replace('image.png', 'points.npy').replace('images', 'points')
    else:
        # end with jpg
        mask_path = f'{os.path.join(os.path.dirname(image_path),os.path.basename(image_path))}'.replace('image.jpg', 'mask.png').replace('images', 'masks')
        points_path = f'{os.path.join(os.path.dirname(image_path),os.path.basename(image_path))}'.replace('image.jpg', 'points.npy').replace('images', 'points')
    cv2.imwrite(mask_path, binary_img * 255)
    np.save(points_path, points)
    # return jsonify({'message': 'Success save mask', 'mask_path': image_path.replace('image.png', 'mask.png').replace('images', 'masks')})
    return jsonify({'message': 'Success save mask', 'mask_path': mask_path})

def decode_data(data) -> np.ndarray:
    image_data = data.split(",")[1]  # Remove the "data:image/png;base64," part
    image_bytes = io.BytesIO(base64.b64decode(image_data))
    image = np.frombuffer(image_bytes.read(), dtype=np.uint8)
    img = cv2.imdecode(image, cv2.IMREAD_UNCHANGED)  # Decode from buffer using cv2.IMREAD_UNCHANGED
    img = img[:, :, :3]  # Remove the alpha channel
    img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)  # Convert to grayscale
    return img


if __name__ == '__main__':
    from .utils import print_pretty_header
    print_pretty_header()
    app = create_app()
    app.run(debug=True, port=6500)
