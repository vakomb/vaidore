// Katalogas iš Supabase surinkimo metu (viešas publishable raktas, tik matomi įrašai – RLS).
// Tas pats formatas kaip src/data/catalog.json (ir kaip programėlės catalogFromDb, 20-supabase.js).
// Nepavykus (nėra interneto, tuščia bazė) – grąžina null, ir naudojamas src/data/catalog.json.
export async function dbCatalog(sb, fallback) {
  if (!sb?.url || !sb?.key) return null;
  const get = async path => {
    const r = await fetch(`${sb.url}/rest/v1/${path}`, { headers: { apikey: sb.key }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`${path.split("?")[0]}: HTTP ${r.status}`);
    return r.json();
  };
  try {
    const [products, families, categories, links, settings, reviews] = await Promise.all([
      get("products?select=*&order=rank.asc"),
      get("families?select=*&order=sort.asc"),
      get("categories?select=*&order=sort.asc"),
      get("product_categories?select=product_id,category_id"),
      get("settings?select=data&id=eq.1"),
      get("reviews?select=product_id,name,text,rating,created_at,verified&status=eq.approved&order=created_at.desc")
    ]);
    if (!products.length) return null;
    const catsOf = new Map();
    for (const l of links) catsOf.set(l.product_id, [...(catsOf.get(l.product_id) || []), l.category_id]);
    const revOf = new Map();
    for (const r of reviews)
      revOf.set(r.product_id, [...(revOf.get(r.product_id) || []), { name: r.name, text: r.text, rating: r.rating, date: String(r.created_at).slice(0, 10), verified: r.verified }]);
    return {
      settings: { ...fallback.settings, ...(settings?.[0]?.data || {}) },
      families: families.map(f => ({ id: f.id, name: f.name, hint: f.hint, sort: f.sort, visible: f.visible })),
      categories: categories.map(c => ({ id: c.id, name: c.name, description: c.description, image: c.image, sort: c.sort, visible: c.visible })),
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        conc: p.conc,
        gender: p.gender,
        family: p.family,
        tagline: p.tagline,
        desc: p.description,
        notes: { top: p.notes?.top || [], heart: p.notes?.heart || [], base: p.notes?.base || [] },
        longevity: p.longevity,
        sillage: p.sillage,
        seasons: p.seasons || [],
        time: p.times || [],
        sizes: (p.sizes || []).map(s => ({ ml: Number(s.ml), price: Number(s.price) })).sort((a, b) => a.ml - b.ml),
        sample: Number(p.sample),
        look: p.look,
        badge: p.badge || null,
        rank: p.rank,
        added: p.added,
        stock: p.stock,
        images: p.images || [],
        visible: p.visible,
        categories: catsOf.get(p.id) || [],
        reviews: revOf.get(p.id) || []
      }))
    };
  } catch (err) {
    console.warn(`! Katalogo iš duomenų bazės gauti nepavyko (${err.message}) – naudojamas src/data/catalog.json`);
    return null;
  }
}
