export const parseToDate = (s?: string | Date): Date => {
  if (!s) return new Date(NaN);
  if (s instanceof Date) return s;
  // yyyy-mm-dd HH:MM:SS or ISO-like
  const spaceMatch = /^\s*(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})\s*$/.exec(s);
  if (spaceMatch) {
    const [, Y, M, D, hh, mm, ss] = spaceMatch;
    return new Date(Number(Y), Number(M) - 1, Number(D), Number(hh), Number(mm), Number(ss));
  }
  // Try native parse first (covers ISO) but strip timezone suffix to keep "naive" local time
  const sStr = String(s).trim();
  const sNoTz = sStr.replace(/(?:Z|[+-]\d{2}:?\d{2})$/, '');
  const d = new Date(sNoTz);
  if (!isNaN(d.getTime())) return d;
  // dd/mm/yyyy HH:MM[:SS]
  const altMatch = /^(\d{2})\/(\d{2})\/(\d{2,4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (altMatch) {
    const [, dd, mm, yy, hh, mi, ss] = altMatch;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    return new Date(year, Number(mm) - 1, Number(dd), Number(hh), Number(mi), ss ? Number(ss) : 0);
  }
  return new Date(s);
};

export const formatDisplayTime = (input: string | number | Date) => {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
};

export const formatBRShort = (input?: string | Date | number) => {
  if (!input) return '';
  return formatDisplayTime(input);
};
