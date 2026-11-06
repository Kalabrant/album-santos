/* Página del administrador: regala cualquier cromo en persona.
   Solo funciona en el móvil donde se creó la llave privada (nunca sale de ese móvil ni está en el repositorio). */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const { santos: SANTOS } = window.ALBUM;
  const BY_N = new Map(SANTOS.map((s) => [s.n, s]));
  const IMGS = window.IMAGENES || {}, IMG_V = window.IMAGENES_V || 1;
  const KEY = "album-santos-admin-key", LOG = "album-santos-admin-log";
  const PUB = { kty: "EC", crv: "P-256", x: "601f9JILOxEwepe20Mgb9n0dVmCfIIlEfd3vhUtvbiE", y: "swU4SBcUXc-DWx1hEvR1JOmClFvL6sbJOofITcnbDiI" }; // se rellena con el código que da la página
  const APP_URL = location.origin + location.pathname.replace(/admin\.html$/, "");
  const RE_REQ = /SANTOS1R\.([A-Z0-9]{10})\.([A-Z0-9]{8})/;
  const b64u = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const toast = (m, ms = 3000) => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms); };

  // La llave se crea en este móvil y nunca sale de él. Solo su parte pública va en la app.
  const KEYPUB = KEY + "-pub";
  let d = null, mine = null; try { d = localStorage.getItem(KEY); mine = localStorage.getItem(KEYPUB); } catch {}
  const pubCode = () => mine;
  if (!d || !mine || mine !== PUB.x + "." + PUB.y) {
    $("#adm").innerHTML = d && mine
      ? `<div class="locked"><div style="font-size:48px">🔑</div><h1>Falta activar tu llave</h1><p>Copia este código y mándaselo a Claude para que lo active en la app:</p>
          <p style="word-break:break-all;background:var(--card);padding:12px;border-radius:12px;font-family:monospace;font-size:13px;color:var(--ink)" id="pc">${esc(mine)}</p>
          <button class="btn btn-primary" id="copy">Copiar código</button></div>`
      : `<div class="locked"><div style="font-size:48px">🔒</div><p>Esta página es solo para el administrador del álbum.</p>
          ${PUB.x === "PENDIENTE" ? `<button class="btn btn-ghost btn-small" id="mk" style="margin-top:20px">Crear llave en este móvil</button>` : ""}</div>`;
    document.addEventListener("click", async (e) => {
      if (e.target.closest("#mk")) {
        const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
        const j = await crypto.subtle.exportKey("jwk", k.privateKey);
        try { localStorage.setItem(KEY, j.d); localStorage.setItem(KEYPUB, j.x + "." + j.y); } catch {}
        location.reload();
      }
      if (e.target.closest("#copy")) { try { await navigator.clipboard.writeText(mine); toast("Copiado"); } catch { toast("Mantén pulsado el código para copiarlo"); } }
    });
    return;
  }
  let keyP = crypto.subtle.importKey("jwk", { ...PUB, d, ext: true }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  async function sign(text) { const k = await keyP; return b64u(new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, new TextEncoder().encode(text)))); }

  let preReq = null; // código de la persona ya leído con la cámara del móvil (enlace #dar=)
  { const hd = RE_REQ.exec(decodeURIComponent(location.hash || "")); if (hd) { preReq = hd[0]; history.replaceState(null, "", location.pathname); } }
  const showPre = () => { const el = $("#pre"); if (el) el.style.display = preReq ? "" : "none"; };
  const lab = (s) => s.l || s.n;
  const img = (n) => IMGS[n] ? `img/santos/${String(n).padStart(3, "0")}.${IMGS[n]}?v=${IMG_V}` : "icons/icon-192.png";
  let q = "";
  function render() {
    const norm = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const list = SANTOS.filter((s) => !q || String(s.n) === q || (s.l && s.l.toLowerCase() === q.toLowerCase()) || norm(s.name + " " + s.short).includes(norm(q)));
    $("#grid").innerHTML = list.map((s) => `<div class="adm-c ${s.e ? "esp" : ""}" data-n="${s.n}"><img loading="lazy" src="${img(s.n)}" alt=""><b>${esc(lab(s))}</b><span>${esc(s.short)}</span></div>`).join("") || `<p class="sub">Nada con esa búsqueda.</p>`;
  }
  let log = []; try { log = JSON.parse(localStorage.getItem(LOG) || "[]"); } catch {}
  $("#adm").innerHTML = `<h1>Regalar cromos</h1><p class="sub">Elige cualquier cromo. Luego escanea el código de la persona (en su app: Repetidas → Recibir un cromo) y enséñale el código que aparece.</p>
    <div class="panel" id="pre" style="display:none;background:#e7f7ef"><b>✓ Ya leí el código de la persona.</b> Ahora toca el cromo que quieres regalarle.</div>
    <label class="search"><input id="q" type="search" placeholder="Busca por nombre, número o letra" autocomplete="off"></label><div class="adm-grid" id="grid"></div>
    <p class="log" id="log"></p>`;
  const renderLog = () => { $("#log").textContent = log.length ? `Has regalado ${log.length} ${log.length === 1 ? "cromo" : "cromos"} desde este móvil.` : ""; };
  render(); renderLog(); showPre();
  $("#q").addEventListener("input", (e) => { q = e.target.value.trim(); render(); });

  /* ── Escáner ── */
  let stopper = null, pick = null;
  let jsqrP = null;
  const loadJsQR = () => jsqrP || (jsqrP = new Promise((ok, ko) => { const s = document.createElement("script"); s.src = "js/vendor/jsQR.js"; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }));
  async function decodeFrom(src, w, h) {
    if ("BarcodeDetector" in window && decodeFrom.bd !== false) {
      try { decodeFrom.bd = decodeFrom.bd || new BarcodeDetector({ formats: ["qr_code"] }); const r = await decodeFrom.bd.detect(src); if (r[0]) return r[0].rawValue; } catch { decodeFrom.bd = false; }
    }
    await loadJsQR(); if (!w || !h) return null;
    const c = decodeFrom.c || (decodeFrom.c = document.createElement("canvas")), sc = Math.min(1, 720 / Math.max(w, h));
    c.width = Math.round(w * sc); c.height = Math.round(h * sc);
    const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(src, 0, 0, c.width, c.height);
    const r = window.jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: "dontInvert" });
    return r ? r.data : null;
  }
  async function startScan() {
    stop(); const box = $("#scanBox"); let alive = true, stream = null, busy = false;
    stopper = () => { alive = false; if (stream) stream.getTracks().forEach((t) => t.stop()); stopper = null; };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      if (!alive) return stream.getTracks().forEach((t) => t.stop());
      box.innerHTML = `<video playsinline muted autoplay></video><i class="aim"></i>`;
      const v = $("video", box); v.srcObject = stream; await v.play().catch(() => {});
      const tick = async () => { if (!alive) return; if (v.readyState >= 2 && !busy) { busy = true; const t = await decodeFrom(v, v.videoWidth, v.videoHeight).catch(() => null); busy = false; if (t) onScan(t); } if (alive) setTimeout(tick, 220); };
      tick();
    } catch { box.innerHTML = `<p class="note">No se pudo abrir la cámara. Dale permiso o usa una foto del código.</p>`; }
  }
  const stop = () => { if (stopper) stopper(); };
  function open(n) {
    pick = n; const s = BY_N.get(n);
    $("#panel").classList.add("open");
    if (preReq) { const r = preReq; preReq = null; showPre(); $("#pBody").innerHTML = `<p class="install-sub">Generando el código…</p>`; return onScan(r); }
    $("#pBody").innerHTML = `<h2 style="font-size:24px">Regalar «${esc(s.short)}»</h2>
      <p class="install-sub">Pídele que abra su app en <b>Repetidas → Recibir un cromo</b> y escanea su código.</p>
      <div class="scan" id="scanBox"></div><p class="scan-msg" id="scanMsg"></p>
      <div class="btn-row" style="justify-content:center"><button class="btn btn-ghost btn-small" id="reCam">🔄 Reiniciar cámara</button>
      <label class="btn btn-ghost btn-small">🖼️ Usar una foto del código<input type="file" accept="image/*" id="scanFile" hidden></label></div>`;
    startScan();
  }
  function close() { stop(); $("#panel").classList.remove("open"); pick = null; }
  async function onScan(txt) {
    const m = RE_REQ.exec(txt);
    if (!m) { const el = $("#scanMsg"); if (el) el.textContent = /SANTOS1/.test(txt) ? "Ese código es el de un regalo. Escanea el de «Recibir un cromo»" : "Ese no es el código de «Recibir un cromo»"; return; }
    if (onScan.busy) return; onScan.busy = true;
    stop();
    let code;
    try {
      const base = `SANTOS1A.${pick}.${m[1]}.${m[2]}`;
      code = `${APP_URL}#recibir=${base}.${await sign(base)}`;
    } catch (e) {
      onScan.busy = false;
      $("#pBody").innerHTML = `<h2 style="font-size:24px">No pude crear el código</h2><p class="install-sub">${esc(e && e.message || e)}</p><p class="note">Cierra y vuelve a intentarlo. Si sigue igual, mándale a Claude una captura.</p>`;
      return;
    }
    onScan.busy = false;
    log.push({ n: pick, t: Date.now() }); try { localStorage.setItem(LOG, JSON.stringify(log.slice(-500))); } catch {}
    renderLog();
    const qr = qrcode(0, "M"); qr.addData(code); qr.make();
    $("#pBody").innerHTML = `<h2 style="font-size:24px">¡Listo!</h2><p class="install-sub">Que toque <b>«📷 Escanear el regalo»</b> y escanee este código para recibir <b>${esc(BY_N.get(pick).short)}</b>. Solo sirve para su móvil y una vez.</p>
      <div class="qr-box">${qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true })}</div>
      <button class="btn btn-primary btn-block" id="pDone">Hecho</button>`;
  }
  $("#grid").addEventListener("click", (e) => { const c = e.target.closest("[data-n]"); if (c) open(+c.dataset.n); });
  $("#panel").addEventListener("click", (e) => { if (e.target.closest("#reCam")) return startScan(); if (e.target.closest("#pClose") || e.target.closest("#pDone") || e.target === $("#panel")) close(); });
  $("#panel").addEventListener("change", (e) => {
    if (e.target.id !== "scanFile" || !e.target.files[0]) return;
    const im = new Image(), url = URL.createObjectURL(e.target.files[0]);
    im.onload = async () => { const t = await decodeFrom(im, im.naturalWidth, im.naturalHeight).catch(() => null); URL.revokeObjectURL(url); if (t) onScan(t); else $("#scanMsg").textContent = "No encontré ningún código en esa foto"; };
    im.src = url;
  });
  window.__admin = { onScan: (t) => onScan(t), open };
})();
