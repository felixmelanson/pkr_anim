'use strict';
/* GPU version of the cell textures (texture.js): the same "rim" and "glow edges" maths as rimEdges / glowEdges, run as WebGL2
   shaders, so a textured element never leaves the graphics card (the CPU version reads every pixel back, which is what made
   the live culture scenes run at 1-3 fps).

   texLayerGL(src, w, h, P, px) draws the LINE layer of one element into TEXGL.canvas (top-left w × h, premultiplied), ready to
   be added ('lighter') over the body. The body itself (the original at P.mix) is a plain 2D drawImage with a brightness filter.
   Same inputs as the CPU path: the element's unpremultiplied colour (texImage2D, no premultiply), the same thresholds in
   0..255 units, the same binomial smoothing (n passes of [1 2 1] done as one exact separable kernel), the same neighbourhood
   colour search. ?texgpu=0 forces the CPU path; offline renders (?render=1) keep the CPU path unless ?texgpu=1, so the videos
   stay exactly as they were. Falls back to the CPU path if WebGL2 or float render targets are missing. */
const TEXGL = (() => {
  const q = new URLSearchParams(location.search), want = q.get('texgpu') != null ? q.get('texgpu') !== '0' : q.get('render') !== '1';
  if (!want) return null;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, alpha: true });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;
  const VS = `#version 300 es
in vec2 p; void main() { gl_Position = vec4(p, 0., 1.); }`;
  const prog = fs => {
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i), nm = a.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  };
  const HEAD = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
out vec4 o;`;
  // raw colour (0..255) for the glow's smoothing, and the rim's coverage field, from the element's pixels
  const P_PREP = prog(HEAD + `
uniform sampler2D D; uniform float L0; uniform int mode;      // mode 0: rgb (glow), 1: coverage (rim)
void main() { ivec2 i = ivec2(gl_FragCoord.xy); vec4 d = texelFetch(D, i, 0) * 255.;
  if (mode == 0) o = vec4(d.rgb, 0.); else { float l = (d.r + d.g + d.b) / 3.; o = vec4(d.a / 255. * clamp((l - L0) / 20., 0., 1.), 0., 0., 0.); } }`);
  // one axis of the binomial kernel; texels outside the area repeat the edge (as smooth121 keeps its border)
  const P_BLUR = prog(HEAD + `
uniform sampler2D S; uniform ivec2 dir; uniform int n; uniform float wt[64]; uniform ivec2 sz;
void main() { ivec2 i = ivec2(gl_FragCoord.xy); vec4 a = vec4(0.);
  for (int k = -n; k <= n; k++) { ivec2 j = clamp(i + dir * k, ivec2(0), sz - 1); a += wt[k + n] * texelFetch(S, j, 0); }
  o = a; }`);
  // sobel magnitude of the mean smoothed colour (the glow's M)
  const P_SOBEL = prog(HEAD + `
uniform sampler2D S; uniform ivec2 sz;
float T(ivec2 i) { vec3 c = texelFetch(S, i, 0).rgb; return (c.r + c.g + c.b) / 3.; }
void main() { ivec2 i = ivec2(gl_FragCoord.xy);
  if (i.x < 1 || i.y < 1 || i.x >= sz.x - 1 || i.y >= sz.y - 1) { o = vec4(0.); return; }
  float gx = ((T(i + ivec2(1, -1)) + 2. * T(i + ivec2(1, 0)) + T(i + ivec2(1, 1))) - (T(i + ivec2(-1, -1)) + 2. * T(i + ivec2(-1, 0)) + T(i + ivec2(-1, 1)))) * .25;
  float gy = ((T(i + ivec2(-1, 1)) + 2. * T(i + ivec2(0, 1)) + T(i + ivec2(1, 1))) - (T(i + ivec2(-1, -1)) + 2. * T(i + ivec2(0, -1)) + T(i + ivec2(1, -1)))) * .25;
  o = vec4(length(vec2(gx, gy)), gx, gy, 0.); }`);
  // the line layer: glow lines (optional) then the measured rim, combined as the CPU path does (keep the brighter, premultiplied)
  const P_LINE = prog(HEAD + `
