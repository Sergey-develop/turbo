// turbo-appear.js — появление Speedtail «Под капотом. Турбо» для three.js (r160+). Выпуск v003.
//
// Два варианта, оба — на одном glb (машина + нити на костях, клип «appear» 25 с):
//   'macro'   «Крупный план», 7,5 с: макро над передним крылом — ленты влетают и наматываются, под ними пятном
//             проступает хром; затем плавный отъезд на общий план, нити втягиваются, машина собирается.
//   'strands' «Нити 25 с»: потоки лент прилетают с разных сторон, наматывают петли на колёса, кокон течёт;
//             колёса проявляются первыми, кузов — фрактальной волной от носа к корме; камера медленно отъезжает.
//
// Подключение:
//   import { createAppear } from './turbo-appear.js';
//   const gltf = await loader.loadAsync('TO_speedtail_appear_strands_web_v003.glb');   // loader с MeshoptDecoder
//   holder.add(gltf.scene);                 // holder — ваша группа: поворот/положение машины в сцене
//   camera.position.copy(общий_план);       // камера в «общем плане» — к нему придёт отъезд
//   const ap = createAppear(THREE, { root: gltf.scene, animations: gltf.animations, camera, target: controls.target });
//   ap.start('macro');                      // или 'strands'
//   // в цикле кадра:  const st = ap.update(секунды_от_start);  if (!st.cameraActive) controls.update();
//   //                 shadow.material.opacity = st.shadow;     // контактная тень, если есть
//   // касание/колесо мыши во время отъезда 'strands':  ap.release()  — управление сразу у зрителя
// Камера: пока st.cameraActive === true, модуль сам ставит camera.position / lookAt / fov — OrbitControls на это время
// выключить (controls.enabled = false) и не вызывать controls.update(). Глубина резкости и шлейф — по желанию:
// ap.attachPost({ bokeh: BokehPass, trail: AfterimagePass }) — модуль сам включает и крутит их во время вступления.
// В AR (WebXR, Quick Look) камерой управляет зритель: там передавать camera: null — анимация нитей и маска работают,
// ходы камеры пропускаются.

export const APPEAR_DEFAULTS = {
  // габарит модели (координаты glb: Y вверх, длина вдоль X, нос к −X, пол y = 0)
  car: { XN: -2.5685, XT: 2.5685, AXF: -1.489, AXR: 1.242, WR: 0.375, EDGE: 0.06 },
  glow: [1.0, 0.75, 0.5],                                  // цвет светящейся кромки проявления
  frac: { amp: 0.75, freqT: 1.2, ampD: 0.35, freq: 2.6, ampP: 0.5 },   // фрактальный край: языки + рваные детали, м
  wave: { T0: 17.0, T1: 24.0 },                            // 'strands': волна проявления кузова, с (с ней же нити уходят внутрь)
  wheels: { front: [4.5, 7.0], rear: [7.5, 10.0] },        // 'strands': проявление колёс, с
  dolly: { T: 24.0, k: 0.6, yaw: 0.3, ky: 0.85 },          // 'strands': отъезд камеры (старт ближе в k раз, повёрнут на yaw рад)
  macro: { T_MACRO: 3.5, T_PULL: 4.0, clip0: 3.85, clip1: 9.0, fov: 30, pt: [-1.6, 0.8], back: 0.34, up: 0.55,
           ahead: 0.08, drift: 0.10, R: 0.75, aperture: 0.03, trail: 0.3 },   // 'macro': макро → отъезд
  stripBoost: 2.4, tailBoost: 1.6,                          // яркость световой полосы и задних фонарей
};

