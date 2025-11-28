export const formatDateShort = (input?: string | Date | null): string => {
  if (!input) return '';
  const s = input instanceof Date ? input.toString() : String(input).trim();
  // strip timezone suffix like Z or +HH:MM
  const sNoTz = s.replace(/(?:Z|[+-]\d{2}:?\d{2})$/, '');
  const d = input instanceof Date ? input : new Date(sNoTz);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
};

export const formatDateLong = (input?: string | Date | null): string => {
  if (!input) return '';
  const s = input instanceof Date ? input.toString() : String(input).trim();
  const sNoTz = s.replace(/(?:Z|[+-]\d{2}:?\d{2})$/, '');
  const d = input instanceof Date ? input : new Date(sNoTz);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};
