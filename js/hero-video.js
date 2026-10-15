/* Hero video: Amara sprays the perfume. It plays over the still photo (the video's first frame IS the photo),
   fades back to the photo when it ends, then replays after a pause. It stays off for visitors who prefer reduced
   motion or have data saver on, and it pauses whenever the hero is off screen. */
(() => {
  const video = document.querySelector(".hero__video");
  if (!video) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const conn = navigator.connection || {};
  if (reduce || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "")) { video.remove(); return; }

  const PAUSE_MS = 7000; // time on the still photo between plays
  let timer = 0, visible = true, started = false;

  const play = () => {
    if (!visible) return;
    video.currentTime = 0;
    const p = video.play();
    if (p && p.catch) p.catch(() => { /* autoplay blocked: the photo stays, nothing breaks */ });
  };

  video.addEventListener("playing", () => video.classList.add("is-on"));
  video.addEventListener("ended", () => {
    video.classList.remove("is-on");           // fade back to the matching still photo
    clearTimeout(timer);
    timer = setTimeout(play, PAUSE_MS);
  });
  video.addEventListener("error", () => video.remove());

  // Start once the intro has finished and the hero is on screen; pause when it scrolls away.
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!visible) { clearTimeout(timer); video.pause(); return; }
    if (!started) { started = true; video.preload = "auto"; setTimeout(play, 3500); }
    else if (video.paused && !video.ended) video.play().catch(() => {});
    else if (video.ended) { clearTimeout(timer); timer = setTimeout(play, 1500); }
  }, { threshold: 0.35 }).observe(video);
})();
