// Simple in-memory cache for route requests
const routeCache = new Map();

export function getCachedRoute(key) {
  return routeCache.get(key);
}

export function setCachedRoute(key, value) {
  routeCache.set(key, value);
}
