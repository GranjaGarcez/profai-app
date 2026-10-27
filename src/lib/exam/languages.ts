// Línguas oferecidas para tradução a alunos LPNM (Língua Portuguesa Não Materna).
// Conjunto curado das L1 mais comuns em escolas portuguesas (evita traduções abusivas
// para línguas arbitrárias). O "label" é usado no prompt da IA; o "code" na cache.
export const TRANSLATION_LANGS: { code: string; label: string }[] = [
  { code: 'uk', label: 'Ucraniano' },
  { code: 'en', label: 'Inglês' },
  { code: 'fr', label: 'Francês' },
  { code: 'es', label: 'Espanhol' },
  { code: 'ro', label: 'Romeno' },
  { code: 'ru', label: 'Russo' },
  { code: 'ar', label: 'Árabe' },
  { code: 'zh', label: 'Mandarim (chinês simplificado)' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ne', label: 'Nepalês' },
  { code: 'pt-cv', label: 'Crioulo cabo-verdiano' },
]

export function langLabel(code: string): string | null {
  return TRANSLATION_LANGS.find(l => l.code === code)?.label ?? null
}
