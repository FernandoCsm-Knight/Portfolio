export const SOCIAL_LINKS = [
  { label: 'E-MAIL', href: import.meta.env.VITE_MAIL_URL?.trim() || '' },
  { label: 'GITHUB', href: import.meta.env.VITE_GITHUB_URL?.trim() || '' },
  { label: 'LINKEDIN', href: import.meta.env.VITE_LINKEDIN_URL?.trim() || '' },
];

/* Os três PDFs já estavam em public/docs sem nenhum link apontando para eles. */
export const CV_LINKS = [
  { label: 'PT', href: '/docs/fernandocsdm_cv_pt.pdf', title: 'Currículo em português' },
  { label: 'EN', href: '/docs/fernandocsdm_cv_en.pdf', title: 'Résumé in English' },
  { label: 'ES', href: '/docs/fernandocsdm_cv_es.pdf', title: 'Currículum en español' },
];
