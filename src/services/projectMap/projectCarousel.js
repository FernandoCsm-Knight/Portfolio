import * as THREE from 'three';
import { createCarouselMotion } from '../carouselMotion';

const LETTER_READY_PROGRESS = 0.72;

/* Tamanho de desenho da textura do card, em pixels lógicos — todo o resto da
   função de desenho (MEDIA_RECT, posições de texto etc.) usa números fixos
   nesse espaço. `RESOLUCAO_TEXTURA` amplia só a densidade real de pixels do
   canvas (via `context.scale`), sem exigir recalcular nenhuma dessas
   coordenadas: o desenho continua "pensando" em 700×990, só que amostrado em
   mais pixels — daí o texto e as bordas arredondadas saírem nítidos de perto. */
const LARGURA_TEXTURA = 700;
const ALTURA_TEXTURA = 990;
const RESOLUCAO_TEXTURA = 2;

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

const MEDIA_RECT = { x: 52, y: 56, width: 596, height: 300, radius: 18 };

/* Desenha a capa do projeto ocupando a área reservada, recortada nas mesmas
   bordas arredondadas do cartão e com "cover fit" (preenche sem distorcer,
   cortando o excesso em vez de espremer a imagem). */
function drawCoverImage(context, image) {
  const { x, y, width, height, radius } = MEDIA_RECT;
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.save();
  context.imageSmoothingQuality = 'high';
  roundedRect(context, x, y, width, height, radius);
  context.clip();
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  context.restore();
}

/* Preenchimento neutro usado enquanto o projeto não tem capa (ou antes dela
   terminar de carregar) — mantém o aspecto de vidro do cartão. */
function drawMediaPlaceholder(context, labels) {
  const { x, y, width, height, radius } = MEDIA_RECT;
  const media = context.createLinearGradient(x, y, x + width, y + height);
  media.addColorStop(0, 'rgba(255,255,255,.065)');
  media.addColorStop(1, 'rgba(255,255,255,.018)');
  roundedRect(context, x, y, width, height, radius);
  context.fillStyle = media;
  context.fill();
  context.font = "500 20px Roboto, sans-serif";
  context.letterSpacing = '2px';
  context.fillStyle = 'rgba(210,214,216,.42)';
  context.fillText(labels.image ?? 'PROJECT IMAGE', x + 24, y + height - 32);
}

function makeCardTexture(project, labels) {
  const canvas = document.createElement('canvas');
  canvas.width = LARGURA_TEXTURA * RESOLUCAO_TEXTURA;
  canvas.height = ALTURA_TEXTURA * RESOLUCAO_TEXTURA;
  const context = canvas.getContext('2d');
  /* Tudo abaixo desenha em coordenadas de 700×990 — é este `scale` que as
     converte para os pixels reais, mais densos, do canvas. */
  context.scale(RESOLUCAO_TEXTURA, RESOLUCAO_TEXTURA);
  const background = context.createLinearGradient(0, 0, LARGURA_TEXTURA, ALTURA_TEXTURA);
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
  context.fillRect(0, 0, LARGURA_TEXTURA, ALTURA_TEXTURA);
  for (let grain = 0; grain < 420; grain++) {
    const x = (Math.sin(grain * 91.17) * 0.5 + 0.5) * LARGURA_TEXTURA;
    const y = (Math.sin(grain * 47.63 + 2.1) * 0.5 + 0.5) * ALTURA_TEXTURA;
    context.fillStyle = `rgba(255,255,255,${0.008 + (grain % 5) * 0.002})`;
    context.fillRect(x, y, 1.4, 1.4);
  }
  context.restore();

  drawMediaPlaceholder(context, labels);

  context.font = "600 56px 'Playfair Display', Georgia, serif";
  context.letterSpacing = '0px';
  context.fillStyle = '#f1f1ee';
  wrapLines(context, project.title, 596, 2).forEach((line, index) => {
    context.fillText(line, 52, 426 + index * 60);
  });

  context.fillStyle = '#a3a6a8';
  context.font = "400 26px Roboto, sans-serif";
  wrapLines(context, project.description, 596, 7).forEach((line, index) => {
    context.fillText(line, 52, 566 + index * 33);
  });

  context.font = "500 22px Roboto, sans-serif";
  context.fillStyle = '#707477';
  const tags = trimLine(context, project.tags.slice(0, 3).join('  ·  '), 596);
  context.fillText(tags, 52, 822);

  context.fillStyle = '#d9dad7';
  context.font = "500 24px Roboto, sans-serif";
  context.fillText(`${labels.open ?? 'OPEN PROJECT'}  ↗`, 52, 928);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Os mipmaps pre-reduzem o texto do card: na maioria das telas de PC a
  // textura escolhida tem metade ou um quarto da resolucao original, e as
  // letras chegam borradas ao canvas WebGL. Amostrar a textura original uma
  // unica vez preserva os contornos finos da tipografia.
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  if (project.imageUrl) {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      drawCoverImage(context, image);
      texture.needsUpdate = true;
    };
    image.src = project.imageUrl;
  }

  return texture;
}