export function createAppear(THREE, { root, animations = [], camera = null, target = null, wide = null, options = {} }) {
  const P = merge(APPEAR_DEFAULTS, options), C = P.car, M = P.macro;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const envl = (t, a, b) => ss(a, a + 0.15, t) * (1 - ss(b - 0.25, b, t));
  const grow = (a, b, t) => 1 - Math.pow(1 - clamp01((t - a) / (b - a)), 2);
  const smoother = u => u * u * u * (u * (u * 6 - 15) + 10);
  const F = v => (Math.abs(v) < 1e-9 ? '0.0' : v.toFixed(4));
  const FM = P.frac.amp + P.frac.ampD;
  const waveX = t => C.XN - 0.35 - FM + (C.XT - C.XN + 1.6 + 2 * FM) * ss(P.wave.T0, P.wave.T1, t);
  const tgt = target || new THREE.Vector3(0, 0.5, 0);

  // ---------- материалы: маска проявления (кузов и колёса), защита нитей ----------
  const U = { u_rW: { value: 0 }, u_rWr: { value: 0 }, u_xs: { value: -99 }, u_a0: { value: 0 }, u_a3: { value: 0 },
              u_pc: { value: new THREE.Vector3(0, -99, 0) }, u_pr: { value: -1 }, u_pa: { value: 0 } };
  function reveal(m, wheel) {
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vP; uniform float u_rW, u_rWr, u_xs, u_a0, u_a3, u_pr, u_pa; uniform vec3 u_pc;
        float glowE(float d, float a) { return d >= 0.0 ? (1.0 - smoothstep(0.0, ${F(C.EDGE)}, d)) * a : 0.0; }
        float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float vn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
        float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
          return clamp((s / 0.97 - 0.5) * 3.4, -1.2, 1.2); }`)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float x = vP.x, up = vP.y, e = 0.0;
        float nF = fbm(vP * ${F(P.frac.freq)} + 4.0);                                  // рваные детали края
        float d4 = u_pr - length(vP - u_pc) + ${F(P.frac.ampP)} * nF;                   // пятно из точки ('macro')
        ${wheel ? `
        float d0 = max(u_rW - length(vec2(x - (${F(C.AXF)}), up - ${F(C.WR)})), u_rWr - length(vec2(x - ${F(C.AXR)}, up - ${F(C.WR)})));
        if (d0 < 0.0 && d4 < 0.0) discard;
        e = max(glowE(d0, u_a0), glowE(d4, u_pa));` : `
        float nT = fbm(vec3(vP.y * ${F(P.frac.freqT)}, vP.z * ${F(P.frac.freqT)}, 5.3));   // крупные языки поперёк хода волны
        float d3 = u_xs - x + ${F(P.frac.amp)} * nT + ${F(P.frac.ampD)} * nF;             // волна нос → корма ('strands')
        if (d3 < 0.0 && d4 < 0.0) discard;
        e = max(glowE(d3, u_a3), glowE(d4, u_pa));`}
        gl_FragColor.rgb += vec3(${P.glow.map(F).join(', ')}) * e * 0.8;`);
    };
    m.customProgramCacheKey = () => 'turboReveal' + (wheel ? 'W' : 'B');
    m.needsUpdate = true;
  }
  function safeStrand(m) {   // кости нитей сжимаются в 0 → нулевая нормаль → NaN; свечение размазывало его на весь кадр
    m.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <skinnormal_vertex>', `#include <skinnormal_vertex>
        if (!(dot(objectNormal, objectNormal) > 1e-12)) objectNormal = vec3(0.0, 1.0, 0.0);`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (any(isnan(gl_FragColor)) || any(isinf(gl_FragColor))) gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);`);
    };
    m.customProgramCacheKey = () => 'turboStrand';
    m.needsUpdate = true;
  }
  const body = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = false;                                     // нити на костях — без отсечения
    for (const m of [].concat(o.material)) {
      if (/strand/i.test(m.name)) { m.envMapIntensity = 1.3; safeStrand(m); continue; }
      if (m.metalness > 0.5) m.envMapIntensity = 1.2;
      if (/light_strip/i.test(m.name)) m.emissiveIntensity *= P.stripBoost;
      if (/tail_light/i.test(m.name)) m.emissiveIntensity *= P.tailBoost;
      reveal(m, /wheel|caliper|tyre|tire|brake/i.test(m.name));
      if (!o.isSkinnedMesh) body.push(o);
    }
  });

  // ---------- анимация нитей ----------
  const mixer = new THREE.AnimationMixer(root);
  const clip = animations.find(a => a.name === 'appear') || animations[0];
  const action = clip ? mixer.clipAction(clip) : null;
  if (action) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play(); }
  const clipDur = clip ? clip.duration : 25;
  const setClip = tc => { if (action) { action.time = Math.min(Math.max(tc, 0), clipDur); mixer.update(0); } };

  // ---------- камера ----------
  const WIDE = { pos: new THREE.Vector3(), fov: 30 };
  const _q = new THREE.Quaternion(), _qe = new THREE.Quaternion(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
  function arcPos(out, center, off0, off1, e) {      // направление по дуге, расстояние по логарифму: отъезд на глаз равномерный
    const l0 = off0.length(), l1 = off1.length();
    const d0 = off0.clone().divideScalar(l0), d1 = off1.clone().divideScalar(l1);
    _q.setFromUnitVectors(d0, d1); _qe.identity().slerp(_q, e);
    return out.copy(d0).applyQuaternion(_qe).multiplyScalar(l0 * Math.pow(l1 / l0, e)).add(center);
  }
  const MAC = { ready: false, cam0: new THREE.Vector3(), cam1: new THREE.Vector3(), tgt0: new THREE.Vector3(), tgt1: new THREE.Vector3() };
  function macroSetup() {            // точка макро: луч сверху на кузов, со стороны камеры общего плана
    if (MAC.ready) return true;
    root.updateMatrixWorld(true);
    const camLocal = root.worldToLocal(WIDE.pos.clone());
    const side = Math.sign(camLocal.z || 1);
    const from = root.localToWorld(new THREE.Vector3(M.pt[0], 3, side * Math.abs(M.pt[1])));
    const down = root.localToWorld(new THREE.Vector3(M.pt[0], 2, side * Math.abs(M.pt[1]))).sub(from).normalize();
    const hit = new THREE.Raycaster(from, down).intersectObjects(body, false)[0];
    if (!hit) return false;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld); if (n.dot(down) > 0) n.negate();
    const fwd = new THREE.Vector3(-1, 0, 0).transformDirection(root.matrixWorld);   // к носу
    fwd.addScaledVector(n, -fwd.dot(n)).normalize();
    MAC.cam0.copy(hit.point).addScaledVector(fwd, -M.back).addScaledVector(n, M.up);
    MAC.tgt0.copy(hit.point).addScaledVector(fwd, M.ahead);
    MAC.cam1.copy(MAC.cam0).addScaledVector(fwd, M.drift);
    MAC.tgt1.copy(MAC.tgt0).addScaledVector(fwd, M.drift * 0.5);
    U.u_pc.value.copy(hit.object.worldToLocal(hit.point.clone()));
    return (MAC.ready = true);
  }
  let post = { bokeh: null, trail: null };

  // ---------- таймлайн ----------
  let variant = 'macro', camOn = false;
  const state = { t: 0, duration: 0, cameraActive: false, shadow: 0, done: false };
  function start(v = variant) {
    variant = v;
    if (camera) {
      if (wide) { WIDE.pos.copy(wide.position); WIDE.fov = wide.fov || camera.fov; }
      else if (!camOn) { WIDE.pos.copy(camera.position); WIDE.fov = camera.fov; }   // при повторе — прежний общий план
    }
    if (camera && !Number.isFinite(WIDE.pos.x + WIDE.pos.y + WIDE.pos.z)) WIDE.pos.set(5.6, 1.8, 10.0).add(tgt);   // камера ещё не поставлена — запасной общий план
    camOn = !!camera;
    state.duration = variant === 'macro' ? M.T_MACRO + M.T_PULL : clipDur;
    state.done = false;
    if (post.bokeh) post.bokeh.enabled = false; if (post.trail) post.trail.enabled = false;
  }
  function release() {                // зритель взялся за камеру
    if (!camOn) return; camOn = false;
    if (post.bokeh) post.bokeh.enabled = false; if (post.trail) post.trail.enabled = false;
  }
  function update(t) {
    state.t = t;
    if (variant === 'macro') {
      const u = clamp01((t - M.T_MACRO) / M.T_PULL), e = smoother(u);
      setClip(t < M.T_MACRO ? M.clip0 + (M.clip1 - M.clip0) * (t / M.T_MACRO) : M.clip1 + (clipDur - M.clip1) * ss(0, 1, u));
      U.u_rW.value = U.u_rWr.value = 0; U.u_xs.value = -99; U.u_a0.value = U.u_a3.value = 0;
      if (camera) macroSetup(); else if (!MAC.ready) { WIDE.pos.set(6, 2, 10); macroSetup(); }
      const p0 = -(P.frac.ampP * 1.2 + 0.08);
      U.u_pr.value = t < M.T_MACRO ? p0 + (M.R - p0) * ss(0.8, M.T_MACRO + 0.4, t) : M.R + 8.5 * Math.pow(u, 1.6);
      U.u_pa.value = 1 - ss(0.75, 1, u);
      state.shadow = u;
      if (camOn && MAC.ready && t < M.T_MACRO + M.T_PULL) {
        const dr = ss(0, M.T_MACRO + 0.3 * M.T_PULL, t);
        const p = _v.lerpVectors(MAC.cam0, MAC.cam1, dr).clone(), g = _w.lerpVectors(MAC.tgt0, MAC.tgt1, dr).clone();
        const c = g.clone().lerp(tgt, e);
        arcPos(camera.position, c, p.sub(g), WIDE.pos.clone().sub(tgt), e);
        camera.lookAt(c);
        camera.fov = M.fov + (WIDE.fov - M.fov) * e; camera.updateProjectionMatrix();
        if (post.bokeh) { post.bokeh.enabled = u < 1; post.bokeh.uniforms.focus.value = camera.position.distanceTo(c); post.bokeh.uniforms.aperture.value = M.aperture * Math.pow(1 - e, 2); }
        if (post.trail) { post.trail.enabled = u > 0 && u < 1; post.trail.uniforms.damp.value = M.trail * Math.sin(Math.PI * u); }
      } else if (camOn) finishCam();
    } else {
      setClip(t);
      U.u_pr.value = -1; U.u_pa.value = 0;
      U.u_rW.value = (C.WR + 0.06) * grow(P.wheels.front[0], P.wheels.front[1], t);
      U.u_rWr.value = (C.WR + 0.06) * grow(P.wheels.rear[0], P.wheels.rear[1], t);
      U.u_a0.value = envl(t, P.wheels.front[0], P.wheels.rear[1]);
      U.u_xs.value = waveX(t); U.u_a3.value = envl(t, P.wave.T0, P.wave.T1 + 0.6);
      state.shadow = ss(P.wheels.front[0], P.wave.T1, t);
      if (camOn && t < P.dolly.T) {
        const D = P.dolly, e = smoother(clamp01(t / D.T));
        const off1 = WIDE.pos.clone().sub(tgt);
        const off0 = off1.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), D.yaw).multiplyScalar(D.k); off0.y *= D.ky;
        arcPos(camera.position, tgt, off0, off1, e); camera.lookAt(tgt);
        if (camera.fov !== WIDE.fov) { camera.fov = WIDE.fov; camera.updateProjectionMatrix(); }
      } else if (camOn) finishCam();
    }
    state.cameraActive = camOn;
    state.done = t >= state.duration;
    return state;
  }
  function finishCam() {
    camOn = false;
    camera.position.copy(WIDE.pos); camera.fov = WIDE.fov; camera.updateProjectionMatrix(); camera.lookAt(tgt);
    if (post.bokeh) post.bokeh.enabled = false; if (post.trail) post.trail.enabled = false;
  }
  return {
    start, update, release, state, params: P,
    attachPost(p) { post = Object.assign({ bokeh: null, trail: null }, p); if (post.bokeh) post.bokeh.enabled = false; if (post.trail) post.trail.enabled = false; },
    get variant() { return variant; },
  };
}

function merge(a, b) {
  const o = Array.isArray(a) ? a.slice() : Object.assign({}, a);
  for (const k in b) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k]) ? merge(a[k], b[k]) : b[k];
  return o;
}
