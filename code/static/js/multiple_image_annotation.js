const app = Vue.createApp({
    delimiters: ['[[', ']]'], 
    data() {
        return {
            //***// Path and File Management //***//
            imageBasePath: 'data/images',
            maskBasePath: 'data/masks',
            selectedDirectory: '',
            imagePaths: [],
            selectedFile: '',
            selectedMask: '',
            noPreFile: false,
            noNextFile: false,
            showModal: false,
            maskPostfix: '', 
            maskPrefix: '',
            canOverwrite: false,

            //***// Canvas and Interaction States //***//
            withEmbedding: false,
            imageLoaded: false,
            canAddPoints: false,
            canModify: false,
            canRetrieve: false,
            blockedByLasso: false,
            isBrushActive: false,
            isCrossHairActive: false,
            dragging: false,
            dragIndex: -1,
            opacity: 0.2,

            //***// Drawing States and History //***//
            selectedPointType: 'positive',
            currentLassoType: 'positive',
            points: [],
            lassoPoints: [],
            mask_history: [],
            currentMaskData: null,
            brushSize: 10,

            //***// UI Listeners and Flags //***//
            isPointListenerAdded: false,
            isBrushListenersAdded: false,
            isLassoListenersAdded: false,
            isBrushing: false,

            //***// Brush Type and Cursor //***//
            cursorImage: '',
            adjustedBrushSize: 0,
        };
    },
    methods: {
        //*************************************************File Logic************************************************************//
        loadDirectoryOptions() {
            this.imagePaths = [];
            fetch('/searchDirs')
                .then(response => response.json())
                .then(data => {
                    const dirSelect = document.getElementById('dir-select');
                    dirSelect.innerHTML = '<option disabled value="" selected>Select a directory</option>';
                    data.dirs.forEach(dir => {
                        const option = document.createElement('option');
                        option.value = dir;
                        option.textContent = dir;
                        dirSelect.appendChild(option);
                    });
                    if (!data.dirs.includes(this.selectedDirectory)) {
                        this.selectedDirectory = '';
                    }
                })
                .catch(error => console.error('Error fetching directories:', error));
        },
        loadFileOptions() {
            console.log('Selected directory:', this.selectedDirectory);
            fetch(`/searchImagePaths?dir=${encodeURIComponent(this.selectedDirectory)}`)
                .then(response => response.json())
                .then(data => {
                    const dirSelect = document.getElementById('dir-select');
                    dirSelect.innerHTML = '<option disabled value="">Select a directory</option>';

                    data.subDirs.forEach(subDir => {
                        const option = document.createElement('option');
                        option.value = subDir;
                        option.textContent = subDir;
                        dirSelect.appendChild(option);
                    });
                    this.selectedDirectory = data.dir;
                    if (data.clear){
                        this.selectedDirectory = '';
                    }
                            
                    const fileSelect = document.getElementById('file-select');
                    fileSelect.innerHTML = '';
                    this.selectedFile = '';
                    
                    const defaultOption = document.createElement('option');
                    defaultOption.disabled = true;
                    defaultOption.selected = true; // Ensure default option is selected
                    defaultOption.value = '';
                    defaultOption.textContent = 'Select a file';
                    fileSelect.appendChild(defaultOption);
                    
                    if (data.imagePaths && data.imagePaths.length > 0) {
                        this.imagePaths = data.imagePaths;

                        data.imagePaths.forEach(file => {
                            const option = document.createElement('option');
                            option.value = file;
                            option.textContent = file;
                            fileSelect.appendChild(option);
                        });
                    }
                    
                    if (!data.subDirs.length && !data.imagePaths.length) {
                        alert('No subdirectories or files found');
                    }
                })
                .catch(error => console.error('Error fetching data:', error));
        },
        selectPreviousFile() {
            const currentIndex = this.imagePaths.indexOf(this.selectedFile);
            if (currentIndex > 0) {
                this.selectedFile = this.imagePaths[currentIndex - 1];
                this.handleFileSelection(); 
            }
            this.noPreFile = currentIndex === 1;
        },
        selectNextFile() {
            const currentIndex = this.imagePaths.indexOf(this.selectedFile);
            if (currentIndex < this.imagePaths.length - 1) {
                this.selectedFile = this.imagePaths[currentIndex + 1];
                this.handleFileSelection(); 
            }
            this.noNextFile = currentIndex === this.imagePaths.length - 2;
        },
        handleFileSelection() {
            console.log('Selected file:', this.selectedFile);
            this.initializeCanvasAndMask();
            const imagePath = `${this.imageBasePath}/${this.selectedDirectory}/${this.selectedFile}`;
            const baseCanvas = document.getElementById('baseImageCanvas');
            const baseCtx = baseCanvas.getContext('2d');

            baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
            baseCtx.font = '20px Arial';
            baseCtx.fillText('Corresponding embedding not found. Waiting for generating...', baseCanvas.width / 2 - 350, baseCanvas.height / 2);
            
            fetch('/selectImage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ imagePath })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Response from backend: Mask path:', data.mask_paths);
                if (data.embendding_generated === "true") {
                    this.withEmbedding = true;
                    this.loadMaskOptions(data.mask_paths);
                } else {
                    const generateEmbedding = confirm("Embedding not found. Do you want to generate it?");
                    if (generateEmbedding) {
                        this.generateEmbedding(imagePath);
                    } else {
                        this.withEmbedding = false;
                        this.loadMaskOptions(data.mask_paths);
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching image data:', error);
                baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
                baseCtx.fillText('Error fetching image and embedding data', baseCanvas.width / 2 - 350, baseCanvas.height / 2);
            });
        
            const currentIndex = this.imagePaths.indexOf(this.selectedFile);
            this.noPreFile = currentIndex === 0;
            this.noNextFile = currentIndex === this.imagePaths.length - 1;
        },
        loadMaskOptions(mask_paths) {
            const dirSelect = document.getElementById('mask-select');
            dirSelect.innerHTML = '<option disabled value="">Select a mask</option>';

            mask_paths.forEach(mask_path => {
                const option = document.createElement('option');
                option.value = mask_path;
                option.textContent = mask_path;
                dirSelect.appendChild(option);
            });

            // Determine the default mask path based on the availability of mask paths
            this.selectedMask = mask_paths.length > 0 ? mask_paths[0] : ''
            this.canOverwrite = this.selectedMask == '' ? false : true
            this.handleMaskSelection();

            // Optionally, select the first mask option in the dropdown if mask paths are available
            if (mask_paths.length > 0) {
                dirSelect.value = mask_paths[0];
            }
        },
        loadImage(imagePath) {
            const img = new Image();
            img.onload = () => {
                const width = img.width;
                const height = img.height;
        
                const container = document.getElementById('imageCanvasContainer');
                const baseCanvas = document.getElementById('baseImageCanvas');
                const maskCanvas = document.getElementById('annotationMaskCanvas');
                const markCanvas = document.getElementById('annotationMarkCanvas');
        
                const controlPanel = document.getElementById('controlPanelContainer');
                controlPanel.style.marginLeft = `${width + 50}px`;
        
                container.style.width = `${width}px`;
                container.style.height = `${height}px`;
        
                [baseCanvas, maskCanvas, markCanvas].forEach(canvas => {
                    canvas.width = width;
                    canvas.height = height;
                });
                
                const baseCtx = baseCanvas.getContext('2d');
                baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
                baseCtx.drawImage(img, 0, 0, width, height);
        
            };
            img.src = imagePath;
            this.imageLoaded = true;
        },
        handleMaskSelection() {
            const imagePath = `${this.imageBasePath}/${this.selectedDirectory}/${this.selectedFile}`;
            this.loadImage(imagePath);
            const maskPath = `${this.maskBasePath}/${this.selectedDirectory}/${this.selectedMask}`;
            if (this.selectedMask != ''){
                fetch('/selectMask', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ maskPath: maskPath })
                })
                .then(response => response.json())
                .catch(error => {
                    console.error('Failed to select mask:', error);
                });
                this.loadMask(maskPath)
            }
        },    
        generateEmbedding(imagePath) {
            fetch('/setImage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ imagePath })
            })
            .then(response => response.json())
            .then(data => {
                this.withEmbedding = true;
                this.loadMaskOptions(data.mask_paths);
            }
            )
        },      
        loadMask(maskPath) {
            const maskCanvas = document.getElementById('annotationMaskCanvas');
            const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
            const maskImg = new Image();
            maskImg.onload = () => {
                ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                ctx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);
                const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    data[i] = data[i];     
                    data[i + 1] = 0;       
                    data[i + 2] = 0;       
                }
                ctx.putImageData(imageData, 0, 0);
                setTimeout(() => {
//                    alert('Existing Mask loaded!');  // Confirm mask is loaded after processing
                    this.mask_history=[];
                    this.saveMaskToHistory();
                }, 5);
            };
            maskImg.src = maskPath; 
            this.canAddPoints = false;
            this.canModify = true;
        },
        //*************************************************Maskcanvas Logic************************************************************//
        adjustOpacity(event) {
            this.opacity = event.target.value / 100;
            document.getElementById('opacityIndicator').innerText = `Opacity: ${this.opacity}`;
            document.getElementById('annotationMaskCanvas').style.opacity = this.opacity;
        },
        //*************************************************Point Logic************************************************************//
        setPointType(type) {
            this.selectedPointType = type;
            this.isCrossHairActive = true;
            this.clearMarkCanvasListeners();
            this.isPointListenerAdded = true;
            const markCanvas = document.getElementById('annotationMarkCanvas');
            markCanvas.addEventListener('click', this.pushPoint);
            markCanvas.addEventListener('contextmenu', this.stopAddingPoints);
        },
        pushPoint(event) {
            if (event.button !== 0) {return;}
            const markCanvas = document.getElementById('annotationMarkCanvas');
            const ctx = markCanvas.getContext('2d');
            const rect = markCanvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const color = this.selectedPointType === 'positive' ? 'red' : 'green';
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, 2 * Math.PI);
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
            this.points.push({ x, y, type: this.selectedPointType });
            this.submitAnnotationPoints();
        },
        submitAnnotationPoints() {
            fetch('/getPoint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: this.points })
            })
                .then(response => response.json())
                .then(data => {
                    this.currentMaskData = data.mask_data;
                    this.refreshMaskDisplay();
                })
                .catch(error => {
                    console.error('Failed to update points:', error);
                });
        },
        refreshMaskDisplay() {
            const maskCanvas = document.getElementById('annotationMaskCanvas');
            const ctx = maskCanvas.getContext('2d');
            const maskImg = new Image();
            maskImg.onload = function () {
                ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                ctx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);
            };
            maskImg.src = 'data:image/png;base64,' + this.currentMaskData;
        },
        stopAddingPoints(event) {
            event.preventDefault();
            this.isCrossHairActive = false;
        },
        moveToModification() {
            this.isCrossHairActive = false;
            this.canAddPoints = false;
            this.canModify = true;
            const markCanvas = document.getElementById('annotationMarkCanvas');
            const ctx = markCanvas.getContext('2d');
            ctx.clearRect(0, 0, markCanvas.width, markCanvas.height);
            this.clearMarkCanvasListeners();
            this.saveMaskToHistory();
        },
        //*************************************************Brush Logic************************************************************//
        handleResize() {
            this.generateCursorImage();
        },
        generateCursorImage() {
            const zoomLevel = window.outerWidth / window.innerWidth; 
            this.adjustedBrushSize = this.brushSize * zoomLevel; 
            
            let canvas = document.getElementById('cursorCanvas');
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'cursorCanvas'; 
            }
            canvas.width = this.adjustedBrushSize * 2;
            canvas.height = this.adjustedBrushSize * 2;
            const ctx = canvas.getContext('2d');
            
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.adjustedBrushSize, 0, 2 * Math.PI, false);
            
            if (this.brushType == 'negative') {
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
            }
            else {
                ctx.fillStyle = 'rgba(255,0,0,0.8)'; 
            }
            ctx.fill();

            this.cursorImage = canvas.toDataURL('image/png');
        },        
        setBrushType(type) {
            this.brushType = type;
            this.isCrossHairActive = true;
            this.isBrushActive = false;
            this.clearMarkCanvasListeners();
            this.isBrushListenersAdded = true;
            const markCanvas = document.getElementById('annotationMarkCanvas');
            markCanvas.addEventListener('mousedown', this.beginBrushStroke);
            markCanvas.addEventListener('mousemove', this.handleBrushMovement);
            markCanvas.addEventListener('mouseup', this.endBrushStroke);
            markCanvas.addEventListener('contextmenu', this.stopAddingBrush);
            this.generateCursorImage();
        },        
        beginBrushStroke(event) {
            if (event.button !== 0) {return;}
            this.isBrushing = true;
            this.isCrossHairActive = false;
            this.isBrushActive = true;
            this.handleBrushMovement(event);
            window.addEventListener('mouseup', this.endBrushStroke);
        },
        handleBrushMovement(event) {
            if (!this.isBrushing) return;
            const canvas = document.getElementById('annotationMaskCanvas');
            const ctx = canvas.getContext('2d');
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            ctx.beginPath();
        
            if (this.brushType === 'negative') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.arc(x, y, this.brushSize - 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = 'rgba(0,0,0,1)';
                ctx.arc(x, y, this.brushSize, 0, 2 * Math.PI);
                ctx.fill();
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = 'rgba(255,0,0,1)';
                ctx.arc(x, y, this.brushSize, 0, 2 * Math.PI);
                ctx.fill();
            }
        },        
        endBrushStroke(event) {
            if (event.button !== 0) {return;}
            this.isBrushing = false;
            this.isBrushActive = false;
            this.isCrossHairActive = true;
            const markCanvas = document.getElementById('annotationMarkCanvas');
            markCanvas.style.cursor = `crosshair`;
            const ctx = markCanvas.getContext('2d');
            ctx.clearRect(0, 0, markCanvas.width, markCanvas.height);
            this.saveMaskToHistory();
            window.removeEventListener('mouseup', this.endBrushStroke);
        },
        stopAddingBrush(event) {
            event.preventDefault();
            this.isBrushActive = false;
            this.isCrossHairActive = false;
            const markCanvas = document.getElementById('annotationMarkCanvas');
            markCanvas.style.cursor = `default`;
            this.clearMarkCanvasListeners();
        },
        //*************************************************Lasso Logic************************************************************//
        setLassoType(type) {
            this.currentLassoType = type;
            this.isBrushActive = false;
            this.isCrossHairActive = true;
            this.blockedByLasso = true;
            this.lassoPoints = [];
            this.clearMarkCanvasListeners();
            this.isLassoListenersAdded = true;
            const markCanvas = document.getElementById('annotationMarkCanvas');
            markCanvas.addEventListener('mousedown', this.handleMouseDown);
            markCanvas.addEventListener('mousemove', this.handleMouseMove);
            markCanvas.addEventListener('mouseup', this.handleMouseUp);
            markCanvas.addEventListener('contextmenu', this.stopAddingLasso);
        },

        handleMouseDown(event) {
            if (event.button !== 0) { return; }
            const markCanvas = document.getElementById('annotationMarkCanvas');
            const rect = markCanvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            for (let i = 0; i < this.lassoPoints.length; i++) {
                const point = this.lassoPoints[i];
                if (Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) < 12) {
                    this.dragging = true;
                    this.dragIndex = i;
                    return;
                }
            }
            this.lassoPoints.push({ x, y });
            this.redrawCanvas();
        },

        handleMouseMove(event) {
            if (!this.dragging) return;
            const markCanvas = document.getElementById('annotationMarkCanvas');
            const rect = markCanvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            this.lassoPoints[this.dragIndex] = { x, y };
            this.redrawCanvas();
        },

        handleMouseUp() {
            this.dragging = false;
        },

        redrawCanvas() {
            const markCanvas = document.getElementById('annotationMarkCanvas');
            const ctx = markCanvas.getContext('2d');
            ctx.clearRect(0, 0, markCanvas.width, markCanvas.height);
            this.lassoPoints.forEach(point => {
                ctx.fillStyle = 'rgba(0, 0, 255, 1)';
                ctx.beginPath();
                ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
                ctx.shadowColor = 'rgba(255, 255, 255, 1)';
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.setLineDash([3, 3]);
            ctx.lineWidth = 3;
            if (this.lassoPoints.length > 1) {
                ctx.beginPath();
                ctx.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);
                this.lassoPoints.forEach((point, index) => {
                    if (index > 0) ctx.lineTo(point.x, point.y);
                });
                ctx.closePath();
                ctx.stroke();
            }
        },
        stopAddingLasso(event) {
            event.preventDefault();
            this.completeLasso();
            this.isCrossHairActive = false;
            this.isBrushActive = false;
            this.blockedByLasso = false;
            this.lassoPoints = [];
            const markCanvas = document.getElementById('annotationMarkCanvas');
            const markCtx = markCanvas.getContext('2d');
            markCtx.clearRect(0, 0, markCanvas.width, markCanvas.height);
            this.clearMarkCanvasListeners();
        },

        completeLasso() {
            if (this.lassoPoints.length < 3) {
                console.warn("Not enough points to form a polygon (need at least 3).");
                return;
            }
            const maskCanvas = document.getElementById('annotationMaskCanvas');
            const ctx = maskCanvas.getContext('2d');
            ctx.beginPath();
            ctx.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);
            this.lassoPoints.forEach(point => ctx.lineTo(point.x, point.y));
            ctx.closePath();
            ctx.fillStyle = this.currentLassoType === 'positive' ? 'rgba(255, 0, 0, 1)' : 'rgba(0, 0, 0, 1)';
            ctx.fill();
            const markCanvas = document.getElementById('annotationMarkCanvas');
            const markCtx = markCanvas.getContext('2d');
            markCtx.clearRect(0, 0, markCanvas.width, markCanvas.height);
            this.saveMaskToHistory();
        },
        //*********************************************************Clear and Save********************************************************//
        initializeCanvasAndMask() {
            this.clearAllAnnotations();
        },
        clearMarkCanvasListeners() {
            const markCanvas = document.getElementById('annotationMarkCanvas');
            if (this.isPointListenerAdded) {
                markCanvas.removeEventListener('click', this.pushPoint);
                markCanvas.removeEventListener('contextmenu', this.stopAddingPoints);
                this.isPointListenerAdded = false;
            }
            if (this.isBrushListenersAdded) {
                markCanvas.removeEventListener('mousedown', this.beginBrushStroke);
                markCanvas.removeEventListener('mousemove', this.handleBrushMovement);
                markCanvas.removeEventListener('mouseup', this.endBrushStroke);
                markCanvas.removeEventListener('contextmenu', this.stopAddingBrush);
                this.isBrushListenersAdded = false;
            }
            if (this.isLassoListenersAdded) {
                markCanvas.removeEventListener('mousedown', this.handleMouseDown);
                markCanvas.removeEventListener('mousemove', this.handleMouseMove);
                markCanvas.removeEventListener('mouseup', this.handleMouseUp);
                markCanvas.removeEventListener('contextmenu', this.stopAddingLasso);
                this.isLassoListenersAdded = false;
            }
        },
        resetMarkCanvas() {
            this.points = [];
            this.lassoPoints = [];
            this.isBrushActive = false;
            this.isCrossHairActive = false;
            this.canAddPoints = true;
            this.canModify = false;
            this.clearMarkCanvasListeners();
            const markCanvas = document.getElementById('annotationMarkCanvas');
            const ctx = markCanvas.getContext('2d');
            ctx.clearRect(0, 0, markCanvas.width, markCanvas.height);
        },
        resetMaskCanvas() {
            this.currentMaskData = null;
            const maskCanvas = document.getElementById('annotationMaskCanvas');
            const ctx = maskCanvas.getContext('2d');
            ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            ctx.globalCompositeOperation = 'source-over';
        },
        clearAllAnnotations() {
            this.resetMarkCanvas();
            this.resetMaskCanvas();
            fetch('/clearPointandMask', {
                method: 'Get',
                headers: {
                    'Content-Type': 'application/json'
                },
            })
            .then(response => response.json())
            .catch(error => console.error('Error clearing points and mask:', error));
            this.mask_history = [];
            this.canRetrieve = false;
        },
        saveCurrentMask() {
            const maskCanvas = document.getElementById('annotationMaskCanvas');
            const imageDataURL = maskCanvas.toDataURL('image/png');
            fetch('/saveMask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify( { imageData: imageDataURL, filename: this.selectedMask } )
            })
            .then(response => response.json())
            .then(data => {
                console.log('Mask saved to:', data.mask_path)
                alert('Mask saved!\nPath: ' + data.mask_path);
            })
            .catch(error => {
                console.error('Error saving the mask:', error);
            });
        },
        closeModal() {
            this.showModal = false;
        },
        saveNewMask() {
            if (this.selectedMask != ''){
                const underScoreIndex = this.selectedMask.indexOf('_mask')+5;
                const extensionIndex = this.selectedMask.indexOf('.');
                this.maskPrefix = this.selectedMask.substring(0, underScoreIndex)
                this.maskPostfix = this.selectedMask.substring(underScoreIndex + 1, extensionIndex);
                if (this.maskPostfix == '.'){this.maskPostfix = ''}
                this.maskPostfix = '_'+this.maskPostfix
                this.showModal = true;
            }
            else{
                const underScoreIndex = this.selectedFile.indexOf('_image');
                const extensionIndex = this.selectedMask.indexOf('.');
                this.maskPrefix = this.selectedFile.substring(0, underScoreIndex)
                this.maskPrefix = this.maskPrefix+'_mask'
                this.showModal = true;
            }
        },
        saveMask() {
            const filename = this.computedMaskName;
            if (/^(?!.*__)(?!.*_$)[a-z0-9_]*$/.test(this.maskPostfix)) {
                console.log("Saving file with name:", filename);
                const maskCanvas = document.getElementById('annotationMaskCanvas');
                const imageDataURL = maskCanvas.toDataURL('image/png');
            
                fetch('/saveMask', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ imageData: imageDataURL, filename: filename }) // Send filename along with image data
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Mask saved to:', data.mask_path);
                    alert('Mask saved!\nPath: ' + data.mask_path);
                    this.showModal = false;  // Close the modal after saving

                    const imagePath = `${this.imageBasePath}/${this.selectedDirectory}/${this.selectedFile}`;
                    fetch('/selectImage', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ imagePath })
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Response from backend: Mask path:', data.mask_paths);
                        this.loadMaskOptions(data.mask_paths);
                    })
                })
                .catch(error => {
                    console.error('Error saving the mask:', error);
                });
                this.maskPrefix = '';
                this.maskPostfix = '';
                this.clearAllAnnotations();
            }
            else {
                alert("Filename must only contain lowercase letters and numbers without spaces. Please try again.");
                console.error("Failed to save due to invalid filename.");
            }
        },
        //*************************************************Brush Size Logic************************************************************//
        adjustBrushSize(event) {
            this.brushSize = event.target.value;
            document.getElementById('brushSizeIndicator').innerText = `Brush Size: ${this.brushSize}`;
            this.updateBrushSizeDisplay();
        },
        updateBrushSizeDisplay() {
            const example = document.getElementById('brushSizeVisualIndicator');
            example.style.width = `${this.brushSize * 2}px`;
            example.style.height = `${this.brushSize * 2}px`;
            this.generateCursorImage();
        },
        //*************************************************Retrieve steps************************************************************//
        saveMaskToHistory() {
            const maskCanvas = document.getElementById('annotationMaskCanvas');
            const imageDataURL = maskCanvas.toDataURL('image/png');
            this.mask_history.push(imageDataURL);
            // Check if the history exceeds the maximum buffer size of 10
            if (this.mask_history.length > 10) {
                // Remove the oldest entry to maintain the buffer size of 10
                this.mask_history.shift();
            }
            if (this.mask_history.length > 1) {this.canRetrieve = true;}
        },
        retrieveStep() {
            this.isBrushActive = false;
            this.isCrossHairActive = false;
            if (this.mask_history.length === 1) {
                console.warn('No steps to retrieve.');
                alert('No steps to retrieve.');
                return;
            }
            this.mask_history.pop();
            const maskCanvas = document.getElementById('annotationMaskCanvas'); 
            const ctx = maskCanvas.getContext('2d');
            ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

            const maskImg = new Image();
            maskImg.onload = function () {
                ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                ctx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);
            };
            maskImg.src = this.mask_history[this.mask_history.length - 1];
            if (this.mask_history.length === 1) {this.canRetrieve = false;}
            this.clearMarkCanvasListeners();
        },

    },
    computed: {
        cursorStyle() {
            if (this.isCrossHairActive === true) {
                return 'crosshair';
            } else if (this.isBrushActive === true) {
                return 'url(' + this.cursorImage + ') ' + this.adjustedBrushSize + ' ' + this.adjustedBrushSize + ', auto';
            } else {
                return 'default';
            }
        },
        computedMaskName() {
            return `${this.maskPrefix}${this.maskPostfix}.png`;
        }
    },
    mounted() {
        window.addEventListener('resize', this.handleResize);
        this.handleResize();
        this.loadDirectoryOptions();
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.handleResize);
    }
});

app.mount('#appContainer');
