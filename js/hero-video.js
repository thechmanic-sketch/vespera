/* Hero background video: loops forever. The clip starts on Amara and ends in the candlelit library, so a plain
   loop would jump. Instead the whole media layer dips to black just before the end, the clip restarts, and it
   fades back in. The poster photo (the clip's first frame) shows until the video can play.
   Stays off for visitors who prefer reduced motion or have data saver on, and pauses when scrolled away. */
(() => {
  const media = document.querySelector(".hero__media");
  const video = document.querySelector(".hero__video");
  if (!media || !video) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const conn = navigator.connection || {};
  if (reduce || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "")) { video.remove(); return; }

  const DIP_BEFORE_END = 0.95; // seconds before the end when the dip to black begins
  let visible = true, started = false, dipping = false;

  const start = () => {
    dipping = false;
    video.currentTime = 0;
    const p = video.play();
    if (p && p.catch) p.catch(() => { /* autoplay blocked: the poster photo simply stays */ });
  };

  video.addEventListener("playing", () => { video.classList.add("is-on"); media.classList.remove("is-dim"); });

  video.addEventListener("timeupdate", () => {
    if (!dipping && video.duration && video.currentTime >= video.duration - DIP_BEFORE_END) {
      dipping = true;
      media.classList.add("is-dim");                 // fade the layer to black
      setTimeout(() => { if (visible) start(); }, DIP_BEFORE_END * 1000 + 150); // restart once fully dark
    }
  });
  video.addEventListener("ended", () => { if (visible && !dipping) { media.classList.add("is-dim"); setTimeout(start, 400); } });
  video.addEventListener("error", () => video.remove());

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!visible) { video.pause(); return; }
    if (!started) { started = true; video.preload = "auto"; setTimeout(start, 3200); }
    else if (video.paused) video.play().catch(() => {});
  }, { threshold: 0.25 }).observe(media);
})();
