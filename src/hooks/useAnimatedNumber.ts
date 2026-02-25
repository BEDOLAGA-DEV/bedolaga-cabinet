import { useEffect, useRef, useState } from 'react';

export function useAnimatedNumber(target: number, duration = 600): number {
  const [current, setCurrent] = useState(target);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(target);
  const currentRef = useRef<number>(target);
  const prevTargetRef = useRef<number>(target);

  // Keep currentRef in sync with state
  currentRef.current = current;

  useEffect(() => {
    if (prevTargetRef.current === target) return;
    prevTargetRef.current = target;
    fromRef.current = currentRef.current;
    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = fromRef.current + (target - fromRef.current) * eased;
      setCurrent(value);
      currentRef.current = value;

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current;
}
