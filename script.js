// Variable to hold the STL mesh object globally so the color picker can access it
let stlMesh;

// -------------------------------------------------------------------
// 🚀 Initialization
// -------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the 3D Viewer
    initStlViewer();
    
    // Initialize the Color Picker logic, now including swatches, color picker, and metallic slider
    setupColorPicker(); 
    
    // Initialize the Audio Player and Controls
    setupPlayerControls();
    
    // Initialize the Parallax Scroll Effect for the hero section
    setupParallaxScroll();

    // NOTE: The JavaScript function for the fixed GIF link (setupFixedVideoLink) 
    // has been REMOVED because the HTML 'target="_blank"' attribute is sufficient 
    // and the JS was causing the link to fail.

    // IMPORTANT: Replace 'assets/your_stream.pls' with the actual path to your PLS file.
    loadAndPlayPls('assets/your_stream.pls'); 
});

// -------------------------------------------------------------------
// --- Lightbox/Image Zoom Functionality ---
function setupImageZoom() {
    // 1. Select all images with the 'zoomable-image' class
    const zoomableImages = document.querySelectorAll('.zoomable-image');

    // 2. Dynamically create the lightbox container element
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.classList.add('lightbox');
    document.body.appendChild(lightbox);

    // 3. Add event listener to CLOSE the lightbox when the overlay is clicked
    lightbox.addEventListener('click', () => {
        lightbox.classList.remove('active');
        lightbox.innerHTML = ''; // Clear the content after closing
    });

    // 4. Add event listener to OPEN the lightbox when an image is clicked
    zoomableImages.forEach(image => {
        image.addEventListener('click', () => {
            // Create the enlarged image element
            const lightboxContent = document.createElement('img');
            lightboxContent.src = image.src; // Use the original image source
            lightboxContent.alt = image.alt;
            lightboxContent.classList.add('lightbox-content');

            // Insert the enlarged image into the lightbox and show it
            lightbox.innerHTML = '';
            lightbox.appendChild(lightboxContent);
            lightbox.classList.add('active');
        });
    });
}

// It's good practice to run this function after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Other setup/initialization code you may have...

    // Setup the image zoom/lightbox functionality
    setupImageZoom(); 
});

// -------------------------------------------------------------------
// 📈 PARALLAX SCROLL EFFECT LOGIC
// -------------------------------------------------------------------
function setupParallaxScroll() {
    const hero = document.querySelector('.hero-parallax-section');
    if (!hero) return;

    // Adjust this value to control the speed of the hero content's movement.
    const speed = 0.5; 

    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        const yOffset = scrollPosition * speed;
        
        const heroContent = hero.querySelector('.hero-content');
        if (heroContent) {
            heroContent.style.transform = `translateY(${yOffset}px)`;
        }
    });
}


// -------------------------------------------------------------------
// ⚙️ 3D STL Viewer Logic (Uses Three.js and STLLoader)
// -------------------------------------------------------------------

