// Variable to hold the GLTF scene/model globally so the viewer can access it (no longer needed for color)
let gltfModel; 

// Variables for the Main Interactive Viewer Animation
let mixerMain;
const clockMain = new THREE.Clock(); 

// -------------------------------------------------------------------
// 🚀 Initialization
// -------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the 3D Viewer (now GLTF)
    initGltfViewer(); 

    // Initialize the Audio Player and Controls
    setupPlayerControls();

    // Initialize the Parallax Scroll Effect for the hero section
    setupParallaxScroll();

    // Initialize the Image Zoom/Lightbox functionality
    setupImageZoom();

    // We only keep the resize listener for the main viewer.
    window.addEventListener('resize', onWindowResize, false); 

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
// ⚙️ 3D GLTF/GLB Viewer Logic (Main Interactive Model)
// -------------------------------------------------------------------

function initGltfViewer() { 
    const container = document.getElementById('stl-viewer-container');
    if (!container) {
        console.error("Error: Could not find HTML element with ID 'stl-viewer-container'.");
        return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    // --- 1. Scene Setup ---
    const sceneMain = new THREE.Scene(); 
    sceneMain.background = new THREE.Color(0x333333);

    // --- 2. Camera Setup ---
    // Using a low near-clipping plane (0.01) to allow for close zooming without clipping.
    const cameraMain = new THREE.PerspectiveCamera(75, width / height, 0.01, 1000); 
    cameraMain.position.set(0, 0, 50);

    // --- 3. Renderer Setup ---
    const rendererMain = new THREE.WebGLRenderer({ antialias: true });
    rendererMain.setSize(width, height);
    container.appendChild(rendererMain.domElement);

    // --- 4. Lighting - PBR SETUP (Reduced intensity for less reflection) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 2); // Reduced from 1.5
    sceneMain.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 5); // Reduced from 5
    directionalLight.position.set(1, 1, 1).normalize();
    sceneMain.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 3); // Reduced from 3
    directionalLight2.position.set(-1, -1, -1).normalize();
    sceneMain.add(directionalLight2);

    // --- 5. Controls (Requires OrbitControls.js) ---
    const controlsMain = new THREE.OrbitControls(cameraMain, rendererMain.domElement);
    controlsMain.enableDamping = true;

    // --- 6. Load GLB Model ---
    const loader = new THREE.GLTFLoader();

    loader.load(
        'assets/animated-gear.glb', 
        function (gltf) {
            gltfModel = gltf.scene; // Store the loaded scene globally
            sceneMain.add(gltfModel);

            // 🌟 MODIFICATION: Traverse the model to remove reflections 🌟
            gltfModel.traverse((child) => {
                if (child.isMesh) {
                    // Check if the material is a PBR material
                    if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
                        // Set metalness to 0 (non-metallic)
                        child.material.metalness = 0;
                        // Set roughness to 1 (fully diffuse/matte)
                        child.material.roughness = 1; 
                        // Ensure the material updates if properties were changed
                        child.material.needsUpdate = true;
                    }
                }
            });
            // 🌟 END MODIFICATION 🌟

            // Add Animation Setup for Viewer
            if (gltf.animations && gltf.animations.length) {
                mixerMain = new THREE.AnimationMixer(gltfModel);
                gltf.animations.forEach((clip) => {
                    mixerMain.clipAction(clip).play();
                });
            } else {
                console.log("No animations found for the Main GLB Viewer.");
            }

            // Center the model in the viewer
            const box = new THREE.Box3().setFromObject(gltfModel);
            const center = box.getCenter(new THREE.Vector3());
            gltfModel.position.sub(center);

            // Scale calculation for camera positioning
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            // Adjust camera position based on the loaded model's size
            cameraMain.position.z = maxDim * 1.5;
            cameraMain.position.y = maxDim * 0.2;
            cameraMain.lookAt(0, 0, 0);

            // No color application logic needed here anymore.

            animateMain();
        },
        (xhr) => { console.log('GLB Load Progress (Viewer):', (xhr.loaded / xhr.total * 100).toFixed(2) + '%'); },
        (error) => { console.error('An error happened loading the GLB viewer file. Check path/file name:', error); }
    );

    // --- 7. Animation/Render Loop (Updated) ---
    function animateMain() { 
        requestAnimationFrame(animateMain);
        
        // Update the Animation Mixer 
        const delta = clockMain.getDelta();
        if (mixerMain) {
            mixerMain.update(delta);
        }
        
        controlsMain.update();
        rendererMain.render(sceneMain, cameraMain);
    }

    // --- 8. Handle Window Resize ---
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;

        cameraMain.aspect = newWidth / newHeight;
        cameraMain.updateProjectionMatrix();
        rendererMain.setSize(newWidth, newHeight);
    });
}

// -------------------------------------------------------------------
// 🔄 Window Resize Handler 
// -------------------------------------------------------------------

function onWindowResize() {
    // This function is now just a placeholder, as the viewer handles its own resize.
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
                    statusElement.innerHTML = 'Blocked! Please click anywhere on the page to start.';
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

    // --- 1. Volume Control (Persistence Added) ---

    // Check if a saved volume exists in localStorage (value is 0.0 to 1.0)
    const savedVolume = parseFloat(localStorage.getItem('streamVolume'));

    // Determine the starting volume and set the audio player and slider UI
    if (!isNaN(savedVolume)) {
        // Use the **saved value** if it exists and is a valid number
        audioPlayer.volume = savedVolume;
        volumeSlider.value = savedVolume * 100; // Convert 0.0-1.0 to 0-100 for the slider
    } else {
        // If nothing is saved, set initial volume to **0 (silent)**, as requested
        audioPlayer.volume = 0;
        volumeSlider.value = 0;
        // Save this initial state so it's remembered next time
        localStorage.setItem('streamVolume', 0);
    }

    // Listener to handle volume changes
    volumeSlider.addEventListener('input', (event) => {
        const newVolume = event.target.value / 100;
        audioPlayer.volume = newVolume;

        // **Save the new volume value** to local storage for persistence
        localStorage.setItem('streamVolume', newVolume);
    });

    // --- 2. Play/Pause Toggle (No Change) ---

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

    // --- 3. Status Listeners (No Change) ---

    audioPlayer.onplaying = () => updateIcon(true);
    audioPlayer.onpause = () => updateIcon(false);
    audioPlayer.onloadedmetadata = () => updateIcon(!audioPlayer.paused);
    // Set initial state (default to play icon visible if paused)
    updateIcon(false);
}
