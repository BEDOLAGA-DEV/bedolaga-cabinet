import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAnimationPause } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

interface BeamOptions {
  initialX: number;
  translateX: number;
  duration: number;
  repeatDelay: number;
  delay?: number;
  className?: string;
}

const BEAMS: BeamOptions[] = [
  { initialX: 10, translateX: 10, duration: 7, repeatDelay: 3, delay: 2 },
  { initialX: 600, translateX: 600, duration: 3, repeatDelay: 3, delay: 4 },
  { initialX: 100, translateX: 100, duration: 7, repeatDelay: 7, className: 'h-6' },
  { initialX: 400, translateX: 400, duration: 5, repeatDelay: 14, delay: 4 },
  { initialX: 800, translateX: 800, duration: 11, repeatDelay: 2, className: 'h-20' },
  { initialX: 1000, translateX: 1000, duration: 4, repeatDelay: 2, className: 'h-12' },
  { initialX: 1200, translateX: 1200, duration: 6, repeatDelay: 4, delay: 2, className: 'h-6' },
];

function Explosion(props: React.HTMLProps<HTMLDivElement>) {
  const spans = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    directionX: Math.floor(Math.random() * 80 - 40),
    directionY: Math.floor(Math.random() * -50 - 10),
  }));

  return (
    <div {...props} className={cn('absolute z-50 h-2 w-2', props.className)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        className="absolute -inset-x-10 top-0 m-auto h-2 w-10 rounded-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-sm"
      />
      {spans.map((span) => (
        <motion.span
          key={span.id}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: span.directionX, y: span.directionY, opacity: 0 }}
          transition={{ duration: Math.random() * 1.5 + 0.5, ease: 'easeOut' }}
          className="absolute h-1 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500"
        />
      ))}
    </div>
  );
}

function CollisionMechanism({
  containerRef,
  parentRef,
  beamOptions,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  parentRef: React.RefObject<HTMLDivElement | null>;
  beamOptions: BeamOptions;
}) {
  const beamRef = useRef<HTMLDivElement>(null);
  const [collision, setCollision] = useState<{
    detected: boolean;
    coordinates: { x: number; y: number } | null;
  }>({ detected: false, coordinates: null });
  const [beamKey, setBeamKey] = useState(0);
  const [cycleCollisionDetected, setCycleCollisionDetected] = useState(false);

  const checkRef = useRef({ cycleDetected: false });
  checkRef.current.cycleDetected = cycleCollisionDetected;

  const checkCollision = useCallback(() => {
    if (checkRef.current.cycleDetected) return;
    if (!beamRef.current || !containerRef.current || !parentRef.current) return;

    const beamRect = beamRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const parentRect = parentRef.current.getBoundingClientRect();

    if (beamRect.bottom >= containerRect.top) {
      const relativeX = beamRect.left - parentRect.left + beamRect.width / 2;
      const relativeY = beamRect.bottom - parentRect.top;

      setCollision({ detected: true, coordinates: { x: relativeX, y: relativeY } });
      setCycleCollisionDetected(true);
    }
  }, [containerRef, parentRef]);

  // Throttled collision detection loop.
  // Parent unmounts this component when paused, so no visibility handling needed here.
  useEffect(() => {
    let animId = 0;
    let lastCheck = 0;
    const CHECK_INTERVAL = 100;

    const loop = (time: number) => {
      if (time - lastCheck >= CHECK_INTERVAL) {
        lastCheck = time;
        checkCollision();
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [checkCollision]);

  // Collision reset with proper timeout cleanup
  useEffect(() => {
    if (!collision.detected || !collision.coordinates) return;

    const timer = setTimeout(() => {
      setCollision({ detected: false, coordinates: null });
      setCycleCollisionDetected(false);
      setBeamKey((prev) => prev + 1);
    }, 2000);

    return () => clearTimeout(timer);
  }, [collision.detected]);

  return (
    <>
      <motion.div
        key={beamKey}
        ref={beamRef}
        animate="animate"
        initial={{
          translateY: '-200px',
          translateX: `${beamOptions.initialX}px`,
          rotate: 0,
        }}
        variants={{
          animate: {
            translateY: '1800px',
            translateX: `${beamOptions.translateX}px`,
            rotate: 0,
          },
        }}
        transition={{
          duration: beamOptions.duration,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'linear',
          delay: beamOptions.delay ?? 0,
          repeatDelay: beamOptions.repeatDelay,
        }}
        className={cn(
          'absolute left-0 top-20 m-auto h-14 w-px rounded-full bg-gradient-to-t from-indigo-500 via-purple-500 to-transparent',
          beamOptions.className,
        )}
      />
      <AnimatePresence>
        {collision.detected && collision.coordinates && (
          <Explosion
            key={`${collision.coordinates.x}-${collision.coordinates.y}`}
            style={{
              left: `${collision.coordinates.x}px`,
              top: `${collision.coordinates.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function BackgroundBeamsCollision({ settings: _settings }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const paused = useAnimationPause();

  return (
    <div ref={parentRef} className="absolute inset-0 overflow-hidden">
      {!paused &&
        BEAMS.map((beam) => (
          <CollisionMechanism
            key={`${beam.initialX}-beam`}
            beamOptions={beam}
            containerRef={containerRef}
            parentRef={parentRef}
          />
        ))}
      {/* Bottom collision line */}
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
        style={{
          boxShadow:
            '0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset',
        }}
      />
    </div>
  );
}