function initStlViewer() {
    const container = document.getElementById('stl-viewer-container');
    if (!container) {
        console.error("Error: Could not find HTML element with ID 'stl-viewer-container'.");
        return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    // --- 1. Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333); 

    // --- 2. Camera Setup ---
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 50);

    // --- 3. Renderer Setup ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // --- 4. Lighting - PBR SETUP ---
    // 1. Hemisphere Light (Soft, ambient)
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2); 
    scene.add(hemisphereLight);

    // 2. Key Directional Light (Sharp highlight from top-right)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 5); 
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
    
    // 3. Back Light / Fill Light (Contrast/Rim highlight from bottom-left)
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 3); 
    directionalLight2.position.set(-1, -1, -1).normalize();
    scene.add(directionalLight2);

    // --- 5. Controls (Requires OrbitControls.js) ---
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; 

    // --- 6. Load STL Model & Texture ---
    const loader = new THREE.STLLoader();
    const textureLoader = new THREE.TextureLoader(); 
    const textureUrl = 'https://placehold.co/512x512/333333/dddddd/png?text=CHECKERED+Texture';

    // Start by loading the texture
    textureLoader.load(
        textureUrl,
        // Success callback for texture loading
        (texture) => {
            loadGeometry(texture);
        },
        // Progress callback (optional)
        (xhr) => { console.log('Texture Load Progress:', (xhr.loaded / xhr.total * 100).toFixed(2) + '%'); },
        // Error callback for texture loading
        (error) => {
            console.error('An error happened loading the Texture. Falling back to solid color.', error);
            loadGeometry(null);
        }
    );

    // Helper function to handle geometry loading regardless of texture success
    function loadGeometry(texture) {
        // Ensure the file path is correct
        loader.load(
            'assets/gtr.stl', 
            function (geometry) {
                geometry.center(); 
                
                // --- MeshStandardMaterial is maintained ---
                const materialProperties = {
                    // Initial color set (Dark Red/Purple)
                    color: 0x5C3347, 
                    metalness: 0.8, 
                    roughness: 0.2, 
                };

                if (texture) {
                    materialProperties.map = texture; 
                }
                
                const material = new THREE.MeshStandardMaterial(materialProperties);
                stlMesh = new THREE.Mesh(geometry, material);
                scene.add(stlMesh);

                // Set camera position based on the loaded model's size
                const boundingBox = new THREE.Box3().setFromObject(stlMesh);
                const size = boundingBox.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                
                camera.position.z = maxDim * 1.5; 
                camera.position.y = maxDim * 0.2; 
                camera.lookAt(0, 0, 0); 

                animate();
            },
            (xhr) => { console.log('STL Load Progress:', (xhr.loaded / xhr.total * 100).toFixed(2) + '%'); },
            (error) => { console.error('An error happened loading the STL file. Check path/file name:', error); }
        );
    }

    // --- 7. Animation/Render Loop ---
    function animate() {
        requestAnimationFrame(animate);
        controls.update(); 
        renderer.render(scene, camera);
    }
    
    // --- 8. Handle Window Resize ---
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;

        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });
}

// -------------------------------------------------------------------
// 🎨 Color Picker, Swatch, and METALLIC SLIDER Logic
// -------------------------------------------------------------------

function setupColorPicker() {
    const colorPicker = document.getElementById('base-color-picker');
    const metallicSlider = document.getElementById('metallic-slider');
    const colorSwatches = document.querySelectorAll('#color-swatches .swatch');

    if (!colorPicker || !metallicSlider) {
        console.error("Error: Could not find HTML element with ID 'base-color-picker' or 'metallic-slider'.");
        return;
    }

    // Helper function to apply color and metallic changes
    const applyModelChanges = (newColor, newMetallic) => {
        if (stlMesh && stlMesh.material) {
            // Apply new color (tints the material)
            stlMesh.material.color.set(newColor);
            
            // Apply new metallic value 
            stlMesh.material.metalness = newMetallic;
            
            // Flag for update 
            stlMesh.material.needsUpdate = true;
        }
    };
    

    // 1. Listen for the 'input' event on the main color picker for real-time updates
    colorPicker.addEventListener('input', (event) => {
        const currentMetallic = parseFloat(metallicSlider.value);
        applyModelChanges(event.target.value, currentMetallic);
    });
    
    // 2. Listen for the 'input' event on the metallic slider
    metallicSlider.addEventListener('input', (event) => {
        const currentColor = colorPicker.value;
        const newMetallic = parseFloat(event.target.value);
        applyModelChanges(currentColor, newMetallic);
    });
    
    // 3. Setup Swatch Click Handlers
    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const newColor = swatch.getAttribute('data-color');
            const currentMetallic = parseFloat(metallicSlider.value);
            
            // Apply changes
            applyModelChanges(newColor, currentMetallic);
            
            // Update the main color picker value to reflect the selected swatch
            colorPicker.value = newColor;
        });
    });
}


// -------------------------------------------------------------------
// 🎧 Audio Player Logic
// -------------------------------------------------------------------

