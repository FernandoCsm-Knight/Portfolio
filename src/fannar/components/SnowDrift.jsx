import { useEffect, useRef } from 'react';

/* Fundo animado: montes de neve (fannar, em islandês) com o vento arrancando
   neve da crista e alguns flocos soprando pelo céu. Só decoração — sem
   interação, aria-hidden, e parado quando:
   - a seção sai da tela (IntersectionObserver);
   - a aba fica oculta (o rAF já para sozinho);
   - o usuário pede menos movimento (desenha um quadro estático).

   variant "light": céu gelo, montes brancos (hero).
   variant "dark":  sobre o azul da marca, montes translúcidos (chamada final). */

const PALETTES = {
  light: {
    layers: [
      { top: '#d3dbe7', bottom: '#dde3ec', edge: 'rgba(94,129,172,0.16)' },
      { top: '#e5e9f0', bottom: '#eceff4', edge: 'rgba(94,129,172,0.12)' },
      { top: '#ffffff', bottom: '#ffffff', edge: 'rgba(255,255,255,1)' },
    ],
    flake: [129, 161, 193], /* Frost #81A1C1 */
    flakeAlpha: [0.18, 0.42],
    spin: [255, 255, 255],
    spinAlpha: 0.9,
  },
  dark: {
    layers: [
      /* Frost #88C0D0 ao fundo, Snow Storm na frente */
      { top: 'rgba(136,192,208,0.12)', bottom: 'rgba(136,192,208,0.06)', edge: 'rgba(136,192,208,0.22)' },
      { top: 'rgba(216,222,233,0.12)', bottom: 'rgba(216,222,233,0.08)', edge: 'rgba(216,222,233,0.22)' },
      { top: 'rgba(236,239,244,0.18)', bottom: 'rgba(236,239,244,0.13)', edge: 'rgba(236,239,244,0.38)' },
    ],
    flake: [236, 239, 244],
    flakeAlpha: [0.25, 0.7],
    spin: [236, 239, 244],
    spinAlpha: 0.75,
  },
};

/* Camadas de trás para a frente: base e amplitude (fração da faixa de
   neve), escala horizontal (px por radiano) e fase. */
const LAYERS = [
  { base: 0.62, amp: 0.3, scale: 210, phase: 0.8, drift: 0.004 },
  { base: 0.38, amp: 0.3, scale: 160, phase: 2.6, drift: 0.007 },
  { base: 0.12, amp: 0.26, scale: 125, phase: 4.1, drift: 0.011 },
];

/* Perfil de duna em [0,1], assimétrico: rampa suave a barlavento e queda
   curta a sotavento — o vento sopra da esquerda para a direita. */
function profile(u) {
  const s = u + 0.42 * Math.sin(u);
  const v = 0.62 * Math.sin(s) + 0.26 * Math.sin(2.1 * s + 1.3) + 0.12 * Math.sin(4.3 * s + 0.4);
  return 0.5 + 0.5 * v;
}

/* Rajadas: vento base com duas oscilações lentas, nunca negativo. */
function windAt(t) {
  return Math.max(0.15, 0.62 + 0.3 * Math.sin(t * 0.23) + 0.18 * Math.sin(t * 0.71 + 1.1));
}

const rand = (a, b) => a + Math.random() * (b - a);

