import { useEffect, useState } from 'react';

/** Ширина от `px` и выше: панель справа вместо шита, кнопка в шапке вместо плашки. */
export function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', onChange);
    setMatches(media.matches);
    return () => media.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
