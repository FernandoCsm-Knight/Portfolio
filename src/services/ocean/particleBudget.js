import * as THREE from 'three';

function calculateParticleBudget(base, {
  density = 48,
  minParticles = 28,
  maxParticles = Infinity,
  importance = 1,
} = {}) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < base.length; i += 3) {
    minX = Math.min(minX, base[i]);
    maxX = Math.max(maxX, base[i]);
    minY = Math.min(minY, base[i + 1]);
    maxY = Math.max(maxY, base[i + 1]);
    minZ = Math.min(minZ, base[i + 2]);
    maxZ = Math.max(maxZ, base[i + 2]);
  }

  const width = Math.max(0.01, maxX - minX);
  const height = Math.max(0.01, maxY - minY);
  const thickness = Math.max(0.01, maxZ - minZ);
  const projectedArea = width * height;
  const thinness = THREE.MathUtils.clamp(thickness / Math.max(width, height), 0, 1);
  const thicknessFactor = 0.32 + Math.sqrt(thinness) * 0.68;
  const requested = Math.round(projectedArea * density * thicknessFactor * importance);
  const sourceCount = base.length / 3;
  const count = THREE.MathUtils.clamp(
    requested,
    Math.min(minParticles, sourceCount),
    Math.min(maxParticles, sourceCount),
  );
  const brightness = Math.min(1.32, Math.sqrt(sourceCount / Math.max(1, count)));
  return { count, brightness, sourceCount };
}

export function optimizeParticleGeometry(geometry, base, options) {
  const budget = calculateParticleBudget(base, options);
  if (budget.count >= budget.sourceCount) return { geometry, base, brightness: 1 };

  const sourcePositions = geometry.attributes.position.array;
  const sourceColors = geometry.attributes.color?.array;
  const positions = new Float32Array(budget.count * 3);
  const optimizedBase = new Float32Array(budget.count * 3);
  const colors = sourceColors ? new Float32Array(budget.count * 3) : null;

  for (let i = 0; i < budget.count; i++) {
    const sourceIndex = Math.floor((i * budget.sourceCount) / budget.count) * 3;
    const targetIndex = i * 3;
    positions[targetIndex] = sourcePositions[sourceIndex];
    positions[targetIndex + 1] = sourcePositions[sourceIndex + 1];
    positions[targetIndex + 2] = sourcePositions[sourceIndex + 2];
    optimizedBase[targetIndex] = base[sourceIndex];
    optimizedBase[targetIndex + 1] = base[sourceIndex + 1];
    optimizedBase[targetIndex + 2] = base[sourceIndex + 2];
    if (colors) {
      colors[targetIndex] = sourceColors[sourceIndex];
      colors[targetIndex + 1] = sourceColors[sourceIndex + 1];
      colors[targetIndex + 2] = sourceColors[sourceIndex + 2];
    }
  }

  const optimizedGeometry = new THREE.BufferGeometry();
  optimizedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (colors) optimizedGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.dispose();
  return { geometry: optimizedGeometry, base: optimizedBase, brightness: budget.brightness };
}
