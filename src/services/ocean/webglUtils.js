/** Limita a resolução interna do WebGL para equilibrar nitidez e fill-rate. */
export function getWebGLPixelRatio(viewportWidth) {
  return Math.min(window.devicePixelRatio || 1, viewportWidth < 768 ? 1.35 : 1.6);
}

/** Pré-compila os programas do contexto definitivo. Não renderiza aqui: os
 * quadros de aquecimento da página fazem o primeiro upload depois que a
 * montagem do React já foi confirmada como a geração vigente. */
export async function precompileRenderer(renderer, scene, camera) {
  if (typeof renderer.compileAsync !== 'function') {
    try {
      renderer.compile(scene, camera);
    } catch (error) {
      console.warn('Pré-compilação WebGL indisponível; seguindo com o renderer normal.', error);
    }
    return;
  }

  let limiteId;
  try {
    await Promise.race([
      renderer.compileAsync(scene, camera),
      new Promise((resolve) => { limiteId = window.setTimeout(resolve, 1600); }),
    ]);
  } catch (error) {
    /* A renderização normal ainda pode funcionar mesmo quando a extensão de
       compilação paralela falha; não transformar aquecimento em tela vazia. */
    console.warn('Pré-compilação WebGL indisponível; seguindo com o renderer normal.', error);
  } finally {
    window.clearTimeout(limiteId);
  }
}

/**
 * Sobe para a GPU tudo que a cena vai precisar, antes do primeiro quadro
 * visível.
 *
 * `precompileRenderer` só linka os programas de shader. Um buffer de geometria
 * ou uma textura só sobem no primeiro desenho que os usa — e o descarte por
 * frustum impede esse desenho enquanto o objeto está fora da tela. O resultado
 * é que cada objeto que entra em cena durante a rolagem paga o próprio upload
 * ali, no meio do gesto: um engasgo por objeto.
 *
 * Uma passada com o descarte desligado submete a cena inteira de uma vez. O que
 * está fora da tela é recortado antes de virar fragmento, então o que sobra é
 * praticamente só o custo do upload — exatamente o que se quer pagar aqui.
 */
export function aquecerUploads(renderer, scene, camera) {
  const restaurar = [];
  scene.traverse((objeto) => {
    if (!objeto.frustumCulled) return;
    if (!(objeto.isMesh || objeto.isPoints || objeto.isLine || objeto.isSprite)) return;
    objeto.frustumCulled = false;
    restaurar.push(objeto);
  });
  try {
    renderer.render(scene, camera);
  } finally {
    restaurar.forEach((objeto) => { objeto.frustumCulled = true; });
  }
}

/** Libera recursos compartilhados de uma árvore Three.js uma única vez. */
export function disposeSceneResources(scene) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (!object.material) return;

    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value?.isTexture) textures.add(value);
      });
    });
  });

  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}