export default function SnowDrift({ variant = 'light', driftRatio = 0.36, maxDrift = 240, flakes = true }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    const pal = PALETTES[variant] ?? PALETTES.light;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let band = 0;
    let sky = [];
    let spin = [];
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let t = Math.random() * 100;

    const crest = (layer, x) => h - band * (layer.base + layer.amp * profile(x / layer.scale + layer.phase + t * layer.drift));

    function seedSky() {
      const count = flakes ? Math.round(Math.min(90, w / 16)) : 0;
      sky = Array.from({ length: count }, () => ({
        x: rand(0, w),
        y: rand(0, h - band * 0.4),
        r: rand(0.6, 1.9),
        a: rand(...pal.flakeAlpha),
        speed: rand(0.55, 1.25),
        fall: rand(6, 16),
        wobble: rand(0, Math.PI * 2),
      }));
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      band = Math.min(maxDrift, h * driftRatio);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedSky();
      spin = [];
    }

    function drawLayer(i) {
      const layer = LAYERS[i];
      const colors = pal.layers[i];
      const grad = ctx.createLinearGradient(0, h - band, 0, h);
      grad.addColorStop(0, colors.top);
      grad.addColorStop(1, colors.bottom);
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, crest(layer, x));
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      /* aresta da crista: brilho na frente, sombra fria atrás */
      ctx.beginPath();
      for (let x = 0; x <= w + 8; x += 8) {
        const y = crest(layer, x);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = colors.edge;
      ctx.lineWidth = i === LAYERS.length - 1 ? 1.5 : 1;
      ctx.stroke();
    }

    function emitSpindrift(dt, wind) {
      /* Mais vento, mais neve arrancada — cresce com o quadrado da rajada. */
      const rate = (w / 1000) * 70 * wind * wind;
      let n = rate * dt;
      while (n > 0) {
        if (Math.random() < n) {
          const layerIndex = Math.random() < 0.7 ? 2 : 1;
          const layer = LAYERS[layerIndex];
          const x = rand(-40, w);
          const y = crest(layer, x);
          const height = (h - y) / band; /* 0 no vale, ~1 na crista */
          if (Math.random() < height ** 3 * 1.6) {
            spin.push({
              x, y,
              vx: rand(60, 140) * wind,
              vy: rand(-28, -6),
              life: 0,
              ttl: rand(0.9, 2.2),
              r: rand(0.5, 1.5),
              back: layerIndex === 1,
            });
          }
        }
        n -= 1;
      }
      if (spin.length > 600) spin.splice(0, spin.length - 600);
    }

    function drawSky(dt, wind) {
      const [r, g, b] = pal.flake;
      for (const f of sky) {
        f.wobble += dt * 1.3;
        f.x += (wind * 46 * f.speed + Math.sin(f.wobble) * 6) * dt;
        f.y += (f.fall + Math.cos(f.wobble * 0.7) * 4) * dt;
        if (f.x > w + 10) { f.x = -10; f.y = rand(0, h - band * 0.5); }
        if (f.y > h - band * 0.3) { f.y = -6; f.x = rand(-20, w); }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${f.a})`;
        ctx.fill();
      }
    }

    function updateSpindrift(dt) {
      for (const p of spin) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 18 * dt; /* gravidade leve: a neve sobe e volta a assentar */
        p.vx *= 1 - 0.25 * dt;
      }
      spin = spin.filter((p) => p.life < p.ttl && p.x < w + 40);
    }

    function drawSpindrift(back) {
      const [r, g, b] = pal.spin;
      ctx.lineCap = 'round';
      for (const p of spin) {
        if (p.back !== back) continue;
        const alpha = pal.spinAlpha * Math.sin(Math.PI * (p.life / p.ttl)) * (back ? 0.6 : 1);
        /* traço curto na direção do movimento: lê como vento, não como bolinha */
        const len = Math.min(14, p.vx * 0.06);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = p.r;
        ctx.beginPath();
        ctx.moveTo(p.x - len, p.y - p.vy * 0.03);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const wind = windAt(t);
      ctx.clearRect(0, 0, w, h);
      drawSky(dt, wind);
      emitSpindrift(dt, wind);
      updateSpindrift(dt);
      /* montes de trás, a neve que sai deles, o monte da frente por cima dela
         e, por fim, a neve arrancada da crista da frente */
      drawLayer(0);
      drawLayer(1);
      drawSpindrift(true);
      drawLayer(2);
      drawSpindrift(false);
      if (visible) raf = requestAnimationFrame(frame);
    }

    function drawStatic() {
      ctx.clearRect(0, 0, w, h);
      drawSky(0, 0);
      LAYERS.forEach((_, i) => drawLayer(i));
    }

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) drawStatic();
    });
    ro.observe(canvas);

    if (reduced) {
      drawStatic();
      return () => ro.disconnect();
    }

    const io = new IntersectionObserver(([entry]) => {
      const now = entry.isIntersecting;
      if (now && !visible) {
        visible = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!now) {
        visible = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [variant, driftRatio, maxDrift, flakes]);

  return <canvas ref={ref} className="snowdrift" aria-hidden="true" />;
}
