import * as THREE from 'three';
import { disposeSceneResources, getWebGLPixelRatio, precompileRenderer } from '../ocean/webglUtils';
import { makeFishOcean } from './fish';
import { makeProjectCarousel } from './projectCarousel';

/**
 * Cena de projetos sem a antiga malha de terreno. A formação de peixes usa
 * uma altura plana apenas como referência espacial para desenhar o monograma.
 */
export function createProjectMapScene(canvas, projects, { reducedMotion = false, labels = {} } = {}) {
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
    renderer.setPixelRatio(getWebGLPixelRatio(width));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    carousel.resize(width, height);
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

  function handleClick(clientX, clientY) {
    if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
      updatePointer(clientX, clientY);
      updatePointerWorld();
    }
    if (fishOcean.containsPointer(pointer)) {
      fishOcean.triggerExplosion(pointer);
      return null;
    }
    return hoveredProject;
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

  function endCarouselDrag(distance) {
    return carousel.endDrag(distance);
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
      pointer,
      camera,
      scene,
    );
    hoveredProject = carousel.pick(pointer, camera, scene);
    renderer.render(scene, camera);
    return {
      hoveredProject,
      letterHovered: fishOcean.containsPointer(pointer),
      carouselVisible: carousel.isVisible(),
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
    navigateCarousel,
    beginCarouselDrag,
    dragCarousel,
    endCarouselDrag,
    prepare,
    update,
    dispose,
  };
}
