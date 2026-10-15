/* Hero atmosphere on a canvas behind the headline and photo:
   - slow drifting gold smoke and fine sparks
   - gold particles that fall from the mist, land along the bottom edge and grow into small flowers
   Lightweight 2D canvas. Pauses when off screen; stays still for visitors who prefer reduced motion. */
(() => {
  const canvas = document.querySelector(".hero__dust");
  if (!canvas) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0, h = 0, dpr = 1, running = true, raf = 0, t = 0, nextDrop = 0;
  const mouse = { x: 0, y: 0, active: false };
  const sparks = [], smoke = [], drops = [], blooms = [];
  const MAX_BLOOMS = 16;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  const makeSpark = () => ({
    x: Math.random() * (w || 1), y: Math.random() * (h || 1),
    r: rnd(0.4, 2.1), vy: -rnd(0.06, 0.36), vx: rnd(-0.1, 0.1), a: rnd(0.2, 0.9), tw: Math.random() * 6.28,
  });
  const makeSmoke = () => ({
    x: Math.random() * (w || 1), y: (h || 1) * rnd(0.5, 1.1),
    r: rnd(120, 300), vy: -rnd(0.05, 0.23), vx: rnd(-0.12, 0.12), a: rnd(0.03, 0.1), ph: Math.random() * 6.28,
  });

  // A falling particle, spawned around the middle of the hero (where the bottle and mist are).
  const spawnDrop = () => {
    // The headline sits bottom-left, so the particles fall down the right side (and a little in the middle).
    const side = rnd(0.5, 0.95);
    drops.push({ x: w * side, y: h * rnd(0.35, 0.6), vy: rnd(1.4, 2.6), vx: rnd(-0.15, 0.15), r: rnd(1, 2.2), ph: Math.random() * 6.28, trail: [] });
  };

  // A flower that grows where a particle lands.
  const spawnBloom = (x, y) => {
    if (blooms.length >= MAX_BLOOMS) blooms.shift();
    const tall = Math.min(h, 900) * rnd(0.06, 0.15);
    blooms.push({ x, y, born: t, grow: rnd(2.2, 3.4), life: rnd(8, 12), tall, lean: rnd(-0.3, 0.3), petals: Math.random() < 0.5 ? 5 : 6,
      size: rnd(7, 15), hue: Math.random() < 0.65 ? "gold" : (Math.random() < 0.5 ? "cream" : "rose") });
  };

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ns = Math.round(Math.min(110, (w * h) / 12000));
    while (sparks.length < ns) sparks.push(makeSpark());
    sparks.length = ns;
    const nm = w < 700 ? 5 : 8;
    while (smoke.length < nm) smoke.push(makeSmoke());
    smoke.length = nm;
  };

  const GROUND = () => h - Math.min(40, h * 0.05);
  const colours = { gold: ["255,226,150", "226,181,74"], cream: ["255,244,222", "240,214,160"], rose: ["255,210,205", "232,160,160"] };

  const drawBloom = (b) => {
    const age = t - b.born;
    const g = ease(age / b.grow);                       // 0 -> 1 stem growth
    const open = ease((age - b.grow * 0.55) / (b.grow * 0.6)); // flower opening
    const fade = age > b.life ? 1 - ease((age - b.life) / 2) : 1;
    if (fade <= 0) { b.dead = true; return; }
    const sway = Math.sin(t * 0.9 + b.x) * 3 * g;
    const topX = b.x + b.lean * b.tall * g + sway, topY = b.y - b.tall * g;
    const [light, deep] = colours[b.hue];
    ctx.save();
    ctx.globalAlpha = fade;
    // stem
    ctx.strokeStyle = `rgba(${deep}, .6)`; ctx.lineWidth = 1.3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(b.x, b.y);
    ctx.quadraticCurveTo(b.x + b.lean * b.tall * 0.1 - 4, b.y - b.tall * g * 0.55, topX, topY); ctx.stroke();
    // a leaf
    if (g > 0.4) {
      const lx = b.x + (topX - b.x) * 0.45, ly = b.y - b.tall * g * 0.45, ls = 9 * ease((g - 0.4) / 0.6);
      ctx.fillStyle = `rgba(${deep}, .35)`;
      ctx.beginPath(); ctx.ellipse(lx + ls * 0.8, ly, ls, ls * 0.35, -0.5, 0, 6.283); ctx.fill();
    }
    // flower head
    if (open > 0) {
      const s = b.size * open;
      ctx.translate(topX, topY);
      ctx.rotate(Math.sin(t * 0.5 + b.x) * 0.08);
      ctx.shadowColor = `rgba(${deep}, .9)`; ctx.shadowBlur = 14 * open;
      for (let i = 0; i < b.petals; i++) {
        ctx.save();
        ctx.rotate((i / b.petals) * 6.283);
        const grad = ctx.createLinearGradient(0, 0, 0, -s * 1.5);
        grad.addColorStop(0, `rgba(${deep}, .95)`); grad.addColorStop(1, `rgba(${light}, .85)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.ellipse(0, -s * 0.75, s * 0.42, s * 0.8, 0, 0, 6.283); ctx.fill();
        ctx.restore();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255, 248, 225, .95)";
      ctx.beginPath(); ctx.arc(0, 0, s * 0.22, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  };

  // The smoke is soft anyway, so draw it on a quarter-size canvas and scale it up. Much cheaper per frame.
  const SM = 4;
  const smokeCanvas = document.createElement("canvas");
  const sctx = smokeCanvas.getContext("2d");

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 0;
    if (sctx) {
      const sw = Math.max(1, Math.round(w / SM)), sh = Math.max(1, Math.round(h / SM));
      if (smokeCanvas.width !== sw || smokeCanvas.height !== sh) { smokeCanvas.width = sw; smokeCanvas.height = sh; }
      sctx.clearRect(0, 0, sw, sh);
      sctx.globalCompositeOperation = "lighter";
      for (const s of smoke) {
        const a = s.a * (0.7 + 0.3 * Math.sin(t * 0.4 + s.ph));
        const x = s.x / SM, y = s.y / SM, r = s.r / SM;
        const g = sctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(226, 181, 74, ${a})`);
        g.addColorStop(1, "rgba(226, 181, 74, 0)");
        sctx.fillStyle = g;
        sctx.beginPath(); sctx.arc(x, y, r, 0, Math.PI * 2); sctx.fill();
      }
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(smokeCanvas, 0, 0, w, h);
    }
    for (const p of sparks) {
      const alpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 224, 150, ${alpha})`;
      ctx.shadowColor = "rgba(255, 210, 120, .9)"; ctx.shadowBlur = p.r * 5;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    // falling particles with a short glowing trail
    for (const d of drops) {
      ctx.shadowColor = "rgba(255, 214, 130, 1)"; ctx.shadowBlur = d.r * 7;
      d.trail.forEach((p, i) => {
        ctx.fillStyle = `rgba(255, 226, 150, ${(i / d.trail.length) * 0.45})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, d.r * 0.7, 0, 6.283); ctx.fill();
      });
      ctx.fillStyle = "rgba(255, 236, 180, .95)";
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (const b of blooms) drawBloom(b);
    ctx.globalCompositeOperation = "source-over";
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
    // falling particles -> flowers
    if (t > nextDrop) { spawnDrop(); nextDrop = t + rnd(0.45, 1.1); }
    const ground = GROUND();
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.trail.push({ x: d.x, y: d.y }); if (d.trail.length > 9) d.trail.shift();
      d.y += d.vy; d.x += d.vx + Math.sin(t * 2 + d.ph) * 0.25;
      const land = ground + rnd(-6, 14);
      if (d.y >= land) { spawnBloom(d.x, d.y); drops.splice(i, 1); }
    }
    for (let i = blooms.length - 1; i >= 0; i--) if (blooms[i].dead) blooms.splice(i, 1);
  };

  const tick = () => { step(); draw(); if (running) raf = requestAnimationFrame(tick); };

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
  tick();
})();
