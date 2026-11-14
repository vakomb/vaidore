// 02 – ikonos: linijiniai glifai (1,85 px), apatinės juostos kontūrinė / užpildyta ikona, spalvotos plytelių ikonos, logotipas.
const GLYPH = {
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  filter: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  "chev-down": '<path d="m7 10 5 5 5-5"/>',
  "chev-right": '<path d="m10 7 5 5-5 5"/>',
  "chev-left": '<path d="m14 7-5 5 5 5"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  minus: '<path d="M6 12h12"/>',
  check: '<path d="m5.5 12.5 4 4 9-9.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  bag: '<path d="M5.5 8.5h13l-1 11.2a1.5 1.5 0 0 1-1.5 1.3H8a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
  heart:
    '<path d="M12 19.5s-7-4.3-7-9.6A4 4 0 0 1 12 7.6a4 4 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6z"/>',
  truck: '<path d="M3.5 7.5h10v8.5h-10zM13.5 10.5h4l3 3v2.5h-7"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  drop: '<path d="M12 3.5c3.6 4.2 6 7.6 6 10.6a6 6 0 0 1-12 0c0-3 2.4-6.4 6-10.6z"/>',
  return: '<path d="M9 7 5 11l4 4"/><path d="M5 11h9a5 5 0 0 1 0 10h-3"/>',
  card: '<rect x="3.5" y="6" width="17" height="12" rx="2.5"/><path d="M3.5 10h17M7 14.5h3"/>',
  mail: '<rect x="3.5" y="6" width="17" height="12" rx="2.5"/><path d="m4.5 7.5 7.5 5.5 7.5-5.5"/>',
  doc: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6"/>',
  shield: '<path d="M12 3.5 5.5 6v5.5c0 4.2 2.8 7.4 6.5 9 3.7-1.6 6.5-4.8 6.5-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>'
};
const glyph = (name, cls = "") =>
  `<svg class="gl ${cls}" viewBox="0 0 24 24" aria-hidden="true">${GLYPH[name] || ""}</svg>`;

// Apatinė juosta: nvO – kontūras (neaktyvi), nvF – užpildyta (aktyvi), kaip AutoEasier
const TAB_ICO = {
  home:
    '<svg class="nvO" viewBox="0 0 24 24"><path d="M4 10.2 11.2 4.6a1.3 1.3 0 0 1 1.6 0L20 10.2v8.9a1.4 1.4 0 0 1-1.4 1.4H15v-5.6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.6H5.4A1.4 1.4 0 0 1 4 19.1z"/></svg><svg class="nvF" viewBox="0 0 24 24"><path d="M3.6 10.1 11 4.3a1.6 1.6 0 0 1 2 0l7.4 5.8v9.1a1.6 1.6 0 0 1-1.6 1.6H15v-5.4a1.2 1.2 0 0 0-1.2-1.2h-3.6A1.2 1.2 0 0 0 9 15.4v5.4H5.2a1.6 1.6 0 0 1-1.6-1.6z"/></svg>',
  shop:
    '<svg class="nvO" viewBox="0 0 24 24"><rect x="9" y="3.6" width="6" height="3.6" rx="1"/><path d="M10.2 7.2h3.6v2.2"/><rect x="5.8" y="9.4" width="12.4" height="11" rx="3"/><path d="M9.2 13.8h5.6"/></svg><svg class="nvF" viewBox="0 0 24 24"><rect x="8.6" y="3" width="6.8" height="4.4" rx="1.3"/><path d="M10 7.2h4v2.4h-4z"/><path d="M8.5 9h7a3.5 3.5 0 0 1 3.5 3.5v6A3.5 3.5 0 0 1 15.5 22h-7A3.5 3.5 0 0 1 5 18.5v-6A3.5 3.5 0 0 1 8.5 9zm.8 4.2a.9.9 0 0 0 0 1.8h5.4a.9.9 0 0 0 0-1.8z"/></svg>',
  fav:
    '<svg class="nvO" viewBox="0 0 24 24"><path d="M12 20s-7.8-4.6-7.8-10.4A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.8 2.3C19.8 15.4 12 20 12 20z"/></svg><svg class="nvF" viewBox="0 0 24 24"><path d="M12 20.6s-8.4-4.9-8.4-11.1A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.4 2.9c0 6.2-8.4 11.1-8.4 11.1z"/></svg>',
  cart:
    '<svg class="nvO" viewBox="0 0 24 24"><path d="M5.3 8.4h13.4l-1 11.4a1.6 1.6 0 0 1-1.6 1.4H7.9a1.6 1.6 0 0 1-1.6-1.4z"/><path d="M8.8 8.4V7a3.2 3.2 0 0 1 6.4 0v1.4"/></svg><svg class="nvF" viewBox="0 0 24 24"><path d="M8 7a4 4 0 0 1 8 0v.6h2.8a1 1 0 0 1 1 1.1l-1.1 11.4a2 2 0 0 1-2 1.8H7.3a2 2 0 0 1-2-1.8L4.2 8.7a1 1 0 0 1 1-1.1H8zm1.7.6h4.6V7a2.3 2.3 0 0 0-4.6 0z"/></svg>'
};

