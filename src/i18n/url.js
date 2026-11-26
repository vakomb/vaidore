// v33: LT ↔ EN adresų vertimas - vienas šaltinis programėlei (window.VAIDORE_L10N, tools/build.mjs) ir surinkimui (tools/i18n.mjs).
// Programėlė viduje visada naudoja lietuviškus kelius („kvepalai/rasa?tipas=zvakes#pristatymas“); anglų versijoje jie
// verčiami tik ties adreso riba („en/perfumes/rasa?type=candles#delivery“). Žemėlapis - src/i18n/routes.json.
function makeL10n(R) {
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o || {}, k);
  const inv = o => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [v, k]));
  const P = R.paths || {};
  const PI = inv(P);
  const SUB = R.sub || {};
  const SUBI = Object.fromEntries(Object.entries(SUB).map(([k, o]) => [P[k], inv(o)]));
  const Q = R.params || {};
  const QI = inv(Q);
  const H = R.hash || {};
  const HI = inv(H);
  const VAL = R.paramValues || {};
  const STATIC = R.static || [];
  const split = rel => {
    const m = String(rel == null ? "" : rel).match(/^([^?#]*)(\?[^#]*)?(#.*)?$/) || [];
    return [m[1] || "", m[2] || "", m[3] || ""];
  };
  const clean = p => p.replace(/^\.(\/|$)/, "").replace(/^\/+|\/+$/g, "");
  const query = (q, toEn) => {
    if (!q || q === "?") return q;
    const out = new URLSearchParams();
    for (const [k, v] of new URLSearchParams(q)) {
      const ltKey = toEn ? k : has(QI, k) ? QI[k] : k;
      const key = toEn ? (has(Q, k) ? Q[k] : k) : ltKey;
      const val = VAL[ltKey] === "paths" ? (toEn ? (has(P, v) ? P[v] : v) : has(PI, v) ? PI[v] : v) : v;
      out.append(key, val);
    }
    const s = out.toString();
    return s ? `?${s}` : "";
  };
  const hash = (h, map) => (h && h.length > 1 ? `#${has(map, h.slice(1)) ? map[h.slice(1)] : h.slice(1)}` : h);
  const isEn = rel => /^(\.\/)?en(\/|$|[?#])/.test(String(rel || ""));
  // Vidinis (LT) santykinis adresas → anglų versijos adresas. Ne maršrutas (failas, administravimas) - nekeičiamas.
  function enRel(rel) {
    if (isEn(rel)) return rel;
    const [p0, q, h] = split(rel);
    const p = clean(p0);
    const seg = p ? p.split("/") : [];
    if (seg.length && !has(P, seg[0])) return rel;
    if (seg.length && STATIC.includes(seg[0]) && !R.enStatic) return rel;
    const out = seg.map((s, i) => (i === 0 ? P[s] : i === 1 && has(SUB[seg[0]], s) ? SUB[seg[0]][s] : s));
    return ["en", ...out].join("/") + query(q, true) + hash(h, H);
  }
  // Anglų versijos adresas → vidinis (LT). Ne „en/…“ - nekeičiamas.
  function ltRel(rel) {
    if (!isEn(rel)) return rel;
    const [p0, q, h] = split(rel);
    const seg = clean(p0).split("/").slice(1);
    if (seg[seg.length - 1] === "index") seg.pop();
    const first = seg[0];
    const out = seg.map((s, i) => (i === 0 ? (has(PI, s) ? PI[s] : s) : i === 1 && has(SUBI[first], s) ? SUBI[first][s] : s));
    return out.join("/") + query(q, false) + hash(h, HI);
  }
  return { enRel, ltRel, isEn };
}
