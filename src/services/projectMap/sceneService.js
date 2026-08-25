import * as THREE from 'three';
import { disposeSceneResources, getWebGLPixelRatio, precompileRenderer } from '../ocean/webglUtils';
import { makeFishOcean } from './fish';
import { makeProjectTerrain } from './terrain';

/**
 * Base limpa do mapa de projetos. A cena contém apenas a malha sólida do
 * leito oceânico e suas luzes; criaturas, marcadores, habitats e todas as
 * camadas de partículas ficam de fora para a próxima versão poder nascer sem
 * resíduos da composição anterior.
 */
export function createProjectMapScene(canvas, projects, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    stencil: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(getWebGLPixelRatio(window.innerWidth));
  renderer.setClearColor(0x061326, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160);
  camera.position.set(0, 0, 78);

  scene.add(new THREE.HemisphereLight(0x8fa9cb, 0x020716, 0.86));
  const terrainLight = new THREE.DirectionalLight(0xc4d3df, 1.34);
  terrainLight.position.set(-38, 20, 18);
  scene.add(terrainLight);

  const projectTerrain = makeProjectTerrain(projects);
  scene.add(projectTerrain);
  const fishOcean = makeFishOcean(projectTerrain.userData.surfaceHeightAt, reducedMotion);
  scene.add(fishOcean.group);

  const pointer = { x: 0, y: 0, worldX: 0, worldY: 0, active: false };
  const pointerDirection = new THREE.Vector3();
  const pointerWorld = new THREE.Vector3();
  const pointerPlane = new THREE.Plane();
  const pointerPlaneNormal = new THREE.Vector3();
  const pointerPlaneOrigin = new THREE.Vector3();
  const pointerRay = new THREE.Ray();
  let targetRotX = 0;
  let targetRotY = 0;
  let last = performance.now();

  function resize(width, height) {
    renderer.setPixelRatio(getWebGLPixelRatio(width));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function updatePointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    pointer.active = true;
    if (!reducedMotion) {
      targetRotY = pointer.x * 0.08;
      targetRotX = -pointer.y * 0.05;
    }
  }

  function clearPointer() {
    pointer.active = false;
    targetRotX = 0;
    targetRotY = 0;
  }

  function updatePointerWorld() {
    scene.updateMatrixWorld(true);
    pointerDirection.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
    pointerPlaneNormal.set(0, 0, 1).transformDirection(scene.matrixWorld);
    pointerPlaneOrigin.set(0, 0, 0).applyMatrix4(scene.matrixWorld);
    pointerPlane.setFromNormalAndCoplanarPoint(pointerPlaneNormal, pointerPlaneOrigin);
    pointerRay.set(camera.position, pointerDirection);
    if (!pointerRay.intersectPlane(pointerPlane, pointerWorld)) return;
    scene.worldToLocal(pointerWorld);
    pointer.worldX = pointerWorld.x;
    pointer.worldY = pointerWorld.y;
  }

  function handleClick() {
    return null;
  }

  function update() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const ease = Math.min(1, dt * 3.8);
    scene.rotation.x += (targetRotX - scene.rotation.x) * ease;
    scene.rotation.y += (targetRotY - scene.rotation.y) * ease;
    if (pointer.active) updatePointerWorld();
    fishOcean.update(now / 1000, dt, pointer);
    renderer.render(scene, camera);
    return { hoveredProject: null };
  }

  function prepare() {
    return precompileRenderer(renderer, scene, camera);
  }

  function dispose() {
    disposeSceneResources(scene);
    renderer.dispose();
  }

  return { resize, updatePointer, clearPointer, handleClick, prepare, update, dispose };
}
