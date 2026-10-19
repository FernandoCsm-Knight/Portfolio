import * as THREE from 'three';
import { disposeSceneResources, precompileRenderer } from '../ocean/webglUtils';
import { makeFishOcean } from './fish';
import { makeProjectCarousel } from './projectCarousel';

/**
 * Cena de projetos sem a antiga malha de terreno. A formação de peixes usa
 * uma altura plana apenas como referência espacial para desenhar o monograma.
 */
export function createProjectMapScene(canvas, projects, { reducedMotion = false, labels = {} } = {}) {
  // O mapa contem texto rasterizado nos cards. Ele precisa de mais resolucao
  // que o oceano, mas o teto de pixels evita buffers enormes em celulares altos.
  function mapPixelRatio(width, height) {
    const pixelBudget = width < 768 ? 2500000 : 6000000;
    const maxRatio = width < 768 ? 3 : 2;
    return Math.min(
      window.devicePixelRatio || 1,
      maxRatio,
      Math.max(1, Math.sqrt(pixelBudget / Math.max(1, width * height))),
    );
  }
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    stencil: false,
    powerPreference: 'high-performance',
  });
  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(mapPixelRatio(window.innerWidth, window.innerHeight));
  renderer.setClearColor(0x061326, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160);
  camera.position.set(0, 0, 78);

  const surfaceHeightAt = () => -1.8;
  const fishOcean = makeFishOcean(surfaceHeightAt, reducedMotion);
  scene.add(fishOcean.group);
  const carousel = makeProjectCarousel(
    projects,
    surfaceHeightAt(0, 0) + 4,
    reducedMotion,
    labels,
  );
  scene.add(carousel.group);

  const pointer = { x: 0, y: 0, worldX: 0, worldY: 0, active: false };
  const pointerDirection = new THREE.Vector3();
  const pointerWorld = new THREE.Vector3();
  const pointerPlane = new THREE.Plane();
  const pointerPlaneNormal = new THREE.Vector3();
  const pointerPlaneOrigin = new THREE.Vector3();
  const pointerRay = new THREE.Ray();
  const oceanColor = new THREE.Color(0x061326);
  const voidColor = new THREE.Color(0x01040c);
  const currentClearColor = oceanColor.clone();
  let targetRotX = 0;
  let targetRotY = 0;
  let hoveredProject = null;
  let oceanVisibility = 1;
  let nativeCursorAnnounced = false;
  let last = performance.now();

  function resize(width, height) {
    renderer.setPixelRatio(mapPixelRatio(width, height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    carousel.resize(width, height);
  }

  function updatePointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    pointer.active = true;
    if (!reducedMotion && !coarsePointer) {
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

  function triggerLetterAt(clientX, clientY) {
    if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
      updatePointer(clientX, clientY);
      updatePointerWorld();
    }
    return fishOcean.containsPointer(pointer) && fishOcean.triggerExplosion(pointer);
  }

  function handleClick(clientX, clientY) {
    updatePointer(clientX, clientY);
    updatePointerWorld();
    return carousel.pick(pointer, camera, scene);
  }

  function navigateCarousel(direction) {
    return carousel.navigate(direction);
  }

  function beginCarouselDrag() {
    return carousel.beginDrag();
  }

  function dragCarousel(distance, viewportWidth) {
    return carousel.dragBy(distance, viewportWidth);
  }

  function endCarouselDrag(distance, cancelled = false) {
    return carousel.endDrag(distance, performance.now() / 1000, cancelled);
  }

  function spinCarouselWheel(delta) {
    return carousel.spinWheel(delta);
  }

  function update() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const ease = Math.min(1, dt * 3.8);
    scene.rotation.x += (targetRotX - scene.rotation.x) * ease;
    scene.rotation.y += (targetRotY - scene.rotation.y) * ease;
    if (pointer.active) updatePointerWorld();
    const fishState = fishOcean.update(now / 1000, dt, pointer, camera);
    if (fishState.exploded && !nativeCursorAnnounced) {
      nativeCursorAnnounced = true;
      window.dispatchEvent(new CustomEvent('ocean-native-cursor', { detail: { active: true } }));
    }
    const oceanTarget = fishState.consolidated ? 0 : 1;
    const oceanEase = reducedMotion ? 1 : Math.min(1, dt * 1.65);
    oceanVisibility += (oceanTarget - oceanVisibility) * oceanEase;
    currentClearColor.copy(voidColor).lerp(oceanColor, oceanVisibility);
    renderer.setClearColor(currentClearColor, 1);
    carousel.update(
      now / 1000,
      dt,
      fishState.formationProgress,
      fishState.exploded,
      camera,
      scene,
    );
    hoveredProject = carousel.pick(pointer, camera, scene);
    renderer.render(scene, camera);
    return {
      hoveredProject,
      letterHovered: fishOcean.containsPointer(pointer),
    };
  }

  function prepare() {
    return precompileRenderer(renderer, scene, camera);
  }

  function dispose() {
    if (nativeCursorAnnounced) {
      window.dispatchEvent(new CustomEvent('ocean-native-cursor', { detail: { active: false } }));
    }
    disposeSceneResources(scene);
    renderer.dispose();
  }

  return {
    resize,
    updatePointer,
    clearPointer,
    handleClick,
    triggerLetterAt,
    navigateCarousel,
    beginCarouselDrag,
    dragCarousel,
    endCarouselDrag,
    spinCarouselWheel,
    prepare,
    update,
    dispose,
  };
}
