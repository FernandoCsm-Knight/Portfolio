import * as THREE from 'three';
import { deepChannelCenterX } from './utils';

export function makeProjectTerrain(projects) {
  const width = 220;
  const height = 140;
  const geometry = new THREE.PlaneGeometry(width, height, 180, 112);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const trenchColor = new THREE.Color('#02171f');
  const deepColor = new THREE.Color('#07343c');
  const siltColor = new THREE.Color('#17605f');
  const sandColor = new THREE.Color('#7d7456');
  const vegetationColor = new THREE.Color('#287567');
  const color = new THREE.Color();
  const terrainOffsetZ = -0.48;

  /* A batimetria não depende dos projetos: uma dorsal sinuosa, um canal
     erodido e ruído em várias escalas formam um único leito contínuo. */
  function rawSeafloorHeight(x, y) {
    const continentalFold =
      Math.sin(x * 0.032 + Math.sin(y * 0.027) * 1.7) * 0.72 +
      Math.cos(y * 0.048 - x * 0.013) * 0.48;
    const ridgeCenter = 4 + Math.sin(x * 0.047) * 9 + Math.sin(x * 0.018 + 1.4) * 5;
    const ridgeDistance = (y - ridgeCenter) / 13;
    const ridge = Math.exp(-(ridgeDistance * ridgeDistance)) * 1.5;
    const trenchAxis = ((x - deepChannelCenterX(y)) * 0.72) / 8.5;
    const trench = -Math.exp(-(trenchAxis * trenchAxis)) * 1.75;
    const erodedChannels =
      Math.sin(x * 0.105 + y * 0.052) * Math.cos(y * 0.083 - x * 0.019) * 0.3;
    const sedimentRipples =
      Math.sin(x * 0.31 + Math.sin(y * 0.075) * 1.8) * 0.12 +
      Math.cos(y * 0.27 - x * 0.045) * 0.08;
    const edgeDepth = THREE.MathUtils.smootherstep(Math.hypot(x / 110, y / 70), 0.58, 1) * 1.35;
    return -1.55 + continentalFold + ridge + trench + erodedChannels + sedimentRipples - edgeDepth;
  }

  const projectBeds = projects.map((project) => ({
    x: project.map.x,
    y: project.map.y,
    height: rawSeafloorHeight(project.map.x, project.map.y),
  }));

  function seafloorHeight(x, y) {
    let surface = rawSeafloorHeight(x, y);
    projectBeds.forEach((bed) => {
      const distance = Math.hypot(x - bed.x, y - bed.y);
      const clearing = 1 - THREE.MathUtils.smootherstep(distance, 2.6, 8.5);
      /* Pequenas clareiras sedimentares acomodam os recifes sem criar
         montes artificiais ou quatro silhuetas idênticas. */
      surface = THREE.MathUtils.lerp(surface, bed.height - 0.08, clearing * 0.78);
    });
    return surface;
  }

  function biomeAt(x, y) {
    const surface = rawSeafloorHeight(x, y);
    const trenchAxis = ((x - deepChannelCenterX(y)) * 0.72) / 8.5;
    const trenchStrength = Math.exp(-(trenchAxis * trenchAxis));
    if (surface > 0.45) return 'reef';
    if (surface < -2.35 && y < 0) return 'abyss';
    if (trenchStrength > 0.62) return 'canyon';
    return 'shelf';
  }

  function vegetationAt(x, y) {
    return THREE.MathUtils.smootherstep(rawSeafloorHeight(x, y), 0.12, 1.08);
  }

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = seafloorHeight(x, y);
    positions.setZ(i, z);

    const colorHeight = THREE.MathUtils.clamp((z + 4.1) / 5.1, 0, 1);
    if (colorHeight < 0.34) {
      color.copy(trenchColor).lerp(deepColor, colorHeight / 0.34);
    } else if (colorHeight < 0.76) {
      color.copy(deepColor).lerp(siltColor, (colorHeight - 0.34) / 0.42);
    } else {
      color.copy(siltColor).lerp(sandColor, (colorHeight - 0.76) / 0.24);
    }
    const sedimentVariation = 0.9 + Math.sin(x * 0.53 + y * 0.21) * 0.035 + Math.cos(y * 0.61) * 0.025;
    color.multiplyScalar(sedimentVariation);
    color.lerp(vegetationColor, vegetationAt(x, y) * 0.3);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
    side: THREE.DoubleSide,
    depthWrite: true,
    flatShading: false,
  }));
  terrain.position.z = terrainOffsetZ;
  terrain.userData.surfaceHeightAt = (x, y) => seafloorHeight(x, y) + terrainOffsetZ;
  terrain.userData.biomeAt = biomeAt;
  terrain.userData.vegetationAt = vegetationAt;
  return terrain;
}
