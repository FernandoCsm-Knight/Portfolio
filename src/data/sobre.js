/* Conteúdo da página /about, tirado do currículo em public/docs.

   A trajetória por extenso (título, instituição, descrição) mora só no i18n
   (`about.trajectory`, em translations.js) — cada etapa muda de texto por
   idioma. O que fica aqui é o que não muda com o idioma: as datas.

   Trechos de cada etapa, na mesma ordem de `about.trajectory` no i18n — é por
   índice que os dois se encontram, e a ordem é a cronológica de início, que é
   como as pistas do gráfico aparecem empilhadas.

   Cada etapa é uma LISTA de trechos, mesmo quando só tem um. A monitoria tem
   dois períodos separados por catorze meses, e uma barra só de 2023 a 2024
   afirmaria um trabalho contínuo que não houve — na pista, o buraco entre os
   dois trechos é a informação.

   Datas em 'AAAA-MM-DD' e não em número de ano: as monitorias têm dia certo nos
   certificados, e escrever 2023.118 em vez de '2023-02-13' esconderia de onde o
   valor veio. Onde só o ano é conhecido, 1º de janeiro. `fim: null` é trecho em
   curso — a barra dele vai até hoje, não até o fim do ano. */
export const PERIODOS = [
  [{ inicio: '2020-01-01', fim: '2022-01-01' }],  /* Medicina */
  [{ inicio: '2021-01-01', fim: '2025-02-01' }],  /* Aulas particulares */
  [{ inicio: '2022-01-01', fim: null }],          /* Bacharelado em CC */
  [{ inicio: '2023-01-01', fim: null }],          /* Analista de dados */
  [{ inicio: '2023-01-01', fim: '2025-01-01' }],  /* Iniciação científica */
  [
    { inicio: '2023-01-01', fim: '2023-07-01' },  /* Monitoria · Bancos de Dados */
    { inicio: '2024-07-01', fim: '2025-01-01' },  /* Monitoria · Grafos e Computabilidade */
  ],
  [{ inicio: '2026-01-01', fim: null }],          /* Estágio no TCE-MG */
];

/* Conferidos na primeira página de cada artigo (as miniaturas em
   public/images). O carrossel exibe só a imagem: `titulo` e `veiculo` não
   aparecem em tela, mas são o nome acessível do link e do indicador — sem
   eles, um leitor de tela anunciaria apenas "link, imagem". */
export const PUBLICACOES = [
  {
    veiculo: 'IHC 2024 · ACM',
    titulo:
      'Persuasive Technology for Managing the Routine of Families with Children and Adolescents with ADHD: A User-Centered Approach',
    doi: '10.1145/3702038.3702101',
    href: 'https://doi.org/10.1145/3702038.3702101',
    miniatura: '/images/proceeding.png',
    largura: 673,
    altura: 824,
  },
  {
    veiculo: 'Journal of the Brazilian Computer Society · 32:1',
    titulo:
      'Support for Families of Children and Adolescents with Attention-Deficit/Hyperactivity Disorder: A Technological Solution Based on Persuasive Strategies',
    doi: '10.5753/jbcs.2026.5670',
    href: 'https://doi.org/10.5753/jbcs.2026.5670',
    miniatura: '/images/journal.png',
    largura: 567,
    altura: 820,
  },
];
