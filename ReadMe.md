# **Instructions**:

1. The image data should be put under `data/images`, and it can be placed in different folders.

2. Create your env and install required libs using requirements.txt. 
   
2. Use `embeddings_generator.py` to generate embeddings and save them under `data/embeddings`. This step will accelerate annotation. After this step, the directory structure will look like this:

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

3. To use SAM, we still need the weights. Use this command to download weight:
    ```
    cd static/sam
    mkdir sam_ckpt
    wget https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth
    ```

5. After this step, we have images and corresponding embeddings. Then, use `app.py` to begin a web server. After seeing *"Running on http://127.0.0.1:6500"*, it indicates that the web is running at port 6500. Open the url in a Chrome(recommended), and begin the annotation.

6. In the web, several tools are deployed. When select the folder, only images end with `.png` will be loaded. If the selected image already has corresponding mask, mask will be shown. If not, we can use points as prompts to indicate a predictor based on SAM. 

7. After suitable points as prompts, we can stop at this step and move on to use brush or lasso to modify. *Use right click to stop brushing or to complete a lasso.*

8. At last, we can save the satisfying mask. Please only use <span style="color:red"><strong>2-5 points</strong></span> as prompts. 

9. Here is an example:





<img src="static/images/example.gif" alt="Example">

# **Next Improvements**:
1. Images size should be flexible.
   - resize the image in embeddings_generator.py to get the embeddings.
   - generate the transfer matrix
   - in app, show the original image, and use the transfer matrix to transfer the points from images position to the embeddings position.
   - get the output mask and transfer it back to the original image size.
   - save the mask.
