import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const easeInOutCubic = (value: number) => (
    value < 0.5
        ? 4 * value * value * value
        : 1 - Math.pow(-2 * value + 2, 3) / 2
);

function initRollingContentReveal() {
    const hero = document.querySelector<HTMLElement>("[data-rolling-content-reveal]");
    if (!hero || hero.dataset.initialized === "true") return;
    hero.dataset.initialized = "true";
    document.documentElement.classList.add("is-rolling-reveal-active");
    document.documentElement.style.setProperty("--rolling-nav-reveal", "0%");

    const canvas = hero.querySelector<HTMLCanvasElement>("[data-reveal-canvas]");
    const revealTarget = hero.querySelector<HTMLElement>("[data-reveal-target]");
    const shadow = hero.querySelector<HTMLElement>("[data-reveal-shadow]");
    const status = hero.querySelector<HTMLElement>("[data-reveal-status]");
    const progress = hero.querySelector<HTMLElement>("[data-reveal-progress]");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!canvas || !revealTarget) return;

    let renderer: THREE.WebGLRenderer;

    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
        });
    } catch {
        hero.classList.add("is-fallback", "is-content-revealed");
        revealTarget.style.setProperty("--content-reveal", "100%");
        document.documentElement.style.setProperty("--rolling-nav-reveal", "100%");
        if (status) status.textContent = "Contenido revelado";
        return;
    }

    renderer.setClearColor(0xffffff, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.01, 100);
    camera.position.set(0, 0, 14);
    camera.lookAt(0, 0, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.05);
    scene.environment = environment.texture;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xc8c8c8, 2.4));

    const keyLight = new THREE.DirectionalLight(0xffffff, 5.4);
    keyLight.position.set(-5, 7, 10);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 3.2);
    rimLight.position.set(7, 1, 6);
    scene.add(rimLight);

    const lowerLight = new THREE.DirectionalLight(0xdadada, 1.8);
    lowerLight.position.set(0, -6, 5);
    scene.add(lowerLight);

    const rollingGroup = new THREE.Group();
    scene.add(rollingGroup);

    let modelVisual: THREE.Group | null = null;
    let animationStart = 0;
    let viewWidth = 10;
    let viewHeight = 10;
    let viewportWidth = 1;
    let viewportHeight = 1;
    let targetSize = 2.7;
    let targetSizePx = 280;
    let travelEdge = 7;
    let wheelRadius = 1.25;
    let lensScreenY = 0;
    let revealMaximum = 0;
    let disposed = false;
    let revealFinished = false;
    let finishTimer = 0;

    const resize = () => {
        const rect = hero.getBoundingClientRect();
        viewportWidth = Math.max(1, rect.width);
        viewportHeight = Math.max(1, rect.height);
        viewHeight = 10;
        viewWidth = viewHeight * (viewportWidth / viewportHeight);

        camera.left = -viewWidth / 2;
        camera.right = viewWidth / 2;
        camera.top = viewHeight / 2;
        camera.bottom = -viewHeight / 2;
        camera.updateProjectionMatrix();

        renderer.setSize(viewportWidth, viewportHeight, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));

        targetSizePx = viewportWidth <= 680
            ? clamp(viewportWidth * 0.58, 190, 250)
            : clamp(viewportWidth * 0.19, 280, 390);
        targetSize = targetSizePx * (viewHeight / viewportHeight);
        wheelRadius = targetSize * 0.46;
        travelEdge = viewWidth / 2 + targetSize * 0.7;

        const isCompactLandscape = viewportWidth >= 600 && viewportHeight <= 620;
        const screenYRatio = isCompactLandscape
            ? 0.5
            : viewportWidth <= 900 ? 0.24 : 0.53;
        lensScreenY = viewportHeight * screenYRatio;
        rollingGroup.position.y = (0.5 - screenYRatio) * viewHeight;

        if (modelVisual) {
            const naturalSize = Number(modelVisual.userData.naturalSize || 1);
            modelVisual.scale.setScalar(targetSize / naturalSize);
        }
    };

    const setLoadingProgress = (loaded: number, total: number) => {
        const value = total > 0 ? clamp(loaded / total) : 0;
        if (progress) progress.style.transform = `scaleX(${value || 0.08})`;
        if (status) status.textContent = total > 0
            ? `Preparando optica · ${Math.round(value * 100)}%`
            : "Preparando optica";
    };

    const finishLoading = () => {
        hero.classList.add("is-reveal-model-ready");
        if (status) status.textContent = "Optica lista";
        if (progress) progress.style.transform = "scaleX(1)";
        animationStart = performance.now() + 240;
    };

    const failLoading = () => {
        hero.classList.add("is-fallback", "is-content-revealed");
        revealTarget.style.setProperty("--content-reveal", "100%");
        document.documentElement.style.setProperty("--rolling-nav-reveal", "100%");
        if (status) status.textContent = "Contenido revelado";
        window.dispatchEvent(new CustomEvent("laese:rolling-reveal-finished"));
        window.setTimeout(() => hero.classList.add("is-status-hidden"), 900);
    };

    const finishReveal = () => {
        if (revealFinished) return;
        revealFinished = true;
        document.documentElement.style.setProperty("--rolling-nav-reveal", "100%");
        hero.classList.add("is-content-revealed", "is-reveal-finished");
        window.dispatchEvent(new CustomEvent("laese:rolling-reveal-finished"));
        finishTimer = window.setTimeout(() => {
            if (!disposed) renderer.setAnimationLoop(null);
        }, 760);
    };

    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    loader.load(
        "/camera_lens.glb",
        (gltf) => {
            if (disposed) return;

            const visual = new THREE.Group();
            const model = gltf.scene;
            visual.add(model);

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
                        material.envMapIntensity = 1.35;
                        material.needsUpdate = true;
                    }
                });
            });

            visual.rotation.y = Math.PI / 2;
            visual.updateMatrixWorld(true);

            const initialBox = new THREE.Box3().setFromObject(visual);
            const center = initialBox.getCenter(new THREE.Vector3());
            visual.position.sub(center);
            visual.updateMatrixWorld(true);

            const centeredBox = new THREE.Box3().setFromObject(visual);
            const naturalSize = centeredBox.getSize(new THREE.Vector3());
            visual.userData.naturalSize = Math.max(naturalSize.x, naturalSize.y);
            modelVisual = visual;
            rollingGroup.add(visual);
            resize();
            finishLoading();
        },
        (event) => setLoadingProgress(event.loaded, event.total),
        failLoading,
    );

    const updateContentReveal = (worldX: number) => {
        if (revealMaximum >= 1) return;

        const targetRect = revealTarget.getBoundingClientRect();
        if (targetRect.width <= 0) return;

        const screenX = ((worldX / viewWidth) + 0.5) * viewportWidth;
        const discoveryEdge = screenX + targetSizePx * 0.18;
        const revealed = clamp((discoveryEdge - targetRect.left) / targetRect.width);
        revealMaximum = Math.max(revealMaximum, revealed);
        revealTarget.style.setProperty("--content-reveal", `${revealMaximum * 100}%`);
        document.documentElement.style.setProperty("--rolling-nav-reveal", `${revealMaximum * 100}%`);

        if (revealMaximum >= 0.999) {
            revealMaximum = 1;
            revealTarget.style.setProperty("--content-reveal", "100%");
            document.documentElement.style.setProperty("--rolling-nav-reveal", "100%");
            finishReveal();
        }
    };

    const renderFrame = (time: number) => {
        if (!modelVisual || disposed || document.hidden) return;

        if (reducedMotion.matches) {
            revealTarget.style.setProperty("--content-reveal", "100%");
            document.documentElement.style.setProperty("--rolling-nav-reveal", "100%");
            rollingGroup.position.x = viewWidth * 0.22;
            rollingGroup.rotation.z = -0.28;
            finishReveal();
        } else {
            const elapsed = Math.max(0, time - animationStart);
            const revealDuration = viewportWidth <= 680 ? 3000 : 4700;
            const progressValue = easeInOutCubic(clamp(elapsed / revealDuration));
            const worldX = THREE.MathUtils.lerp(-travelEdge, travelEdge, progressValue);
            const rotation = -(worldX + travelEdge) / wheelRadius;

            updateContentReveal(worldX);
            rollingGroup.position.x = worldX;
            rollingGroup.rotation.z = rotation;

            if (elapsed > revealDuration + 220) {
                revealTarget.style.setProperty("--content-reveal", "100%");
                document.documentElement.style.setProperty("--rolling-nav-reveal", "100%");
                finishReveal();
            }

            if (shadow) {
                const screenX = ((worldX / viewWidth) + 0.5) * viewportWidth;
                shadow.style.width = `${targetSizePx * 0.72}px`;
                shadow.style.height = `${Math.max(14, targetSizePx * 0.105)}px`;
                shadow.style.transform = `translate3d(${screenX - targetSizePx * 0.36}px, ${lensScreenY + targetSizePx * 0.38}px, 0)`;
            }
        }

        renderer.render(scene, camera);
    };

    const handleVisibility = () => {
        if (!document.hidden && modelVisual && !revealFinished) {
            animationStart = performance.now();
        }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    renderer.setAnimationLoop(renderFrame);

    window.addEventListener("pagehide", () => {
        disposed = true;
        window.clearTimeout(finishTimer);
        renderer.setAnimationLoop(null);
        renderer.dispose();
        environment.dispose();
        pmrem.dispose();
        window.removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", handleVisibility);
    }, { once: true });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRollingContentReveal, { once: true });
} else {
    initRollingContentReveal();
}
