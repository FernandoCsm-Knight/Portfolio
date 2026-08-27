import { memo } from 'react';

const ICONS = {
  plus: (
    <path d="M12 5.5v13M5.5 12h13" />
  ),
  send: (
    <>
      <path d="M4.2 11.4 20 4l-6.7 16-2.2-7.1-6.9-1.5Z" />
      <path d="m11.1 12.9 8.6-8.6" />
    </>
  ),
};

function BubbleButton({
  icon,
  label,
  loading = false,
  loadingLabel = 'Carregando',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      className={`botao-bolha${loading ? ' carregando' : ''}${className ? ` ${className}` : ''}`}
      aria-label={loading ? loadingLabel : label}
      aria-busy={loading}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {ICONS[icon]}
      </svg>
    </button>
  );
}

export default memo(BubbleButton);
