/* Hero atmosphere on a canvas over the video:
   - slow drifting gold smoke and fine sparks
   - gold particles that fall, land along the bottom edge and grow into small flowers
   Performance first: every glow is a pre-drawn sprite stamped with drawImage (no shadowBlur, no per-frame gradients),
   and the canvas is drawn at 1x so it never fights the background video for the GPU.
   Pauses when off screen; stays still for visitors who prefer reduced motion. */
(() => {
  const canvas = document.querySelector(".hero__dust");
  if (!canvas) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0, h = 0, running = true, raf = 0, t = 0, nextDrop = 0, lastDraw = 0;
  const mouse = { x: 0, y: 0, active: false };
  const sparks = [], smoke = [], drops = [], blooms = [];
  const MAX_BLOOMS = 14;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  // ----- pre-drawn sprites -----
  const sprite = (size, stops) => {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const g = c.getContext("2d"), r = size / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    stops.forEach(([o, col]) => grad.addColorStop(o, col));
    g.fillStyle = grad; g.fillRect(0, 0, size, size);
    return c;
  };
  const GLOW = sprite(64, [[0, "rgba(255,240,200,1)"], [0.18, "rgba(255,214,130,.85)"], [0.5, "rgba(226,181,74,.22)"], [1, "rgba(226,181,74,0)"]]);
  const PUFF = sprite(128, [[0, "rgba(226,181,74,1)"], [1, "rgba(226,181,74,0)"]]);
  const PETAL = { gold: "rgba(238,196,92,.9)", cream: "rgba(255,244,222,.9)", rose: "rgba(240,176,176,.9)" };
  const STEM = { gold: "rgba(226,181,74,.6)", cream: "rgba(240,214,160,.6)", rose: "rgba(232,160,160,.6)" };

  const makeSpark = () => ({ x: Math.random() * (w || 1), y: Math.random() * (h || 1), r: rnd(1.2, 4), vy: -rnd(0.06, 0.36), vx: rnd(-0.1, 0.1), a: rnd(0.25, 0.9), tw: Math.random() * 6.28 });
  const makeSmoke = () => ({ x: Math.random() * (w || 1), y: (h || 1) * rnd(0.5, 1.1), r: rnd(140, 320), vy: -rnd(0.05, 0.23), vx: rnd(-0.12, 0.12), a: rnd(0.03, 0.1), ph: Math.random() * 6.28 });

  const spawnDrop = () => {
    // The headline sits bottom-left, so the particles fall down the right side (and a little in the middle).
    const side = rnd(0.5, 0.95);
    drops.push({ x: w * side, y: h * rnd(0.35, 0.6), vy: rnd(1.4, 2.6), vx: rnd(-0.15, 0.15), r: rnd(2.5, 4.5), ph: Math.random() * 6.28, trail: [] });
  };
  const spawnBloom = (x, y) => {
    if (blooms.length >= MAX_BLOOMS) blooms.shift();
    blooms.push({ x, y, born: t, grow: rnd(2.2, 3.4), life: rnd(8, 12), tall: Math.min(h, 900) * rnd(0.06, 0.15), lean: rnd(-0.3, 0.3),
      petals: Math.random() < 0.5 ? 5 : 6, size: rnd(7, 15), hue: Math.random() < 0.65 ? "gold" : (Math.random() < 0.5 ? "cream" : "rose") });
  };

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = Math.round(w); canvas.height = Math.round(h); // 1x on purpose
    const ns = Math.round(Math.min(70, (w * h) / 18000));
    while (sparks.length < ns) sparks.push(makeSpark());
    sparks.length = ns;
    const nm = w < 700 ? 4 : 6;
    while (smoke.length < nm) smoke.push(makeSmoke());
    smoke.length = nm;
  };

  const GROUND = () => h - Math.min(40, h * 0.05);

  const stamp = (img, x, y, size, alpha) => { ctx.globalAlpha = alpha; ctx.drawImage(img, x - size / 2, y - size / 2, size, size); };

  const drawBloom = (b) => {
    const age = t - b.born;
    const g = ease(age / b.grow);
    const open = ease((age - b.grow * 0.55) / (b.grow * 0.6));
    const fade = age > b.life ? 1 - ease((age - b.life) / 2) : 1;
    if (fade <= 0) { b.dead = true; return; }
    const topX = b.x + b.lean * b.tall * g + Math.sin(t * 0.9 + b.x) * 3 * g, topY = b.y - b.tall * g;
    ctx.globalAlpha = fade;
    ctx.strokeStyle = STEM[b.hue]; ctx.lineWidth = 1.3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(b.x, b.y);
    ctx.quadraticCurveTo(b.x + b.lean * b.tall * 0.1 - 4, b.y - b.tall * g * 0.55, topX, topY); ctx.stroke();
    if (open > 0) {
      const s = b.size * open;
      stamp(GLOW, topX, topY, s * 5, 0.55 * fade * open);        // soft glow behind the flower
      ctx.save(); ctx.translate(topX, topY); ctx.rotate(Math.sin(t * 0.5 + b.x) * 0.08);
      ctx.globalAlpha = fade; ctx.fillStyle = PETAL[b.hue];
      for (let i = 0; i < b.petals; i++) {
        ctx.save(); ctx.rotate((i / b.petals) * 6.283);
        ctx.beginPath(); ctx.ellipse(0, -s * 0.75, s * 0.42, s * 0.8, 0, 0, 6.283); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "rgba(255,248,225,.95)"; ctx.beginPath(); ctx.arc(0, 0, s * 0.22, 0, 6.283); ctx.fill();
      ctx.restore();
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    for (const s of smoke) stamp(PUFF, s.x, s.y, s.r * 2, s.a * (0.7 + 0.3 * Math.sin(t * 0.4 + s.ph)));
    for (const p of sparks) stamp(GLOW, p.x, p.y, p.r * 6, p.a * (0.6 + 0.4 * Math.sin(p.tw)));
    for (const d of drops) {
      for (let i = 0; i < d.trail.length; i++) stamp(GLOW, d.trail[i].x, d.trail[i].y, d.r * 3, (i / d.trail.length) * 0.5);
      stamp(GLOW, d.x, d.y, d.r * 6, 1);
    }
    ctx.globalCompositeOperation = "source-over";
    for (const b of blooms) drawBloom(b);
    ctx.globalAlpha = 1;
  };

  const step = () => {
    t += 0.016;
    for (const s of smoke) {
      s.x += s.vx + Math.sin(t * 0.3 + s.ph) * 0.15; s.y += s.vy;
      if (s.y < -s.r) { s.y = h + s.r * 0.6; s.x = Math.random() * w; }
    }
    for (const p of sparks) {
      p.tw += 0.02; p.x += p.vx; p.y += p.vy;
      if (mouse.active) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 14000) { const f = (1 - d2 / 14000) * 0.9; const d = Math.sqrt(d2 + 1); p.x += (dx / d) * f; p.y += (dy / d) * f; }
      }
      if (p.y < -6) { p.y = h + 6; p.x = Math.random() * w; }
      if (p.x < -6) p.x = w + 6; else if (p.x > w + 6) p.x = -6;
    }
    if (t > nextDrop) { spawnDrop(); nextDrop = t + rnd(0.45, 1.1); }
    const ground = GROUND();
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.trail.push({ x: d.x, y: d.y }); if (d.trail.length > 8) d.trail.shift();
      d.y += d.vy; d.x += d.vx + Math.sin(t * 2 + d.ph) * 0.25;
      if (d.y >= ground + rnd(-6, 14)) { spawnBloom(d.x, d.y); drops.splice(i, 1); }
    }
    for (let i = blooms.length - 1; i >= 0; i--) if (blooms[i].dead) blooms.splice(i, 1);
  };

  // Draw at most ~30 times a second, and skip frames if the device is struggling, so the video always wins.
  const tick = (now) => {
    if (running) raf = requestAnimationFrame(tick);
    if (now - lastDraw < 32) return;
    const slow = lastDraw && now - lastDraw > 70;
    lastDraw = now;
    step(); if (!slow) draw();
  };

  const host = canvas.parentElement;
  host.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
  });
  host.addEventListener("pointerleave", () => { mouse.active = false; });

  window.addEventListener("resize", resize);
  resize();
  if (reduce) { draw(); return; }
  new IntersectionObserver(([e]) => {
    running = e.isIntersecting;
    if (running) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
  }).observe(canvas);
  raf = requestAnimationFrame(tick);
})();
