import { PROJECTS } from './projects';

const [pineapple, , stellar, pesquisa] = PROJECTS;

export const OCEAN_TARGETS = [
  { rotulo: 'PROJETO', title: pineapple.title, url: pineapple.href },
  { rotulo: 'DEMO', title: 'Grafos', url: 'https://graphic-paint-roan.vercel.app/graph' },
  { rotulo: 'PERFIL', title: 'GitHub', url: 'https://github.com/FernandoCsm-Knight' },
  { rotulo: 'PROJETO', title: stellar.title, url: stellar.href },
  { rotulo: 'PESQUISA', title: 'Publicação no IHC 2024', url: pesquisa.href },
  { rotulo: 'PERFIL', title: 'LinkedIn', url: 'https://linkedin.com/in/fernandocsdm' },
  { rotulo: 'DEMO', title: 'Autômatos', url: 'https://graphic-paint-roan.vercel.app/automaton' },
  {
    rotulo: 'PROJETO',
    title: 'Relationship-RHPG',
    url: 'https://github.com/FernandoCsm-Knight/Relationship-RHPG',
  },
];
