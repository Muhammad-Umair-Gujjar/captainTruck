/**
 * Light sanitize for stored chat text (admin web XSS hardening).
 * Strips tags and control chars; does not HTML-escape (clients escape on render).
 */
export function sanitizeChatBody(input: string): string {
  let out = input.replace(/<[^>]*>/g, '');
  // Strip C0 controls without a control-character regex (eslint no-control-regex)
  out = [...out]
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || code >= 32;
    })
    .join('');
  return out.trim();
}
