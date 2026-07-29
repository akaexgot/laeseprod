import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function initLensExplorer() {
    const root = document.querySelector<HTMLElement>("[data-lens-explorer]");
    if (!root || root.dataset.initialized === "true") return;
    root.dataset.initialized = "true";

    const canvas = root.querySelector<HTMLCanvasElement>("[data-explorer-canvas]");
    const status = root.querySelector<HTMLElement>("[data-explorer-status]");
    const progress = root.querySelector<HTMLElement>("[data-explorer-progress]");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;

    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
        });
    } catch {
        root.classList.add("is-fallback");
        if (status) status.textContent = "Visor 3D no disponible";
        return;
    }

    renderer.setClearColor(0xf0f0ed, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, 0.01, 100);
    camera.position.set(5, 3, 7);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.05);
    scene.environment = environment.texture;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xbdbdb8, 2.8));

    const keyLight = new THREE.DirectionalLight(0xffffff, 5.2);
    keyLight.position.set(-4, 7, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.radius = 7;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 3.4);
    rimLight.position.set(7, 2, -3);
    scene.add(rimLight);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.autoRotate = !reducedMotion.matches;
    controls.autoRotateSpeed = 0.62;
    controls.minPolarAngle = 0.22;
    controls.maxPolarAngle = Math.PI - 0.22;

    let disposed = false;
    let ground: THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial> | null = null;

    const resize = () => {
        const rect = root.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    };

    const updateProgress = (loaded: number, total: number) => {
        const value = total > 0 ? clamp(loaded / total) : 0;
        if (progress) progress.style.transform = `scaleX(${value || 0.08})`;
        if (status) status.textContent = total > 0
            ? `Cargando objeto · ${Math.round(value * 100)}%`
            : "Cargando objeto";
    };

    const loader = new GLTFLoader();
    loader.load(
        "/camera_lens.glb",
        (gltf) => {
            if (disposed) return;

            const visual = new THREE.Group();
            const model = gltf.scene;
            visual.add(model);
            visual.rotation.set(-0.08, 1.18, -0.035);

            model.traverse((object) => {
                if (!(object instanceof THREE.Mesh)) return;
                object.castShadow = true;
                object.receiveShadow = true;

                const materials = Array.isArray(object.material) ? object.material : [object.material];
                materials.forEach((material) => {
                    if (
                        material instanceof THREE.MeshStandardMaterial
                        || material instanceof THREE.MeshPhysicalMaterial
                    ) {
                        material.envMapIntensity = 1.4;
                        material.needsUpdate = true;
                    }
                });
            });

            visual.updateMatrixWorld(true);
            const sourceBox = new THREE.Box3().setFromObject(visual);
            const sourceCenter = sourceBox.getCenter(new THREE.Vector3());
            const sourceSize = sourceBox.getSize(new THREE.Vector3());
            visual.position.sub(sourceCenter);
            visual.scale.setScalar(4.4 / Math.max(sourceSize.x, sourceSize.y, sourceSize.z));
            visual.updateMatrixWorld(true);
            scene.add(visual);

            const fittedBox = new THREE.Box3().setFromObject(visual);
            const fittedSphere = fittedBox.getBoundingSphere(new THREE.Sphere());
            const fittedSize = fittedBox.getSize(new THREE.Vector3());
            const radius = Math.max(1, fittedSphere.radius);
            const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 1.08;

            camera.position.set(distance * 0.72, distance * 0.32, distance * 0.92);
            camera.near = Math.max(0.01, distance / 100);
            camera.far = distance * 10;
            camera.updateProjectionMatrix();

            controls.target.set(0, 0, 0);
            controls.minDistance = radius * 1.35;
            controls.maxDistance = radius * 4.4;
            controls.update();

            const shadowMaterial = new THREE.ShadowMaterial({
                color: 0x000000,
                opacity: 0.075,
                transparent: true,
            });
            ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), shadowMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -fittedSize.y * 0.5 - 0.04;
            ground.receiveShadow = true;
            scene.add(ground);

            root.classList.add("is-model-ready");
            if (status) status.textContent = "Arrastra para explorar";
            if (progress) progress.style.transform = "scaleX(1)";
        },
        (event) => updateProgress(event.loaded, event.total),
        () => {
            root.classList.add("is-fallback");
            if (status) status.textContent = "No se pudo cargar el objetivo";
        },
    );

    const stopAutoRotation = () => {
        controls.autoRotate = false;
        root.classList.add("is-user-controlled");
    };

    controls.addEventListener("start", () => {
        stopAutoRotation();
        root.classList.add("is-interacting");
    });
    controls.addEventListener("end", () => root.classList.remove("is-interacting"));

    canvas.addEventListener("keydown", (event) => {
        const step = 0.14;
        const offset = camera.position.clone().sub(controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        let handled = false;

        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            spherical.theta += event.key === "ArrowLeft" ? -step : step;
            handled = true;
        }

        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            spherical.phi += event.key === "ArrowUp" ? -step : step;
            spherical.phi = clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
            handled = true;
        }

        if (handled) {
            event.preventDefault();
            stopAutoRotation();
            camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));
            camera.lookAt(controls.target);
            controls.update();
        }
    });

    resize();
    window.addEventListener("resize", resize, { passive: true });
    renderer.setAnimationLoop(() => {
        if (disposed || document.hidden) return;
        controls.update();
        renderer.render(scene, camera);
    });

    window.addEventListener("pagehide", () => {
        disposed = true;
        renderer.setAnimationLoop(null);
        controls.dispose();
        ground?.geometry.dispose();
        ground?.material.dispose();
        renderer.dispose();
        environment.dispose();
        pmrem.dispose();
        window.removeEventListener("resize", resize);
    }, { once: true });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLensExplorer, { once: true });
} else {
    initLensExplorer();
}
