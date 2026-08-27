import { useEffect, useRef, useState } from 'react';

/**
 * Ciclo de vida comum às cenas WebGL do site (oceano, caderno de bordo, mapa
 * de expedições): contador de geração — o StrictMode do React monta e
 * desmonta o efeito duas vezes em dev, então só a geração que sobrevive de
 * fato cria o contexto WebGL —, e a captura de falha (driver bloqueado, GPU
 * em lista negra, navegador antigo) revertendo para `cenaIndisponivel` em
 * vez de deixar a página em branco.
 *
 * `mount(canvas, { isCurrent }) => cleanup | undefined` faz todo o resto:
 * import dinâmico do serviço da cena, esperar fontes, criar a cena, plugar
 * os event listeners específicos dela, e devolver a função que desfaz tudo
 * isso. Precisa ser estável entre renders (`useCallback`) com a mesma lista
 * de dependências que antes ia no array do `useEffect`.
 */
export function useSceneMount(canvasRef, mount, onReady, errorLabel = 'a cena') {
  const generationRef = useRef(0);
  const [cenaIndisponivel, setCenaIndisponivel] = useState(false);

  useEffect(() => {
    const generation = ++generationRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let cancelled = false;
    let cleanup = () => {};
    const isCurrent = () => !cancelled && generationRef.current === generation;

    Promise.resolve(mount(canvas, { isCurrent }))
      .then((result) => {
        if (isCurrent() && result) cleanup = result;
      })
      .catch((error) => {
        if (!isCurrent()) return;
        console.error(`Não foi possível iniciar ${errorLabel}.`, error);
        setCenaIndisponivel(true);
        onReady?.();
      });

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, mount, onReady, errorLabel]);

  return { cenaIndisponivel };
}
