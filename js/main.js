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

  // If scripts from the CDN fail or motion is reduced, show the page plainly.
  if (!window.gsap || !window.ScrollTrigger || reduce) {
    loader && loader.remove();
    document.querySelectorAll(".word").forEach((w) => (w.style.opacity = 1));
    document.documentElement.style.setProperty("--bg", "#1a2150");
    document.body.style.color = "#f8f0e5";
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Smooth scrolling.
  const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id.length > 1 ? document.querySelector(id) : null;
      if (id === "#top") { e.preventDefault(); lenis.scrollTo(0); }
      else if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -10 }); }
    });
  });

  // Split text.
  const loaderChars = splitChars(document.querySelector(".loader__word"));
  const heroChars = splitChars(document.querySelector(".hero__title span"));
  document.querySelectorAll("[data-words]").forEach(splitWords);

  // ---------- Intro ----------
  gsap.set(heroChars, { yPercent: 110, opacity: 0 });
  gsap.set(".hero__figure", { y: 80, opacity: 0, scale: 1.04 });
  gsap.set([".hero__meta > *", ".hero__scroll", ".nav"], { opacity: 0, y: 20 });

  const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
  intro
    .from(loaderChars, { yPercent: 100, opacity: 0, duration: 1, stagger: 0.07 })
    .to(".loader__bar span", { scaleX: 1, duration: 1.2, ease: "power2.inOut" }, "<0.2")
    .to(loader, { yPercent: -100, duration: 1.1, ease: "power4.inOut" }, "+=0.15")
    .add(() => lenis.start(), "<0.6")
    .to(heroChars, { yPercent: 0, opacity: 1, duration: 1.4, stagger: 0.06 }, "<0.3")
    .to(".hero__figure", { y: 0, opacity: 1, scale: 1, duration: 1.6 }, "<0.1")
    .to([".hero__meta > *", ".hero__scroll", ".nav"], { opacity: 1, y: 0, duration: 1, stagger: 0.12 }, "<0.5")
    .set(loader, { display: "none" });

  // ---------- Hero parallax ----------
  gsap.to(".hero__figure", {
    yPercent: -10, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
  gsap.to(".hero__title", {
    yPercent: 28, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
  gsap.to(".hero__bg", {
    scale: 1.15, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  // ---------- Golden hour -> night ----------
  const shift = (trigger, to) =>
    gsap.to(document.body, {
      backgroundColor: to.bg, color: to.fg, "--accent": to.accent, ease: "none",
      scrollTrigger: { trigger, start: "top 85%", end: "top 25%", scrub: true },
    });
  shift(".scent", { bg: "#e9b09a", fg: "#2a1c1a", accent: "#96662a" });
  shift(".bottle", { bg: "#2b2f66", fg: "#f8f0e5", accent: "#d9b472" });
  shift(".campaign", { bg: "#0a0e24", fg: "#f8f0e5", accent: "#d9b472" });

  // ---------- Manifesto word reveal ----------
  gsap.to(".manifesto .word", {
    opacity: 1, stagger: 0.06, ease: "none",
    scrollTrigger: { trigger: ".manifesto__text", start: "top 78%", end: "bottom 55%", scrub: true },
  });

  // ---------- Scent ----------
  gsap.fromTo(".scent__media img", { yPercent: -8 }, {
    yPercent: 8, ease: "none",
    scrollTrigger: { trigger: ".scent__media", start: "top bottom", end: "bottom top", scrub: true },
  });
  gsap.from(".note", {
    y: 50, opacity: 0, duration: 1, stagger: 0.18, ease: "power3.out",
    scrollTrigger: { trigger: ".notes", start: "top 80%" },
  });

  // ---------- Bottle ----------
  gsap.fromTo(".bottle__img", { y: 70, scale: 0.96 }, {
    y: -40, scale: 1.02, ease: "none",
    scrollTrigger: { trigger: ".bottle__stage", start: "top bottom", end: "bottom top", scrub: true },
  });
  gsap.from(".bottle__copy > *", {
    y: 40, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out",
    scrollTrigger: { trigger: ".bottle__copy", start: "top 78%" },
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

  // ---------- Reserve ----------
  gsap.from(".reserve > *", {
    y: 40, opacity: 0, duration: 1.1, stagger: 0.14, ease: "power3.out",
    scrollTrigger: { trigger: ".reserve", start: "top 70%" },
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
