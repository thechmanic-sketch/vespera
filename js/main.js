(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const loader = document.querySelector(".loader");

  // Split text into spans we can animate.
  const splitChars = (el) => {
    const text = el.textContent.trim();
    el.textContent = "";
    el.setAttribute("aria-label", text);
    [...text].forEach((ch) => {
      const s = document.createElement("span");
      s.className = "char";
      s.setAttribute("aria-hidden", "true");
      s.textContent = ch === " " ? " " : ch;
      el.appendChild(s);
    });
    return el.querySelectorAll(".char");
  };
  const splitWords = (el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach((w, i) => {
      const s = document.createElement("span");
      s.className = "word";
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return el.querySelectorAll(".word");
  };

  const showCounts = () =>
    document.querySelectorAll("[data-count]").forEach((el) => (el.textContent = el.dataset.count + (el.dataset.suffix || "")));

  // If the CDN scripts fail or motion is reduced, show the page plainly.
  if (!window.gsap || !window.ScrollTrigger || reduce) {
    loader && loader.remove();
    document.querySelectorAll(".word").forEach((w) => (w.style.opacity = 1));
    showCounts();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Smooth scrolling.
  const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95 });
  window.__lenis = lenis; // used by the shop's bag drawer and mood cards
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id.length > 1 ? document.querySelector(id) : null;
      if (id === "#top") { e.preventDefault(); lenis.scrollTo(0); }
      else if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -70 }); }
    });
  });

  // Split text.
  const loaderChars = splitChars(document.querySelector(".loader__word"));
  document.querySelectorAll("[data-words]").forEach(splitWords);

  // ---------- Intro ----------
  const heroLines = document.querySelectorAll(".hero__line");
  gsap.set(heroLines, { yPercent: 60, opacity: 0 });
  gsap.set([".hero__sub", ".hero__cta", ".nav"], { opacity: 0, y: 20 });

  const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
  intro
    .from(loaderChars, { yPercent: 100, opacity: 0, duration: 1, stagger: 0.07 })
    .to(".loader__bar span", { scaleX: 1, duration: 1.2, ease: "power2.inOut" }, "<0.2")
    .to(loader, { yPercent: -100, duration: 1.1, ease: "power4.inOut" }, "+=0.15")
    .add(() => lenis.start(), "<0.6")
    .to(heroLines, { yPercent: 0, opacity: 1, duration: 1.3, stagger: 0.15 }, "<0.3")
    .to([".hero__sub", ".hero__cta", ".nav"], { opacity: 1, y: 0, duration: 1, stagger: 0.12 }, "<0.7")
    .set(loader, { display: "none" });

  // ---------- Hero parallax ----------
  gsap.to(".hero__copy", {
    yPercent: -14, opacity: 0.15, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "35% top", end: "bottom top", scrub: true },
  });

  // ---------- Section reveals ----------
  const rise = (targets, trigger, opts = {}) =>
    gsap.from(targets, {
      y: 50, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger, start: "top 82%" }, ...opts,
    });
  rise(".moods .section-head > *", ".moods .section-head");
  rise(".mood", ".mood-grid", { stagger: 0.1 });
  rise(".shop .section-head > *", ".shop .section-head");
  rise(".panel", ".panel", { stagger: 0 });
  rise(".product", ".products", { stagger: 0.1 });
  rise(".how__intro > *", ".how__intro");
  rise(".glass", ".steps", { stagger: 0.14 });
  rise(".note", ".notes", { stagger: 0.18 });
  rise(".bottle__copy > *", ".bottle__copy");
  rise(".reserve > *", ".reserve", { y: 40, stagger: 0.14 });

  // ---------- Manifesto word reveal ----------
  gsap.to(".manifesto .word", {
    opacity: 1, stagger: 0.06, ease: "none",
    scrollTrigger: { trigger: ".manifesto__text", start: "top 78%", end: "bottom 55%", scrub: true },
  });

  // ---------- Stats count-up ----------
  document.querySelectorAll("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count), suffix = el.dataset.suffix || "", o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 1.8, ease: "power2.out",
      onUpdate: () => (el.textContent = Math.round(o.v) + suffix),
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });

  // ---------- Parallax images ----------
  gsap.fromTo(".scent__media img", { yPercent: -8 }, {
    yPercent: 8, ease: "none",
    scrollTrigger: { trigger: ".scent__media", start: "top bottom", end: "bottom top", scrub: true },
  });
  gsap.fromTo(".bottle__img", { y: 70, scale: 0.96 }, {
    y: -40, scale: 1.02, ease: "none",
    scrollTrigger: { trigger: ".bottle__stage", start: "top bottom", end: "bottom top", scrub: true },
  });

  // ---------- Campaign: pinned horizontal scroll on desktop ----------
  const mm = gsap.matchMedia();
  mm.add("(min-width: 801px)", () => {
    const track = document.querySelector(".campaign__track");
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 80);
    gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: {
        trigger: ".campaign__pin", start: "top top", end: () => "+=" + dist(),
        pin: true, scrub: 0.6, invalidateOnRefresh: true,
      },
    });
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
