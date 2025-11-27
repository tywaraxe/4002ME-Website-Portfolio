// ----------------------------
// Full fixed script
// ----------------------------

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

    // Initialize the Audio Player and Controls (assumes function exists)
    if (typeof setupPlayerControls === 'function') setupPlayerControls();

    // Initialize the Parallax Scroll Effect for the hero section
    setupParallaxScroll();

    // Initialize the Image Zoom/Lightbox functionality
    setupImageZoom();

    // We only keep the resize listener for the main viewer.
    window.addEventListener('resize', onWindowResize, false);

    // IMPORTANT: Replace 'assets/your_stream.pls' with the actual path to your PLS file.
    if (typeof loadAndPlayPls === 'function') loadAndPlayPls('assets/your_stream.pls');
});

// -------------------------------------------------------------------
// --- Lightbox/Image Zoom Functionality (robust + delegated) ---
// -------------------------------------------------------------------
function setupImageZoom() {
    // Only create the lightbox once
    if (document.getElementById('lightbox')) return;

    // Inject minimal CSS to ensure the lightbox sits above the WebGL canvas
    const style = document.createElement('style');
    style.textContent = `
    #lightbox {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;
        z-index: 2147483647; /* very high to beat canvas */
    }
    #lightbox.active {
        opacity: 1;
        pointer-events: auto;
    }
    #lightbox .lightbox-inner {
        position: relative;
        max-width: 95%;
        max-height: 95%;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    #lightbox img.lightbox-content {
        max-width: 100%;
        max-height: 100%;
        display: block;
        border-radius: 4px;
        box-shadow: 0 6px 30px rgba(0,0,0,0.6);
    }
    #lightbox .lightbox-close {
        position: absolute;
        top: -12px;
        right: -12px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(0,0,0,0.6);
        color: #fff;
        border: none;
        font-size: 20px;
        line-height: 36px;
        text-align: center;
        cursor: pointer;
    }
    `;
    document.head.appendChild(style);

    // Create the lightbox DOM
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.innerHTML = `<div class="lightbox-inner" role="dialog" aria-modal="true"></div>`;
    document.body.appendChild(lightbox);

    const inner = lightbox.querySelector('.lightbox-inner');

    // Close helpers
    function closeLightbox() {
        lightbox.classList.remove('active');
        inner.innerHTML = '';
        // return focus? Not tracked here. Could be improved.
    }

    // Close on overlay click (but not if clicking image or close button)
    lightbox.addEventListener('click', (ev) => {
        if (ev.target === lightbox) closeLightbox();
    });

    // Close on ESC
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });

    // Delegated click handler: supports images added later
    // Change selector here if you use a different class (e.g., .gallery-image)
    const selector = '.zoomable-image';

    document.addEventListener('click', (ev) => {
        // Find the nearest element matching selector from the click target
        const clicked = ev.target.closest(selector);
        if (!clicked) return;

        // Prevent clicks inside the 3D canvas from triggering lightbox (optional)
        // If rendererMain.domElement exists and contains the clicked target, ignore.
        // (We don't have rendererMain globally — if you want, expose it and uncomment below.)
        // if (rendererMain && rendererMain.domElement && rendererMain.domElement.contains(clicked)) return;

        // Build the image to show
        const src = clicked.dataset.src || clicked.src || clicked.getAttribute('src');
        if (!src) return; // nothing to show

        inner.innerHTML = ''; // clear previous
        // Create img element
        const image = document.createElement('img');
        image.className = 'lightbox-content';
        image.alt = clicked.alt || clicked.getAttribute('alt') || '';
        image.src = src;

        // Optional: show a close button so mobile users can easily tap
        const btn = document.createElement('button');
        btn.className = 'lightbox-close';
        btn.setAttribute('aria-label', 'Close image');
        btn.innerHTML = '✕';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeLightbox();
        });

        inner.appendChild(btn);
        inner.appendChild(image);
        lightbox.classList.add('active');

        // Prevent default if it's inside a link
        if (clicked.closest('a')) ev.preventDefault();
    }, true); // use capture true to catch early (safer with other libs)
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

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // --- 1. Scene Setup ---
    const sceneMain = new THREE.Scene();
    sceneMain.background = new THREE.Color(0x333333);

    // --- 2. Camera Setup ---
    const cameraMain = new THREE.PerspectiveCamera(75, width / height, 0.01, 1000);
    cameraMain.position.set(0, 0, 50);

    // --- 3. Renderer Setup ---
    const rendererMain = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    rendererMain.setSize(width, height);
    rendererMain.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Make sure canvas doesn't steal pointer events from overlayed UI if necessary:
    rendererMain.domElement.style.display = 'block';
    container.appendChild(rendererMain.domElement);

    // Expose rendererMain if you need it elsewhere (optional)
    window.__rendererMain = rendererMain;

    // --- 4. Lighting - PBR SETUP (Reduced intensity for less reflection) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    sceneMain.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
    directionalLight.position.set(1, 1, 1).normalize();
    sceneMain.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight2.position.set(-1, -1, -1).normalize();
    sceneMain.add(directionalLight2);

    // --- 5. Controls (Requires OrbitControls.js loaded) ---
    const controlsMain = new THREE.OrbitControls(cameraMain, rendererMain.domElement);
    controlsMain.enableDamping = true;

    // --- 6. Load GLB Model ---
    const loader = new THREE.GLTFLoader();

    loader.load(
        'assets/animated-gear.glb',
        function (gltf) {
            gltfModel = gltf.scene; // Store the loaded scene globally
            sceneMain.add(gltfModel);

            // Remove reflections / make matte
            gltfModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    const mat = child.material;
                    // Some materials can be an array
                    if (Array.isArray(mat)) {
                        mat.forEach(m => {
                            if (m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) {
                                m.metalness = 0;
                                m.roughness = 1;
                                m.needsUpdate = true;
                            }
                        });
                    } else {
                        if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                            mat.metalness = 0;
                            mat.roughness = 1;
                            mat.needsUpdate = true;
                        }
                    }
                }
            });

            // Animation setup
            if (gltf.animations && gltf.animations.length) {
                mixerMain = new THREE.AnimationMixer(gltfModel);
                gltf.animations.forEach((clip) => {
                    mixerMain.clipAction(clip).play();
                });
            } else {
                console.log("No animations found for the Main GLB Viewer.");
            }

            // Center & scale the model
            const box = new THREE.Box3().setFromObject(gltfModel);
            const center = box.getCenter(new THREE.Vector3());
            gltfModel.position.sub(center);

            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z, 1); // avoid zero
            cameraMain.position.z = maxDim * 1.5;
            cameraMain.position.y = maxDim * 0.2;
            cameraMain.lookAt(0, 0, 0);

            animateMain();
        },
        (xhr) => { 
            if (xhr && xhr.total) {
                console.log('GLB Load Progress (Viewer):', (xhr.loaded / xhr.total * 100).toFixed(2) + '%');
            }
        },
        (error) => { console.error('An error happened loading the GLB viewer file. Check path/file name:', error); }
    );

    // --- 7. Animation/Render Loop ---
    function animateMain() {
        requestAnimationFrame(animateMain);

        const delta = clockMain.getDelta();
        if (mixerMain) mixerMain.update(delta);

        controlsMain.update();
        rendererMain.render(sceneMain, cameraMain);
    }

    // --- 8. Handle Window Resize ---
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth || window.innerWidth;
        const newHeight = container.clientHeight || window.innerHeight;

        cameraMain.aspect = newWidth / newHeight;
        cameraMain.updateProjectionMatrix();
        rendererMain.setSize(newWidth, newHeight);
    });
}

// -------------------------------------------------------------------
// 🔄 Window Resize Handler 
// -------------------------------------------------------------------
function onWindowResize() {
    // Placeholder (viewer handles its own resize). If you want to handle other elements, add here.
}
document.addEventListener("DOMContentLoaded", () => {

    const images = document.querySelectorAll(".zoomable-image");
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.querySelector(".lightbox-content");

    images.forEach(img => {
        img.addEventListener("click", () => {
            lightboxImg.src = img.src;
            lightbox.classList.add("active");
        });
    });

    lightbox.addEventListener("click", () => {
        lightbox.classList.remove("active");
    });

});
