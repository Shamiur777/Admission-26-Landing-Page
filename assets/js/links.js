import { ALLOWED_LINK_HOSTS, ATTRIBUTION_HOSTS, ATTRIBUTION_PARAMS } from './config.js';

/**
 * Validates an outbound URL and, for our own hosts, carries the visitor's ad params across.
 * Returns null (and warns) if the URL is not https, carries credentials or a port, or its host is not in ALLOWED_LINK_HOSTS.
 * @param {string} rawUrl
 * @param {string} [search] query string of the current page; defaults to location.search
 * @returns {string|null}
 */
export function buildLink(rawUrl, search = window.location.search) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    console.warn('[links] skipped, not a valid URL:', rawUrl);
    return null;
  }
  const plain = !url.username && !url.password && !url.port;
  if (url.protocol !== 'https:' || !plain || !ALLOWED_LINK_HOSTS.includes(url.hostname)) {
    console.warn('[links] skipped, link not allowed:', rawUrl);
    return null;
  }
  if (ATTRIBUTION_HOSTS.includes(url.hostname)) {
    const incoming = new URLSearchParams(search);
    for (const key of ATTRIBUTION_PARAMS) {
      const value = incoming.get(key);
      if (value && !url.searchParams.has(key)) url.searchParams.set(key, value.slice(0, 200));
    }
  }
  return url.toString();
}
