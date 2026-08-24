/* `map` posiciona o projeto no mapa de expedições (/projetos); `feature`
   escolhe o cenário que a cena constrói em volta do marcador. As coordenadas
   foram mantidas, então o relevo, os cardumes e o tesouro continuam nos
   mesmos pontos do mapa. */
export const PROJECTS = [
  {
    num: '01',
    title: 'Pineapple',
    description: 'Framework de aprendizado profundo escrito do zero em C++, inspirado em PyTorch e TensorFlow: diferenciação automática, operações com tensores e uma API modular de camadas. Executa em paralelo na CPU (multithreading) e na GPU (CUDA), com ganhos expressivos sobre implementações ingênuas.',
    tags: ['C++', 'CUDA', 'APRENDIZADO PROFUNDO'],
    href: 'https://github.com/FernandoCsm-Knight/Pineapple',
    map: { x: 18, y: 13 },
  },
  {
    num: '02',
    title: 'Graphic Paint',
    description: 'Editor visual de grafos e autômatos em TypeScript, na linha do Excalidraw. Constrói grafos dirigidos e não dirigidos e autômatos finitos (AFD, AFN, ε-AFN e com pilha), simula entradas e roda algoritmos — BFS, DFS, caminho mínimo, árvore geradora mínima — direto na tela de desenho.',
    tags: ['TYPESCRIPT', 'REACT', 'ALGORITMOS'],
    href: 'https://graphic-paint-roan.vercel.app/paint',
    map: { x: -29, y: 12, feature: 'deep-fish' },
  },
  {
    num: '03',
    title: 'Classificação Estelar',
    description: 'Classificadores clássicos e modernos — Random Forest, SVM e redes neurais — aplicados a conjuntos de dados astronômicos para separar estrelas, galáxias e quasares, comparados por validação cruzada, curvas ROC/AUC e testes estatísticos.',
    tags: ['PYTHON', 'SCIKIT-LEARN', 'MACHINE LEARNING'],
    href: 'https://github.com/FernandoCsm-Knight/Stellar-Classification',
    map: { x: 0, y: -20, feature: 'treasure' },
  },
  {
    num: '04',
    title: 'Tecnologia Persuasiva para Rotinas com TDAH',
    description: 'Pesquisa de iniciação científica (CNPq, laboratório LICAP da PUC Minas) sobre gestão da rotina de famílias com crianças e adolescentes com TDAH, numa abordagem centrada no usuário. Publicada no IHC 2024 (ACM) com Menção Honrosa, e ampliada em artigo no Journal of the Brazilian Computer Society.',
    tags: ['PESQUISA', 'IHC', 'ACM'],
    href: 'https://dl.acm.org/doi/10.1145/3702038.3702101',
    map: { x: 34, y: -8, feature: 'migration' },
  },
];
