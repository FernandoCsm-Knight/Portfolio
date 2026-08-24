import * as THREE from 'three';

export function makeMarker(project, i) {
  const group = new THREE.Group();
  const ringRadius = 1.55;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(ringRadius, ringRadius + 0.2, 36),
    new THREE.MeshBasicMaterial({ color: 0x2a1b0f, transparent: true, opacity: 0.58, depthWrite: false }),
  );
  group.add(ring);

  const ping = new THREE.Mesh(
    new THREE.RingGeometry(ringRadius + 0.35, ringRadius + 0.47, 42),
    new THREE.MeshBasicMaterial({ color: 0x174d4a, transparent: true, opacity: 0.0, depthWrite: false }),
  );
  group.add(ping);

  group.position.set(project.map.x, project.map.y, 1.4);
  group.userData = { project, index: i, ring, ping };
  return group;
}
