// Home hero backdrop: a starfield over the curve of a planet, drawn on a 2D canvas behind the copy and vials.
// The only motion is parallax: stars (in three depth layers) and the planet drift slightly with the pointer.
// The canvas is sized to the hero, so nothing reaches past the dark band.
(function () {
  const canvas = document.querySelector(".hero-space");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ICE = "124,196,255";

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
      const depth = rand();                      // 0 far … 1 near: nearer stars are bigger, brighter and move more
      return { x: rand() * w, y: rand() * h, r: 0.35 + depth * depth * 1.1, a: 0.25 + depth * 0.6, depth };
    });
  };

  // pointer, eased; -1…1 from the viewport centre
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  if (!still) addEventListener("pointermove", (e) => { target.x = e.clientX / innerWidth * 2 - 1; target.y = e.clientY / innerHeight * 2 - 1; });

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    for (const s of stars) {
      const k = 6 + s.depth * 22;
      let x = (s.x - cur.x * k) % w, y = (s.y - cur.y * k * 0.6) % h;
      if (x < 0) x += w; if (y < 0) y += h;
      ctx.globalAlpha = s.a; ctx.fillStyle = "#cfe9ff";
      ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // planet: a huge circle low in the band, its crown under the vials
    const R = Math.max(w, h * 1.6) * 0.95, apexX = w * (w > 860 ? 0.76 : 0.5) - cur.x * 8, apexY = h * (w > 860 ? 0.84 : 0.86) - cur.y * 5;
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
  const tick = () => {
    cur.x += (target.x - cur.x) * 0.06; cur.y += (target.y - cur.y) * 0.06;
    draw();
    // keep going only while the hero is on screen and the parallax is still settling
    raf = visible && (Math.abs(target.x - cur.x) > 0.0005 || Math.abs(target.y - cur.y) > 0.0005) ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => { if (!raf && visible) raf = requestAnimationFrame(tick); };
  addEventListener("pointermove", wake);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(canvas);
  new ResizeObserver(() => { layout(); draw(); }).observe(canvas);
  layout(); draw();
})();
