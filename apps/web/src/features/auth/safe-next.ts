/** Returns a same-origin relative path when safe, otherwise falls back to the default path. */
export function safePortalPath(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}
