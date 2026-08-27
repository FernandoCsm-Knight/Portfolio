import * as THREE from 'three';

const LETTER_READY_PROGRESS = 0.72;

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function trimLine(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) return text;
  let shortened = text;
  while (shortened.length > 1 && context.measureText(`${shortened}…`).width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened.trim()}…`;
}

function wrapLines(context, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  });
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    visible[maxLines - 1] = `${trimLine(context, visible[maxLines - 1], maxWidth - 24)}…`
      .replace('……', '…');
  }
  return visible;
}

function makeCardTexture(project) {
  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 990;
  const context = canvas.getContext('2d');
  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, 'rgba(32,35,38,.88)');
  background.addColorStop(0.54, 'rgba(12,14,16,.82)');
  background.addColorStop(1, 'rgba(3,4,5,.9)');

  roundedRect(context, 10, 10, 680, 970, 30);
  context.fillStyle = background;
  context.fill();

  context.save();
  roundedRect(context, 10, 10, 680, 970, 30);
  context.clip();
  const sheen = context.createRadialGradient(110, 70, 0, 110, 70, 430);
  sheen.addColorStop(0, 'rgba(255,255,255,.13)');
  sheen.addColorStop(0.45, 'rgba(170,190,196,.035)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = sheen;
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let grain = 0; grain < 420; grain++) {
    const x = (Math.sin(grain * 91.17) * 0.5 + 0.5) * canvas.width;
    const y = (Math.sin(grain * 47.63 + 2.1) * 0.5 + 0.5) * canvas.height;
    context.fillStyle = `rgba(255,255,255,${0.008 + (grain % 5) * 0.002})`;
    context.fillRect(x, y, 1.4, 1.4);
  }
  context.restore();

  context.font = "500 22px 'IBM Plex Mono', monospace";
  context.letterSpacing = '3px';
  context.fillStyle = '#8d9296';
  context.fillText(`PROJETO  ${project.num}`, 52, 70);

  /* Área reservada para uma futura imagem de capa. O preenchimento neutro
     preserva o aspecto de vidro enquanto o projeto ainda não possui mídia. */
  const media = context.createLinearGradient(52, 108, 648, 382);
  media.addColorStop(0, 'rgba(255,255,255,.065)');
  media.addColorStop(1, 'rgba(255,255,255,.018)');
  roundedRect(context, 52, 108, 596, 274, 18);
  context.fillStyle = media;
  context.fill();
  context.font = "500 16px 'IBM Plex Mono', monospace";
  context.letterSpacing = '2px';
  context.fillStyle = 'rgba(210,214,216,.42)';
  context.fillText('IMAGEM DO PROJETO', 76, 350);

  context.font = "600 52px 'Cormorant Garamond', serif";
  context.letterSpacing = '0px';
  context.fillStyle = '#f1f1ee';
  wrapLines(context, project.title, 596, 2).forEach((line, index) => {
    context.fillText(line, 52, 452 + index * 56);
  });

  context.fillStyle = '#a3a6a8';
  context.font = "400 19px 'IBM Plex Mono', monospace";
  wrapLines(context, project.description, 596, 7).forEach((line, index) => {
    context.fillText(line, 52, 590 + index * 31);
  });

  context.font = "500 18px 'IBM Plex Mono', monospace";
  context.fillStyle = '#707477';
  const tags = trimLine(context, project.tags.slice(0, 3).join('  ·  '), 596);
  context.fillText(tags, 52, 838);

  context.fillStyle = '#d9dad7';
  context.font = "500 20px 'IBM Plex Mono', monospace";
  context.fillText('ABRIR PROJETO  ↗', 52, 928);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export function makeProjectCarousel(projects, centerZ, reducedMotion = false) {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 7;

  /* Proporção vertical preservada, mas cerca de 18% menor que a versão
     anterior para manter água visível ao redor do card frontal. */
  const cardGeometry = new THREE.PlaneGeometry(19.4, 27.5);
  const cards = projects.map((project) => {
    const material = new THREE.MeshBasicMaterial({
      map: makeCardTexture(project),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const card = new THREE.Mesh(cardGeometry, material);
    card.userData.project = project;
    card.userData.hoverAmount = 0;
    card.renderOrder = 8;
    group.add(card);
    return card;
  });

  const raycaster = new THREE.Raycaster();
  /* Ângulo zero coloca o primeiro card em x=0 e no ponto frontal do anel. */
  let angleOffset = 0;
  let transitionFrom = angleOffset;
  let transitionTarget = angleOffset;
  let transitionStart = 0;
  let transitioning = false;
  let lastAutomaticStep = 0;
  let automaticSteps = 0;
  let automaticEnabled = true;
  let dragging = false;
  let dragStartAngle = angleOffset;
  let reveal = 0;
  let unlocked = false;
  let hoveredProject = null;
  let viewportScale = 1;

  function resize(width, height) {
    if (width > 760) {
      viewportScale = 1;
      return;
    }
    /* O card frontal ocupa cerca de 43,4% da altura em largura. Esta razão
       transforma o limite de 82vw em uma escala de mundo, usando as duas
       dimensões da viewport para celulares baixos e altos. */
    viewportScale = THREE.MathUtils.clamp(
      (width * 0.82) / Math.max(1, height * 0.434),
      0.58,
      0.96,
    );
  }

  function navigate(direction, time = performance.now() / 1000, userInitiated = true) {
    if (!unlocked || transitioning) return false;
    transitionFrom = angleOffset;
    transitionTarget = angleOffset - Math.sign(direction || 1) * ((Math.PI * 2) / cards.length);
    transitionStart = time;
    transitioning = true;
    if (userInitiated) automaticEnabled = false;
    return true;
  }

  function beginDrag() {
    if (!unlocked || transitioning) return false;
    dragging = true;
    dragStartAngle = angleOffset;
    return true;
  }

  function dragBy(distance, viewportWidth) {
    if (!dragging) return false;
    angleOffset = dragStartAngle + (distance / Math.max(1, viewportWidth)) * Math.PI * 1.2;
    return true;
  }

  function endDrag(distance, time = performance.now() / 1000) {
    if (!dragging) return false;
    dragging = false;
    transitionFrom = angleOffset;
    const moved = Math.abs(distance) >= 34;
    transitionTarget = moved
      ? dragStartAngle + Math.sign(distance) * ((Math.PI * 2) / cards.length)
      : dragStartAngle;
    transitionStart = time;
    transitioning = true;
    if (moved) automaticEnabled = false;
    return moved;
  }

  function update(time, dt, formationProgress, activated, pointer, camera, scene) {
    if (!unlocked && activated && formationProgress >= LETTER_READY_PROGRESS) {
      unlocked = true;
      lastAutomaticStep = time;
    }
    const targetReveal = unlocked ? 1 : 0;
    const revealEase = reducedMotion ? 1 : Math.min(1, dt * 2.1);
    reveal += (targetReveal - reveal) * revealEase;
    group.visible = reveal > 0.002;
    if (!group.visible) return;

    if (hoveredProject) lastAutomaticStep = time;
    if (
      automaticEnabled
      && automaticSteps < cards.length
      && !hoveredProject
      && time - lastAutomaticStep >= 5
    ) {
      if (navigate(1, time, false)) {
        automaticSteps++;
        lastAutomaticStep = time;
      }
    }

    if (transitioning) {
      const duration = reducedMotion ? 0.01 : 0.75;
      const progress = THREE.MathUtils.clamp((time - transitionStart) / duration, 0, 1);
      const eased = THREE.MathUtils.smootherstep(progress, 0, 1);
      angleOffset = THREE.MathUtils.lerp(transitionFrom, transitionTarget, eased);
      if (progress >= 1) {
        angleOffset = transitionTarget;
        transitioning = false;
      }
    }

    cards.forEach((card, index) => {
      const angle = angleOffset + (index / cards.length) * Math.PI * 2;
      const depth = (Math.cos(angle) + 1) * 0.5;
      const hoverTarget = card.userData.project === hoveredProject ? 1 : 0;
      const hoverEase = reducedMotion ? 1 : Math.min(1, dt * 8.5);
      card.userData.hoverAmount += (hoverTarget - card.userData.hoverAmount) * hoverEase;
      const hoverAmount = card.userData.hoverAmount;
      card.position.set(
        Math.sin(angle) * 38,
        Math.cos(angle * 2 + time * 0.16) * 1.15 + hoverAmount * 0.62,
        centerZ + Math.cos(angle) * 14,
      );
      const scale = reveal
        * THREE.MathUtils.lerp(0.72, 1.06, depth)
        * viewportScale
        * (1 + hoverAmount * 0.085);
      card.scale.setScalar(scale);
      card.material.opacity = reveal * THREE.MathUtils.lerp(0.38, 1, depth);
      card.material.color.setScalar(1 + hoverAmount * 0.1);
      if (hoverTarget) card.material.opacity = reveal;
    });

    /* Atualiza a matriz do pai antes do lookAt para que cada card continue
       legível enquanto percorre a profundidade do anel. */
    scene.updateMatrixWorld(true);
    cards.forEach((card) => {
      card.lookAt(camera.position);
      card.rotateZ(Math.sin(time * 2.1) * 0.014 * card.userData.hoverAmount);
    });
  }

  function pick(pointer, camera, scene) {
    if (!unlocked || reveal < 0.72 || !pointer?.active) {
      hoveredProject = null;
      return null;
    }
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(cards, false)[0];
    hoveredProject = hit?.object.userData.project ?? null;
    return hoveredProject;
  }

  function isVisible() {
    return unlocked && reveal >= 0.72;
  }

  return { group, resize, update, pick, navigate, beginDrag, dragBy, endDrag, isVisible };
}
