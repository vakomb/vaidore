// Pradiniai duomenys duomenų bazei iš src/data/catalog.json → supabase/seed.sql
// (šeimos, kategorijos, kvapai, kvapų kategorijos, nustatymai). Paleisti vieną kartą tuščiai bazei:
//   node tools/make-seed.mjs && (Supabase → SQL Editor → įklijuoti supabase/seed.sql → Run)
// Vėliau katalogą valdote administravimo skydelyje (/admin), o catalog.json lieka atsarginiu katalogu.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const d = JSON.parse(fs.readFileSync(path.join(root, "src/data/catalog.json"), "utf8"));
const q = s => `'${String(s).replace(/'/g, "''")}'`;
const J = v => `${q(JSON.stringify(v))}::jsonb`;
const A = arr => (arr?.length ? `array[${arr.map(q).join(",")}]::text[]` : "'{}'::text[]");
const out = ["-- Sugeneruota: node tools/make-seed.mjs (iš src/data/catalog.json)", "begin;"];
d.families.forEach((f, i) => out.push(`insert into public.families (id, name, hint, sort) values (${q(f.id)}, ${q(f.name)}, ${q(f.hint)}, ${i + 1}) on conflict (id) do nothing;`));
(d.categories || []).forEach((c, i) =>
  out.push(`insert into public.categories (id, name, description, image, sort) values (${q(c.id)}, ${q(c.name)}, ${q(c.description || "")}, ${q(c.image || "")}, ${c.sort ?? i + 1}) on conflict (id) do nothing;`)
);
for (const p of d.products) {
  const cols = [
    q(p.id), q(p.name), q(p.conc), q(p.gender), q(p.family), q(p.tagline), q(p.desc), J(p.notes), p.longevity, p.sillage,
    J(p.sizes), p.sample, J(p.look), p.badge ? q(p.badge) : "null", p.rank, q(p.added),
    p.stock == null ? "null" : p.stock, A(p.images), q(p.inspired || "")
  ];
  out.push(
    `insert into public.products (id, name, conc, gender, family, tagline, description, notes, longevity, sillage, sizes, sample, look, badge, rank, added, stock, images, inspired) values (${cols.join(", ")}) on conflict (id) do nothing;`
  );
  for (const c of p.categories || []) out.push(`insert into public.product_categories values (${q(p.id)}, ${q(c)}) on conflict do nothing;`);
}
// v33: vertimai (stulpelis i18n, migracija 20261126120000; katalogo „desc“ → bazės „description“)
const dbI18n = i18n => Object.fromEntries(Object.entries(i18n || {}).map(([l, o]) => [l, Object.fromEntries(Object.entries(o).map(([k, v]) => [k === "desc" ? "description" : k, v]))]));
for (const [table, list] of [["products", d.products], ["families", d.families], ["categories", d.categories || []]])
  for (const x of list) if (x.i18n) out.push(`update public.${table} set i18n = ${J(dbI18n(x.i18n))} where id = ${q(x.id)};`);
out.push(`insert into public.settings (id, data) values (1, ${J(d.settings)}) on conflict (id) do nothing;`, "commit;");
fs.writeFileSync(path.join(root, "supabase/seed.sql"), out.join("\n") + "\n");
console.log(`supabase/seed.sql - ${d.products.length} kvapai, ${d.families.length} šeimos, ${(d.categories || []).length} kategorijos`);
