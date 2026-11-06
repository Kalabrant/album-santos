/* Álbum de los Santos · lógica de la app
   Todo se guarda en el dispositivo (localStorage). Sin servidor. */
(() => {
  "use strict";

  const { sections: SECTIONS, santos: SANTOS } = window.ALBUM;
  const RETOS = window.RETOS;
  const CATS = window.RETO_CATS;
  const IMGS = window.IMAGENES || {};
  const BY_N = new Map(SANTOS.map((s) => [s.n, s]));
  const SEC = new Map(SECTIONS.map((s) => [s.id, s]));
  const TOTAL = SANTOS.length;
  const CARDS_PER_PACK = 5;
  const SWAP_COST = 10;
  const PREMIUM_WEIGHT = 0.3; // los premium salen menos al azar
  const KEY = "album-santos-v1";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ───────── Estado ───────── */
  const fresh = () => ({ owned: {}, packs: 0, days: {}, streak: 0, lastDone: null, welcome: false, opened: 0, swaps: 0, feastBonus: {} });
  let S;
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { S = fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

  /* ───────── Fechas y calendario litúrgico ───────── */
  const pad = (n) => String(n).padStart(2, "0");
  const dkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  function easter(y) { // algoritmo de Meeus/Jones/Butcher
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day, 12);
  }
  function advent1(y) { const d = new Date(y, 11, 3, 12); return addDays(d, -d.getDay()); } // domingo entre 27 nov y 3 dic
  function nthSunday(y, m, k) { const d = new Date(y, m, 1, 12); return addDays(d, ((7 - d.getDay()) % 7) + 7 * (k - 1)); }
  function movable(y) {
    const E = easter(y);
    const jan6 = new Date(y, 0, 6, 12);
    const firstFriMar = (() => { const d = new Date(y, 2, 1, 12); return addDays(d, (5 - d.getDay() + 7) % 7); })();
    return {
      2: [addDays(E, 68)], 3: [addDays(E, 7)], 4: [addDays(advent1(y), -7)], 5: [addDays(E, 60), addDays(E, 63)],
      9: [addDays(E, -4)], 10: [firstFriMar], 14: [addDays(E, -47)], 15: [addDays(E, 21)], 18: [E],
      19: [addDays(E, -2)], 20: [addDays(jan6, 7 - jan6.getDay() || 7)], 57: [addDays(E, 69)],
      501: [addDays(E, -3)], 504: [addDays(E, -44), addDays(E, 49)], 505: [addDays(E, -6)], 507: [addDays(E, -5)],
      508: [addDays(E, -2)], 509: [addDays(E, -2)], 510: [addDays(E, 39), addDays(E, 42)], 523: [addDays(E, 50)],
      522: [nthSunday(y, 4, 2)], 530: [nthSunday(y, 4, 1)],
    };
  }
  const feastCache = {};
  function saintsOfDay(d) {
    const k = dkey(d);
    if (feastCache[k]) return feastCache[k];
    const mv = movable(d.getFullYear());
    const out = [];
    for (const s of SANTOS) {
      let hit = s.fd.some(([dd, mm]) => dd === d.getDate() && mm === d.getMonth() + 1);
      if (!hit && mv[s.n]) hit = mv[s.n].some((x) => same(x, d));
      if (!hit && s.n === 6 && d.getDate() === 25) hit = true; // Niño Jesús de Praga: el 25 de cada mes
      if (hit) out.push(s.n);
    }
    return (feastCache[k] = out);
  }
  function bigFeast(d) { // fechas muy señaladas: sobre extra
    const y = d.getFullYear(), E = easter(y), md = `${d.getMonth() + 1}-${d.getDate()}`;
    const fixed = { "12-25": "Navidad", "1-1": "Santa María, Madre de Dios", "1-6": "Epifanía del Señor", "3-19": "San José", "3-25": "Anunciación del Señor",
      "6-29": "San Pedro y San Pablo", "8-15": "Asunción de la Virgen", "11-1": "Todos los Santos", "12-8": "Inmaculada Concepción", "12-12": "Virgen de Guadalupe", "9-8": "Natividad de la Virgen" };
    if (fixed[md]) return fixed[md];
    const mov = [[E, "Domingo de Resurrección"], [addDays(E, 7), "Divina Misericordia"], [addDays(E, 49), "Pentecostés"], [addDays(E, 60), "Corpus Christi"],
      [addDays(E, 68), "Sagrado Corazón de Jesús"], [addDays(E, 39), "Ascensión del Señor"], [addDays(advent1(y), -7), "Cristo Rey"]];
    for (const [x, n] of mov) if (same(x, d)) return n;
    return null;
  }

  /* ───────── Azar con semilla (los retos del día son los mismos todo el día) ───────── */
  function rng(seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }

  /* ───────── Retos del día ───────── */
  const ORDER = ["oracion", "sacramentos", "caridad", "formacion", "vida"];
  function dayState(d = today()) {
    const k = dkey(d);
    if (!S.days[k]) {
      const r = rng("retos-" + k);
      const list = ORDER.map((c) => {
        const pool = RETOS.map((x, i) => ({ ...x, i })).filter((x) => x.c === c);
        const x = pool[Math.floor(r() * pool.length)];
        return { id: "r" + x.i, c: x.c, t: x.t, s: x.s };
      });
      const sod = saintsOfDay(d);
      if (sod.length) { // un reto ligado al santo del día sustituye al de formación
        const n = sod[Math.floor(r() * sod.length)], s = BY_N.get(n);
        list[3] = { id: "santo" + n, c: "santo", t: `Hoy celebramos a ${s.short}: lee su historia y pídele su intercesión`, s: n };
      }
      // solo 1 o 2 retos del día llevan «cromo seguro» (el del santo del día siempre)
      const linked = list.map((x, i) => i).filter((i) => list[i].s && list[i].c !== "santo").sort(() => r() - 0.5).slice(0, sod.length ? 1 : 2);
      list.forEach((x, i) => { if (x.c !== "santo" && !linked.includes(i)) x.s = null; });
      S.days[k] = { retos: list, done: [], claimed: false, swapUsed: false, granted: [] };
      // limpiamos días muy antiguos
      const keys = Object.keys(S.days).sort();
      while (keys.length > 40) delete S.days[keys.shift()];
      save();
    }
    return S.days[k];
  }
  function swapReto(idx) {
    const D = dayState();
    if (D.swapUsed || D.done.includes(D.retos[idx].id)) return;
    const c = D.retos[idx].c === "santo" ? "formacion" : D.retos[idx].c;
    const used = new Set(D.retos.map((x) => x.id));
    const pool = RETOS.map((x, i) => ({ ...x, i })).filter((x) => x.c === c && !used.has("r" + x.i));
    const x = pool[Math.floor(Math.random() * pool.length)];
    D.retos[idx] = { id: "r" + x.i, c: x.c, t: x.t, s: D.retos[idx].s ? x.s : null };
    D.swapUsed = true; save(); renderHoy();
  }

  /* ───────── Reto de la semana (lunes a domingo) ───────── */
  const WEEKLY = window.RETOS_SEMANA || [];
  function weekKey(d = today()) { const m = addDays(d, -((d.getDay() + 6) % 7)); return dkey(m); } // lunes
  function weekState() {
    const k = weekKey();
    if (!S.week || S.week.k !== k) {
      const r = rng("semana-" + k);
      S.week = { k, i: Math.floor(r() * WEEKLY.length), done: false };
      save();
    }
    return S.week;
  }

  /* ───────── Colección ───────── */
  const has = (n) => (S.owned[n] || 0) > 0;
  const ownedCount = () => Object.keys(S.owned).filter((n) => S.owned[n] > 0).length;
  const dupCount = () => Object.values(S.owned).reduce((a, c) => a + Math.max(0, c - 1), 0);

  const locked = (s) => s.x || (s.h && dkey(today()) < s.h); // x: solo sale el día de su fiesta
  const weight = (s) => (locked(s) || s.e ? 0 : s.p ? PREMIUM_WEIGHT : 1);
  const SPECIAL_CHANCE = 0.01; // cada cromo al azar tiene un 1 % de ser un cromo especial
  const specials = () => SANTOS.filter((s) => s.e && !locked(s));
  const missingBoost = () => 0.4; // los cromos que faltan salen menos: más repetidas, álbum más largo
  function drawRandom(r = Math.random, only = null) {
    if (!only && r() < SPECIAL_CHANCE) { const L = specials(); if (L.length) return L[Math.floor(r() * L.length)].n; }
    const boost = missingBoost();
    const list = only ? SANTOS.filter(only) : SANTOS;
    const w = (s) => weight(s) * (has(s.n) ? 1 : boost);
    let total = 0;
    for (const s of list) total += w(s);
    let x = r() * total;
    for (const s of list) { const k = w(s); if (!k) continue; x -= k; if (x <= 0) return s.n; }
    return list.filter((s) => weight(s)).pop().n;
  }
  function buildPack(kind = "normal") {
    const d = today(), D = dayState(d);
    const cards = [], why = {};
    const push = (n, reason) => { if (!cards.includes(n)) { cards.push(n); if (reason) why[n] = reason; } };
    if (kind === "welcome") push(1, "Bienvenida");
    if (kind === "premium") push(drawRandom(Math.random, (s) => s.p && !s.e && !locked(s)), "Premium seguro");
    for (const n of saintsOfDay(d)) push(n, "Santo del día");
    for (const r of D.retos) {
      if (r.s && D.done.includes(r.id) && !D.granted.includes(r.s)) { push(r.s, "Por tu reto"); D.granted.push(r.s); }
    }
    const size = Math.max(CARDS_PER_PACK, cards.length + 2); // siempre al menos 2 sorpresas
    while (cards.length < size) {
      const n = drawRandom();
      if (cards.includes(n) && Math.random() < 0.85) continue; // casi nunca dos iguales en el mismo sobre
      cards.push(n);
    }
    // mezclamos para que la sorpresa no siempre esté al principio, pero el garantizado queda al final (¡suspense!)
    const g = cards.filter((n) => why[n]), rest = cards.filter((n) => !why[n]).sort(() => Math.random() - 0.5);
    return { cards: [...rest, ...g], why };
  }

  /* ───────── Cromos (HTML) ───────── */
  const ROMAN = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  const roman = (n) => ROMAN.reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, "");
  const lab = (n) => BY_N.get(n).l || roman(n); // los especiales llevan letra
  const secC = (id) => (SEC.get(id) || {}).c || id; // la segunda parte usa los colores de su sección

  const ICONS = {
    jesus: '<path d="M50 10v80M28 34h44" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="34" r="26" stroke-width="2" opacity=".5"/><path d="M50 4v-2M50 66v2M16 34h-2M86 34h-2M26 10l-2-2M74 10l2-2M26 58l-2 2M74 58l2 2" stroke-width="3" stroke-linecap="round" opacity=".7"/>',
    maria: '<path d="M30 78V30l20 26 20-26v48" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><path d="M22 86h56" stroke-width="3" stroke-linecap="round"/>' + Array.from({ length: 12 }, (_, i) => { const a = (Math.PI * 2 * i) / 12; return `<circle cx="${50 + 40 * Math.cos(a)}" cy="${52 + 40 * Math.sin(a)}" r="2.6" fill="currentColor" stroke="none"/>`; }).join(""),
    arcangeles: '<path d="M50 30c-10-14-30-18-42-10 6 2 10 6 12 10-6 0-10 2-12 6 8 0 14 2 18 6-6 2-8 6-8 10 10-4 22-6 32-4M50 30c10-14 30-18 42-10-6 2-10 6-12 10 6 0 10 2 12 6-8 0-14 2-18 6 6 2 8 6 8 10-10-4-22-6-32-4" stroke-width="3.5" stroke-linejoin="round"/><path d="M50 30v58" stroke-width="5" stroke-linecap="round"/><path d="M40 74h20" stroke-width="5" stroke-linecap="round"/>',
    angel: '<circle cx="50" cy="26" r="10" stroke-width="3"/><ellipse cx="50" cy="12" rx="12" ry="3.5" stroke-width="2.5"/><path d="M50 40c-14-4-30 4-38 20 10-2 18 0 22 4-6 4-8 10-6 16 8-8 16-10 22-10M50 40c14-4 30 4 38 20-10-2-18 0-22 4 6 4 8 10 6 16-8-8-16-10-22-10" stroke-width="3.5" stroke-linejoin="round"/><path d="M42 44l-4 44h24l-4-44" stroke-width="3.5" stroke-linejoin="round"/>',
    jose: '<path d="M50 92V30" stroke-width="5" stroke-linecap="round"/><path d="M50 30c-8-4-12-14-6-22 4 6 6 10 6 16 0-6 2-10 6-16 6 8 2 18-6 22zM50 50c-10 0-16-6-18-14 8 0 14 4 18 10M50 50c10 0 16-6 18-14-8 0-14 4-18 10M50 66c-10 0-16-6-18-14 8 0 14 4 18 10M50 66c10 0 16-6 18-14-8 0-14 4-18 10" stroke-width="3" stroke-linejoin="round"/>',
    bautista: '<path d="M50 84c-20 0-36-16-36-36 0-14 10-26 18-30l18 20 18-20c8 4 18 16 18 30 0 20-16 36-36 36z" stroke-width="3.5" stroke-linejoin="round"/><path d="M50 38v44M36 30l8 50M64 30l-8 50M24 40l18 40M76 40L58 80" stroke-width="2.5" stroke-linecap="round"/>',
    apostoles: '<path d="M50 26c-10-6-24-8-36-6v58c12-2 26 0 36 6 10-6 24-8 36-6V20c-12-2-26 0-36 6z" stroke-width="3.5" stroke-linejoin="round"/><path d="M50 26v58" stroke-width="3"/><path d="M50 10v14M44 15h12" stroke-width="3" stroke-linecap="round"/>',
    martires: '<path d="M46 92c2-30 8-56 22-80" stroke-width="4" stroke-linecap="round"/><path d="M68 12c-6 4-10 10-12 18M64 20c-8 2-14 6-18 12M61 30c-8 0-16 4-20 10M58 40c-8 0-14 2-20 8M55 50c-6 0-12 2-16 6M66 18c6 2 10 6 12 12M63 28c6 2 10 6 12 12M60 38c6 2 10 6 10 12M57 48c6 2 8 6 8 10" stroke-width="2.6" stroke-linecap="round"/><circle cx="72" cy="78" r="9" stroke-width="3"/>',
    pastores: '<path d="M50 92V40" stroke-width="5" stroke-linecap="round"/><path d="M50 40V30c0-12 8-20 18-20s16 8 16 16-6 12-12 12-8-4-8-8" stroke-width="5" stroke-linecap="round"/><path d="M40 58h20" stroke-width="4" stroke-linecap="round"/>',
    confesores: '<path d="M50 88c-16 0-26-10-26-24 0-16 14-22 16-40 8 6 10 14 10 20 4-6 6-14 4-26 14 10 22 26 22 44 0 16-10 26-26 26z" stroke-width="3.5" stroke-linejoin="round"/><path d="M50 88c-6 0-10-4-10-10 0-8 6-12 10-20 4 8 10 12 10 20 0 6-4 10-10 10z" stroke-width="3" stroke-linejoin="round"/>',
    virgenes: '<path d="M50 92V44" stroke-width="4" stroke-linecap="round"/><path d="M50 44c-4-10-2-24 0-32 2 8 4 22 0 32zM50 44c-10-2-20-10-24-22 10 2 20 10 24 22zM50 44c10-2 20-10 24-22-10 2-20 10-24 22z" stroke-width="3" stroke-linejoin="round"/><path d="M50 70c-8-2-14-8-16-14 8 0 14 6 16 14zM50 76c8-2 14-8 16-14-8 0-14 6-16 14z" stroke-width="2.6" stroke-linejoin="round"/>',
    casados: '<circle cx="38" cy="56" r="20" stroke-width="5"/><circle cx="62" cy="56" r="20" stroke-width="5"/><path d="M50 14v16M42 22h16" stroke-width="4" stroke-linecap="round"/>',
    especiales: '<path d="M50 8l12 26 28 4-20 20 5 28-25-13-25 13 5-28-20-20 28-4z" stroke-width="3.5" stroke-linejoin="round"/><circle cx="50" cy="50" r="9" stroke-width="3"/>',
    jovenes: '<path d="M50 10l9 26h28l-22 16 8 26-23-16-23 16 8-26-22-16h28z" stroke-width="3.5" stroke-linejoin="round"/><circle cx="50" cy="48" r="6" fill="currentColor" stroke="none"/>',
  };
  const ICON_COVER = '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor"><path d="M50 4l40 46-40 46-40-46z" stroke-width="2.4"/><path d="M50 18l28 32-28 32-28-32z" stroke-width="1.4" opacity=".6"/><path d="M50 30v40M38 44h24" stroke-width="5" stroke-linecap="round"/></svg>';

  const IMG_V = window.IMAGENES_V || 1; // cambia con cada tanda de imágenes, para no ver copias viejas
  function imgSrc(n) { const e = IMGS[n]; return e ? `img/santos/${String(n).padStart(3, "0")}.${e}?v=${IMG_V}` : null; }

  function cardHTML(n, { flippable = false, cover = false, sway = false, lazy = true } = {}) {
    const s = BY_N.get(n);
    const r = lab(n);
    const len = s.short.length;
    const cls = len > 30 ? "xl" : len > 19 ? "l" : "";
    const src = imgSrc(n);
    const art = src
      ? `<img src="${src}" alt="" ${lazy ? 'loading="lazy"' : ""} decoding="async" onerror="this.remove()">`
      : `<div class="ph-lines"></div><div class="ph-lines b"></div><svg class="ph" viewBox="0 0 100 100" fill="none" stroke="currentColor">${ICONS[secC(s.s)]}</svg>`;
    const front = `<div class="face front"><div class="bg"></div><div class="art ${src ? "full" : ""}">${art}</div><div class="frame"></div>
      <div class="numero"><i class="side"></i><span class="gem ${r.length <= 2 ? "short" : ""}">${r}</span><i class="side"></i></div>
      <div class="plate"><span class="${cls}">-${esc(s.short)}-</span></div><div class="holo"></div><div class="shine"></div>${s.e ? '<i class="esp-rib">ESPECIAL</i>' : ""}</div>`;
    const back = flippable ? `<div class="face back"><div class="b-in">
      <div class="b-num">${s.e ? `Cromo especial · ${r}` : `N.º ${n} · ${r}`}</div><div class="b-name">${esc(s.name)}</div>
      <span class="b-sec">${esc(SEC.get(s.s).name)}${s.p && !s.e ? " · ★ Premium" : ""}</span>
      <p class="b-dates">${esc(s.dates)}</p><p class="b-bio">${esc(s.bio)}</p>
      <div class="b-feast"><b>Fecha litúrgica</b>${esc(s.feast)}</div></div></div>` : "";
    const cov = cover ? `<div class="cover">${ICON_COVER}</div>` : "";
    return `<div class="card s-${secC(s.s)} ${s.p ? "premium" : ""} ${s.e ? "especial" : ""} ${sway ? "sway" : ""}" data-n="${n}"><div class="card-3d">${front}${back}${cov}</div></div>`;
  }

  /* Inclinación 3D con el dedo / ratón / giroscopio */
  function attachTilt(card) {
    const t = card.querySelector(".card-3d");
    let raf = 0;
    const set = (x, y) => { // x,y en [-1,1]
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.setProperty("--ry", `${x * 16}deg`);
        card.style.setProperty("--rx", `${-y * 14}deg`);
        card.style.setProperty("--hx", x.toFixed(3));
        card.style.setProperty("--hy", y.toFixed(3));
      });
    };
    const onMove = (e) => {
      if (card.classList.contains("flipped") || e.pointerType === "touch") return;
      const r = card.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
      card.classList.remove("sway");
    };
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", () => { set(0, 0); card.classList.add("sway"); });
    const onOrient = (e) => { if (e.gamma == null || card.classList.contains("flipped")) return; card.classList.remove("sway"); set(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 40) / 30))); };
    window.addEventListener("deviceorientation", onOrient);
    t.style.transition = "transform .25s ease-out";
    return () => window.removeEventListener("deviceorientation", onOrient);
  }
  let orientAsked = false;
  function askOrientation() {
    if (orientAsked) return; orientAsked = true;
    try { if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => {}); } catch {}
  }

  /* ───────── UI general ───────── */
  function toast(msg, ms = 2600) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms); }
  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
  function confetti(n = 80) {
    const box = document.createElement("div"); box.className = "confetti";
    const cols = ["#ff5a5f", "#ffd36b", "#2fc6a0", "#3aa8ff", "#b06bff", "#ffffff"];
    for (let i = 0; i < n; i++) {
      const c = document.createElement("i");
      c.style.left = Math.random() * 100 + "vw"; c.style.background = cols[i % cols.length];
      c.style.setProperty("--dx", (Math.random() * 200 - 100) + "px"); c.style.setProperty("--r", Math.random() * 720 + "deg");
      c.style.animationDuration = 1.6 + Math.random() * 1.6 + "s"; c.style.animationDelay = Math.random() * 0.4 + "s";
      box.appendChild(c);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 4000);
  }

  function updateChrome() {
    const own = ownedCount();
    $("#topCount").textContent = `${own} de ${TOTAL} cromos`;
    $("#streakN").textContent = S.streak || 0;
    const np = (S.packs || 0) + (S.ppacks || 0); const bp = $("#badgePacks"); bp.textContent = np || ""; bp.dataset.n = np;
    const D = dayState(); const left = D.claimed ? 0 : D.retos.length - D.done.length;
    const bh = $("#badgeHoy"); bh.textContent = left || ""; bh.dataset.n = left;
    const dc = dupCount(); const bd = $("#badgeDup"); const can = Math.floor(dc / SWAP_COST); bd.textContent = can || ""; bd.dataset.n = can;
  }

  let current = "hoy";
  function go(view) {
    current = view;
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
    ({ hoy: renderHoy, album: renderAlbum, sobres: renderSobres, mas: renderMas })[view]();
    window.scrollTo({ top: 0 });
    try { history.replaceState(null, "", "#" + view); } catch {}
  }
  $("#tabbar").addEventListener("click", (e) => { const b = e.target.closest(".tab"); if (b) go(b.dataset.view); });

  /* ───────── Vista HOY ───────── */
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  function greeting() { const h = new Date().getHours(); return h < 6 ? "¡Buenas noches!" : h < 13 ? "¡Buenos días!" : h < 20 ? "¡Buenas tardes!" : "¡Buenas noches!"; }

  function renderHoy() {
    const d = today(), D = dayState(d), done = D.done.length, total = D.retos.length;
    const sod = saintsOfDay(d), fest = bigFeast(d), k = dkey(d);
    const pct = Math.round((done / total) * 100);
    let html = `<section class="hero">
      <div class="date">${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}</div>
      <h1>${greeting()}</h1>
      <p>${D.claimed ? "Hoy ya ganaste tu sobre. ¡Mañana hay cinco retos nuevos!" : "Cumple los 5 retos de hoy y gana un sobre de cromos."}</p>
      <div class="progress-row"><div class="ring" style="--p:${pct}"><span>${done}/${total}</span></div>
      <div class="txt"><b>${done === total ? "¡Retos cumplidos!" : `Te faltan ${total - done}`}</b><small>Racha: ${S.streak || 0} ${S.streak === 1 ? "día" : "días"} seguidos</small></div></div>
    </section>`;

    if (sod.length) {
      html += `<h2 class="section">🕊️ Hoy celebramos</h2><div class="today-saints">` + sod.map((n) => { const s = BY_N.get(n);
        return `<button class="saint-chip" data-open="${n}"><div class="mini">${cardHTML(n)}</div><div><b>${esc(s.short)}</b><small>${has(n) ? "Ya lo tienes" : "Sale seguro en tu sobre de hoy"}</small></div></button>`; }).join("") + `</div>`;
    }
    if (fest && !S.feastBonus[k]) {
      html += `<div class="claim"><button class="btn btn-primary" id="feastBtn">🎁 ¡Fiesta grande: ${esc(fest)}! Recoge tu sobre extra</button></div>`;
    }

    html += `<h2 class="section">✅ Retos de hoy</h2><div class="retos">` + D.retos.map((r, i) => {
      const isDone = D.done.includes(r.id), cat = CATS[r.c], s = r.s ? BY_N.get(r.s) : null;
      return `<button class="reto ${isDone ? "done" : ""}" data-i="${i}" data-c="${r.c}">
        <span class="ico">${cat.icon}</span>
        <span class="body"><span class="cat">${cat.label}</span><div class="t">${esc(r.t)}</div>${s ? `<span class="link">🎴 Cromo seguro: ${esc(s.short)}</span>` : ""}</span>
        <span class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></button>`;
    }).join("") + `</div>`;

    if (done === total && !D.claimed) html += `<div class="claim"><button class="btn btn-primary" id="claimBtn">🎉 ¡Recoge tu sobre!</button></div>`;
    if (WEEKLY.length) {
      const W = weekState(), dl = 7 - ((d.getDay() + 6) % 7);
      html += `<h2 class="section">🌟 Reto de la semana</h2>
        <div class="weekly ${W.done ? "done" : ""}"><div class="wk-badge">Sobre premium</div>
        <div class="wk-t">${esc(WEEKLY[W.i])}</div>
        <div class="wk-foot"><small>${W.done ? "¡Cumplido! El lunes llega un reto nuevo." : dl === 1 ? "Último día: termina hoy, domingo" : `Tienes ${dl} días, hasta el domingo`}</small>
        ${W.done ? `<span class="wk-ok">✓ Hecho</span>` : `<button class="btn btn-primary btn-small" id="weeklyBtn">¡Lo cumplí!</button>`}</div></div>`;
    }
    html += `<div class="retos-actions">${!D.swapUsed && !D.claimed ? `<button class="btn btn-ghost btn-small" id="swapBtn">🔄 Cambiar un reto</button>` : ""}
      ${S.packs ? `<button class="btn btn-dark btn-small" data-goto="sobres">📦 Tienes ${S.packs} ${S.packs === 1 ? "sobre" : "sobres"} sin abrir</button>` : ""}</div>
      <p class="note">Toca un reto cuando lo cumplas y te llevas un cromo al momento. Es un compromiso contigo y con Dios: sé sincero. Con los cinco, ¡sobre completo!</p>`;

    const own = ownedCount();
    html += `<h2 class="section">📊 Tu colección</h2><div class="stats">
      <div class="stat"><b>${own}</b><small>de ${TOTAL} cromos</small></div>
      <div class="stat"><b>${SANTOS.filter((s) => s.p && has(s.n)).length}</b><small>premium de ${SANTOS.filter((s) => s.p).length}</small></div>
      <div class="stat"><b>${dupCount()}</b><small>repetidas</small></div></div>`;

    $("#view-hoy").innerHTML = html;
    updateChrome();
  }

  $("#view-hoy").addEventListener("click", (e) => {
    const reto = e.target.closest(".reto");
    if (reto) {
      const D = dayState(), r = D.retos[+reto.dataset.i];
      if (D.claimed && D.done.includes(r.id)) return toast("Este reto ya contó para el sobre de hoy");
      const i = D.done.indexOf(r.id);
      if (i >= 0) D.done.splice(i, 1); else { D.done.push(r.id); vibrate(15); }
      if (D.done.length === D.retos.length) markStreak();
      // Un cromo suelto por cada reto cumplido (solo la primera vez)
      D.cards = D.cards || [];
      let gift = null;
      if (i < 0 && !D.cards.includes(r.id)) {
        D.cards.push(r.id);
        if (r.s && !D.granted.includes(r.s)) { gift = { n: r.s, why: "Por tu reto" }; D.granted.push(r.s); }
        else gift = { n: drawRandom(), why: null };
      }
      save(); renderHoy();
      if (gift) setTimeout(() => startOpening("reto", [gift.n], gift.why ? { [gift.n]: gift.why } : {}), 350);
      else if (D.done.length === D.retos.length && !D.claimed) { confetti(60); vibrate([30, 40, 30]); }
      return;
    }
    if (e.target.closest("#claimBtn")) {
      const D = dayState(); if (D.claimed) return;
      D.claimed = true; S.packs++;
      let extra = "";
      if (S.streak > 0 && S.streak % 7 === 0) { S.packs++; extra = " ¡Y uno extra por tu racha de 7 días!"; }
      save(); toast("¡Has ganado un sobre!" + extra); go("sobres"); return;
    }
    if (e.target.closest("#weeklyBtn")) {
      const W = weekState(); if (W.done) return;
      W.done = true; S.ppacks = (S.ppacks || 0) + 1; save(); confetti(90); vibrate([30, 40, 60]);
      toast("¡Sobre premium ganado! ✨"); go("sobres"); return;
    }
    if (e.target.closest("#feastBtn")) { S.feastBonus[dkey(today())] = true; S.packs++; save(); confetti(70); toast("¡Feliz fiesta! Sobre extra añadido"); go("sobres"); return; }
    if (e.target.closest("#swapBtn")) {
      const D = dayState(); const idx = D.retos.findIndex((r) => !D.done.includes(r.id) && r.c !== "santo");
      if (idx < 0) return toast("No hay retos pendientes para cambiar");
      toast("Toca el reto que quieres cambiar");
      $$(".reto").forEach((el) => { const r = D.retos[+el.dataset.i]; if (!D.done.includes(r.id)) el.style.outline = "2.5px dashed var(--brand-2)"; });
      const once = (ev) => { const el = ev.target.closest(".reto"); ev.stopPropagation(); ev.preventDefault(); document.removeEventListener("click", once, true);
        if (el && el.closest("#view-hoy")) swapReto(+el.dataset.i); else renderHoy(); };
      setTimeout(() => document.addEventListener("click", once, true), 0);
      return;
    }
    const g = e.target.closest("[data-goto]"); if (g) return go(g.dataset.goto);
    const o = e.target.closest("[data-open]"); if (o) { const n = +o.dataset.open; if (has(n)) openViewer(n, [n]); else toast("Ábrelo en un sobre hoy y será tuyo"); }
  });

  function markStreak() {
    const k = dkey(today());
    if (S.lastDone === k) return;
    const y = dkey(addDays(today(), -1));
    S.streak = S.lastDone === y ? (S.streak || 0) + 1 : 1;
    S.lastDone = k;
  }

  /* ───────── Vista ÁLBUM ───────── */
  let filter = "todos", query = "";
  const FILTERS = [["todos", "Todos"], ["tengo", "Los tengo"], ["faltan", "Me faltan"], ["premium", "★ Premium"]];
  function renderAlbum() {
    const own = ownedCount();
    $("#filters").innerHTML = FILTERS.map(([id, l]) => {
      const n = id === "todos" ? TOTAL : id === "tengo" ? own : id === "faltan" ? TOTAL - own : SANTOS.filter((s) => s.p).length;
      return `<button class="chip ${filter === id ? "active" : ""}" data-f="${id}">${l}<span class="n">${n}</span></button>`;
    }).join("");
    $("#sections").innerHTML = SECTIONS.map((s) => `<button class="chip" data-sec="${s.id}">${esc(s.name)}</button>`).join("");
    $("#albumBar").style.width = (own / TOTAL) * 100 + "%";
    renderPages(); updateChrome();
  }
  function matches(s) {
    if (filter === "tengo" && !has(s.n)) return false;
    if (filter === "faltan" && has(s.n)) return false;
    if (filter === "premium" && !s.p) return false;
    if (query) {
      const q = query.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      if (/^\d+$/.test(q)) return String(s.n) === q || String(s.n).startsWith(q);
      return (s.name + " " + s.short).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(q);
    }
    return true;
  }
  let visibleOrder = [];
  function renderPages() {
    let html = ""; visibleOrder = [];
    for (const sec of SECTIONS) {
      const list = SANTOS.filter((s) => s.s === sec.id && matches(s));
      if (!list.length) continue;
      const got = SANTOS.filter((s) => s.s === sec.id && has(s.n)).length, tot = sec.to - sec.from + 1;
      html += `<section class="page" id="sec-${sec.id}"><div class="page-head"><h3>${esc(sec.name)}</h3><span>${got}/${tot} · ${sec.id === "especiales" ? "cromos A–S" : `n.º ${sec.from}–${sec.to}`}</span></div><div class="grid">`;
      for (const s of list) {
        if (has(s.n)) {
          visibleOrder.push(s.n);
          html += `<div class="slot has" data-n="${s.n}">${cardHTML(s.n)}${S.owned[s.n] > 1 ? `<span class="count">×${S.owned[s.n]}</span>` : ""}</div>`;
        } else {
          html += `<div class="slot empty ${s.p ? "premium-slot" : ""}"><span class="num">${s.l || s.n}</span><span class="nm">${esc(s.short)}</span></div>`;
        }
      }
      html += `</div></section>`;
    }
    $("#pages").innerHTML = html || `<div class="empty-state"><div style="font-size:48px">🔍</div>${filter === "tengo" ? "Aún no tienes cromos aquí. ¡Cumple tus retos y abre sobres!" : "No hay cromos con ese filtro."}</div>`;
  }
  $("#filters").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; filter = c.dataset.f; renderAlbum(); });
  $("#sections").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; const el = $("#sec-" + c.dataset.sec); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 150, behavior: "smooth" }); else toast("Ningún cromo de esa sección con este filtro"); });
  let qT; $("#q").addEventListener("input", (e) => { clearTimeout(qT); qT = setTimeout(() => { query = e.target.value.trim(); renderPages(); }, 150); });
  $("#pages").addEventListener("click", (e) => { const s = e.target.closest(".slot.has"); if (s) openViewer(+s.dataset.n, visibleOrder); });

  /* ───────── Visor ───────── */
  let vList = [], vIdx = 0, vCleanup = null;
  function openViewer(n, list) {
    askOrientation();
    vList = list && list.length ? list : [n]; vIdx = Math.max(0, vList.indexOf(n));
    showViewerCard(); $("#viewer").classList.add("open"); document.body.style.overflow = "hidden";
  }
  function showViewerCard() {
    const n = vList[vIdx]; if (vCleanup) vCleanup();
    $("#viewerCard").innerHTML = cardHTML(n, { flippable: true, sway: true, lazy: false });
    const card = $("#viewerCard .card"); vCleanup = attachTilt(card);
    let flipT;
    card.addEventListener("click", () => {
      clearTimeout(flipT);
      if (!card.classList.contains("flipped")) {
        card.classList.add("flipped"); setTimeout(() => card.classList.add("hide-front"), 330);
        // al terminar el giro, el reverso queda plano (sin 3D) para poder desplazarlo con el dedo
        flipT = setTimeout(() => card.classList.add("flat"), 720);
      } else {
        card.classList.remove("flat");
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove("flipped")));
        setTimeout(() => card.classList.remove("hide-front"), 330);
      }
      vibrate(10);
      $("#viewerHint").textContent = card.classList.contains("flipped") ? "Desliza para leer · toca para volver" : "Toca el cromo para darle la vuelta";
    });
    $("#vOwned").textContent = `${BY_N.get(n).l || n} · tienes ${S.owned[n] || 0}`;
    $("#vPrev").style.visibility = vList.length > 1 ? "visible" : "hidden"; $("#vNext").style.visibility = vList.length > 1 ? "visible" : "hidden";
    $("#viewerHint").textContent = "Toca el cromo para darle la vuelta";
  }
  function closeViewer() { $("#viewer").classList.remove("open"); document.body.style.overflow = ""; if (vCleanup) vCleanup(); vCleanup = null; $("#viewerCard").innerHTML = ""; }
  $("#viewer").addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target === $("#viewer")) closeViewer(); });
  $("#vPrev").addEventListener("click", () => { vIdx = (vIdx - 1 + vList.length) % vList.length; showViewerCard(); });
  $("#vNext").addEventListener("click", () => { vIdx = (vIdx + 1) % vList.length; showViewerCard(); });
  document.addEventListener("keydown", (e) => { if (!$("#viewer").classList.contains("open")) return; if (e.key === "Escape") closeViewer(); if (e.key === "ArrowLeft") $("#vPrev").click(); if (e.key === "ArrowRight") $("#vNext").click(); });
  // deslizar para cambiar de cromo
  let sx = null; $("#viewer").addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  $("#viewer").addEventListener("touchend", (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 70 && vList.length > 1) (dx < 0 ? $("#vNext") : $("#vPrev")).click(); });

  /* ───────── Vista SOBRES ───────── */
  const packHTML = (kind = "normal") => {
    const label = { premium: "Sobre premium", reto: "Cromo del reto", swap: "Canje", gift: "Regalo", trade: "De un amigo" }[kind] || "Sobre de cromos";
    return `<div class="pack ${kind === "premium" ? "gold" : kind === "gift" || kind === "trade" ? "gold mini-pack" : kind === "reto" || kind === "swap" ? "mini-pack" : ""}"><div class="crimp t"></div><div class="crimp b"></div><div class="pk-in">${ICON_COVER}<b>Álbum de los Santos</b><small>${label}</small></div></div>`;
  };
  const PACK_HTML = packHTML();
  function renderSobres() {
    const n = S.packs || 0, pp = S.ppacks || 0;
    let html = `<h1 class="title">Tus sobres</h1><p class="subtitle">Cada sobre trae ${CARDS_PER_PACK} cromos al azar. Si es la fiesta de un santo, ¡sale seguro!</p>`;
    if (pp > 0) html += `<div class="packs-area"><div class="pack-stack" id="ppackStack"><div class="pk">${packHTML("premium")}</div></div>
        <div class="pack-count">✨ ${pp} ${pp === 1 ? "sobre premium" : "sobres premium"}</div>
        <button class="btn btn-primary" style="margin-top:14px" id="openPremium">Abrir sobre premium</button></div>`;
    if (n > 0) {
      html += `<div class="packs-area"><div class="pack-stack" id="packStack">${Array.from({ length: Math.min(3, n) }, () => `<div class="pk">${PACK_HTML}</div>`).join("")}</div>
        <div class="pack-count">${n} ${n === 1 ? "sobre" : "sobres"} sin abrir</div>
        <button class="btn btn-primary" style="margin-top:14px" id="openBtn">Abrir sobre</button></div>`;
    } else if (!pp) {
      const D = dayState();
      html += `<div class="panel no-packs"><div class="big">📭</div><h3>No tienes sobres ahora</h3><p>${D.claimed ? "Ya ganaste el sobre de hoy. ¡Vuelve mañana a por más retos!" : "Cumple los 5 retos de hoy para ganar un sobre nuevo."}</p>
        ${D.claimed ? "" : `<button class="btn btn-dark" data-goto="hoy">Ver retos de hoy</button>`}</div>`;
    }
    html += `<p class="note" style="text-align:center">Llevas ${S.opened || 0} sobres abiertos.</p>`;
    $("#view-sobres").innerHTML = html;
    updateChrome();
  }
  $("#view-sobres").addEventListener("click", (e) => {
    if (e.target.closest("#openPremium") || e.target.closest("#ppackStack")) return startOpening("premium");
    if (e.target.closest("#openBtn") || e.target.closest("#packStack")) startOpening();
    const g = e.target.closest("[data-goto]"); if (g) go(g.dataset.goto);
  });

  /* ───────── Apertura del sobre ───────── */
  let pack = null, dealIdx = 0, opening = false;
  function startOpening(kind = "normal", forced = null, why = {}) {
    if (!forced && kind === "premium" && (S.ppacks || 0) <= 0) return;
    if (!forced && kind !== "premium" && (S.packs || 0) <= 0) return;
    askOrientation();
    if (!forced && kind === "normal" && S.welcomePending) { kind = "welcome"; S.welcomePending = false; }
    pack = forced ? { cards: forced, why } : buildPack(kind);
    pack.kind = kind;
    if (!forced) { if (kind === "premium") S.ppacks--; else S.packs--; }
    // los cromos se pegan ya en el álbum (así no se pierden si se cierra la app)
    pack.isNew = {};
    for (const n of pack.cards) { pack.isNew[n] = !has(n); S.owned[n] = (S.owned[n] || 0) + 1; }
    S.opened = (S.opened || 0) + (forced ? 0 : 1);
    save(); updateChrome();
    dealIdx = 0; opening = true;
    const ov = $("#opening");
    $("#bigPack").innerHTML = packHTML(kind); $("#bigPack").className = "big-pack" + (forced && forced.length === 1 && kind !== "swap" ? " small" : ""); $("#bigPack").style.display = "";
    $("#tapHint").style.display = ""; $("#tapHint").textContent = forced ? "Toca para descubrir tu cromo" : "Toca el sobre para abrirlo";
    $("#reveal").classList.remove("show"); $("#summary").classList.remove("show"); ov.classList.remove("lit");
    ov.classList.add("open"); document.body.style.overflow = "hidden";
  }
  $("#bigPack").addEventListener("click", () => {
    const bp = $("#bigPack"); if (bp.classList.contains("shake") || bp.classList.contains("burst")) return;
    vibrate([20, 30, 20]); bp.classList.add("shake");
    setTimeout(() => { bp.classList.add("burst"); vibrate(60); $("#opening").classList.add("lit"); }, 1000);
    setTimeout(() => { bp.style.display = "none"; $("#tapHint").style.display = "none"; dealCards(); }, 1500);
  });
  function dealCards() {
    const deal = $("#deal");
    deal.innerHTML = pack.cards.map((n, i) => cardHTML(n, { flippable: true, cover: true, lazy: false })).reverse().join("");
    const cards = $$(".card", deal).reverse(); // ahora cards[0] es el de arriba
    cards.forEach((c, i) => { c.classList.add("flipped", "dealt", "hide-front"); c.style.animationDelay = i * 0.07 + "s"; if (i > 0) c.classList.add("under"); c.style.zIndex = 100 - i; });
    $("#reveal").classList.add("show"); $("#tag").innerHTML = ""; updateCounter();
  }
  function updateCounter() { $("#dealCounter").textContent = `${Math.min(dealIdx + 1, pack.cards.length)} de ${pack.cards.length} · toca para descubrir`; }
  $("#deal").addEventListener("click", () => {
    const cards = $$(".card", $("#deal")).reverse();
    const c = cards[dealIdx]; if (!c) return;
    const n = +c.dataset.n;
    if (c.classList.contains("flipped") && !c.dataset.revealed) { // boca abajo → mostrar
      c.dataset.revealed = "1"; c.classList.remove("flipped");
      setTimeout(() => c.classList.remove("hide-front"), 300); // a mitad del giro: en iPhone el anverso se veía en espejo
      const s = BY_N.get(n);
      $("#tag").innerHTML = `${pack.isNew[n] ? '<span class="new">¡Nuevo!</span>' : '<span class="dup">Repetida</span>'}${s.p ? '<span class="prem">★ Premium</span>' : ""}${pack.why[n] ? `<span class="why">${esc(pack.why[n])}</span>` : ""}`;
      vibrate(s.p ? [40, 40, 80] : 25);
      if (s.p) confetti(90); else if (pack.isNew[n]) confetti(25);
      $("#dealCounter").textContent = `${dealIdx + 1} de ${pack.cards.length} · toca para seguir`;
      return;
    }
    // siguiente
    c.classList.add("gone"); dealIdx++;
    const next = cards[dealIdx];
    if (next) { next.classList.remove("under"); $("#tag").innerHTML = ""; updateCounter(); }
    else setTimeout(showSummary, 350);
  });
  function showSummary() {
    $("#reveal").classList.remove("show");
    const nuevos = pack.cards.filter((n) => pack.isNew[n]).length;
    $("#summary").innerHTML = `<h2>${nuevos ? `¡${nuevos} ${nuevos === 1 ? "cromo nuevo" : "cromos nuevos"}!` : pack.cards.length === 1 ? "¡Repetida!" : "¡Todas repetidas!"}</h2>
      <p>${nuevos ? "Ya están pegados en tu álbum." : "Guárdalas: con " + SWAP_COST + " repetidas cambias por un cromo nuevo."}</p>
      <div class="row ${pack.cards.length > 5 ? "many" : ""}">${pack.cards.map((n) => `<div>${cardHTML(n)}<span class="tg ${pack.isNew[n] ? "" : "d"}">${pack.isNew[n] ? "NUEVO" : "REPE"}</span></div>`).join("")}</div>
      <div class="btn-row" style="justify-content:center">${pack.kind === "reto" ? `<button class="btn btn-primary" id="backBtn">Seguir con mis retos</button>` : S.packs > 0 ? `<button class="btn btn-primary" id="againBtn">Abrir otro (${S.packs})</button>` : ""}<button class="btn btn-ghost" id="toAlbumBtn">Ver mi álbum</button></div>`;
    $("#summary").classList.add("show");
  }
  $("#summary").addEventListener("click", (e) => {
    if (e.target.closest("#againBtn")) { startOpening(); }
    if (e.target.closest("#backBtn")) { closeOpening(); const D = dayState(); if (D.done.length === D.retos.length && !D.claimed) { confetti(60); vibrate([30, 40, 30]); } }
    if (e.target.closest("#toAlbumBtn")) { closeOpening(); filter = "todos"; go("album"); }
  });
  function closeOpening() { $("#opening").classList.remove("open", "lit"); document.body.style.overflow = ""; opening = false; if (current === "sobres") renderSobres(); else if (current === "mas") renderMas(); else if (current === "hoy") renderHoy(); }

  /* ───────── Vista MÁS / REPETIDAS ───────── */
  function renderMas() {
    const dc = dupCount(), own = ownedCount();
    const dups = SANTOS.filter((s) => (S.owned[s.n] || 0) > 1);
    let html = `<h1 class="title">Repetidas</h1><p class="subtitle">Cambia ${SWAP_COST} repetidas por un cromo que todavía no tienes.</p>
      <div class="panel"><h3>Canje</h3><p>Tienes <b>${dc}</b> ${dc === 1 ? "repetida" : "repetidas"}. ${own >= TOTAL ? "¡Ya completaste el álbum!" : ""}</p>
      <div class="meter"><i style="width:${Math.min(100, ((dc % SWAP_COST) / SWAP_COST) * 100 + (dc >= SWAP_COST ? 100 : 0))}%"></i></div>
      <button class="btn btn-primary btn-block" id="swapCards" ${dc >= SWAP_COST && own < TOTAL ? "" : "disabled"}>Cambiar ${SWAP_COST} repetidas por 1 nuevo</button>
      ${dups.length ? `<div class="dups">${dups.map((s) => `<div class="slot has" data-n="${s.n}">${cardHTML(s.n)}<span class="count">×${S.owned[s.n]}</span></div>`).join("")}</div>` : `<p class="note">Aún no tienes repetidas.</p>`}</div>`;

    const pend = pendingGifts().length;
    html += `<div class="panel"><h3>Intercambia con tus amigos</h3><p>Pasa tus repetidas de un móvil a otro con un código QR. Cada código sirve una sola vez.</p>
      <div class="btn-row"><button class="btn btn-primary btn-small" id="tradeGive" ${dups.length ? "" : "disabled"}>📤 Regalar una repetida</button><button class="btn btn-dark btn-small" id="tradeGet">📥 Recibir un cromo</button></div>
      ${pend ? `<button class="btn btn-ghost btn-small" id="tradePend" style="margin-top:10px">⏳ Regalos sin confirmar (${pend})</button>` : ""}</div>`;

    html += `<div class="panel"><h3>Tu avance por secciones</h3><div class="sec-progress">${SECTIONS.map((sec) => {
      const tot = sec.to - sec.from + 1, got = SANTOS.filter((s) => s.s === sec.id && has(s.n)).length;
      return `<div class="r"><span>${esc(sec.name)}</span><span>${got}/${tot}</span><div class="bar s-${secC(sec.id)}"><i style="width:${(got / tot) * 100}%;background:var(--c1)"></i></div></div>`;
    }).join("")}</div></div>`;

    html += `<div class="panel"><h3>Instálala en tu móvil</h3><p>En Android (Chrome): menú ⋮ → «Instalar aplicación». En iPhone (Safari): botón Compartir → «Añadir a pantalla de inicio». Funciona sin conexión.</p>
      <button class="btn btn-dark btn-small" id="installBtn" style="display:none">Instalar ahora</button></div>
      <div class="panel"><h3>Copia de seguridad</h3><p>Tu colección se guarda solo en este dispositivo. Descarga una copia para no perderla o pasarla a otro móvil.</p>
      <div class="btn-row"><button class="btn btn-ghost btn-small" id="exportBtn">⬇️ Guardar copia</button><label class="btn btn-ghost btn-small">⬆️ Cargar copia<input type="file" id="importInp" accept="application/json,.json" hidden></label></div></div>
      <div class="panel"><h3>Empezar de cero</h3><p>Borra toda tu colección de este dispositivo.</p><button class="btn btn-ghost btn-small" id="resetBtn" style="color:#c2414b">Borrar mi álbum</button></div>`;
    $("#view-mas").innerHTML = html;
    if (!isStandalone()) $("#installBtn").style.display = "";
    updateChrome();
  }
  $("#view-mas").addEventListener("click", (e) => {
    const sl = e.target.closest(".slot.has"); if (sl) return openViewer(+sl.dataset.n, $$(".dups .slot").map((x) => +x.dataset.n));
    if (e.target.closest("#swapCards")) return doSwap();
    if (e.target.closest("#tradeGive")) return openTrade("dar");
    if (e.target.closest("#tradeGet")) return openTrade("recibir");
    if (e.target.closest("#tradePend")) { openTrade("pend"); return showPending(); }
    if (e.target.closest("#exportBtn")) {
      const blob = new Blob([JSON.stringify({ app: "album-santos", v: 1, date: new Date().toISOString(), state: S })], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `album-santos-${dkey(today())}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      return;
    }
    if (e.target.closest("#resetBtn")) {
      const b = e.target.closest("#resetBtn");
      if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "Toca otra vez para confirmar"; setTimeout(() => { b.dataset.sure = ""; b.textContent = "Borrar mi álbum"; }, 4000); return; }
      S = fresh(); save(); location.reload(); return;
    }
    if (e.target.closest("#installBtn")) openInstall();
  });
  $("#view-mas").addEventListener("change", (e) => {
    if (e.target.id !== "importInp" || !e.target.files[0]) return;
    e.target.files[0].text().then((t) => { const j = JSON.parse(t); if (j.app !== "album-santos") throw 0; const keep = { dev: S.dev, inbox: S.inbox, usedReq: S.usedReq, outbox: S.outbox }; S = Object.assign(fresh(), j.state, keep); save(); toast("Copia cargada"); renderMas(); }).catch(() => toast("Ese archivo no es una copia válida"));
  });
  function doSwap() {
    if (dupCount() < SWAP_COST) return;
    const missing = SANTOS.filter((s) => !has(s.n) && !locked(s) && !s.e); if (!missing.length) return toast("Los cromos que te faltan no se pueden conseguir por canje");
    // quitamos repetidas empezando por las que más se repiten
    let left = SWAP_COST;
    while (left > 0) {
      const top = SANTOS.filter((s) => (S.owned[s.n] || 0) > 1).sort((a, b) => S.owned[b.n] - S.owned[a.n] || a.p - b.p)[0];
      S.owned[top.n]--; left--;
    }
    let tot = 0; for (const s of missing) tot += weight(s);
    let x = Math.random() * tot, pick = missing[0].n;
    for (const s of missing) { x -= weight(s); if (x <= 0) { pick = s.n; break; } }
    S.swaps = (S.swaps || 0) + 1; save();
    startOpening("swap", [pick]);
  }

  /* ───────── Bienvenida ───────── */
  function welcome() {
    if (S.welcome) return;
    S.welcome = true; S.welcomePending = true; S.packs = (S.packs || 0) + 1; save();
    setTimeout(() => { const m = "¡Bienvenido! Te regalamos tu primer sobre 🎁"; if ($("#install").classList.contains("open")) pendingToast = m; else toast(m); }, 2000);
  }

  /* ───────── Instalación (PWA) ───────── */
  let deferredInstall = null, pendingToast = null;
  const SHARE_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>';
  const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const UA = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const inApp = /FBAN|FBAV|Instagram|Line\/|TikTok|Snapchat/i.test(UA);
  function renderInstall() {
    let h;
    if (isStandalone()) h = `<p class="install-sub">¡Ya la tienes instalada! 🎉</p>`;
    else if (inApp) h = `<ol class="install-steps"><li>Toca los tres puntos ⋯ de arriba</li><li>Elige «Abrir en el navegador» (Chrome o Safari)</li><li>Allí te aparecerá el botón para instalarla</li></ol>`;
    else if (deferredInstall) h = `<button class="btn btn-primary" id="installNow">📲 Instalar la app</button>`;
    else if (isIOS) h = `<ol class="install-steps"><li>Toca el botón Compartir ${SHARE_ICO} de Safari</li><li>Elige «Añadir a pantalla de inicio»</li><li>Pulsa «Añadir» y ábrela desde tu pantalla</li></ol>`;
    else h = `<ol class="install-steps"><li>Abre el menú ⋮ de Chrome</li><li>Elige «Instalar aplicación» o «Añadir a pantalla de inicio»</li></ol>`;
    $("#installBody").innerHTML = h;
  }
  function openInstall() { renderInstall(); $("#install").classList.add("open"); }
  function closeInstall() { $("#install").classList.remove("open"); if (pendingToast) { toast(pendingToast); pendingToast = null; } try { localStorage.setItem(KEY + "-noinstall", "1"); } catch {} }
  $("#install").addEventListener("click", async (e) => {
    if (e.target.closest("#installNow") && deferredInstall) { deferredInstall.prompt(); const r = await deferredInstall.userChoice.catch(() => ({})); deferredInstall = null; if (r.outcome === "accepted") { closeInstall(); toast("¡Instalada! Búscala en tu pantalla de inicio"); } else renderInstall(); return; }
    if (e.target.closest("#installLater") || e.target === $("#install")) closeInstall();
  });
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; const b = $("#installBtn"); if (b) b.style.display = ""; if ($("#install").classList.contains("open")) renderInstall(); });
  window.addEventListener("appinstalled", () => { closeInstall(); });
  // El enlace …/?instalar abre directamente la hoja; en la primera visita también aparece
  const wantsInstall = /[?&]instalar\b/.test(location.search);
  let dismissed = false; try { dismissed = !!localStorage.getItem(KEY + "-noinstall"); } catch {}
  if (wantsInstall) try { history.replaceState(null, "", location.pathname + location.hash); } catch {}
  if (!isStandalone() && (wantsInstall || !dismissed)) setTimeout(openInstall, wantsInstall ? 200 : 1600);
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((r) => r.update()).catch(() => {}));
    // cuando llega una versión nueva, recargamos una vez para verla
    let reloaded = false, hadCtrl = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadCtrl && !reloaded) { reloaded = true; location.reload(); } });
  }

  // Si la app queda abierta y cambia el día, refrescamos
  let lastKey = dkey(today());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && dkey(today()) !== lastKey) { lastKey = dkey(today()); go(current); } });

  /* ───────── Novedades (se muestran una vez a quien ya usaba la app) ───────── */
  const NEWS_V = 2;
  function maybeNews() {
    if (!S.welcome || (S.news || 0) >= NEWS_V) { S.news = NEWS_V; save(); return; }
    setTimeout(() => { if (!$("#install").classList.contains("open")) $("#news").classList.add("open"); else maybeNews._wait = true; }, 900);
  }
  $("#news").addEventListener("click", (e) => { if (e.target.closest("#newsOk") || e.target === $("#news")) { $("#news").classList.remove("open"); S.news = NEWS_V; save(); } });

  /* ───────── Regalo de promoción: Nuestra Señora de la Natividad (especial E) ───────── */
  const PROMO = (SANTOS.find((s) => s.l === "E") || {}).n;
  function maybeGift() {
    if (!PROMO || S.promoE) return;
    const busy = () => opening || ["#install", "#news", "#trade"].some((id) => $(id).classList.contains("open"));
    const tryIt = () => {
      if (S.promoE) return;
      if (busy()) return setTimeout(tryIt, 1200);
      S.promoE = 1;
      startOpening("gift", [PROMO], { [PROMO]: "¡Regalo de la app!" });
      $("#tapHint").textContent = "Tienes un regalo: toca para abrirlo";
    };
    setTimeout(tryIt, 2600);
  }

  /* ───────── Intercambio de repetidas con QR (dos escaneos, sin servidor) ─────────
     1. Quien RECIBE muestra su código (su móvil + una clave de un solo uso).
     2. Quien DA elige una repetida y escanea ese código: el cromo sale de su álbum
        y aparece un código que solo sirve para ese móvil y esa clave.
     3. Quien RECIBE lo escanea: la clave se gasta, así que el código no vale otra vez. */
  const rid = (k) => Array.from(crypto.getRandomValues(new Uint8Array(k)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
  if (!S.dev) { S.dev = rid(10); save(); }
  const TSALT = "santos·trueque·2026";
  function th(str) { // huella corta (cyrb53)
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36).toUpperCase();
  }
  // Los códigos son enlaces: se pueden leer desde la app o con la cámara normal del móvil
  const APP_URL = location.origin + location.pathname;
  const reqCode = (nonce) => `${APP_URL}#dar=SANTOS1R.${S.dev}.${nonce}`;
  const giftCode = (n, dev, nonce) => { const b = `SANTOS1T.${n}.${dev}.${nonce}.${S.dev}`; return `${APP_URL}#recibir=${b}.${th(TSALT + b)}`; };
  const RE_REQ = /SANTOS1R\.([A-Z0-9]{10})\.([A-Z0-9]{8})/;
  const RE_GIFT = /(SANTOS1T\.(\d{1,3})\.([A-Z0-9]{10})\.([A-Z0-9]{8})\.([A-Z0-9]{10}))\.([A-Z0-9]+)/;
  function qrSVG(text) {
    const q = qrcode(0, "M"); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }
  let tradeState = null, scanStop = null;
  const tradeBody = () => $("#tradeBody");
  function openTrade(mode, req = null) {
    tradeState = { mode, req };
    $("#trade").classList.add("open"); document.body.style.overflow = "hidden";
    if (mode === "recibir") showRequest(); else if (mode !== "pend") pickDup();
  }
  function closeTrade() { stopScan(); $("#trade").classList.remove("open"); document.body.style.overflow = ""; tradeState = null; if (current === "mas") renderMas(); }
  function showRequest() {
    S.inbox = (S.inbox || []).filter((x) => Date.now() - x.t < 30 * 864e5).slice(-20);
    let mine = S.inbox[S.inbox.length - 1];
    if (!mine || Date.now() - mine.t > 864e5) { mine = { k: rid(8), t: Date.now() }; S.inbox.push(mine); save(); }
    tradeBody().innerHTML = `<h2>Recibir un cromo</h2>
      <p class="step-t"><b>1</b> Tu amigo escanea este código y elige la repetida</p>
      <div class="qr-box">${qrSVG(reqCode(mine.k))}</div>
      <p class="step-t"><b>2</b> Cuando a él le salga otro código, tócalo aquí:</p>
      <button class="btn btn-primary btn-block big-scan" id="tScanGift">📷 Escanear el regalo</button>`;
  }
  function pickDup() {
    const dups = SANTOS.filter((s) => (S.owned[s.n] || 0) > 1);
    const out = pendingGifts();
    tradeBody().innerHTML = `<h2>Regalar una repetida</h2>
      ${dups.length ? `<p class="install-sub">${tradeState.req ? "Ya tengo el código de tu amigo. " : ""}Elige el cromo que quieres pasar. Se quitará una copia de tu álbum.</p><div class="dups trade-dups">${dups.map((s) => `<div class="slot has" data-give="${s.n}">${cardHTML(s.n)}<span class="count">×${S.owned[s.n]}</span></div>`).join("")}</div>`
        : `<p class="install-sub">Aún no tienes repetidas para regalar.${tradeState.req ? " Si tienes la app instalada, ábrela y escanea el código desde allí: Repetidas → Regalar una repetida." : ""}</p>`}
      ${out.length ? pendingHTML(out) : ""}`;
    tradeState.out = out;
  }
  // Regalos hechos que el amigo quizá no recibió: se pueden volver a enseñar o recuperar
  const pendingGifts = () => (S.outbox || []).filter((x) => !x.r && !x.ok);
  const pendingHTML = (out) => `<div class="pending"><p class="note"><b>Regalos sin confirmar.</b> Si tu amigo no llegó a recibirlo, enséñale otra vez el código o recupera tu cromo.</p>
    ${out.map((x, i) => `<div class="pend-row"><span>${esc(BY_N.get(x.n).short)}</span><button class="btn btn-ghost btn-small" data-out="${i}">Enseñar código</button><button class="btn btn-ghost btn-small" data-back="${i}">Recuperar</button><button class="btn btn-ghost btn-small" data-okg="${i}">✓ Lo recibió</button></div>`).join("")}</div>`;
  function showPending() {
    tradeState = tradeState || { mode: "dar" };
    const out = pendingGifts(); tradeState.out = out;
    tradeBody().innerHTML = `<h2>Regalos sin confirmar</h2>${out.length ? pendingHTML(out) : `<p class="install-sub">No tienes regalos pendientes.</p>`}`;
  }
  function askScanReq(n) {
    tradeState.give = n;
    if (tradeState.req) return onScanReq(tradeState.req);
    tradeBody().innerHTML = `<h2>Regalar «${esc(BY_N.get(n).short)}»</h2><p class="install-sub">Escanea el código que aparece en el móvil de tu amigo (en Repetidas → Recibir un cromo).</p>
      <div class="scan" id="scanBox"></div><p class="scan-msg" id="scanMsg"></p><label class="btn btn-ghost btn-small">🖼️ Usar una foto del código<input type="file" accept="image/*" id="scanFile" hidden></label>`;
    startScan(onScanReq);
  }
  function onScanReq(txt) {
    const m = RE_REQ.exec(txt);
    if (!m) return scanMsg(RE_GIFT.test(txt) ? "Ese es el código de un regalo: lo tiene que escanear tu amigo" : "Ese no es un código para recibir cromos");
    const [, dev, nonce] = m;
    if (dev === S.dev) return scanMsg("Ese código es de tu propio móvil");
    S.usedReq = S.usedReq || [];
    if (S.usedReq.includes(dev + nonce)) return scanMsg("Ya le pasaste un cromo con ese código. Pídele que abra uno nuevo");
    const n = tradeState.give;
    if ((S.owned[n] || 0) < 2) { stopScan(); return pickDup(); }
    stopScan();
    S.owned[n]--; S.usedReq.push(dev + nonce); S.usedReq = S.usedReq.slice(-200);
    const code = giftCode(n, dev, nonce);
    S.outbox = [...(S.outbox || []), { n, c: code, t: Date.now() }].slice(-20);
    S.given = (S.given || 0) + 1; save(); updateChrome(); vibrate(30);
    showGift(code, n);
  }
  function showGift(code, n) {
    tradeBody().innerHTML = `<h2>¡Listo para entregar!</h2><p class="install-sub">Dile a tu amigo que toque <b>«📷 Escanear el regalo»</b> en su pantalla y que escanee este código para recibir <b>${esc(BY_N.get(n).short)}</b>. Solo sirve para su móvil y una vez.</p>
      <div class="qr-box">${qrSVG(code)}</div><button class="btn btn-primary btn-block" id="tOk">✓ Ya lo recibió</button>
      <p class="note">Si algo falla, no pierdes el cromo: en Repetidas → «Regalos sin confirmar» puedes enseñar el código otra vez o recuperarlo.</p>`;
    tradeState.last = code;
  }
  function askScanGift() {
    tradeBody().innerHTML = `<h2>Escanea el código de tu amigo</h2><p class="install-sub">Es el que le aparece después de elegir el cromo que te regala.</p><div class="scan" id="scanBox"></div><p class="scan-msg" id="scanMsg"></p>
      <label class="btn btn-ghost btn-small">🖼️ Usar una foto del código<input type="file" accept="image/*" id="scanFile" hidden></label>`;
    startScan(onScanGift);
  }
  // Regalos del administrador: firmados con una llave que solo tiene él (aquí solo está la llave pública)
  const ADMIN_PUB = { kty: "EC", crv: "P-256", x: "PENDIENTE", y: "PENDIENTE" };
  const RE_ADMIN = /(SANTOS1A\.(\d{1,3})\.([A-Z0-9]{10})\.([A-Z0-9]{8}))\.([A-Za-z0-9_-]{80,90})/;
  const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  async function adminOk(base, sig) {
    try {
      const k = await crypto.subtle.importKey("jwk", ADMIN_PUB, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
      return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, k, b64u(sig), new TextEncoder().encode(base));
    } catch { return false; }
  }
  async function onAdminGift([, base, ns, dev, nonce, sig]) {
    const n = +ns;
    if (!BY_N.get(n) || !(await adminOk(base, sig))) return scanMsg("Ese código no es válido");
    if (dev !== S.dev) return scanMsg("Ese código es para otro móvil.");
    const i = (S.inbox || []).findIndex((x) => x.k === nonce);
    if (i < 0) return scanMsg("Ese código ya se usó.");
    stopScan();
    S.inbox.splice(i, 1); S.received = (S.received || 0) + 1; save();
    closeTrade();
    startOpening("trade", [n], { [n]: "¡Regalo especial!" });
  }
  function onScanGift(txt) {
    const ad = RE_ADMIN.exec(txt); if (ad) return onAdminGift(ad);
    const m = RE_GIFT.exec(txt);
    if (!m) return scanMsg(RE_REQ.test(txt) ? "Ese es tu código para recibir: lo escanea tu amigo. Tú escanea el que le sale después de elegir el cromo" : "Ese no es un código de cromo");
    const [, base, ns, dev, nonce, , sig] = m, n = +ns;
    if (th(TSALT + base) !== sig || !BY_N.get(n)) return scanMsg("Ese código no es válido");
    const fromLink = !tradeState || !tradeState.cb;
    const hint = fromLink ? " Si tienes la app instalada, ábrela y escanéalo desde allí: Repetidas → Recibir un cromo → Escanear su código." : "";
    if (dev !== S.dev) return scanMsg("Ese código es para otro móvil." + hint);
    const i = (S.inbox || []).findIndex((x) => x.k === nonce);
    if (i < 0) return scanMsg("Ese código ya se usó." + hint);
    stopScan();
    S.inbox.splice(i, 1); S.received = (S.received || 0) + 1; save();
    closeTrade();
    startOpening("trade", [n], { [n]: "Regalo de un amigo" });
  }
  function scanMsg(m) { const el = $("#scanMsg"); if (el && $("#trade").classList.contains("open")) el.textContent = m; toast(m, m.length > 60 ? 6000 : 3000); vibrate([30, 40, 30]); }
  let jsqrP = null;
  const loadJsQR = () => jsqrP || (jsqrP = new Promise((ok, ko) => { const s = document.createElement("script"); s.src = "js/vendor/jsQR.js"; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }));
  async function decodeFrom(src, w, h) { // src: video o imagen
    if ("BarcodeDetector" in window && decodeFrom.bd !== false) {
      try { decodeFrom.bd = decodeFrom.bd || new BarcodeDetector({ formats: ["qr_code"] }); const r = await decodeFrom.bd.detect(src); if (r[0]) return r[0].rawValue; } catch { decodeFrom.bd = false; }
    }
    await loadJsQR(); // en algunos móviles el detector del sistema no ve nada: probamos también con jsQR
    if (!w || !h) return null;
    const c = decodeFrom.c || (decodeFrom.c = document.createElement("canvas")), sc = Math.min(1, 720 / Math.max(w, h));
    c.width = Math.round(w * sc); c.height = Math.round(h * sc);
    const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(src, 0, 0, c.width, c.height);
    const r = window.jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: "dontInvert" });
    return r ? r.data : null;
  }
  async function startScan(cb) {
    stopScan(); tradeState.cb = cb;
    const box = $("#scanBox");
    let alive = true, stream = null, last = "";
    scanStop = () => { alive = false; if (stream) stream.getTracks().forEach((t) => t.stop()); scanStop = null; };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      if (!alive) return stream.getTracks().forEach((t) => t.stop());
      box.innerHTML = `<video playsinline muted autoplay></video><i class="aim"></i>`;
      const v = $("video", box); v.srcObject = stream; await v.play().catch(() => {});
      const tick = async () => {
        if (!alive) return;
        if (v.readyState >= 2) {
          const txt = await decodeFrom(v, v.videoWidth, v.videoHeight).catch(() => null);
          if (txt && txt !== last) { last = txt; setTimeout(() => { last = ""; }, 2500); cb(txt); }
        }
        if (alive) setTimeout(tick, 220);
      };
      tick();
    } catch {
      box.innerHTML = `<p class="note">No se pudo abrir la cámara. Dale permiso en el navegador, o usa una foto del código.</p>`;
    }
  }
  function stopScan() { if (scanStop) scanStop(); }
  $("#trade").addEventListener("click", (e) => {
    if (e.target.closest("#tOk")) { const x = (S.outbox || []).find((o) => o.c === tradeState.last); if (x) { x.ok = 1; save(); } return closeTrade(); }
    if (e.target.closest("#tradeClose") || e.target === $("#trade") || e.target.closest("#tDone")) return closeTrade();
    const bk = e.target.closest("[data-back]");
    if (bk) { const x = tradeState.out[+bk.dataset.back]; if (x && !x.r) { x.r = 1; S.owned[x.n] = (S.owned[x.n] || 0) + 1; save(); updateChrome(); toast(`Recuperaste ${BY_N.get(x.n).short}`); } return $("#tradeBody .trade-dups") ? pickDup() : showPending(); }
    const ok = e.target.closest("[data-okg]");
    if (ok) { const x = tradeState.out[+ok.dataset.okg]; if (x) { x.ok = 1; save(); } return $("#tradeBody .trade-dups") ? pickDup() : showPending(); }
    if (e.target.closest("#tScanGift")) return askScanGift();
    const g = e.target.closest("[data-give]"); if (g) return askScanReq(+g.dataset.give);
    const o = e.target.closest("[data-out]"); if (o) { const x = tradeState.out[+o.dataset.out]; return showGift(x.c, x.n); }
  });
  $("#trade").addEventListener("change", (e) => {
    if (e.target.id !== "scanFile" || !e.target.files[0] || !tradeState) return;
    const img = new Image(), url = URL.createObjectURL(e.target.files[0]);
    img.onload = async () => { const txt = await decodeFrom(img, img.naturalWidth, img.naturalHeight).catch(() => null); URL.revokeObjectURL(url); if (txt) tradeState.cb(txt); else scanMsg("No encontré ningún código en esa foto"); };
    img.src = url;
  });

  /* ───────── Arranque ───────── */
  maybeNews();
  welcome();
  maybeGift();
  const start = (location.hash || "").slice(1);
  function handleLink(delay) { // enlaces de intercambio leídos con la cámara del móvil
    let h = location.hash.slice(1); try { h = decodeURIComponent(h); } catch {}
    const link = /^(dar|recibir)=(.+)$/.exec(h);
    if (!link) return false;
    try { history.replaceState(null, "", location.pathname + location.search); } catch {}
    setTimeout(() => {
      if (tradeState) closeTrade();
      if (link[1] === "dar") { if (RE_REQ.test(link[2])) { go("mas"); openTrade("dar", link[2]); } }
      else { go("mas"); onScanGift(link[2]); }
    }, delay);
    return true;
  }
  handleLink(700);
  window.addEventListener("hashchange", () => handleLink(50));
  go(["hoy", "album", "sobres", "mas"].includes(start) ? start : "hoy");
  $("#opening").addEventListener("click", (e) => { if (e.target === $("#opening") && $("#summary").classList.contains("show")) closeOpening(); });

  // Para pruebas desde la consola: window.__album
  window.__album = { S, saintsOfDay, bigFeast, buildPack, easter, drawRandom, giftCode, reqCode, onScanGift: (t) => onScanGift(t), onScanReq: (t) => onScanReq(t), openTrade };
})();
