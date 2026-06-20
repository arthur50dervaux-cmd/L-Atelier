import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Visualiseur de maquette d'architecte — haute qualité.
 * Outils : rotation auto, recentrage, vues (perspective / plan / façade),
 * matériaux (réaliste / maquette blanche / filaire), étude d'ensoleillement,
 * plein écran. Charge un .glb (Revit/scan) ou affiche une maquette de démo.
 */
export function createViewer(container) {
  const canvas = container.querySelector('canvas');
  const statusEl = container.querySelector('[data-viewer-status]');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 2000);
  camera.position.set(7, 5, 10);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  controls.minDistance = 2;
  controls.maxDistance = 200;
  controls.maxPolarAngle = Math.PI / 2.02;

  // ----- Lighting (sun study) -----
  const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x6b5a45, 0.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0002;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 120;
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -30; sc.right = sc.top = 30;
  scene.add(sun);
  scene.add(sun.target);

  // ----- Ground (receives contact shadow) -----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.ShadowMaterial({ opacity: 0.28 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(60, 60, 0x2a6f86, 0x1c3a44);
  grid.material.opacity = 0.25;
  grid.material.transparent = true;
  scene.add(grid);

  let model = null;
  let radius = 5;
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeae4d8, roughness: 0.85, metalness: 0 });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x1a8fb3, wireframe: true });
  let materialMode = 'real';

  function applyMaterialMode(mode) {
    materialMode = mode;
    if (!model) return;
    model.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.userData._orig) o.userData._orig = o.material;
      if (mode === 'real') o.material = o.userData._orig;
      else if (mode === 'white') o.material = whiteMat;
      else if (mode === 'wire') o.material = wireMat;
    });
  }

  function frameObject(obj, view = 'persp') {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    if (view === 'reset-pos') {
      obj.position.x -= center.x;
      obj.position.z -= center.z;
      obj.position.y -= box.min.y; // pose le modèle sur le sol
      return frameObject(obj, 'persp');
    }
    radius = Math.max(size.x, size.y, size.z) || 5;
    const target = new THREE.Vector3(0, size.y * 0.45, 0);
    const d = radius * 1.9;
    let pos;
    if (view === 'plan') pos = new THREE.Vector3(0.001, d * 1.4, 0.001);
    else if (view === 'facade') pos = new THREE.Vector3(0, size.y * 0.5, d);
    else pos = new THREE.Vector3(d * 0.75, d * 0.55, d);
    camera.position.copy(pos);
    camera.near = radius / 100; camera.far = radius * 100;
    camera.updateProjectionMatrix();
    controls.target.copy(target);
    controls.update();
    // cadre d'ombre adapté à la taille
    const s = radius * 1.4;
    sc.left = sc.bottom = -s; sc.right = sc.top = s; sc.far = radius * 8;
    sun.shadow.camera.updateProjectionMatrix();
  }

  function setSun(t) {
    // t de 0 (aube) à 1 (crépuscule), midi au centre
    const az = Math.PI * (0.15 + t * 0.7);
    const el = Math.sin(t * Math.PI) * 0.8 + 0.15;
    const dist = radius * 4;
    sun.position.set(Math.cos(az) * dist, Math.max(el, 0.1) * dist, Math.sin(az) * dist);
    sun.target.position.set(0, 0, 0);
    const warm = new THREE.Color(0xffd2a1);
    const noon = new THREE.Color(0xffffff);
    const edge = Math.abs(t - 0.5) * 2; // 0 midi, 1 aube/crépuscule
    sun.color.copy(noon).lerp(warm, edge);
    sun.intensity = 1.6 + (1 - edge) * 1.4;
    hemi.intensity = 0.35 + (1 - edge) * 0.4;
  }

  function buildPlaceholder() {
    const g = new THREE.Group();
    const wall = new THREE.MeshStandardMaterial({ color: 0xf2ece1, roughness: 0.75 });
    const stone = new THREE.MeshStandardMaterial({ color: 0xcdb08c, roughness: 0.9 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x183f4d, roughness: 0.08, metalness: 0, transmission: 0.6, transparent: true, opacity: 0.6 });
    const accent = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.5 });
    const water = new THREE.MeshStandardMaterial({ color: 0x2aa5c4, roughness: 0.08, metalness: 0.3 });
    const greenM = new THREE.MeshStandardMaterial({ color: 0x4f6b34, roughness: 0.9 });

    const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };

    mk(new THREE.BoxGeometry(7, 0.3, 5.4), stone, 0, 0.15, 0);            // socle
    mk(new THREE.BoxGeometry(4.4, 2, 3.4), wall, -0.8, 1.3, 0);          // corps bas
    mk(new THREE.BoxGeometry(2.6, 3, 2.6), wall, 1.7, 1.8, -0.3);        // tour
    mk(new THREE.BoxGeometry(4.5, 0.18, 3.7), accent, -0.8, 2.4, 0);     // toiture plate
    mk(new THREE.BoxGeometry(2.7, 0.18, 2.7), accent, 1.7, 3.4, -0.3);
    const gl = mk(new THREE.BoxGeometry(4.3, 1.5, 0.08), glass, -0.8, 1.2, 1.74); gl.castShadow = false; // baie vitrée
    mk(new THREE.BoxGeometry(3.4, 0.08, 1.7), water, -0.5, 0.32, 3.1);   // piscine
    for (let i = 0; i < 2; i++) mk(new THREE.CylinderGeometry(0.12, 0.14, 2, 8), wall, -2.9 + i * 4.2, 1, 1.7); // poteaux
    for (let i = 0; i < 5; i++) { const t = mk(new THREE.ConeGeometry(0.32, 1.7, 8), greenM, -3.2 + i * 1.4, 1, -2.7); mk(new THREE.CylinderGeometry(0.08,0.1,0.6,6), stone, -3.2+i*1.4,0.4,-2.7); }
    return g;
  }

  function setModel(obj) {
    if (model) scene.remove(model);
    model = obj;
    model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(model);
    frameObject(model, 'reset-pos');
    applyMaterialMode('real');
    setSun(0.32);
  }

  function loadModel(url) {
    if (statusEl) statusEl.textContent = 'Chargement de la maquette…';
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(draco);
    loader.load(
      url,
      (gltf) => { setModel(gltf.scene); if (statusEl) statusEl.style.display = 'none'; },
      undefined,
      () => {
        setModel(buildPlaceholder());
        if (statusEl) statusEl.textContent = 'Maquette de démonstration — déposez votre export Revit (.glb) dans public/models/';
      }
    );
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  let active = true, started = false;
  function render() {
    if (!active) return;
    requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
  }
  new IntersectionObserver((entries) => {
    entries.forEach((e) => { active = e.isIntersecting; if (active) render(); });
  }, { threshold: 0.05 }).observe(container);

  setSun(0.32);
  loadModel(container.dataset.model || 'models/maquette.glb');

  return {
    toggleRotate: () => (controls.autoRotate = !controls.autoRotate),
    reset: () => model && frameObject(model, 'persp'),
    setView: (v) => model && frameObject(model, v),
    setMaterial: applyMaterialMode,
    setSun,
    fullscreen: () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else container.requestFullscreen?.();
    },
  };
}
