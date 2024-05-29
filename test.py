import numpy as np
# Load the newly uploaded numpy array from the file with allow_pickle set to True
new_data = np.load('data\points\example\example_points.npy', allow_pickle=True)

# Display the newly loaded data
print(new_data)