// Logotipas: lašo ženklas + VAIDORE
// Kiekvienas logotipas gauna savo gradiento id (paslėptame šoniniame meniu esantis gradientas kitur nepiešiamas)
let logoSeq = 0;
const logoHTML = () => {
  const id = `vdLg${++logoSeq}`;
  return `<svg viewBox="0 0 26 26" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B67CC"/><stop offset="1" stop-color="#1E3A86"/></linearGradient></defs><path d="M13 2.5c4.4 5 7.4 9.1 7.4 12.7a7.4 7.4 0 0 1-14.8 0C5.6 11.6 8.6 7.5 13 2.5z" fill="url(#${id})"/><path d="M10 15.6a3.2 3.2 0 0 0 3 3.2" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.6" stroke-linecap="round"/></svg><b>Vaidore</b>`;
};

// Spalvotos plytelių ikonos (48 × 48, spalvos pačiame SVG – kaip AutoEasier plytelės)
const TILE_ICO = {
  moterims:
    '<svg viewBox="0 0 48 48"><circle cx="24" cy="19" r="7.5" fill="#F9A8C0"/><circle cx="17" cy="23" r="7" fill="#F48FB1"/><circle cx="31" cy="23" r="7" fill="#F48FB1"/><circle cx="20.5" cy="29.5" r="7" fill="#EC6F9A"/><circle cx="27.5" cy="29.5" r="7" fill="#EC6F9A"/><circle cx="24" cy="25" r="4.2" fill="#FDE68A"/><path d="M24 36v8" stroke="#4CA867" stroke-width="2.6" stroke-linecap="round"/></svg>',
  vyrams:
    '<svg viewBox="0 0 48 48"><rect x="18" y="5" width="12" height="9" rx="2" fill="#1E293B"/><rect x="21" y="13" width="6" height="4" fill="#94A3B8"/><rect x="10" y="17" width="28" height="27" rx="5" fill="#BFD4EE"/><rect x="13" y="24" width="22" height="17" rx="3" fill="#4C78B8"/><rect x="13.5" y="19.5" width="3" height="20" rx="1.5" fill="#fff" fill-opacity=".7"/><rect x="17" y="29" width="14" height="6" rx="1.5" fill="#fff" fill-opacity=".9"/></svg>',
  unisex:
    '<svg viewBox="0 0 48 48"><circle cx="19" cy="24" r="12" fill="#A5B4FC" fill-opacity=".9"/><circle cx="29" cy="24" r="12" fill="#F0ABFC" fill-opacity=".8"/><path d="M24 13.6a12 12 0 0 1 0 20.8 12 12 0 0 1 0-20.8z" fill="#C084FC"/><circle cx="24" cy="24" r="2.6" fill="#fff"/></svg>',
  meginukai:
    '<svg viewBox="0 0 48 48"><rect x="9" y="8" width="8" height="5" rx="1.5" fill="#C9A24A"/><rect x="10" y="13" width="6" height="28" rx="3" fill="#FDE7C2"/><rect x="11" y="23" width="4" height="16" rx="2" fill="#E6A23C"/><rect x="20" y="6" width="8" height="5" rx="1.5" fill="#C9A24A"/><rect x="21" y="11" width="6" height="30" rx="3" fill="#FBD3DC"/><rect x="22" y="20" width="4" height="19" rx="2" fill="#E77C97"/><rect x="31" y="8" width="8" height="5" rx="1.5" fill="#C9A24A"/><rect x="32" y="13" width="6" height="28" rx="3" fill="#D7EBDD"/><rect x="33" y="22" width="4" height="17" rx="2" fill="#5FA77A"/></svg>'
};

