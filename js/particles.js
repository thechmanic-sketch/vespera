/* Floating gold dust behind the hero. Lightweight 2D canvas, pauses when off screen. */
(() => {
  const canvas = document.querySelector(".hero__dust");
  if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0, h = 0, dpr = 1, running = true, raf = 0;
  const mouse = { x: 0, y: 0, active: false };
  const parts = [];

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.round(Math.min(90, (w * h) / 14000));
    while (parts.length < target) parts.push(make());
    parts.length = target;
  };
  const make = () => ({
    x: Math.random() * (w || 1), y: Math.random() * (h || 1),
    r: Math.random() * 1.8 + 0.4, vy: -(Math.random() * 0.25 + 0.05), vx: (Math.random() - 0.5) * 0.15,
    a: Math.random() * 0.6 + 0.2, tw: Math.random() * Math.PI * 2,
  });

  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.tw += 0.02;
      p.x += p.vx; p.y += p.vy;
      if (mouse.active) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 14000) { const f = (1 - d2 / 14000) * 0.9; p.x += (dx / Math.sqrt(d2 + 1)) * f; p.y += (dy / Math.sqrt(d2 + 1)) * f; }
      }
      if (p.y < -6) { p.y = h + 6; p.x = Math.random() * w; }
      if (p.x < -6) p.x = w + 6; else if (p.x > w + 6) p.x = -6;
      const alpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 226, 170, ${alpha})`;
      ctx.shadowColor = "rgba(255, 214, 140, .8)"; ctx.shadowBlur = p.r * 5;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    if (running) raf = requestAnimationFrame(tick);
  };

  canvas.parentElement.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
  });
  canvas.parentElement.addEventListener("pointerleave", () => { mouse.active = false; });

  new IntersectionObserver(([e]) => {
    running = e.isIntersecting;
    if (running) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
  }).observe(canvas);

  window.addEventListener("resize", resize);
  resize(); tick();
})();
