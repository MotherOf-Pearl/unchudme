// Shared vial model: 10 ml-style injection vial with an Aura Pharma label.
// Used by the catalog photo renderer (tools/vials) and the live home-page hero (js/hero3d.js).
// makeVial(mark, { sleek, glass }) → { group, drawLabel({ name, option, lot }) }. Group origin sits on the floor, label faces +z.
//   mark: the site logo's MARK_PARTS path data (from app.js).
//   sleek: ice-blue anodised crimp, graphite cap, dark label.
//   glass: 'transmission' (needs an opaque backdrop — catalog photos) or 'additive' (over a transparent canvas — live hero).
//          Defaults to additive when sleek.
import * as THREE from 'three';

const BLUE = '#1f4f78', BLUE_LIGHT = '#8cc8f0', INK = '#14181f';

// ---- vial geometry (units ≈ cm/10) ----
const R = 1, BODY = 3.15;
const glassProfile = [
  [0, 0], [0.92, 0], [R, 0.07], [R, BODY], [0.96, BODY + 0.18], [0.78, BODY + 0.36], [0.62, BODY + 0.44],
  [0.62, BODY + 0.66], [0.7, BODY + 0.7], [0.7, BODY + 0.84], [0, BODY + 0.84],
].map(([x, y]) => new THREE.Vector2(x, y));
const LH = 2.15, LR = R + 0.006, CW = 4096, CH = Math.round(CW * LH / (2 * Math.PI * LR));

