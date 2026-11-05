/* Borda inferior das seções em gelo: o fundo da seção termina num monte de
   neve branco que já é o fundo da seção seguinte. Duas camadas estáticas e
   alguns fios de neve que o vento leva pela crista — só CSS, sem JS. */
const STREAKS = [
  { left: '8%', bottom: 54, delay: '0s', dur: '7s' },
  { left: '22%', bottom: 40, delay: '2.6s', dur: '8.5s' },
  { left: '41%', bottom: 58, delay: '4.1s', dur: '6.8s' },
  { left: '57%', bottom: 46, delay: '1.2s', dur: '9s' },
  { left: '73%', bottom: 60, delay: '5.3s', dur: '7.6s' },
  { left: '86%', bottom: 44, delay: '3.4s', dur: '8.2s' },
];

export default function DriftEdge() {
  return (
    <div className="drift-edge" aria-hidden="true">
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none">
        <path
          className="drift-edge-back"
          d="M0 58 C 120 30, 230 26, 330 44 C 420 60, 470 36, 600 30 C 760 22, 820 56, 960 50 C 1080 44, 1150 20, 1290 28 C 1370 32, 1410 44, 1440 48 L1440 90 L0 90 Z"
        />
        <path
          className="drift-edge-front"
          d="M0 72 C 150 54, 260 50, 380 62 C 470 71, 520 58, 650 52 C 800 46, 880 70, 1020 66 C 1130 63, 1210 48, 1330 52 C 1390 54, 1420 60, 1440 62 L1440 90 L0 90 Z"
        />
      </svg>
      {STREAKS.map((s) => (
        <i
          key={s.left}
          style={{ left: s.left, bottom: `${s.bottom}px`, animationDelay: s.delay, animationDuration: s.dur }}
        />
      ))}
    </div>
  );
}
