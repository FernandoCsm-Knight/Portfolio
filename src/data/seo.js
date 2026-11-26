/* Título e descrição de cada rota pública, para o Google e para os cards de
   compartilhamento. Em português: é o idioma do `<html lang>` e o da busca
   que importa aqui ("desenvolvedor belo horizonte").

   Lido em dois lugares: no build (scripts/llms.js gera um about.html,
   projects.html… com estes valores já no <head>, sem depender de JS) e no
   App, que repete a troca a cada navegação interna. */
export const SITE_URL = 'https://fernandocsdm.com';

/* Site próprio dos serviços de interpretabilidade (pasta fannar/, deploy à parte). */
export const FANNAR_URL = 'https://fannar.fernandocsdm.com/';

export const ROUTE_META = {
  '/': {
    title: "Fernando Dal' Maria · Desenvolvedor de Software em Belo Horizonte",
    description:
      "Fernando Dal' Maria, desenvolvedor de software em Belo Horizonte: projetos sob medida em inteligência artificial, computação gráfica e alto desempenho.",
  },
  '/about': {
    title: "Sobre · Fernando Dal' Maria, desenvolvedor em Belo Horizonte",
    description:
      'Trajetória, artigos publicados e certificações de Fernando Dal\' Maria, desenvolvedor e pesquisador em Ciência da Computação na PUC Minas, Belo Horizonte.',
  },
  '/projects': {
    title: "Projetos · Fernando Dal' Maria",
    description:
      "Projetos de Fernando Dal' Maria em C++/CUDA, TypeScript e Python: aprendizado profundo, grafos, autômatos e interpretabilidade de modelos.",
  },
  '/pricing': {
    title: "Valores · Desenvolvedor freelancer em Belo Horizonte · Fernando Dal' Maria",
    description:
      'Valores por hora para desenvolvimento de software, consultoria técnica e pesquisa, com atendimento em Belo Horizonte, remoto no Brasil e no exterior.',
  },
  '/contact': {
    title: "Contato · Fernando Dal' Maria, desenvolvedor em Belo Horizonte",
    description:
      'Fale com Fernando Dal\' Maria sobre um projeto de software, consultoria técnica ou colaboração em pesquisa. Belo Horizonte (MG) e remoto.',
  },
};
