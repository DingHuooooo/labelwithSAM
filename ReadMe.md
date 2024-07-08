# **V1.2 ToDos**:
- ✅ **Multimask**
- ✅ **Easy Starting**
- ❌ **Build a .exe**
  - Compile the application into an executable (.exe) file for easier distribution and usage.

# **Quick Start Guide**:

1. **Prepare Images and Environment**:
   - Create a `data` dir.
   - Store images in `data/images`. Use subdirectories for organization if needed.
   - Set up your environment and install dependencies from `requirements.txt`.

2. **Generate and Store Embeddings**:
   - Run `embeddings_generator.py` to generate embeddings. Save them in `data/embeddings` to expedite the annotation process. This script maybe outdated. Modify if needed to meet the naming requirements.
   - To run the server, use the following command in the directory above the project directory: `python -m web_label_tool.code.app`, and enter the `data` dir when asked.
   - You can also run this tool without embeddings, which can be generated during runtime, or just annotating without features provided by SAM.
   - **Directory Structure**: 
   <br>

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
     |  └─example
     |        example_mask.png
     |        example_mask_wear.png
     │
     └─points
     |  └─example
     |        example_points.npy
     |        example_points_wear.npy
     ```

     see `data/*/Test` as an example.

3. **Download SAM Weights**:
   - Execute the following commands to download necessary weights for SAM:
     ```
     cd code/static/sam
     mkdir sam_ckpt
     curl -o sam_vit_l_0b3195.pth https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth
     ```

4. **Launch the Web Server**:
   - Start the server using `app.py`. Once you see *"Running on http://127.0.0.1:6500"*, the server is live. Access it using Chrome (recommended) for annotating.
   - Sometimes the 6500 port maybe occupied. You can change it to other ports.

5. **Annotation Process**:
   - In the web interface, first select the target dir, then select `.png` or `.jpg` image you want to annotate. If a mask already exists, it will be shown. Otherwise, use 2-5 points as prompts for SAM-based initial masking.
   - Adjust annotations with brush or lasso tools. Right-click to end modifications.

6. **Save the Final Mask**:
   - Save your mask once you are satisfied with the adjustments.  
   - You can overwrite existing mask, or save as a new mask. You can only add postfix to the original name.

7. **Here is an example (v1) (Outdated)**:  

<img src="code/static/images/example.gif" alt="Example">


<br>

# If encountering issues/bugs:
Please report them on GitLab, preferably with a detailed description of the context.

