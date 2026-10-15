// Home hero backdrop: a starfield over the curve of a planet, drawn on a 2D canvas behind the copy and vials.
// Motion: the whole starfield drifts slowly in one direction (leftward), nearer stars a little faster, wrapping
// around the edges. Nothing follows the pointer. Reduced-motion users get a still sky.
// The canvas is sized to its dark band, so nothing reaches past it. <canvas data-planet="off"> draws the stars only
// (used on the affiliate page).
(function () {
  const canvas = document.querySelector(".hero-space");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ICE = "124,196,255";
  const planet = canvas.dataset.planet !== "off";

  let w = 0, h = 0, dpr = 1, stars = [];
  // seeded so the sky is the same on every visit
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  const layout = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    seed = 7;
    stars = Array.from({ length: Math.round((w * h) / 2600) }, () => {
      const depth = rand();                      // 0 far … 1 near: nearer stars are bigger, brighter and drift faster
      return { x: rand() * w, y: rand() * h, r: 0.35 + depth * depth * 1.1, a: 0.25 + depth * 0.6, depth, v: 2 + depth * 6 }; // v: px/s
    });
  };

  // seconds of drift so far; only advances while the sky is on screen, so it never jumps
  let t = 0, last = 0;
  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    for (const s of stars) {
      let x = (s.x - t * s.v) % w, y = (s.y - t * s.v * 0.12) % h;   // leftward, very slightly upward
      if (x < 0) x += w; if (y < 0) y += h;
      ctx.globalAlpha = s.a; ctx.fillStyle = "#cfe9ff";
      ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!planet) return;

    // planet: a huge circle low in the band, its crown under the vials
    const R = Math.max(w, h * 1.6) * 0.95, apexX = w * (w > 860 ? 0.76 : 0.5), apexY = h * (w > 860 ? 0.84 : 0.86);
    const cx = apexX, cy = apexY + R;
    // dawn: soft light pooled above the horizon
    const dawn = ctx.createRadialGradient(cx, apexY / 0.32, 0, cx, apexY / 0.32, w * 0.55); // drawn in the squashed space below
    dawn.addColorStop(0, `rgba(${ICE},.22)`); dawn.addColorStop(0.4, `rgba(${ICE},.07)`); dawn.addColorStop(1, `rgba(${ICE},0)`);
    ctx.save(); ctx.scale(1, 0.32); ctx.fillStyle = dawn; ctx.fillRect(0, 0, w, h / 0.32); ctx.restore();
    // haze: glow hugging the limb, fading out into space
    const haze = ctx.createRadialGradient(cx, cy, R, cx, cy, R + 70);
    haze.addColorStop(0, `rgba(${ICE},.32)`); haze.addColorStop(0.35, `rgba(${ICE},.1)`); haze.addColorStop(1, `rgba(${ICE},0)`);
    ctx.fillStyle = haze; ctx.beginPath(); ctx.arc(cx, cy, R + 70, 0, Math.PI * 2); ctx.fill();
    // night side
    ctx.fillStyle = "#04070a"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    // hairline rim, brightest at the crown and fading toward the edges of the band
    const rim = ctx.createLinearGradient(0, 0, w, 0);
    const c = apexX / w;
    rim.addColorStop(0, `rgba(${ICE},.15)`); rim.addColorStop(Math.max(0, c - 0.3), `rgba(${ICE},.55)`);
    rim.addColorStop(c, "rgba(230,245,255,1)"); rim.addColorStop(Math.min(1, c + 0.3), `rgba(${ICE},.55)`); rim.addColorStop(1, `rgba(${ICE},.15)`);
    ctx.save(); ctx.strokeStyle = rim; ctx.lineWidth = 1.6; ctx.shadowColor = `rgba(${ICE},.9)`; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  };

  let raf = 0, visible = true;
  const tick = (now) => {
    t += Math.min(0.1, last ? (now - last) / 1000 : 0); last = now;
    draw();
    // keep drifting while the hero is on screen and the tab is visible
    raf = visible && !document.hidden ? requestAnimationFrame(tick) : (last = 0);
  };
  const wake = () => { if (!raf && visible && !still) raf = requestAnimationFrame(tick); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(canvas);
  document.addEventListener("visibilitychange", wake);
  new ResizeObserver(() => { layout(); draw(); }).observe(canvas);
  layout(); draw(); wake();
})();
