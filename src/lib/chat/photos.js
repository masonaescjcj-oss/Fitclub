// Photos sent in a chat live in a private bucket; each device asks for a
// short-lived link to show one. The messenger's server client registers how
// to get that link; links are cached until shortly before they expire.

let resolver = null;
const cache = new Map(); // path -> { url, until }

/** Called by the chat store with its server client's photoUrl(path). */
export function setPhotoResolver(fn) {
  resolver = fn;
  cache.clear();
}

/** A link to show the photo at `path`, or null when there is no way to get one. */
export async function photoUrl(path) {
  if (!path || !resolver) return null;
  const hit = cache.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const url = await resolver(path).catch(() => null);
  if (url) cache.set(path, { url, until: Date.now() + 50 * 60 * 1000 });
  return url;
}