// Kvapo šeimų ikonos (24 × 24, spalvotos) ir atspalviai
const FAMILY_LOOK = {
  geliu: {
    tint: "#FCEFF2",
    svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7.5" r="4" fill="#F48FB1"/><circle cx="7.5" cy="12" r="4" fill="#F48FB1"/><circle cx="16.5" cy="12" r="4" fill="#F48FB1"/><circle cx="12" cy="16.5" r="4" fill="#F48FB1"/><circle cx="12" cy="12" r="3" fill="#FDE68A"/></svg>'
  },
  sviezi: {
    tint: "#EAF4FA",
    svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="#FCD34D"/><circle cx="12" cy="12" r="6.6" fill="#FEF3C7"/><path d="M12 5.6v12.8M5.6 12h12.8M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="#FCD34D" stroke-width="1.3"/></svg>'
  },
  medienos: {
    tint: "#EEF5EE",
    svg: '<svg viewBox="0 0 24 24"><path d="M12 3 6 11.5h3.2L5.5 17h13l-3.7-5.5H18z" fill="#4CA867"/><rect x="10.8" y="17" width="2.4" height="4" rx="1" fill="#8E6442"/></svg>'
  },
  ambros: {
    tint: "#FBF1E1",
    svg: '<svg viewBox="0 0 24 24"><path d="M12 3c1.2 3.6 5.5 5.2 5.5 10.2A5.5 5.5 0 0 1 12 19a5.5 5.5 0 0 1-5.5-5.8c0-2.6 1.4-4 2.6-5.2.3 1.6 1 2.6 2 3C11 8.3 11.2 5.5 12 3z" fill="#E6A23C"/><path d="M12 12.2c1.4 1.4 2.4 2.6 2.4 4a2.4 2.4 0 0 1-4.8 0c0-1.4 1-2.6 2.4-4z" fill="#FDE7C2"/></svg>'
  },
  gurmaniski: {
    tint: "#F8EEE7",
    svg: '<svg viewBox="0 0 24 24"><path d="M6.5 9h11l-1.2 9.5a2 2 0 0 1-2 1.7H9.7a2 2 0 0 1-2-1.7z" fill="#C77B4E"/><path d="M6 9c0-2.5 2.7-4.5 6-4.5s6 2 6 4.5z" fill="#F2D27A"/><path d="M9 13.5h6" stroke="#fff" stroke-opacity=".6" stroke-width="1.4" stroke-linecap="round"/></svg>'
  }
};

function hydrateIcons(root = document) {
  $$("[data-glyph]", root).forEach(el => {
    if (!el.firstElementChild) el.innerHTML = glyph(el.dataset.glyph);
  });
  $$("[data-ico]", root).forEach(el => {
    if (!el.firstElementChild) el.innerHTML = TAB_ICO[el.dataset.ico] || "";
  });
  $$("[data-logo]", root).forEach(el => {
    if (!el.firstElementChild) el.innerHTML = logoHTML();
  });
}
