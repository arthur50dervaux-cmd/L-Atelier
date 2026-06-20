import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Visualiseur de maquette 3D.
 * Dépose un fichier .glb / .gltf dans public/models/ puis renseigne son
 * chemin via l'attribut data-model du conteneur (ex: data-model="models/villa.glb").
 * En l'absence de fichier, une maquette de démonstration est générée.
 */
export function createViewer(container) {
  const canvas = container.querySelector('canvas');
  const statusEl = container.querySelector('[data-viewer-status]');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(6, 4, 9);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.9;
  controls.minDistance = 3;
  controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI / 2.05;

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(8, 12, 6);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xbfd4ff, 0.4));

  let model = null;

  function frameObject(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const dist = maxDim * 1.8;
    camera.position.set(dist * 0.7, dist * 0.55, dist);
    camera.near = maxDim / 100;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();
    controls.target.set(0, size.y * 0.05, 0);
    controls.update();
  }

  function buildPlaceholder() {
    const group = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3ede2, roughness: 0.7, metalness: 0.05 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a6f8a, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.85 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xe07a3f, roughness: 0.6 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x2aa5c4, roughness: 0.1, metalness: 0.4 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 5), accentMat);
    base.position.y = 0.15; group.add(base);

    const g1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.8, 3.4), wallMat);
    g1.position.set(-0.6, 1.2, 0); group.add(g1);

    const g2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 2.6), wallMat);
    g2.position.set(1.6, 1.7, -0.3); group.add(g2);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(4.1, 1.4, 0.1), glassMat);
    glass.position.set(-0.6, 1.1, 1.7); group.add(glass);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.15, 3.8), accentMat);
    roof.position.set(-0.6, 2.18, 0); group.add(roof);

    const pool = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.6), waterMat);
    pool.position.set(-0.4, 0.32, 2.9); group.add(pool);

    for (let i = 0; i < 5; i++) {
      const tree = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x3f6b3a, roughness: 0.9 }));
      tree.position.set(-3 + i * 1.3, 1, -2.4); group.add(tree);
    }
    return group;
  }

  function loadModel(url) {
    if (statusEl) statusEl.textContent = 'Chargement de la maquette…';
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (model) scene.remove(model);
        model = gltf.scene;
        scene.add(model);
        frameObject(model);
        if (statusEl) statusEl.style.display = 'none';
      },
      undefined,
      () => {
        // Pas de fichier : maquette de démonstration.
        if (model) scene.remove(model);
        model = buildPlaceholder();
        scene.add(model);
        frameObject(model);
        if (statusEl) statusEl.textContent = 'Maquette de démonstration — déposez votre export Revit (.glb) dans public/models/';
      }
    );
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let active = true;
  function render() {
    if (!active) return;
    requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
  }

  // Démarre le rendu uniquement quand le viewer est visible (perf).
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      active = e.isIntersecting;
      if (active) render();
    });
  }, { threshold: 0.05 });
  io.observe(container);

  const modelUrl = container.dataset.model || 'models/maquette.glb';
  loadModel(modelUrl);

  return {
    toggleRotate: () => (controls.autoRotate = !controls.autoRotate),
    reset: () => { if (model) frameObject(model); },
  };
}
