// Katalogas iš Supabase surinkimo metu (viešas publishable raktas, tik matomi įrašai - RLS).
// Tas pats formatas kaip src/data/catalog.json (ir kaip programėlės catalogFromDb, 20-supabase.js).
// Nepavykus (nėra interneto, tuščia bazė) - grąžina null, ir naudojamas src/data/catalog.json.
// v30: ilgi brūkšniai (U+2012-2015) ir minuso ženklas (U+2212) - visur paprastas „-“ (kaip programėlėje, 01-util.js)
export const plain = v => String(v ?? "").replace(/[\u2012-\u2015\u2212]/g, "-");
export const plainDeep = v => {
  if (typeof v === "string") return plain(v);
  if (Array.isArray(v)) for (let i = 0; i < v.length; i++) v[i] = plainDeep(v[i]);
  else if (v && typeof v === "object") for (const k of Object.keys(v)) v[k] = plainDeep(v[k]);
  return v;
};
// v33: vertimai (stulpelis i18n) - katalogo laukų vardais („description“ → „desc“); lietuviškiems puslapiams jie
// pašalinami surinkimo metu (tools/build.mjs - catalogForLang)
const I18N_KEYS = { description: "desc", mood_title: "moodTitle", mood_line: "moodLine" };
export function dbI18n(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const [lang, o] of Object.entries(raw))
    if (lang !== "lt" && o && typeof o === "object")
      for (const [k, v] of Object.entries(o)) if (typeof v === "string" ? v.trim() : v != null) ((out[lang] ??= {})[I18N_KEYS[k] || k] = v);
  return Object.keys(out).length ? { i18n: out } : {};
}
export async function dbCatalog(sb, fallback) {
  if (!sb?.url || !sb?.key) return null;
  const get = async path => {
    const r = await fetch(`${sb.url}/rest/v1/${path}`, { headers: { apikey: sb.key }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`${path.split("?")[0]}: HTTP ${r.status}`);
    return plainDeep(await r.json());
  };
  // Natų biblioteka ir kvapų nuotaikos juosta (v29) - nebūtinos: be migracijos grąžinamas tuščias sąrašas
  const optional = path => get(path).then(r => (Array.isArray(r) ? r : []), () => []);
  const pageFields = p => ({
    ...(p.subtitle ? { subtitle: p.subtitle } : {}),
    ...(p.mood_image ? { moodImage: p.mood_image } : {}),
    ...(p.mood_title ? { moodTitle: p.mood_title } : {}),
    ...(p.mood_line ? { moodLine: p.mood_line } : {})
  });
  try {
    const [products, families, categories, links, settings, reviews, scents, notes] = await Promise.all([
      get("products?select=*&order=rank.asc"),
      get("families?select=*&order=sort.asc"),
      get("categories?select=*&order=sort.asc"),
      get("product_categories?select=product_id,category_id"),
      get("settings?select=data&id=eq.1"),
      get("reviews?select=product_id,name,text,rating,created_at,verified&status=eq.approved&order=created_at.desc"),
      optional("scents?select=*"),
      optional("note_media?select=name,image")
    ]);
    if (!products.length) return null;
    const catsOf = new Map();
    for (const l of links) catsOf.set(l.product_id, [...(catsOf.get(l.product_id) || []), l.category_id]);
    const revOf = new Map();
    for (const r of reviews)
      revOf.set(r.product_id, [...(revOf.get(r.product_id) || []), { name: r.name, text: r.text, rating: r.rating, date: String(r.created_at).slice(0, 10), verified: r.verified }]);
    return {
      settings: { ...fallback.settings, ...(settings?.[0]?.data || {}) },
      families: families.map(f => ({ id: f.id, name: f.name, hint: f.hint, sort: f.sort, visible: f.visible, ...dbI18n(f.i18n) })),
      categories: categories.map(c => ({ id: c.id, name: c.name, description: c.description, image: c.image, sort: c.sort, visible: c.visible, ...dbI18n(c.i18n) })),
      scents: scents.filter(s => s.mood_image).map(s => ({ id: s.id, moodImage: s.mood_image, moodTitle: s.mood_title || "", moodLine: s.mood_line || "", ...dbI18n(s.i18n) })),
      noteMedia: notes.filter(n => n.name && n.image).map(n => ({ name: n.name, image: n.image })),
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        inspired: p.inspired || "",
        inspiredImage: p.inspired_image || "",
        ...pageFields(p),
        type: p.type || "kvepalai",
        conc: p.conc,
        gender: p.gender,
        family: p.family,
        tagline: p.tagline,
        desc: p.description,
        ingredients: p.ingredients || "",
        notes: { top: p.notes?.top || [], heart: p.notes?.heart || [], base: p.notes?.base || [] },
        longevity: p.longevity,
        sillage: p.sillage,
        attrs: p.attrs || {},
        scent: p.scent_id || null,
        sizes: (p.sizes || [])
        .map(s => ({ ml: Number(s.ml), price: Number(s.price), ...(Number(s.was) > Number(s.price) ? { was: Number(s.was) } : {}), ...(s.unit && s.unit !== "ml" ? { unit: s.unit } : {}) }))
        .sort((a, b) => a.ml - b.ml),
        sample: Number(p.sample),
        look: p.look,
        badge: p.badge || null,
        rank: p.rank,
        added: p.added,
        stock: p.stock,
        images: p.images || [],
        visible: p.visible,
        categories: catsOf.get(p.id) || [],
        reviews: revOf.get(p.id) || [],
        ...dbI18n(p.i18n)
      }))
    };
  } catch (err) {
    console.warn(`! Katalogo iš duomenų bazės gauti nepavyko (${err.message}) - naudojamas src/data/catalog.json`);
    return null;
  }
}