uniform sampler2D D; uniform sampler2D S; uniform sampler2D M; uniform sampler2D C;
uniform ivec2 sz; uniform int H; uniform int glow; uniform int rim; uniform int both;
uniform float k, sat, thr, keepE, r2f; uniform float u, rimK, rimSat, rimW, mixv; uniform int R;
vec4 Dv(ivec2 i) { return texelFetch(D, i, 0) * 255.; }
void main() {
  ivec2 i = ivec2(int(gl_FragCoord.x), H - 1 - int(gl_FragCoord.y));      // row 0 = top, as the source canvas
  vec3 lp = vec3(0.); float la = 0.;                                     // premultiplied line (0..255) and its alpha (0..1)
  vec4 d = Dv(i);
  if (glow == 1 && d.a > 0. && i.x >= 1 && i.y >= 1 && i.x < sz.x - 1 && i.y < sz.y - 1) {
    vec4 mm = texelFetch(M, i, 0); float m = mm.x;
    bool ok = m > thr;
    if (ok && both == 1) { int r2 = int(r2f);                             // inner lines only: the outline is the rim's job
      for (int q = -r2; q <= r2; q++) { if (Dv(clamp(i + ivec2(q, 0), ivec2(0), sz - 1)).a < 250. || Dv(clamp(i + ivec2(0, q), ivec2(0), sz - 1)).a < 250.) { ok = false; break; } } }
    if (ok) {
      float an = atan(mm.z, mm.y); int qd = int(mod(float(int(round(an / (3.14159265 / 4.)))), 4.) + 4.) % 4;
      ivec2 dd = qd == 0 ? ivec2(1, 0) : qd == 1 ? ivec2(1, 1) : qd == 2 ? ivec2(0, 1) : ivec2(-1, 1);
      if (m < texelFetch(M, i + dd, 0).x || m < texelFetch(M, i - dd, 0).x) ok = false;
    }
    if (ok) {
      float mag = min(255., k * (m - thr)); vec3 cb = vec3(0.); float cl = -1.;
      for (int oy = -1; oy <= 1; oy++) for (int ox = -1; ox <= 1; ox++) { vec3 s = texelFetch(S, i + ivec2(ox, oy), 0).rgb; float l = s.r + s.g + s.b; if (l > cl) { cl = l; cb = s; } }
      float ca = (cb.r + cb.g + cb.b) / 3.; vec3 c = max(vec3(0.), ca + (cb - ca) * sat); float cm = max(max(c.r, c.g), max(c.b, 1.));
      vec3 lc = min(vec3(255.), c / cm * mag); float a = d.a * keepE / 255.;
      lp = lc * a; la = a;
    }
  }
  if (rim == 1 && i.x >= R + 1 && i.y >= R + 1 && i.x < sz.x - R - 1 && i.y < sz.y - R - 1) {
    float c = texelFetch(C, i, 0).x;
    bool near = c >= .01 || texelFetch(C, i + ivec2(-2, 0), 0).x >= .01 || texelFetch(C, i + ivec2(2, 0), 0).x >= .01 || texelFetch(C, i + ivec2(0, -2), 0).x >= .01 || texelFetch(C, i + ivec2(0, 2), 0).x >= .01;
    if (near) {
      float gx = (texelFetch(C, i + ivec2(1, 0), 0).x - texelFetch(C, i + ivec2(-1, 0), 0).x) * .5, gy = (texelFetch(C, i + ivec2(0, 1), 0).x - texelFetch(C, i + ivec2(0, -1), 0).x) * .5, g = length(vec2(gx, gy));
      if (g / u >= .107 / rimW) {
        float dist = (c - .5) / g * u;
        if (dist >= -3. && dist <= 5. * rimW) {
          float ny = -gy / g, t = clamp((ny + .85) / 1.1, 0., 1.), s = t * t * (3. - 2. * t);
          float peak = (.1 + .8 * s) * rimK, hw = (.5 + .5 * s) * rimW, dc = 1.2 * s + (hw - (.5 + .5 * s));
          float prof = clamp(1. - (abs(dist - dc) - hw) / .6, 0., 1.);
          if (prof > 0.) {
            int st = max(1, R >> 1); vec3 cb = vec3(0.); float cl = -1.;
            for (int oy = -R; oy <= R; oy += st) for (int ox = -R; ox <= R; ox += st) { vec4 n = Dv(i + ivec2(ox, oy)); float l = n.r + n.g + n.b; if (n.a > 128. && l > cl) { cl = l; cb = n.rgb; } }
            if (cl >= 0.) {
              float cm = max(max(cb.r, cb.g), max(cb.b, 1.)), ca = (cb.r + cb.g + cb.b) / 3.;
              vec3 v = max(vec3(0.), ca + (cb - ca) * rimSat); float vm = max(max(v.r, v.g), max(v.b, 1.));
              v *= (1. - mixv) * peak * prof * cm / vm;
              float lv = min(1., max(max(v.r, v.g), v.b) / 255.);
              if (lv > .002) { lp = min(vec3(255.), max(lp, v)); la = min(1., max(max(lp.r, lp.g), lp.b) / 255.); }
            }
          }
        }
      }
    }
  }
  o = vec4(lp / 255., la);
}`);
  // the body: the original at P.mix (rgb × mix, alpha kept), premultiplied, as the CPU path's OB
  const P_BODY = prog(HEAD + `
