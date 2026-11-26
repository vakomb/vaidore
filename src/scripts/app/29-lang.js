// 29 - kalba (v33): LT | EN perjungiklis (header'is kompiuteryje, ☰ meniu, poraštė), pasirinkimo įsiminimas ir nuorodų
// vertimas anglų versijoje. Programėlė viduje naudoja lietuviškus kelius („kvepalai/rasa“); anglų puslapyje kiekviena
// vidinė nuoroda (ir vėliau atsiradusi) gauna anglišką adresą („en/perfumes/rasa“), todėl atidarius naujame skirtuke,
// pasidalijus ar paieškos sistemai - adresas teisingas. Žemėlapis - src/i18n/routes.json, vertimas - src/i18n/url.js.
const LANG_KEY = "vaidore_lang_v1"; // naujas raktas (v33); senieji localStorage raktai nekeičiami
const LANG_COOKIE = "vaidore_lang"; // funkcinis slapukas: jį perskaito serveris (Vercel), kad pasirinkta kalba nebūtų keičiama
// Perjungiklis matomas anglų puslapyje visada, lietuviškame - kai angliška versija paskelbta (src/i18n/config.json „enPublic“)
const langSwitchOn = () => LANG === "en" || EN_PUBLIC;
// 404.html - viena abiem kalboms: <html lang> pagal adresą
if (document.documentElement.lang !== LANG) document.documentElement.lang = LANG;

function rememberLang(lang) {
  store.set(LANG_KEY, lang);
  try {
    document.cookie = `${LANG_COOKIE}=${lang}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    /* slapukai išjungti - pasirinkimas lieka localStorage */
  }
}

// Vidinė santykinė nuoroda → anglų versijos (tik anglų puslapyje). Išorinės, absoliučios, inkarai, mailto / tel - nekeičiamos.
function localHref(v) {
  if (LANG !== "en" || v == null || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#|\?)/i.test(v) || L10N.isEn(v)) return v;
  return L10N.enRel(v);
}
function localizeEl(el) {
  if (el.hasAttribute("data-lang-link")) return;
  const attr = el.tagName === "FORM" ? "action" : "href";
  const v = el.getAttribute(attr);
  const nv = localHref(v);
  if (nv !== v) el.setAttribute(attr, nv);
}
function localizeLinks(root = document) {
  if (LANG !== "en" || !root.querySelectorAll) return;
  if (root.matches?.("a[href], form[action]")) localizeEl(root);
  root.querySelectorAll("a[href], form[action]").forEach(localizeEl);
}
if (LANG === "en") {
  localizeLinks(document);
  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === "attributes") localizeEl(m.target);
      else m.addedNodes.forEach(n => n.nodeType === 1 && localizeLinks(n));
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["href", "action"] });
}

// Perjungiklio nuorodos - tas pats puslapis kita kalba (su filtrais ir inkaru); dabartinė pažymima aria-current
function langLinksHTML(cls = "") {
  return ["lt", "en"]
    .map(
      l =>
        `<a class="${cls}" href="${esc(altUrl(l))}" data-lang-link="${l}" hreflang="${l}" lang="${l}" title="${esc(t(`lang.${l}`))}"${
          l === LANG ? ' aria-current="true"' : ""
        }>${esc(t(`lang.${l}Short`))}</a>`
    )
    .join("");
}
function updateLangSwitch() {
  const sw = $("#langSw");
  if (!sw) return;
  sw.hidden = !langSwitchOn();
  $$("a[data-lang-link]", sw).forEach(a => {
    a.href = altUrl(a.dataset.langLink);
    a.toggleAttribute("aria-current", a.dataset.langLink === LANG);
  });
  $$("a[data-lang-link]", $("#ftrIn") || document.createElement("i")).forEach(a => (a.href = altUrl(a.dataset.langLink)));
}
// ☰ meniu eilutė (iOS segmentas) ir poraštės nuorodos - 21-header.js
const langRowHTML = () =>
  langSwitchOn()
    ? `<div class="mLang"><span class="mIco">${glyph("globe")}</span><span class="mTxt">${esc(t("lang.label"))}</span><nav class="langSeg" aria-label="${esc(
        t("lang.aria")
      )}">${langLinksHTML()}</nav></div>`
    : "";
const langFooterHTML = () => (langSwitchOn() ? `<nav class="ftrLang" aria-label="${esc(t("lang.aria"))}">${langLinksHTML()}</nav>` : "");

// Paspaudus kalbą - įsimenama (kitą kartą rodoma ta pati), toliau - įprastas perėjimas į kitos kalbos puslapį
document.addEventListener("click", e => {
  const a = e.target instanceof Element && e.target.closest("a[data-lang-link]");
  if (!a) return;
  a.href = altUrl(a.dataset.langLink);
  rememberLang(a.dataset.langLink);
});
// Atidarius adresą su kalba (pvz. iš nuorodos), kai pasirinkimo dar nėra - jis įsimenamas tik kalbai pasirinkus pačiam;
// automatinį parinkimą pagal šalį atlieka serveris (8 etapas)

// 404.html - vienas abiem kalboms (GitHub Pages, Vercel): statiniai tekstai (partials) surinkti lietuviškai, todėl anglų
// adrese jie išverčiami čia pagal žodynus (LT reikšmė → raktas → EN). Kituose puslapiuose nieko nedaroma.
(function retranslateStatic() {
  const built = document.documentElement.dataset.buildLang;
  if (!built || built === LANG || !document.body) return;
  const rev = new Map(Object.entries(I18N_ALL[built] || {}).map(([k, v]) => [v, k]));
  const tr = s => {
    const k = rev.get(s.trim());
    return k && DICT[k] != null ? s.replace(s.trim(), DICT[k]) : s;
  };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode;
    const v = tr(n.nodeValue);
    if (v !== n.nodeValue) n.nodeValue = v;
  }
  for (const el of document.querySelectorAll("[aria-label], [placeholder], [title]"))
    for (const a of ["aria-label", "placeholder", "title"]) {
      const v = el.getAttribute(a);
      const x = v && tr(v);
      if (x && x !== v) el.setAttribute(a, x);
    }
})();
