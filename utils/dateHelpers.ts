/**
 * Retorna a data local atual no formato YYYY-MM-DD (sem depender de UTC).
 * Evita o bug clássico de `new Date().toISOString()` que usa UTC e pode
 * avançar ou recuar um dia no fuso horário do Brasil (UTC-3 / UTC-2).
 */
export const localDateStr = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Retorna a data e hora local no formato YYYY-MM-DDTHH:MM
 * compatível com <input type="datetime-local">.
 */
export const localDateTimeStr = (d: Date = new Date()): string => {
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${localDateStr(d)}T${h}:${min}`;
};

/**
 * Gera uma "assinatura" dos campos de conteúdo de um formulário,
 * ignorando campos de data/hora que são resetados ao reemitir.
 * Usado para detectar se o usuário editou os dados antes de gerar novamente.
 */
const FINGERPRINT_IGNORED = new Set([
  'date', 'displayDate', 'horarioAgendado', 'schedulingDate', 'schedulingTime',
]);
export const formFingerprint = (data: any): string => {
  if (!data) return '';
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([k]) => !FINGERPRINT_IGNORED.has(k))
  );
  return JSON.stringify(filtered);
};

/**
 * Formata uma ISO string ou qualquer string de data para o padrão
 * pt-BR DD/MM/YYYY HH:MM sem depender do fuso do servidor.
 */
export const formatDateTimePtBR = (isoStr: string): string => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  } catch {
    return isoStr;
  }
};
