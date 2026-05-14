const apiOrigin = import.meta.env.VITE_API_URL?.replace(/\/$/, '');

export const apiBaseUrl = apiOrigin ? `${apiOrigin}/api` : '/api';

export function getSocketUrl() {
  if (apiOrigin) return apiOrigin;

  if (import.meta.env.DEV) {
    return window.location.origin;
  }

  console.error('Missing VITE_API_URL. Set it to the backend origin, for example https://majetot.onrender.com.');
  return null;
}
