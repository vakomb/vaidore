// 02 – ikonos: linijiniai glifai (1,85 px), spalvotos kategorijų ir kvapo šeimų ikonos, logotipas.
const GLYPH = {
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  filter: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  "chev-down": '<path d="m7 10 5 5 5-5"/>',
  "chev-right": '<path d="m10 7 5 5-5 5"/>',
  "chev-left": '<path d="m14 7-5 5 5 5"/>',
  "arrow-right": '<path d="M4.5 12h15M14 6.5l5.5 5.5-5.5 5.5"/>',
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
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  spark: '<path d="M12 3.5 13.9 9l5.6 2-5.6 2L12 18.5 10.1 13l-5.6-2 5.6-2z"/><path d="M18.5 3.5v3M17 5h3"/>',
  share: '<path d="M12 4v11M8 7.5 12 4l4 3.5"/><path d="M6.5 11.5H6A1.5 1.5 0 0 0 4.5 13v6A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5h-.5"/>',
  gift: '<rect x="4" y="9" width="16" height="11.5" rx="2"/><path d="M4 13h16M12 9v11.5M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zm0 0c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/>',
  locker: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M12 3.5v17M4 9.5h8M4 15h8M12 12h8"/><path d="M15 9.2h2"/>',
  bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2H5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.8 20c.9-3.7 3.7-5.6 7.2-5.6s6.3 1.9 7.2 5.6"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  box: '<path d="m4 7.5 8-4 8 4v9l-8 4-8-4z"/><path d="m4 7.5 8 4 8-4M12 11.5v9"/>',
  logout: '<path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 8l-4 4 4 4M6 12h9"/>',
  edit: '<path d="M4.5 19.5h4l10-10-4-4-10 10z"/><path d="m13 7 4 4"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7"/><path d="M10.5 11v5M13.5 11v5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  "eye-off": '<path d="M4 4l16 16"/><path d="M9.9 6A9.6 9.6 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17 17 0 0 1-3 3.7M6.2 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  upload: '<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15v3A1.5 1.5 0 0 0 6 19.5h12a1.5 1.5 0 0 0 1.5-1.5v-3"/>',
  chart: '<path d="M4.5 19.5h15"/><path d="M7 16v-5M12 16V7M17 16v-8"/>',
  tag: '<path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.4 1.4 0 0 1 0 2l-6.6 6.6a1.4 1.4 0 0 1-2 0z"/><circle cx="8" cy="8" r="1.5"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 19.5c.8-3.4 3.4-5.2 6.5-5.2s5.7 1.8 6.5 5.2"/><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.6c2 .6 3.4 2.2 4 4.9"/>',
  star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7.9-5.6-4-3.9 5.6-.8z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/>',
  drag: '<circle cx="9" cy="7" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="17" r="1"/><circle cx="15" cy="17" r="1"/>',
  ext: '<path d="M13.5 4.5h6v6M19.5 4.5l-9 9"/><path d="M17 13.5v5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/>',
  pin: '<path d="M12 20.5s6-5.6 6-10.5a6 6 0 0 0-12 0c0 4.9 6 10.5 6 10.5z"/><circle cx="12" cy="10" r="2.2"/>'
};
const glyph = (name, cls = "") =>
  `<svg class="gl ${cls}" viewBox="0 0 24 24" aria-hidden="true">${GLYPH[name] || ""}</svg>`;

// Logotipas: VAIDORE etiketės šriftu (kontūrai – src/partials/logo.svg, tools/make-logo.py; įdėtas į header'į surinkimo metu)
const logoHTML = () => document.querySelector(".hdr .logo svg.wordmark")?.outerHTML || `<b>Vaidore</b>`;

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
  $$("[data-logo]", root).forEach(el => {
    if (!el.firstElementChild) el.innerHTML = logoHTML();
  });
}
