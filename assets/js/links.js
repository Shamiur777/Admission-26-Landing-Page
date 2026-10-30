import { ALLOWED_LINK_HOSTS, ATTRIBUTION_HOSTS, ATTRIBUTION_PARAMS } from './config.js';

/** Ad params are forwarded only if they look like ad params: plain characters, at most 200. */
const SAFE_PARAM = /^[\w.~+-]{1,200}$/;

/**
 * Validates an outbound URL and, for our own hosts, carries the visitor's ad params across.
 * Pure: reads no globals and logs nothing; the caller decides what to do with an error.
 * A link is rejected if it is not https, carries credentials or a port, or its host is not in ALLOWED_LINK_HOSTS.
 * @param {string} rawUrl
 * @param {string} search query string of the current page (location.search)
 * @returns {{href: string} | {error: string}}
 */
export function buildLink(rawUrl, search) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: 'not a valid URL' };
  }
  const plain = !url.username && !url.password && !url.port;
  if (url.protocol !== 'https:' || !plain || !ALLOWED_LINK_HOSTS.includes(url.hostname)) {
    return { error: 'link not allowed' };
  }
  if (ATTRIBUTION_HOSTS.includes(url.hostname)) {
    const incoming = new URLSearchParams(search || '');
    for (const key of ATTRIBUTION_PARAMS) {
      const value = incoming.get(key);
      if (value && SAFE_PARAM.test(value) && !url.searchParams.has(key)) url.searchParams.set(key, value);
    }
  }
  return { href: url.toString() };
}
