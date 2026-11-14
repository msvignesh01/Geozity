export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || /[\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
