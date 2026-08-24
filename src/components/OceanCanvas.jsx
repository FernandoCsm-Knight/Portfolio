import { memo } from 'react';

function OceanCanvas({ canvasRef, fundoRef }) {
  return (
    <>
      <div id="fundo" ref={fundoRef} />
      <canvas id="mar" ref={canvasRef} />
      <div id="vinheta" />
    </>
  );
}

export default memo(OceanCanvas);