export function makeVial(mark, { sleek = false, glass: glassMode = sleek ? 'additive' : 'transmission' } = {}) {
  const MARK = Object.fromEntries(Object.entries(mark).map(([k, d]) => [k, new Path2D(d)]));
  const group = new THREE.Group();
  // Transmission glass needs an opaque scene behind it; over a transparent canvas it renders flat grey.
  // The sleek look instead adds only the glass's reflections (black base + additive blend), so the page shows
  // through clean and the softbox streaks and fresnel edges sit on top.
  const glassMat = glassMode === 'additive'
    ? new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: 0.08, ior: 1.52, specularIntensity: 0.6,
      clearcoat: 0.3, clearcoatRoughness: 0.1, envMapIntensity: 1.1, side: THREE.DoubleSide,
      transparent: true, depthWrite: false, blending: THREE.CustomBlending, // colour adds, alpha composites "over"
      blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor })
    : new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, thickness: 0.35, ior: 1.52,
      attenuationColor: new THREE.Color(0xd5e2dd), attenuationDistance: 2.5, specularIntensity: 1,
      envMapIntensity: 1, side: THREE.DoubleSide,
    });
  // Additive glass also writes its brightness as alpha. The premultiplied canvas then composites to the same
  // rgb + (1 − a)·page as pure addition, and a transparent screenshot (the hero fallback still) keeps the glass
  // instead of dropping every pixel whose alpha was 0.
  if (glassMode === 'additive') glassMat.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace('#include <dithering_fragment>',
      '#include <dithering_fragment>\n\tgl_FragColor.a = clamp(max(max(gl_FragColor.r, gl_FragColor.g), gl_FragColor.b), 0.0, 1.0);');
  };
  const glass = new THREE.Mesh(new THREE.LatheGeometry(glassProfile, 128), glassMat);
  glass.castShadow = glassMode !== 'additive'; glass.renderOrder = 2; group.add(glass);

  // lyophilized cake at the bottom
  const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.34, 72), new THREE.MeshStandardMaterial({ color: sleek ? 0x9ea6a3 : 0xf7f7f4, roughness: 0.95 }));
  cake.position.y = 0.2; group.add(cake);

  // aluminium crimp seal + flip-off cap
  const crimp = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.5, 96), sleek
    ? new THREE.MeshPhysicalMaterial({ color: 0x5f9fd4, metalness: 1, roughness: 0.32, clearcoat: 0.2, clearcoatRoughness: 0.2 })
    : new THREE.MeshStandardMaterial({ color: 0xd7d9da, metalness: 1, roughness: 0.28 }));
  crimp.position.y = BODY + 0.66; crimp.castShadow = true; group.add(crimp);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.03, 12, 96), crimp.material);
  lip.rotation.x = Math.PI / 2; lip.position.y = BODY + 0.41; group.add(lip);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.77, 0.32, 96), new THREE.MeshPhysicalMaterial(sleek
    ? { color: 0x242b30, roughness: 0.45, metalness: 0.2, clearcoat: 0.3, clearcoatRoughness: 0.25 }
    : { color: 0xf2f3f2, roughness: 0.42, clearcoat: 0.3 }));
  cap.position.y = BODY + 1.07; cap.castShadow = true; group.add(cap);
  const capEdge = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.035, 12, 96), cap.material);
  capEdge.rotation.x = Math.PI / 2; capEdge.position.y = BODY + 1.23; group.add(capEdge);

  // ---- label: canvas texture wrapped round the body, front centre facing camera ----
  const lc = document.createElement('canvas'); lc.width = CW; lc.height = CH;
  const ctx = lc.getContext('2d');
  const tex = new THREE.CanvasTexture(lc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(LR, LR, LH, 160, 1, true, -Math.PI, Math.PI * 2),
    new THREE.MeshPhysicalMaterial({ map: tex, roughness: sleek ? 0.6 : 0.55, clearcoat: sleek ? 0.1 : 0.15, clearcoatRoughness: 0.2 }));
  label.position.y = 0.46 + LH / 2; group.add(label);

  // label palette: white stock for catalog photos, dark stock for the sleek look
  const L = sleek
    ? { paper: '#222b31', band: BLUE_LIGHT, band2: BLUE, ink: '#f4f6f4', sub: BLUE_LIGHT, pill: BLUE_LIGHT, pillInk: '#0f1215', fine: '#a7b0ba' }
    : { paper: '#ffffff', band: BLUE, band2: BLUE_LIGHT, ink: INK, sub: BLUE, pill: BLUE, pillInk: '#ffffff', fine: '#3f4651' };

  // the site logo (app.js markSVG) without its tile: the label paper is the night sky and hides the legs below the horizon
  function drawMark(x, y, h) {
    const s = h / 48;
    const grad = (g, stops) => { stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
    const lin = (x0, y0, x1, y1, stops) => grad(ctx.createLinearGradient(x0, y0, x1, y1), stops);
    const glow = (draw) => { ctx.save(); ctx.filter = `blur(${1.1 * s}px)`; draw(); ctx.restore(); };
    const stroke = (path, style, w, blurW) => {
      ctx.strokeStyle = style;
      if (blurW) glow(() => { ctx.lineWidth = blurW; ctx.stroke(path); });
      ctx.lineWidth = w; ctx.stroke(path);
    };
    ctx.save(); ctx.translate(x - 24 * s, y); ctx.scale(s, s); ctx.lineJoin = 'miter';
    ctx.fillStyle = grad(ctx.createRadialGradient(24, 31, 0, 24, 31, 22), [[0, 'rgba(124,196,255,.35)'], [1, 'rgba(124,196,255,0)']]);
    ctx.fillRect(-8, -4, 64, 60);
    stroke(MARK.beam, lin(0, -2, 0, 7, [[0, 'rgba(169,220,255,0)'], [1, '#fff']]), 0.7, 2.2);
    ctx.fillStyle = lin(0, 6, 0, 40, [[0, '#2b3947'], [1, '#06090d']]); ctx.fill(MARK.a);
    stroke(MARK.edge, lin(0, 5, 0, 36, [[0, '#fff'], [0.55, '#a9dcff'], [1, 'rgba(90,169,230,.25)']]), 0.75, 1.8);
    stroke(MARK.inner, 'rgba(159,212,255,.35)', 0.5);
    ctx.fillStyle = L.paper; ctx.fill(MARK.planet);
    stroke(MARK.rim, lin(-8, 0, 56, 0, [[0, 'rgba(90,169,230,0)'], [0.5, '#e6f5ff'], [1, 'rgba(90,169,230,0)']]), 0.7, 2.4);
    glow(() => { ctx.fillStyle = 'rgba(191,230,255,.55)'; ctx.beginPath(); ctx.arc(24, 30.3, 2.6, 0, Math.PI * 2); ctx.fill(); });
    stroke(MARK.flare, 'rgba(207,234,255,.7)', 0.35);
    ctx.fillStyle = '#fff'; ctx.fill(MARK.star);
    ctx.restore();
  }

  function fitText(text, font, maxW, startPx) {
    let px = startPx;
    do { ctx.font = font.replace('{px}', px); px -= 2; } while (ctx.measureText(text).width > maxW && px > 20);
  }

  function drawLabel({ name, option, lot }) {
    const cx = CW / 2, panel = 1500;          // visible front panel width in px
    ctx.fillStyle = L.paper; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = L.band; ctx.fillRect(0, 0, CW, 46); ctx.fillRect(0, CH - 46, CW, 46);
    ctx.fillStyle = L.band2; ctx.fillRect(0, 46, CW, 9); ctx.fillRect(0, CH - 55, CW, 9);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

    drawMark(cx, 150, 460);

    // compound name in a solid pill
    const pillH = 158, pillY = 612;
    ctx.letterSpacing = '4px'; fitText(name.toUpperCase(), '800 {px}px Inter', panel - 200, 108);
    const tw = ctx.measureText(name.toUpperCase()).width, pw = Math.min(panel - 80, tw + 110);
    ctx.fillStyle = L.pill; ctx.beginPath(); ctx.roundRect(cx - pw / 2, pillY, pw, pillH, 20); ctx.fill();
    ctx.fillStyle = L.pillInk; ctx.fillText(name.toUpperCase(), cx, pillY + pillH / 2 + parseInt(ctx.font.match(/(\d+)px/)[1]) * 0.36);

    if (option) {
      ctx.fillStyle = L.ink; ctx.letterSpacing = '1px';
      fitText(option, '500 {px}px Inter', panel - 240, 100);
      ctx.fillText(option, cx, 905);
    }
    ctx.fillStyle = L.sub; ctx.font = '700 50px Inter'; ctx.letterSpacing = '6px';
    ctx.fillText('FOR RESEARCH USE ONLY', cx, 1040);
    ctx.fillStyle = L.fine; ctx.font = '600 34px Inter'; ctx.letterSpacing = '3px';
    ctx.fillText(`BATCH ${lot}  ·  STORE AT −20 °C  ·  NOT FOR HUMAN USE`, cx, 1110);
    tex.needsUpdate = true;
  }

  return { group, drawLabel };
}

// studio environment: neutral grey room with two tall softboxes → vertical highlight streaks on the glass.
// `glare` scales the softboxes: 1 for the bright catalog studio, lower for the subdued dark look.
export function studioEnvironment(renderer, room = 0x8a8f8c, glare = 1) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene();
  studio.add(new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: room, side: THREE.BackSide })));
  const softbox = (x, z, w, h, k) => { k *= glare; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide })); m.position.set(x, 2, z); m.lookAt(0, 2, 0); studio.add(m); };
  softbox(-9, 6, 3, 22, 6); softbox(9, 6, 2, 22, 4); softbox(0, -12, 14, 22, 1.6);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5 * glare, 2.5 * glare, 2.5 * glare) })); top.position.y = 18; top.rotation.x = Math.PI / 2; studio.add(top);
  return pmrem.fromScene(studio, 0.02).texture;
}

export const FONTS = ['800 104px Inter', '500 100px Inter', '600 40px Inter', '700 50px Inter'];
