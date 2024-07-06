import os
import cv2
import numpy as np
import base64
import io
import argparse
import glob
from flask import Flask, render_template, request, send_from_directory, jsonify
from natsort import natsorted

from .static.sam.predictor_for_app import Predictor

app = Flask(__name__)
points = []
mask = None
image_path = None
mask_path = None
points_path = None
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

@app.route('/multiple_image_annotation', methods=['GET'])
def multiple_image_annotation():
    return render_template('multiple_image_annotation.html')

@app.route('/searchDirs', methods=['GET'])
def search_dirs():
    global proj_dir
    dirs = natsorted([dir for dir in os.listdir(os.path.join(proj_dir, 'data/images'))])
    return jsonify({'dirs': dirs})

@app.route('/searchImagePaths', methods=['GET'])
def search_image_paths():
    global proj_dir
    dir_path = request.args.get('dir', '')
    dir_path = os.path.normpath(dir_path)
    if dir_path == '.':
        dir_path = ''
    full_path = os.path.join(proj_dir, 'data/images', dir_path)

    entries = os.listdir(full_path)
    sub_dirs = [f for f in entries if os.path.isdir(os.path.join(full_path, f))]
    image_paths = [f for f in entries if f.endswith('.png') or f.endswith('.jpg')]
    image_paths = natsorted(image_paths)
    sub_dirs = natsorted(sub_dirs)
    sub_dirs = [os.path.join(dir_path, sub_dir) for sub_dir in sub_dirs]

    if dir_path:
        parent_dir = os.path.join(dir_path, "..")
        sub_dirs.insert(0, parent_dir) 
        sub_dirs.insert(0, dir_path)

    return jsonify({'imagePaths': image_paths, 'subDirs': sub_dirs, 'clear': dir_path == ''})


@app.route('/selectImage', methods=['POST'])
def select_image():
    global image_path, embedding_path, points, proj_dir
    predictor.reset_predictor()
    data = request.get_json()
    image_path = os.path.join(proj_dir, data.get('imagePath'))
    if image_path.endswith('.png'):
        embedding_path = image_path.replace('image.png', 'embedding.pth').replace('images', 'embeddings')
    else:
        # end with jpg
        embedding_path = image_path.replace('image.jpg', 'embedding.pth').replace('images', 'embeddings')

    image_name = os.path.basename(data.get('imagePath')).split('.')[0].split('_')[0]
    points_path = os.path.dirname(data.get('imagePath')).replace('images', 'points')
    mask_path = os.path.dirname(data.get('imagePath').replace('images', 'masks'))

    mask_paths_pattern = os.path.join(proj_dir, mask_path, f'*{image_name}*')
    mask_paths = glob.glob(mask_paths_pattern)
    mask_paths = [os.path.basename(mask_path) for mask_path in mask_paths]
    
    points_paths_pattern = os.path.join(proj_dir, points_path, f'*{image_name}*')
    points_paths = glob.glob(points_paths_pattern)
    points_paths = [os.path.basename(points_path) for points_path in points_paths]

    if os.path.exists(embedding_path):
        predictor.set_embedding(embedding_path, image_path)
    else:
        return jsonify({"message": "Success receive image path", "mask_paths": mask_paths, "embendding_generated": "false"}), 200

    return jsonify({"message": "Success receive image path", "mask_paths": mask_paths, "embendding_generated": "true"}), 200

@app.route('/setImage', methods=['POST'])
def setImage():
    data = request.get_json()
    image_path = os.path.join(proj_dir, data.get('imagePath'))
    if image_path.endswith('.png'):
        mask_path = image_path.replace('image.png', 'mask.png').replace('images', 'masks')
    else:
        # end with jpg
        mask_path = image_path.replace('image.jpg', 'mask.png').replace('images', 'masks')
    predictor.set_image(image_path)
    return jsonify({'message': 'Success set image', 'mask_path': os.path.relpath(mask_path, proj_dir) if os.path.exists(mask_path) else None})

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
