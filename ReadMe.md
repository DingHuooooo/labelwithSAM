# **Quick Start Guide**:

# **V1.2 ToDos**:
- ❌ **Multimask**
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

