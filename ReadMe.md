# **Quick Start Guide**:

# **V1.1 ToDos**:
- ✅ **Image without embedding**
  - If there is an image without embedding, directly load the image and use this tool to make the mask manually.
  - This feature can be realized by introducing a pop-up window to ask whether to generate the embedding or not.
- ✅ **Mask color adjustment**
  - The mask color is too red, enable transparency adjustment to moderate the intensity.
- ✅ **Select any dir**
  - Implement functionality to allow users to choose any data directory from the file system.
- ❌ **Build a .exe**
  - Compile the application into an executable (.exe) file for easier distribution and usage.


1. **Prepare Images and Environment**:
   - Store images in `data/images`. Use subdirectories for organization if needed.
   - Set up your environment and install dependencies from `requirements.txt`.

2. **Generate and Store Embeddings**:
   - Run `embeddings_generator.py` to generate embeddings. Save them in `data/embeddings` to expedite the annotation process.
   - **Directory Structure**:
     ```
     ├─embeddings
     │  └─example
     │        example_embedding.pth
     │
     ├─images
     │  └─example
     │        example_image.png
     │
     ├─masks
     │
     └─points
     ```

3. **Download SAM Weights**:
   - Execute the following commands to download necessary weights for SAM:
     ```
     cd static/sam
     mkdir sam_ckpt
     curl -o sam_vit_l_0b3195.pth https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth
     ```

4. **Launch the Web Server**:
   - Start the server using `app.py`. Once you see *"Running on http://127.0.0.1:6500"*, the server is live. Access it using Chrome (recommended) for annotating.

5. **Annotation Process**:
   - In the web interface, select `.png` images. If a mask already exists, it will be shown. Otherwise, use 2-5 points as prompts for SAM-based initial masking.
   - Adjust annotations with brush or lasso tools. Right-click to end modifications.

6. **Save the Final Mask**:
   - Save your mask once you are satisfied with the adjustments.  

7. **Here is an example (v1)**:  

<img src="static/images/example.gif" alt="Example">

# **ToDos**:
1. **Image without embedding**
   - If there is an image without embedding, direct load the image and use this tool to make the mask manually.
   - This can be realized by a pop-up window to ask to generate embedding or not.
2. **Mask color adjustment**
    - The mask color is too red, enable the transparency ajustment.
3. **Select any dir**

4. **Build a .exe**