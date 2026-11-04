// Resolve ?returnTo= para um caminho seguro da própria aplicação; senão "/".
// Exige uma única barra inicial (sem "//" nem "\") para evitar redirecionamento aberto.
export function safeReturnTo() {
  const raw = new URLSearchParams(window.location.search).get('returnTo');
  if (!raw) return '/';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return '/';
    const path = url.pathname + url.search;
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return '/';
    if (path.startsWith('/login')) return '/';
    return path;
  } catch {
    return '/';
  }
}
