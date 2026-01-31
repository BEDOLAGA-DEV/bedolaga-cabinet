import { useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import { brandingApi } from '@/api/branding';

const VERT = /* glsl */ `#version 300 es
  in vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `#version 300 es
  precision highp float;

  uniform float uTime;
  uniform float uAmplitude;
  uniform vec3 uColorStops[3];
  uniform vec2 uResolution;
  uniform float uBlend;

  out vec4 fragColor;

  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);

    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
           + i.x + vec3(0.0, i1.x, 1.0));

    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  struct ColorStop {
    vec3 color;
    float position;
  };

  #define COLOR_RAMP(colors, factor, finalColor) {               \
    int index = 0;                                                \
    for (int i = 0; i < colors.length() - 1; i++) {              \
      ColorStop currentColor = cyclingColors[i];                  \
      bool isInBetween = cyclingColors[i].position <= factor;     \
      index = isInBetween ? i : index;                            \
    }                                                             \
    ColorStop currentColor = cyclingColors[index];                \
    ColorStop nextColor = cyclingColors[index + 1];               \
    float range = cyclingColors[index + 1].position - currentColor.position; \
    float lerpFactor = (factor - currentColor.position) / range;  \
    finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;

    // Build color stops with fixed positions - optimized for visual appeal
    ColorStop cyclingColors[3];
    cyclingColors[0] = ColorStop(uColorStops[0], 0.0);
    cyclingColors[1] = ColorStop(uColorStops[1], 0.5);
    cyclingColors[2] = ColorStop(uColorStops[2], 1.0);

    float noiseValue = snoise(uv * uAmplitude + uTime) * 0.5 + 0.5;

    vec3 rampColor;
    COLOR_RAMP(cyclingColors, noiseValue, rampColor);

    fragColor = vec4(rampColor, uBlend);
  }
`;

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  speed?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function getAccentColorFromCSS(): string {
  // Get accent-500 RGB value from CSS variable
  const root = document.documentElement;
  const accentRgb = getComputedStyle(root).getPropertyValue('--color-accent-500').trim();

  if (accentRgb) {
    // Convert "r g b" format to hex
    const parts = accentRgb.split(' ').map(Number);
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      const hex = parts.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
      return `#${hex}`;
    }
  }

  // Default accent color fallback
  return '#a78bfa';
}

function generateColorStops(baseColor: string): string[] {
  const [r, g, b] = hexToRgb(baseColor);

  // Create variations: darker, base, lighter (all very dark for background)
  const darkerR = Math.max(0, Math.round(r * 255 * 0.15));
  const darkerG = Math.max(0, Math.round(g * 255 * 0.15));
  const darkerB = Math.max(0, Math.round(b * 255 * 0.15));

  const baseR = Math.round(r * 255 * 0.25);
  const baseG = Math.round(g * 255 * 0.25);
  const baseB = Math.round(b * 255 * 0.25);

  const lighterR = Math.round(r * 255 * 0.35);
  const lighterG = Math.round(g * 255 * 0.35);
  const lighterB = Math.round(b * 255 * 0.35);

  return [
    `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`,
    `#${baseR.toString(16).padStart(2, '0')}${baseG.toString(16).padStart(2, '0')}${baseB.toString(16).padStart(2, '0')}`,
    `#${lighterR.toString(16).padStart(2, '0')}${lighterG.toString(16).padStart(2, '0')}${lighterB.toString(16).padStart(2, '0')}`,
  ];
}

export function Aurora({ amplitude = 1.0, blend = 0.5, speed = 0.5 }: AuroraProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const rendererRef = useRef<Renderer | null>(null);
  const programRef = useRef<Program | null>(null);

  // Fetch animation setting
  const { data: animationSetting } = useQuery({
    queryKey: ['animation-enabled'],
    queryFn: brandingApi.getAnimationEnabled,
    staleTime: 60000,
  });

  const isEnabled = animationSetting?.enabled ?? false;

  // Get color stops based on theme
  const colorStops = useMemo(() => {
    if (typeof window === 'undefined') return ['#0a0a0a', '#1a1a2e', '#0a0a0a'];
    const accent = getAccentColorFromCSS();
    return generateColorStops(accent);
  }, []);

  useEffect(() => {
    if (!isEnabled || !containerRef.current) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const container = containerRef.current;
    const renderer = new Renderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    rendererRef.current = renderer;
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);

    const colorStopsArray = colorStops
      .map((hex) => {
        const c = new Color(hex);
        return [c.r, c.g, c.b];
      })
      .flat();

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uColorStops: { value: colorStopsArray },
        uResolution: { value: [container.offsetWidth, container.offsetHeight] },
        uBlend: { value: blend },
      },
    });
    programRef.current = program;

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      if (!containerRef.current || !rendererRef.current || !programRef.current) return;
      const w = containerRef.current.offsetWidth;
      const h = containerRef.current.offsetHeight;
      rendererRef.current.setSize(w, h);
      programRef.current.uniforms.uResolution.value = [w, h];
    }

    window.addEventListener('resize', resize);
    resize();

    let lastTime = 0;
    const targetFPS = 30; // Limit to 30fps for performance
    const frameInterval = 1000 / targetFPS;

    function animate(currentTime: number) {
      animationFrameRef.current = requestAnimationFrame(animate);

      const delta = currentTime - lastTime;
      if (delta < frameInterval) return;

      lastTime = currentTime - (delta % frameInterval);

      if (programRef.current && rendererRef.current) {
        programRef.current.uniforms.uTime.value += speed * 0.01;
        rendererRef.current.render({ scene: mesh });
      }
    }
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameRef.current);
      if (rendererRef.current && container.contains(rendererRef.current.gl.canvas)) {
        container.removeChild(rendererRef.current.gl.canvas);
      }
      rendererRef.current = null;
      programRef.current = null;
    };
  }, [isEnabled, colorStops, amplitude, blend, speed]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
