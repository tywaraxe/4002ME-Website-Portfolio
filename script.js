// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the 3D Viewer
    initStlViewer();
    
    // Initialize the Audio Player and Controls
    setupPlayerControls();
    // IMPORTANT: Replace 'assets/your_stream.pls' with the actual path to your PLS file.
    loadAndPlayPls('assets/your_stream.pls'); 
});


// -------------------------------------------------------------------
// 3D STL Viewer Logic (Uses Three.js and STLLoader)
// -------------------------------------------------------------------

function initStlViewer() {
    // This looks for the HTML element with the ID 'stl-viewer-container'
    const container = document.getElementById('stl-viewer-container');
    if (!container) {
        console.error("Error: Could not find HTML element with ID 'stl-viewer-container'.");
        return; // Exit if the container isn't found
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    // --- 1. Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0); // Light gray background

    // --- 2. Camera Setup ---
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 50);

    // --- 3. Renderer Setup ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // --- 4. Lighting ---
    scene.add(new THREE.AmbientLight(0x404040, 3)); 
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // --- 5. Controls (Requires OrbitControls.js to be included in HTML) ---
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; 

    // --- 6. Load STL Model ---
    const loader = new THREE.STLLoader();
    
    // Ensure the file path is correct (forward slashes only)
    loader.load(
        'assets/gtr.stl', 
        function (geometry) {
            // Center the model's geometry for better viewing
            geometry.center(); 
            
            // Create a material
            const material = new THREE.MeshPhongMaterial({ 
                color: 0x007bff, // Blue
                specular: 0x494949, 
                shininess: 200 
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);

            // Set camera position based on the loaded model's size
            const boundingBox = new THREE.Box3().setFromObject(mesh);
            const size = boundingBox.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            // Adjust camera to view the entire model
            camera.position.z = maxDim * 1.5; 
            camera.position.y = maxDim * 0.2; // Slightly above center
            camera.lookAt(0, 0, 0); // Focus on the model center

            // Start the render loop only once the model is loaded
            animate();
        },
        // Progress callback (optional)
        (xhr) => {
            console.log('STL Load Progress:', (xhr.loaded / xhr.total * 100).toFixed(2) + '%');
        },
        // Error callback (optional)
        (error) => {
            // This will log the 404 error if 'assets/gtr.stl' is not found
            console.error('An error happened loading the STL file. Check path/file name:', error);
        }
    );

    // --- 7. Animation/Render Loop (Defined locally to avoid global conflicts) ---
    function animate() {
        requestAnimationFrame(animate);
        controls.update(); // Required if damping is enabled
        renderer.render(scene, camera);
    }
    
    // --- 8. Handle Window Resize (Defined locally to avoid global conflicts) ---
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;

        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });
}

// -------------------------------------------------------------------
// Audio Player Logic
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
                throw new Error(`Failed to fetch PLS file: ${response.statusText}`);
            }
            return response.text();
        })
        .then(plsContent => {
            // 2. Parse the content to find the stream URL (usually File1=...)
            const lines = plsContent.split('\n');
            let streamUrl = null;

            for (const line of lines) {
                if (line.trim().startsWith('File1=')) {
                    streamUrl = line.trim().substring(6); // Get the part after 'File1='
                    break;
                }
            }

            if (streamUrl) {
                // 3. Load the stream URL into the HTML5 audio player
                audioPlayer.src = streamUrl;
                audioPlayer.load();

                // 4. Handle playback events
                audioPlayer.onplay = () => {
                    statusElement.textContent = 'Playing!';
                    statusElement.style.color = '#00ff00'; // Green for playing
                };

                audioPlayer.onerror = () => {
                    statusElement.textContent = 'Error: Failed to connect to stream.';
                    statusElement.style.color = '#ff3333';
                };

                // Due to browser security restrictions, playback must be initiated by user action.
                audioPlayer.play().catch(error => {
                    if (error.name === "NotAllowedError") {
                        statusElement.innerHTML = 'Blocked! Please **click anywhere on the page** to start.';
                        statusElement.style.color = '#ffff00'; // Yellow for blocked
                        
                        // Add a one-time listener to start playback on user interaction
                        document.body.addEventListener('click', () => {
                            audioPlayer.play();
                        }, { once: true });
                    } else {
                            statusElement.textContent = 'Playback error.';
                            statusElement.style.color = '#ff3333';
                    }
                });

            } else {
                statusElement.textContent = 'Error: Stream URL not found in PLS file.';
                statusElement.style.color = '#ff3333';
            }
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
