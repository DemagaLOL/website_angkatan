// Pemilik: Wendra
// Easter egg: klik logo besar di beranda 5x cepat -> mode "virus" di semua halaman sampai disembuhkan
(() => {
  const KEY = "pantherion-virus", PIC = "img/easteregg.jpg", MUSIC = "img/easteregg.mp3";
  const WORDS = ["wendra", "rafly", "deki", "dzaki"];
  let w = 0;
  const word = () => WORDS[w++ % WORDS.length];
  const skip = el => el && el.closest("script, style, [data-noinfect]");

  function infectText(root) {
    // Lepas highlight pencarian dulu supaya potongan kata tidak menempel
    if (root.querySelectorAll) { root.querySelectorAll("mark").forEach(m => m.replaceWith(m.textContent)); root.normalize(); }
    if (root.nodeType === 3) { if (!skip(root.parentElement)) root.nodeValue = root.nodeValue.replace(/[\p{L}\p{N}]+/gu, word); return; }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => skip(n.parentElement) || !n.nodeValue.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    for (let n; (n = walker.nextNode());) n.nodeValue = n.nodeValue.replace(/[\p{L}\p{N}]+/gu, word);
    if (root.querySelectorAll) root.querySelectorAll("[placeholder]").forEach(el => el.placeholder = el.placeholder.replace(/[\p{L}\p{N}]+/gu, word));
  }

  function infectImages(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll("img").forEach(img => { if (!img.src.endsWith(PIC)) { img.removeAttribute("srcset"); img.src = PIC; } });
    root.querySelectorAll("a[href$='.jpg'], a[href$='.png']").forEach(a => a.href = PIC);
    // Foto profil yang tadinya cuma inisial juga ikut kena
    root.querySelectorAll(".photo, .profile-photo").forEach(s => { if (!s.querySelector("img")) s.innerHTML = `<img src="${PIC}" alt="">`; });
  }

  // Konten yang muncul belakangan (hasil pencarian, popup profil) ikut terinfeksi
  const observer = new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType === 1 && skip(n)) return;
    infectText(n); infectImages(n);
  })));

  function infect(withIntro) {
    document.documentElement.classList.add("virus");
    infectText(document.body);
    infectImages(document);
    document.title = "wendra rafly deki dzaki";
    document.querySelector("link[rel=icon]")?.setAttribute("href", PIC);
    observer.observe(document.body, { childList: true, subtree: true });

    const controls = document.createElement("div");
    controls.className = "virus-controls"; controls.dataset.noinfect = "";
    controls.innerHTML = '<button type="button" class="virus-ear">💥</button><button type="button" class="virus-sound"></button><button type="button" class="virus-cure">💊 Sembuhkan</button>';
    controls.querySelector(".virus-cure").onclick = () => window.toggleVirus();
    document.body.append(controls);
    playMusic(controls.querySelector(".virus-sound"), controls.querySelector(".virus-ear"));

    if (withIntro && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const boot = document.createElement("div");
      boot.className = "virus-boot"; boot.dataset.noinfect = "";
      boot.innerHTML = "<p>⚠ VIRUS TERDETEKSI ⚠<span>wendra.exe · rafly.dll · deki.sys · dzaki.bat</span></p>";
      document.body.append(boot);
      boot.addEventListener("animationend", () => boot.remove());
    }
  }

  // Musik latar: berulang terus, posisi lagu berlanjut saat pindah halaman, bisa dibisukan
  function playMusic(btn, earBtn) {
    const music = new Audio(MUSIC);
    music.loop = true;
    const saved = +sessionStorage.getItem(KEY + "-t") || 0;
    music.addEventListener("loadedmetadata", () => { music.currentTime = saved % (music.duration || 1); }, { once: true });
    addEventListener("pagehide", () => { if (sessionStorage.getItem(KEY)) sessionStorage.setItem(KEY + "-t", music.currentTime); });

    // Earrape: bass dinaikkan lalu suara dipecah (clipping) lewat Web Audio; tombol 💥 untuk menyalakan/mematikan
    const earrape = () => sessionStorage.getItem(KEY + "-ear") !== "0";
    let ctx, dry, wet;
    const mix = () => { if (ctx) { dry.gain.value = earrape() ? 0 : 0.7; wet.gain.value = earrape() ? 1 : 0; } };
    function setupAudio() {
      if (ctx || !window.AudioContext) return;
      ctx = new AudioContext();
      const src = ctx.createMediaElementSource(music);
      const bass = new BiquadFilterNode(ctx, { type: "lowshelf", frequency: 120, gain: 24 });
      const boost = new GainNode(ctx, { gain: 8 });
      const curve = new Float32Array(2048);
      for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / 1024 - 1) * 30);
      const shaper = new WaveShaperNode(ctx, { curve, oversample: "4x" });
      dry = new GainNode(ctx);
      wet = new GainNode(ctx);
      src.connect(dry).connect(ctx.destination);
      src.connect(bass).connect(boost).connect(shaper).connect(wet).connect(ctx.destination);
      mix();
    }

    const muted = () => sessionStorage.getItem(KEY + "-mute") === "1";
    const label = () => {
      btn.textContent = muted() ? "🔇" : "🔊";
      btn.setAttribute("aria-label", muted() ? "Nyalakan musik" : "Matikan musik");
      earBtn.classList.toggle("off", !earrape());
      earBtn.setAttribute("aria-label", earrape() ? "Matikan efek earrape" : "Nyalakan efek earrape");
      earBtn.title = earrape() ? "Earrape: NYALA" : "Earrape: MATI";
    };
    const start = () => {
      if (muted()) return Promise.resolve();
      setupAudio();
      ctx?.resume();
      return music.play();
    };
    btn.onclick = () => {
      sessionStorage.setItem(KEY + "-mute", muted() ? "0" : "1");
      muted() ? music.pause() : start().catch(() => {});
      label();
    };
    earBtn.onclick = () => {
      sessionStorage.setItem(KEY + "-ear", earrape() ? "0" : "1");
      mix();
      label();
    };
    label();
    // Browser menolak suara otomatis setelah pindah halaman; mulai di interaksi pertama
    start().catch(() => {
      const resume = () => { start().catch(() => {}); removeEventListener("pointerdown", resume); removeEventListener("keydown", resume); };
      addEventListener("pointerdown", resume);
      addEventListener("keydown", resume);
    });
  }

  window.toggleVirus = () => {
    if (sessionStorage.getItem(KEY)) { [KEY, KEY + "-t", KEY + "-mute", KEY + "-ear"].forEach(k => sessionStorage.removeItem(k)); location.reload(); }
    else { sessionStorage.setItem(KEY, "1"); infect(true); }
  };

  try { if (sessionStorage.getItem(KEY)) infect(false); } catch {}
})();