function loadAndPlayPls(plsFilePath) {
    const audioPlayer = document.getElementById('stream-player');
    const statusElement = document.getElementById('stream-status');

    if (!audioPlayer || !statusElement) return;

    statusElement.textContent = 'Connecting to stream...';

    // 1. Fetch the .pls file content
    fetch(plsFilePath)
        .then(response => {
            if (!response.ok) {
                // If fetching the local PLS file fails (e.g., due to file structure)
                console.warn("Could not load local PLS file. Attempting to use a direct stream link as fallback.");
                // Fallback: Use a direct stream link (NeuroFM default)
                const fallbackStreamUrl = "https://stream.neurofm.live/neurofm.mp3"; 
                if (fallbackStreamUrl) {
                    return fallbackStreamUrl;
                }
                throw new Error(`Failed to fetch PLS file: ${response.statusText}`);
            }
            return response.text();
        })
        .then(content => {
            let streamUrl = content;
            if (content.includes('File1=')) {
                // It was a valid PLS, parse it
                const lines = content.split('\n');
                for (const line of lines) {
                    if (line.trim().startsWith('File1=')) {
                        streamUrl = line.trim().substring(6); 
                        break;
                    }
                }
            } else if (!streamUrl.startsWith('http')) {
                // If it wasn't a valid PLS and not a direct URL from the fallback
                console.error("Stream URL could not be determined from PLS file or fallback.");
                statusElement.textContent = 'Error: Stream URL not found.';
                statusElement.style.color = '#ff3333';
                return;
            }

            // 3. Load the stream URL into the HTML5 audio player
            audioPlayer.src = streamUrl;
            audioPlayer.load();

            // 4. Handle playback events
            audioPlayer.onplay = () => {
                statusElement.textContent = 'Playing!';
                statusElement.style.color = '#00ff00';
            };

            audioPlayer.onerror = () => {
                statusElement.textContent = 'Error: Failed to connect to stream.';
                statusElement.style.color = '#ff3333';
            };

            // Due to browser security restrictions, playback must be initiated by user action.
            audioPlayer.play().catch(error => {
                if (error.name === "NotAllowedError") {
                    statusElement.innerHTML = 'Blocked! Please **click anywhere on the page** to start.';
                    statusElement.style.color = '#ffff00'; 
                    
                    // Add a one-time listener to start playback on user interaction
                    document.body.addEventListener('click', () => {
                        audioPlayer.play();
                        // Update status after playback starts
                        statusElement.textContent = 'Playing!'; 
                        statusElement.style.color = '#00ff00';
                    }, { once: true });
                } else {
                    statusElement.textContent = 'Playback error.';
                    statusElement.style.color = '#ff3333';
                }
            });

        })
        .catch(error => {
            statusElement.textContent = `Error: ${error.message}`;
            statusElement.style.color = '#ff3333';
            console.error(error);
        });
}

function setupPlayerControls() {
    const audioPlayer = document.getElementById('stream-player');
    const volumeSlider = document.getElementById('volume-slider');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    
    if (!audioPlayer || !volumeSlider || !playPauseBtn || !playIcon || !pauseIcon) return;

    // 1. Volume Control
    audioPlayer.volume = volumeSlider.value / 100;
    volumeSlider.addEventListener('input', () => {
        audioPlayer.volume = volumeSlider.value / 100;
    });

    // 2. Play/Pause Toggle
    const updateIcon = (isPlaying) => {
        playIcon.style.display = isPlaying ? 'none' : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
    };

    playPauseBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            // Attempt to play, handling potential browser restrictions
            audioPlayer.play().then(() => updateIcon(true)).catch(error => {
                console.warn("Playback blocked by browser policy.", error);
            });
        } else {
            audioPlayer.pause();
            updateIcon(false);
        }
    });

    // 3. Status Listeners (To keep the UI in sync with the audio state)
    audioPlayer.onplaying = () => updateIcon(true);
    audioPlayer.onpause = () => updateIcon(false);
    audioPlayer.onloadedmetadata = () => updateIcon(!audioPlayer.paused);
    // Set initial state (default to play icon visible if paused)
    updateIcon(false); 
}
