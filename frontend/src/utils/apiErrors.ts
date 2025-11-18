export function parseApiError(err: any): string {
  try {
    const resp = err?.response?.data;
    if (!resp) return err?.message || 'Erro desconhecido';

    // Zod error structure used by backend
    if (resp.error === 'Validation error' && Array.isArray(resp.details)) {
      // details are Zod issues
      const messages = resp.details.map((issue: any) => {
        const path = (issue.path || []).join('.') || '(body)';
        return `${path}: ${issue.message}`;
      });
      return messages.join('\n');
    }

    // Generic API error with message
    if (typeof resp.error === 'string') return resp.error;
    if (resp.message) return resp.message;

    return JSON.stringify(resp);
  } catch (e) {
    return err?.message || 'Erro desconhecido';
  }
}
