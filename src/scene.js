import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const isMobile = window.matchMedia('(max-width: 760px)').matches;

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 800);

  // ---------- Sky dome (sunset gradient) ----------
  const skyGeo = new THREE.SphereGeometry(420, 24, 16);
  const skyColors = [];
  const skyPos = skyGeo.attributes.position;
  const top = new THREE.Color('#1b2440');
  const mid = new THREE.Color('#e98a5b');
  const horizon = new THREE.Color('#ffd9a0');
  for (let i = 0; i < skyPos.count; i++) {
    const y = skyPos.getY(i) / 420; // -1..1
    let c;
    if (y > 0.05) c = top.clone().lerp(mid, 1 - Math.min(y / 0.6, 1));
    else c = mid.clone().lerp(horizon, 1 - Math.min(Math.abs(y) / 0.15, 1));
    skyColors.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3));
  const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  scene.fog = new THREE.FogExp2(0xe0a877, 0.0026);

  // ---------- Lights ----------
  const hemi = new THREE.HemisphereLight(0xffe3bf, 0x33291f, 0.65);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffd3a0, 1.6);
  sunLight.position.set(-60, 40, -90);
  sunLight.castShadow = !isMobile;
  if (sunLight.castShadow) {
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 250;
    sunLight.shadow.camera.left = -80;
    sunLight.shadow.camera.right = 80;
    sunLight.shadow.camera.top = 80;
    sunLight.shadow.camera.bottom = -80;
  }
  scene.add(sunLight);
  const fill = new THREE.DirectionalLight(0x6f93b0, 0.35);
  fill.position.set(40, 20, 40);
  scene.add(fill);

  // sun sprite (bloom glow source)
  const sunCanvas = document.createElement('canvas');
  sunCanvas.width = sunCanvas.height = 256;
  const sctx = sunCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,235,200,1)');
  grad.addColorStop(0.4, 'rgba(255,200,140,0.8)');
  grad.addColorStop(1, 'rgba(255,200,140,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 256, 256);
  const sunTex = new THREE.CanvasTexture(sunCanvas);
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false }));
  sunSprite.scale.set(70, 70, 1);
  sunSprite.position.set(-60, 36, -160);
  scene.add(sunSprite);

  // ---------- Water shader (sea + pool reuse) ----------
  const waterUniforms = {
    uTime: { value: 0 },
    uColorDeep: { value: new THREE.Color('#16414f') },
    uColorShallow: { value: new THREE.Color('#e8c587') },
    uOpacity: { value: 1 },
  };
  const waterVertex = `
    uniform float uTime;
    varying vec3 vPos;
    varying vec3 vNormalW;
    void main() {
      vec3 p = position;
      float wave = sin(p.x * 0.18 + uTime * 0.6) * 0.18 + cos(p.y * 0.22 - uTime * 0.5) * 0.14;
      p.z += wave;
      vPos = p;
      vNormalW = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `;
  const waterFragment = `
    uniform vec3 uColorDeep;
    uniform vec3 uColorShallow;
    uniform float uTime;
    uniform float uOpacity;
    varying vec3 vPos;
    void main() {
      float d = clamp((vPos.y + 0.3) / 0.6, 0.0, 1.0);
      vec3 col = mix(uColorDeep, uColorShallow, d * 0.6);
      float sparkle = fract(sin(dot(vPos.xy * 4.0, vec2(12.9898, 78.233)) + uTime * 2.0) * 43758.5453);
      sparkle = smoothstep(0.985, 1.0, sparkle);
      col += sparkle * 0.6;
      gl_FragColor = vec4(col, uOpacity);
    }
  `;
  function makeWaterMaterial(opacity = 1) {
    const u = THREE.UniformsUtils.clone(waterUniforms);
    u.uOpacity.value = opacity;
    return new THREE.ShaderMaterial({
      uniforms: u, vertexShader: waterVertex, fragmentShader: waterFragment,
      transparent: opacity < 1,
    });
  }

  const seaGeo = new THREE.PlaneGeometry(500, 500, 80, 80);
  const seaMat = makeWaterMaterial(1);
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0;
  scene.add(sea);

  // ---------- Terrain (cliffs -> vineyard hills) ----------
  const segs = isMobile ? 60 : 110;
  const terrainSize = 260;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segs, segs);
  terrainGeo.rotateX(-Math.PI / 2);
  const tPos = terrainGeo.attributes.position;
  const colors = [];
  const rock = new THREE.Color('#8a7860');
  const vineGreen = new THREE.Color('#5d6b35');
  const vineGold = new THREE.Color('#caa85e');
  const sandy = new THREE.Color('#b89a72');

  function terrainHeight(x, z) {
    const inland = Math.max(0, x + 6);
    const cliff = Math.pow(inland, 1.15) * 0.32;
    const hills = Math.sin(x * 0.06) * 1.8 + Math.cos(z * 0.08) * 1.4;
    const noise = Math.sin(x * 0.25 + z * 0.3) * 0.4;
    const shoreDrop = Math.min(0, x + 14) * 0.5;
    return cliff + hills + noise + shoreDrop;
  }

  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i);
    const z = tPos.getZ(i);
    const y = terrainHeight(x, z);
    tPos.setY(i, y);
    const t = THREE.MathUtils.clamp((x + 10) / 60, 0, 1);
    let c;
    if (y < 0.4) c = sandy.clone();
    else c = rock.clone().lerp(vineGreen, t).lerp(vineGold, Math.max(0, t - 0.5) * 1.2);
    colors.push(c.r, c.g, c.b);
  }
  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.02 });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ---------- Vineyard rows ----------
  const rowCount = isMobile ? 18 : 32;
  const rowGeo = new THREE.BoxGeometry(0.5, 0.6, 14);
  const rowMat = new THREE.MeshStandardMaterial({ color: '#6b7a3c', roughness: 0.9 });
  const rows = new THREE.InstancedMesh(rowGeo, rowMat, rowCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < rowCount; i++) {
    const x = 2 + (i % 8) * 2.4;
    const z = -28 + Math.floor(i / 8) * 16;
    const y = terrainHeight(x, z) + 0.3;
    dummy.position.set(x, y, z);
    dummy.rotation.y = (Math.random() - 0.5) * 0.05;
    dummy.scale.set(1, 0.8 + Math.random() * 0.4, 1 + Math.random() * 0.15);
    dummy.updateMatrix();
    rows.setMatrixAt(i, dummy.matrix);
  }
  rows.castShadow = true;
  scene.add(rows);

  // ---------- Cypress trees ----------
  const treeCount = isMobile ? 8 : 14;
  const treeGroup = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 1, 5);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#3b3127', roughness: 1 });
  const conifGeo = new THREE.ConeGeometry(0.55, 4.2, 7);
  const conifMat = new THREE.MeshStandardMaterial({ color: '#26331f', roughness: 0.95 });
  for (let i = 0; i < treeCount; i++) {
    const x = 18 + Math.random() * 14;
    const z = -10 + i * 3.2;
    const y = terrainHeight(x, z);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, y + 0.5, z);
    const top = new THREE.Mesh(conifGeo, conifMat);
    top.position.set(x, y + 2.6, z);
    top.castShadow = true;
    treeGroup.add(trunk, top);
  }
  scene.add(treeGroup);

  // ---------- Villa ----------
  const villaGroup = new THREE.Group();
  const villaBaseX = 27, villaBaseZ = -4;
  const groundY = terrainHeight(villaBaseX, villaBaseZ);

  const wallMat = new THREE.MeshStandardMaterial({ color: '#e9e3d6', roughness: 0.85 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#1c2f3a', roughness: 0.15, metalness: 0.3, emissive: '#16323e', emissiveIntensity: 0.25 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#23211d', roughness: 0.6 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(14, 3.4, 9), wallMat);
  base.position.set(villaBaseX, groundY + 1.7, villaBaseZ);
  base.castShadow = true; base.receiveShadow = true;
  villaGroup.add(base);

  const glassWall = new THREE.Mesh(new THREE.BoxGeometry(13.6, 2.6, 0.15), glassMat);
  glassWall.position.set(villaBaseX, groundY + 1.9, villaBaseZ + 4.5);
  villaGroup.add(glassWall);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.35, 10.4), roofMat);
  roof.position.set(villaBaseX, groundY + 3.6, villaBaseZ);
  roof.castShadow = true;
  villaGroup.add(roof);

  for (let i = -1; i <= 1; i += 2) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.8, 8), wallMat);
    col.position.set(villaBaseX + i * 6.3, groundY + 0.9, villaBaseZ + 4.3);
    villaGroup.add(col);
  }

  const poolMat = makeWaterMaterial(0.92);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(10, 5, 24, 12), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(villaBaseX, groundY + 0.05, villaBaseZ + 9.5);
  villaGroup.add(pool);

  scene.add(villaGroup);

  // ---------- Floating particles ----------
  const particleCount = isMobile ? 120 : 280;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    pPos[i * 3] = -10 + Math.random() * 60;
    pPos[i * 3 + 1] = Math.random() * 14 + 1;
    pPos[i * 3 + 2] = -30 + Math.random() * 60;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: '#ffe3b0', size: 0.12, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // ---------- Camera path ----------
  const positionCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 38, 90),
    new THREE.Vector3(-12, 26, 55),
    new THREE.Vector3(8, 14, 26),
    new THREE.Vector3(22, 7, 9),
    new THREE.Vector3(27, 5, 1),
  ]);
  const lookCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 10, -60),
    new THREE.Vector3(0, 9, -20),
    new THREE.Vector3(20, 6, -2),
    new THREE.Vector3(28, 4, -8),
    new THREE.Vector3(30, 3, -10),
  ]);

  let targetProgress = 0;
  let currentProgress = 0;

  function setProgress(p) {
    targetProgress = THREE.MathUtils.clamp(p, 0, 1);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), isMobile ? 0.35 : 0.55, 0.6, 0.82);
  composer.addPass(bloom);

  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;
    const t = clock.getElapsedTime();
    waterMatTick(seaMat, t);
    waterMatTick(poolMat, t);

    currentProgress += (targetProgress - currentProgress) * 0.06;
    const pos = positionCurve.getPointAt(currentProgress);
    const look = lookCurve.getPointAt(currentProgress);
    camera.position.set(pos.x, pos.y + Math.sin(t * 0.4) * 0.06, pos.z);
    camera.lookAt(look);

    sunSprite.material.rotation = t * 0.02;
    particles.rotation.y = t * 0.01;
    const pa = particles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      pa[i * 3 + 1] += 0.004;
      if (pa[i * 3 + 1] > 15) pa[i * 3 + 1] = 1;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    composer.render();
  }
  function waterMatTick(mat, t) { mat.uniforms.uTime.value = t; }

  animate();

  return { setProgress, resize };
}
