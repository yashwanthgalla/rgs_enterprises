/**
 * Utilities for URL and query parameter encoding.
 * Since '#' is a URL fragment delimiter, Hub codes like 'RGS#AP01' must be
 * URL-encoded (?code=RGS%23AP01) when passed in query strings.
 */

export const encodeHubCode = (code: string): string => {
  if (!code) return '';
  return encodeURIComponent(code.trim());
};

export const decodeHubCode = (encoded: string): string => {
  if (!encoded) return '';
  return decodeURIComponent(encoded);
};

export const formatHubRoute = (id: number | string): string => {
  return `/hubs/${id}`;
};
