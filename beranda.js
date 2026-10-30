// Pemilik: Rafly
// Logo interaktif: miring mengikuti kursor / jari, klik untuk memperbesar
(() => {
  const logo = document.querySelector(".hero-logo");
  const logoImg = logo.querySelector("img");
  const hero = logo.closest(".page-hero");
  const zoom = document.querySelector(".logo-zoom");
  const zoomImg = zoom.querySelector("img");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = v => Math.max(-1, Math.min(1, v));

  // Miringkan el ke arah titik (x, y); makin dekat titiknya, makin kuat geraknya
  function tilt(el, x, y, reach) {
    const r = el.getBoundingClientRect();
    const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    const near = Math.max(0, 1 - Math.hypot(dx, dy) / reach);
    if (!near) return rest(el);
    const nx = clamp(dx / (r.width / 2)), ny = clamp(dy / (r.height / 2));
    const power = 0.4 + 0.6 * near;
    el.classList.add("tilting");
    el.style.setProperty("--ry", `${nx * 18 * power}deg`);
    el.style.setProperty("--rx", `${-ny * 18 * power}deg`);
    el.style.setProperty("--tx", `${nx * 14 * near}px`);
    el.style.setProperty("--ty", `${ny * 14 * near}px`);
    el.style.setProperty("--s", 1 + 0.06 * near);
    el.style.setProperty("--gx", `${50 + nx * 40}%`);
    el.style.setProperty("--gy", `${50 + ny * 40}%`);
  }
  function rest(el) {
    el.classList.remove("tilting");
    ["--rx", "--ry", "--tx", "--ty", "--s"].forEach(p => el.style.removeProperty(p));
  }

  // Geser jari di atas el (HP/tablet). Mengembalikan fungsi "apakah barusan digeser?"
  function touchDrag(el, target = el) {
    let start = null, dragged = false;
    el.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse") return;
      start = [e.clientX, e.clientY]; dragged = false;
      try { el.setPointerCapture(e.pointerId); } catch {}
    });
    el.addEventListener("pointermove", e => {
      if (!start) return;
      if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 10) dragged = true;
      tilt(target, e.clientX, e.clientY, Infinity);
    });
    const end = () => { if (start) { start = null; rest(target); } };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    return () => dragged;
  }

  let logoDragged = () => false, zoomDragged = () => false;
  if (!reduce) {
    hero.addEventListener("pointermove", e => {
      if (e.pointerType === "mouse") tilt(logo, e.clientX, e.clientY, logo.offsetWidth * 1.8);
    });
    hero.addEventListener("pointerleave", () => rest(logo));
    logoDragged = touchDrag(logo);
    zoom.addEventListener("pointermove", e => {
      if (e.pointerType === "mouse") tilt(zoomImg, e.clientX, e.clientY, Infinity);
    });
    zoomDragged = touchDrag(zoom, zoomImg);
  }

  // Zoom: gambar besar terbang dari posisi logo kecil ke tengah layar (dan kembali saat ditutup)
  function flight() {
    const a = logoImg.getBoundingClientRect(), b = zoomImg.getBoundingClientRect();
    const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
    return [{ transform: `translate(${dx}px, ${dy}px) scale(${a.width / b.width})`, borderRadius: "28px" }, { transform: "none" }];
  }

  function openZoom() {
    if (logoDragged()) return;
    rest(logo);
    zoom.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => zoom.classList.add("open"));
    if (!reduce) {
      logoImg.style.visibility = "hidden";
      zoomImg.animate(flight(), { duration: 600, easing: "cubic-bezier(.2,.9,.3,1.15)" });
    }
    zoom.focus();
  }

  function closeZoom() {
    if (zoom.hidden || zoomDragged()) return;
    rest(zoomImg);
    zoom.classList.remove("open");
    const done = () => {
      zoom.hidden = true;
      logoImg.style.visibility = "";
      document.body.style.overflow = "";
      logo.focus();
    };
    if (reduce) return done();
    const back = zoomImg.animate(flight().reverse(), { duration: 420, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" });
    back.onfinish = () => { done(); back.cancel(); };
  }

  // Klik sekali = zoom; 5 klik cepat berturut-turut = easter egg (lihat skrip di bawah)
  let clicks = 0, clickTimer;
  logo.addEventListener("click", () => {
    if (logoDragged()) return;
    clearTimeout(clickTimer);
    if (++clicks >= 5) { clicks = 0; return window.toggleVirus(); }
    clickTimer = setTimeout(() => { if (clicks === 1) openZoom(); clicks = 0; }, 350);
  });
  zoom.addEventListener("click", closeZoom);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeZoom(); });
})();
