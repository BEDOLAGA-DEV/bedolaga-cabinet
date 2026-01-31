import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import { brandingApi } from '@/api/branding';
import { ThemeSettings, DEFAULT_THEME_COLORS } from '@/types/theme';

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

function generateColorStops(accent: string, background: string): string[] {
  const [ar, ag, ab] = hexToRgb(accent);

  // Color 1: Dark background
  const color1 = background;

  // Color 2: Accent at 40% intensity
  const midR = Math.round(ar * 255 * 0.4);
  const midG = Math.round(ag * 255 * 0.4);
  const midB = Math.round(ab * 255 * 0.4);
  const color2 = `#${midR.toString(16).padStart(2, '0')}${midG.toString(16).padStart(2, '0')}${midB.toString(16).padStart(2, '0')}`;

  // Color 3: Accent at 70% intensity
  const brightR = Math.round(ar * 255 * 0.7);
  const brightG = Math.round(ag * 255 * 0.7);
  const brightB = Math.round(ab * 255 * 0.7);
  const color3 = `#${brightR.toString(16).padStart(2, '0')}${brightG.toString(16).padStart(2, '0')}${brightB.toString(16).padStart(2, '0')}`;

  return [color1, color2, color3];
}

export function Aurora() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const rendererRef = useRef<Renderer | null>(null);
  const programRef = useRef<Program | null>(null);

  const queryClient = useQueryClient();

  // Fetch animation setting
  const { data: animationSetting } = useQuery({
    queryKey: ['animation-enabled'],
    queryFn: brandingApi.getAnimationEnabled,
    staleTime: 60000,
  });

  const isEnabled = animationSetting?.enabled ?? false;

  // Get theme colors from cache (already fetched by ThemeColorsProvider)
  const themeColors =
    queryClient.getQueryData<ThemeSettings>(['theme-colors']) || DEFAULT_THEME_COLORS;

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

    const colorStops = generateColorStops(themeColors.accent, themeColors.darkBackground);
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
        uAmplitude: { value: 1.0 },
        uColorStops: { value: colorStopsArray },
        uResolution: { value: [container.offsetWidth, container.offsetHeight] },
        uBlend: { value: 1.0 },
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
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
    const speed = 0.3; // Slow and smooth

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
  }, [isEnabled, themeColors.accent, themeColors.darkBackground]);

  if (!isEnabled) {
    return null;
  }

  // Blur overlay color from accent (very subtle)
  const [r, g, b] = hexToRgb(themeColors.accent);
  const blurColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.03)`;

  return (
    <>
      {/* WebGL Aurora canvas */}
      <div
        ref={containerRef}
        className="pointer-events-none fixed inset-0 z-0"
        style={{ width: '100%', height: '100%' }}
      />
      {/* Blur overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backdropFilter: 'blur(80px)',
          WebkitBackdropFilter: 'blur(80px)',
          backgroundColor: blurColor,
        }}
      />
    </>
  );
}
