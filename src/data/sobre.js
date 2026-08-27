/* Conteúdo da página /about, tirado do currículo em public/docs.

   A trajetória fica em ordem cronológica crescente de propósito: na metáfora
   do site, descer é avançar no tempo, então a formação mais antiga aparece na
   superfície e o trabalho atual no ponto mais fundo da página. A `marca` de
   profundidade é decorativa e acompanha as zonas usadas na home. */
export const TRAJETORIA = [
  {
    marca: '0M',
    periodo: '2020 — 2022',
    titulo: 'Medicina',
    instituicao: 'Faculdade Ciências Médicas de Minas Gerais',
    descricao:
      'Dois anos de anatomia, fisiologia, bioquímica, histologia e patologia, antes da transferência para computação.',
  },
  {
    marca: '240M',
    periodo: '2022 — presente',
    titulo: 'Bacharelado em Ciência da Computação',
    instituicao: 'PUC Minas',
    descricao:
      'Média global 9,475/10 e láurea acadêmica por desempenho excepcional. Monitor de Teoria dos Grafos, Teoria da Computabilidade, Sistemas de Bancos de Dados e Histologia.',
  },
  {
    marca: '480M',
    periodo: '2023 — presente',
    titulo: 'Analista de dados e engenheiro de automação com IA',
    instituicao: 'Profissional autônomo',
    descricao:
      'Análise de grafos de relacionamentos para identificar padrões de nepotismo, detecção de doenças na cultura da soja com PyTorch, sistema de gestão para uma loja de móveis e estruturação de dados de pesquisa clínica com o Hospital das Clínicas da UFMG.',
  },
  {
    marca: '760M',
    periodo: '2023 — 2025',
    titulo: 'Iniciação científica · bolsista CNPq',
    instituicao: 'PUC Minas — Laboratório LICAP',
    descricao:
      'Pesquisa em tecnologia persuasiva com abordagem centrada no usuário, publicada no IHC 2024. Linha atual: interpretabilidade de modelos profundos e fundacionais via truque do kernel, medindo similaridade geométrica no espaço de representações de cada camada.',
  },
  {
    marca: '1.000M',
    periodo: '2026 — presente',
    titulo: 'Estagiário de desenvolvimento de software',
    instituicao: 'Tribunal de Contas do Estado de Minas Gerais',
    descricao:
      'Sistemas internos e projetos de transformação digital do setor público.',
    atual: true,
  },
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

export const CREDENCIAIS = [
  'Microsoft Azure AI Fundamentals (AI-900)',
  'Red Hat Certified System Administrator II (RHCSA)',
  'Menção Honrosa — Congresso Acadêmico de Iniciação Científica, PUC Minas',
  'Láurea acadêmica — reconhecimento da reitoria, PUC Minas',
];
