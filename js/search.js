let data = [];
let shown = [];   // hasil pencarian yang sedang tampil (urutan untuk tombol sebelumnya/berikutnya)
let current = -1; // indeks profil yang sedang dibuka di dalam `shown`
const input = document.getElementById("searchInput");
const results = document.getElementById("results");
const count = document.getElementById("count");
const dialog = document.getElementById("profile");

fetch("data/mahasiswa.json")
  .then(r => r.json())
  .then(json => {
    data = json;
    const params = new URLSearchParams(location.search);
    // ?q=... di URL langsung diisi ke kotak pencarian
    input.value = params.get("q") || "";
    search();
    // ?nim=... di URL langsung membuka profil orang itu
    const i = shown.findIndex(m => m.nim === (params.get("nim") || "").toUpperCase());
    if (i >= 0) openProfile(i);
  })
  .catch(() => {
    count.textContent = "Gagal memuat data. Buka lewat web server (mis. Live Server), bukan file://";
  });

const escapeHtml = s => String(s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Tandai setiap kata kunci yang cocok dengan <mark>
function highlight(text, words) {
  if (!words.length) return escapeHtml(text);
  const pattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return text.split(new RegExp(`(${pattern})`, "gi"))
    .map((part, i) => i % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part))
    .join("");
}

function render(list, words) {
  shown = list;
  count.textContent = words.length
    ? `${list.length} dari ${data.length} orang ditemukan`
    : `${data.length} orang`;
  if (!list.length) {
    results.innerHTML = `<p class="empty">Tidak ada nama atau NIM yang cocok.</p>`;
    return;
  }
  results.innerHTML = list.map((m, i) =>
    `<button type="button" class="card" data-index="${i}" aria-haspopup="dialog">
      ${avatar(m)}
      <span class="info"><strong>${highlight(m.nama, words)}</strong><span class="nim">${highlight(m.nim, words)}</span></span>
      <span class="no">${m.no}</span>
    </button>`
  ).join("");
}

const initialsOf = m => escapeHtml(m.nama.split(" ").slice(0, 2).map(w => w[0]).join(""));

// Foto dari data/mahasiswa.json; tanpa foto (atau gagal dimuat) tampil inisial nama
function avatar(m, cls = "photo", lazy = true) {
  const initials = initialsOf(m);
  if (!m.foto) return `<span class="${cls}">${initials}</span>`;
  return `<span class="${cls}"><img src="${escapeHtml(m.foto)}" alt="Foto ${escapeHtml(m.nama)}"${lazy ? ' loading="lazy"' : ""}
    onerror="this.parentNode.textContent='${initials}'"></span>`;
}

// Setiap kata harus ada di nama atau NIM (urutan bebas, huruf besar/kecil diabaikan)
function search() {
  const words = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  render(data.filter(m => {
    const text = `${m.nama} ${m.nim}`.toLowerCase();
    return words.every(w => text.includes(w));
  }), words);
}

input.addEventListener("input", search);

/* ---------- Popup profil ---------- */

results.addEventListener("click", e => {
  const card = e.target.closest(".card");
  if (card) openProfile(+card.dataset.index);
});

function fillProfile(m) {
  dialog.querySelector(".profile-photo").outerHTML = avatar(m, "profile-photo", false);
  dialog.querySelector("#profile-name").textContent = m.nama;
  dialog.querySelector(".profile-nim").textContent = m.nim;
  dialog.querySelector("[data-field=no]").textContent = m.no;
  dialog.querySelector("[data-field=nim]").textContent = m.nim;
  dialog.querySelector(".profile-pos").textContent = `${current + 1} / ${shown.length}`;
  dialog.querySelector("[data-act=prev]").disabled = current <= 0;
  dialog.querySelector("[data-act=next]").disabled = current >= shown.length - 1;
  // Tautan yang bisa dibagikan: search.html?nim=H1D026xxx
  const url = new URL(location.href);
  url.searchParams.delete("q");
  url.searchParams.set("nim", m.nim);
  history.replaceState(null, "", url);
}

function openProfile(i) {
  current = i;
  fillProfile(shown[i]);
  dialog.classList.remove("closing");
  if (!dialog.open) dialog.showModal();
}

// Ganti orang di dalam popup dengan animasi geser
function step(dir) {
  const i = current + dir;
  if (i < 0 || i >= shown.length) return;
  const body = dialog.querySelector(".profile-card");
  body.classList.remove("slide-next", "slide-prev");
  void body.offsetWidth; // restart animasi
  current = i;
  fillProfile(shown[i]);
  body.classList.add(dir > 0 ? "slide-next" : "slide-prev");
}

// Tutup dengan animasi keluar dulu, baru dialog benar-benar ditutup
function closeProfile() {
  if (!dialog.open || dialog.classList.contains("closing")) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const done = () => {
    dialog.classList.remove("closing");
    dialog.close();
    const url = new URL(location.href);
    url.searchParams.delete("nim");
    history.replaceState(null, "", url);
    results.querySelector(`[data-index="${current}"]`)?.focus();
  };
  if (reduce) return done();
  dialog.classList.add("closing");
  // Abaikan animationend dari elemen di dalam popup, tunggu animasi dialog itu sendiri
  dialog.addEventListener("animationend", function onEnd(e) {
    if (e.target !== dialog) return;
    dialog.removeEventListener("animationend", onEnd);
    done();
  });
}

dialog.addEventListener("click", e => {
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "close" || e.target === dialog) closeProfile(); // tombol X atau klik di luar kartu
  if (act === "prev") step(-1);
  if (act === "next") step(1);
  if (act === "copy") {
    navigator.clipboard?.writeText(location.href).then(() => {
      e.target.textContent = "Tautan disalin ✓";
      setTimeout(() => (e.target.textContent = "Salin tautan profil"), 1800);
    });
  }
});

dialog.addEventListener("cancel", e => { e.preventDefault(); closeProfile(); }); // tombol Esc
dialog.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
});