export function makeProjectCarousel(projects, centerZ, reducedMotion = false, labels = {}) {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 7;

  /* Proporção vertical preservada. Já foi 18% menor que a versão anterior
     dela mesma para manter água visível ao redor do card frontal; este
     aumento de ~8% é bem mais discreto e ainda deixa a margem d'água. */
  const cardGeometry = new THREE.PlaneGeometry(21, 29.7);
  const cards = projects.map((project) => {
    const material = new THREE.MeshBasicMaterial({
      map: makeCardTexture(project, labels),
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
  const motion = createCarouselMotion(cards.length, reducedMotion);
  let lastAutomaticStep = 0;
  let automaticSteps = 0;
  let automaticEnabled = true;
  let reveal = 0;
  let unlocked = false;
  let hoveredProject = null;
  let viewportScale = 1;
  let mobileViewport = false;

  function resize(width, height) {
    mobileViewport = width <= 760;
    if (!mobileViewport) {
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
    if (!unlocked || !motion.navigate(direction, time)) return false;
    if (userInitiated) automaticEnabled = false;
    return true;
  }

  function beginDrag() {
    if (!unlocked || !motion.beginDrag()) return false;
    automaticEnabled = false;
    return true;
  }

  function dragBy(distance, viewportWidth, time = performance.now() / 1000) {
    /* Um mesmo deslocamento em pixels representa uma fração muito maior da
       tela estreita. Dobrar a largura efetiva reduz giro e impulso do flick,
       mantendo o carrossel livre para percorrer vários cards. */
    const dragWidth = viewportWidth <= 760 ? viewportWidth * 1.8 : viewportWidth;
    return motion.dragBy(distance, dragWidth, time);
  }

  function endDrag(distance, time = performance.now() / 1000, cancelled = false) {
    return motion.endDrag(distance, time, cancelled);
  }

  function spinWheel(delta, time = performance.now() / 1000) {
    if (!unlocked) return false;
    const handled = motion.spinWheel(delta, time);
    automaticEnabled = false;
    return handled;
  }

  function update(time, dt, formationProgress, activated, camera, scene) {
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

    const angleOffset = motion.update(time, dt);

    cards.forEach((card, index) => {
      const angle = angleOffset + (index / cards.length) * Math.PI * 2;
      const depth = (Math.cos(angle) + 1) * 0.5;
      const hoverTarget = !mobileViewport && card.userData.project === hoveredProject ? 1 : 0;
      const hoverEase = reducedMotion ? 1 : Math.min(1, dt * 8.5);
      card.userData.hoverAmount += (hoverTarget - card.userData.hoverAmount) * hoverEase;
      const hoverAmount = card.userData.hoverAmount;
      card.position.set(
        Math.sin(angle) * 38,
        mobileViewport ? 0 : Math.cos(angle * 2 + time * 0.16) * 1.15 + hoverAmount * 0.62,
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

  return { group, resize, update, pick, navigate, beginDrag, dragBy, endDrag, spinWheel };
}
