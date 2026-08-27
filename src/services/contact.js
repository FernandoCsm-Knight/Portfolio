import { requireSupabase, supabaseConfigured, unwrap } from './supabase';

export const contactConfigured = supabaseConfigured;

/* Os mesmos valores estão no CHECK de `subject` em
   supabase/contact_requests.sql: mudar um lado exige mudar o outro. */
export const CONTACT_SUBJECTS = [
  { value: 'projeto', label: 'Projeto sob medida' },
  { value: 'consultoria', label: 'Consultoria técnica' },
  { value: 'pesquisa', label: 'Pesquisa ou colaboração' },
  { value: 'outro', label: 'Outro assunto' },
];

export function subjectLabel(value) {
  return CONTACT_SUBJECTS.find((item) => item.value === value)?.label ?? value;
}

export const CONTACT_LIMITS = {
  name: { min: 2, max: 80 },
  email: { max: 160 },
  company: { max: 80 },
  message: { min: 10, max: 2000 },
};

export async function createContactRequest({ name, email, company, subject, message }) {
  await unwrap(requireSupabase()
    .from('contact_requests')
    .insert({
      name,
      email,
      company: company || null,
      subject,
      message,
    }));
}