uniform sampler2D D; uniform int H; uniform float mixv;
void main() { ivec2 i = ivec2(int(gl_FragCoord.x), H - 1 - int(gl_FragCoord.y)); vec4 d = texelFetch(D, i, 0); o = vec4(floor(d.rgb * 255. * mixv) / 255. * d.a, d.a); }`);
  // geometry, source texture, float targets (grown, never shrunk)
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const srcTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, srcTex); for (const [k2, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k2, v);
  const RT = {}; let rtW = 0, rtH = 0, srcW = 0, srcH = 0;
  // the coverage field stays 32-bit (one channel: the rim's distance comes from its slope); colour and gradients are half floats
  const FMT = { ca: 'r32', cb: 'r32', cc: 'r32' };
  const target = (name) => {
    let t = RT[name]; if (!t) { const tex = gl.createTexture(), fb = gl.createFramebuffer(); t = RT[name] = { tex, fb, w: 0, h: 0 }; }
    if (t.w !== rtW || t.h !== rtH) {
      const keepFB = gl.getParameter(gl.FRAMEBUFFER_BINDING), keepTex = gl.getParameter(gl.TEXTURE_BINDING_2D);      // restored below: making a target must not change what is bound
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      if (FMT[name] === 'r32') gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, rtW, rtH, 0, gl.RED, gl.FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, rtW, rtH, 0, gl.RGBA, gl.HALF_FLOAT, null);
      for (const [k2, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k2, v);
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0); t.w = rtW; t.h = rtH;
      gl.bindFramebuffer(gl.FRAMEBUFFER, keepFB); gl.bindTexture(gl.TEXTURE_2D, keepTex);
    }
    return t;
  };
  const binom = n => { const w = [1]; for (let i = 0; i < 2 * n; i++) { const nx = [1]; for (let j = 1; j < w.length; j++) nx.push(w[j - 1] + w[j]); nx.push(1); w.length = 0; w.push(...nx); } const s = w.reduce((a, b) => a + b, 0); return w.map(x => x / s); };
  const BIN = {}; const weights = n => BIN[n] || (BIN[n] = (() => { const a = new Float32Array(64); binom(n).forEach((x, i) => a[i] = x); return a; })());
  const bindTex = (unit, tex, loc) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(loc, unit); };
  const draw = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // unbind the spare texture units before drawing into a target: a texture left bound on any unit that is also the render target
  // is a feedback loop, and the driver drops the draw (that left the big neurons without their rim)
  const freeUnits = (from = 1) => { for (let u = from; u < 4; u++) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, null); } gl.activeTexture(gl.TEXTURE0); };
  // separable binomial blur of `from` into `into` (via `tmp`), n passes of [1 2 1] each way
  const blur = (from, tmp, into, n, w, h) => {
    if (n <= 0) return from;
    n = Math.min(n, 31); freeUnits(); gl.useProgram(P_BLUR.p); gl.uniform1i(P_BLUR.u.n, n); gl.uniform1fv(P_BLUR.u.wt, weights(n)); gl.uniform2i(P_BLUR.u.sz, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tmp.fb); gl.uniform2i(P_BLUR.u.dir, 1, 0); bindTex(0, from.tex, P_BLUR.u.S); draw();
    gl.bindFramebuffer(gl.FRAMEBUFFER, into.fb); gl.uniform2i(P_BLUR.u.dir, 0, 1); bindTex(0, tmp.tex, P_BLUR.u.S); draw();
    return into;
  };
  // body pass, from the source already uploaded by texLayerGL (call texLayerGL first, draw its lines, then this)
  function texBodyGL(w, h, P) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, canvas.height - h, w, h); gl.disable(gl.BLEND);
    freeUnits(); gl.useProgram(P_BODY.p); bindTex(0, srcTex, P_BODY.u.D); gl.uniform1i(P_BODY.u.H, canvas.height); gl.uniform1f(P_BODY.u.mixv, P.mix); draw();
    return canvas;
  }
  function texLayerGL(src, w, h, P, px) {
    if (canvas.width < w || canvas.height < h) { canvas.width = Math.max(canvas.width, Math.ceil(w / 64) * 64); canvas.height = Math.max(canvas.height, Math.ceil(h / 64) * 64); }
    const nw = Math.max(rtW, Math.ceil(w / 64) * 64), nh = Math.max(rtH, Math.ceil(h / 64) * 64); rtW = nw; rtH = nh;
    gl.bindTexture(gl.TEXTURE_2D, srcTex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);      // the whole scratch canvas (GPU → GPU copy); texture.js sizes it to the element (bucketed)
    freeUnits(); gl.disable(gl.BLEND); gl.viewport(0, 0, w, h);
    const glow = P.mode === 'lines' || P.mode === 'both', rim = P.mode === 'rim' || P.mode === 'both';
    let S = null, M = null, C = null; const dummy = target('a');      // also bound to unused samplers in the line pass
    if (glow) {
      const a = target('a'), b = target('b'), s = target('s'); M = target('m');
      gl.useProgram(P_PREP.p); gl.uniform1i(P_PREP.u.mode, 0); bindTex(0, srcTex, P_PREP.u.D); gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb); draw();
      S = blur(a, b, s, Math.max(0, Math.round(P.sm * px / 2)), w, h);
      freeUnits(); gl.useProgram(P_SOBEL.p); gl.uniform2i(P_SOBEL.u.sz, w, h); bindTex(0, S.tex, P_SOBEL.u.S); gl.bindFramebuffer(gl.FRAMEBUFFER, M.fb); draw();
    }
    if (rim) {
      freeUnits(); const a = target('ca'), b = target('cb'), c = target('cc'), u = 1.5 / px;
      gl.useProgram(P_PREP.p); gl.uniform1i(P_PREP.u.mode, 1); gl.uniform1f(P_PREP.u.L0, P.rimL0); bindTex(0, srcTex, P_PREP.u.D); gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb); draw();
      C = blur(a, b, c, Math.max(1, Math.round(1.5 / u * P.rimW * P.rimW)), w, h);
    }
    // the line layer onto the visible canvas, top-left w × h
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, canvas.height - h, w, h);
    gl.clearColor(0, 0, 0, 0); gl.enable(gl.SCISSOR_TEST); gl.scissor(0, canvas.height - h, w, h); gl.clear(gl.COLOR_BUFFER_BIT); gl.disable(gl.SCISSOR_TEST);
    const L = P_LINE.u, u = 1.5 / px; gl.useProgram(P_LINE.p);
    bindTex(0, srcTex, L.D); bindTex(1, (S || dummy).tex, L.S); bindTex(2, (M || dummy).tex, L.M); bindTex(3, (C || dummy).tex, L.C);
    gl.uniform2i(L.sz, w, h); gl.uniform1i(L.H, canvas.height); gl.uniform1i(L.glow, glow ? 1 : 0); gl.uniform1i(L.rim, rim ? 1 : 0); gl.uniform1i(L.both, P.mode === 'both' ? 1 : 0);
    gl.uniform1f(L.k, P.k); gl.uniform1f(L.sat, P.sat); gl.uniform1f(L.thr, P.thr); gl.uniform1f(L.keepE, 1 - P.mix); gl.uniform1f(L.r2f, Math.max(2, Math.round(3 * px / 2)));
    gl.uniform1f(L.u, u); gl.uniform1f(L.rimK, P.rimK); gl.uniform1f(L.rimSat, P.rimSat); gl.uniform1f(L.rimW, P.rimW); gl.uniform1f(L.mixv, P.mix); gl.uniform1i(L.R, (4 / u | 0) || 1);
    draw();
    return canvas;
  }
  return { canvas, texLayerGL, texBodyGL, gl, RT };
})();
