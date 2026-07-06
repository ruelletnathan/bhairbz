// Fond de fumée procédurale (bruit fractal + distorsion de domaine),
// rendu en WebGL sur un simple quad plein écran. Beaucoup plus proche
// d'une vraie fumée que des blobs CSS flous : le bruit ne boucle jamais
// à l'identique, le mouvement est donc réellement continu.

const VERT_SRC = `
  attribute vec2 aPos;
  void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`

const FRAG_SRC = `
  precision highp float;
  uniform vec2 uResolution;
  uniform float uTime;

  // Hash + value-noise (Dave Hoskins style) : reste stable même en
  // précision "mediump" (contrairement au simplex/permute classique,
  // qui dégénère en grille de points sur beaucoup de GPU/navigateurs).
  float hash(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    float v = mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    return v * 2.0 - 1.0; // recentré en [-1, 1], comme un bruit simplex classique
  }

  float fbm(vec2 p){
    float f = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++){
      f += amp * noise(p);
      p *= 2.03;
      amp *= 0.5;
    }
    return f;
  }

  // Bruit "ridged" : transforme le bruit lisse en fins filaments (comme des
  // volutes de fumée) au lieu d'un dégradé flou uniforme.
  float ridge(float n){ return 1.0 - abs(n); }

  float fbmRidged(vec2 p){
    float f = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 6; i++){
      f += amp * ridge(noise(p));
      p *= 2.08;
      amp *= 0.55;
    }
    return f;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = uv * 2.6;
    p.x *= aspect;

    float t = mod(uTime, 1000.0);

    vec2 q = vec2(
      fbm(p + t * 0.05),
      fbm(p + vec2(5.2, 1.3) + t * 0.045)
    );
    vec2 r = vec2(
      fbm(p + 3.4 * q + vec2(1.7, 9.2) + t * 0.035),
      fbm(p + 3.4 * q + vec2(8.3, 2.8) + t * 0.03)
    );
    float n = fbmRidged(p + 4.0 * r);

    float smoke = pow(smoothstep(0.52, 0.72, n), 2.2);
    vec3 col = mix(vec3(0.05, 0.0, 0.0), vec3(0.85, 0.1, 0.08), smoke);
    col = mix(col, vec3(1.0, 0.35, 0.22), smoothstep(0.82, 1.0, smoke) * 0.5);

    // Vide au centre (là où se trouve le texte du hero), fumée surtout
    // visible tout autour, et qui se dissipe encore avant les bords.
    vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
    float distFromCenter = length(centered);
    float centerHole = smoothstep(0.1, 0.6, distFromCenter);
    float edgeFade = smoothstep(1.15, 0.55, distFromCenter);
    float vig = centerHole * edgeFade;

    float alpha = smoke * 0.16 * vig;

    gl_FragColor = vec4(col * alpha, alpha);
  }
`

function compileShader(gl, type, src) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
  }
  return shader
}

export function initSmoke(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false })
  if (!gl) return () => {}

  const program = gl.createProgram()
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERT_SRC))
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC))
  gl.linkProgram(program)
  gl.useProgram(program)

  const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)

  const aPos = gl.getAttribLocation(program, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const uResolution = gl.getUniformLocation(program, 'uResolution')
  const uTime = gl.getUniformLocation(program, 'uTime')

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = canvas.clientWidth * dpr
    canvas.height = canvas.clientHeight * dpr
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
  resize()
  window.addEventListener('resize', resize)

  let rafId
  const start = performance.now()
  function frame(now) {
    const t = (now - start) / 1000
    gl.uniform2f(uResolution, canvas.width, canvas.height)
    gl.uniform1f(uTime, t)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    rafId = requestAnimationFrame(frame)
  }
  rafId = requestAnimationFrame(frame)

  return function stop() {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', resize)
  }
}
