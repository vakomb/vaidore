// Automatinio produktų pridėjimo variklio testas (v15): src/scripts/admin/13-autofill-words.js + 13-autofill.js.
// Variklis – grynas JS be DOM, todėl paleidžiamas Node vm kontekste (kaip administravimo skydelyje – vienas scope).
// Paleisti: node tools/test-autofill.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = vm.createContext({});
vm.runInContext(
  `${["13-autofill-words.js", "13-autofill.js"].map(f => fs.readFileSync(path.join(root, "src/scripts/admin", f), "utf8")).join("\n")}
globalThis.AF = { afParse, afNote, afProductName, AF_NOTES };`,
  ctx
);
const { afParse, afNote, AF_NOTES } = ctx.AF;
let failed = 0;
const check = (ok, name) => {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failed++;
};
const j = x => JSON.stringify(x);
const labels = r => r.missing.map(m => m.key);
const families = ["geliu", "sviezi", "medienos", "ambros", "gurmaniski"];

// ── 1. Priimamumo testas: lenkiškas „My Pink“ aprašymas ──
const myPink = fs.readFileSync(path.join(root, "tools/fixtures/autofill-my-pink.txt"), "utf8");
const r = afParse(myPink, { families });
const f = r.fields;
check(r.lang === "pl" && r.type === "kvepalai", "My Pink: kalba lenkų, tipas kvepalai");
check(f.name === "My Pink" && f.id === "my-pink", "My Pink: pavadinimas „My Pink“ (be NOMI ir rinkodaros žodžių), id my-pink");
check(f.gender === "moterims" && f.conc === "EDP" && j(f.sizes) === j([{ ml: 33, price: "" }]), "My Pink: moterims, EDP, 33 ml");
check(j(f.notes.top) === j(["Bergamotė", "Apelsinmedžio žiedai"]), "My Pink: viršutinės – Bergamotė, Apelsinmedžio žiedai");
check(j(f.notes.heart) === j(["Tuberozė", "Jazminas"]), "My Pink: širdis – Tuberozė, Jazminas");
check(j(f.notes.base) === j(["Kreminė vanilė", "Baltasis muskusas", "Medienos natos"]), "My Pink: bazė – Kreminė vanilė, Baltasis muskusas, Medienos natos");
check(f.family === "geliu" && !r.unknown.length, "My Pink: šeima geliu, visos natos atpažintos");
check(!("seasons" in f) && !("times" in f) && !("occasions" in f) && f.longevity === 4 && f.sillage === 3 && /^#[0-9A-F]{6}$/i.test(f.look.liquid) && f.tagline, "My Pink: be „kada tinka“; ilgaamžiškumas, sklaida, spalvos, šūkis");
check(f.description.length >= 350 && f.description.length <= 650, `My Pink: aprašymas 350–650 simb. (${f.description.length})`);
check(!/nomi|20\s*%|francus|prancūz|lenk|torebk|rankin/i.test(`${f.description} ${f.tagline}`), "My Pink: aprašyme nėra pardavėjo teiginių ir prekės ženklo");
check(!/atsiskleidžia (pavasar|vasar|rudenį|žiem|visais)|Tinka (kasdien|darbui|pasimatym|vakarėl|šventei)|dienai ir vakarui|vakarams|į darbą/i.test(f.description), "My Pink: aprašyme – be „kada tinka“ (sezonų, progų, paros laiko)");
check(f.description.startsWith("My Pink – ") && /bergamotė/.test(f.description) && !/[a-z]\.\./.test(f.description), "My Pink: savas lietuviškas aprašymas");
check(j(["price", "stock", "images", "inspired"].filter(k => labels(r).includes(k))) === j(["price", "stock", "images", "inspired"]) && labels(r).length === 4, "My Pink: „Liko užpildyti“ – Kaina, Likutis, Nuotraukos, Originalo kvapas");
check(r.facts.some(([k, v]) => k.startsWith("Prekės ženklas") && v === "NOMI") && r.facts.some(([k]) => k === "Natos šaltinyje"), "My Pink: „Ką atpažinau“ – prekės ženklas, natos šaltinyje");
check(j(afParse(myPink, { families })) === j(r), "My Pink: rezultatas toks pat kiekvieną kartą");

// ── 2. Kvapni žvakė su pasirinktu kvapu ──
const scent = { id: "my-pink", name: "My Pink", inspired: "", gender: "moterims", family: "geliu", notes: f.notes, longevity: 4, sillage: 3, look: f.look };
const c = afParse("Świeca sojowa 180 g, czas palenia 40 h", { scent, families });
check(c.type === "zvakes" && c.fields.name === "Kvapni žvakė My Pink" && c.fromScent, "žvakė: tipas zvakes, pavadinimas „Kvapni žvakė My Pink“");
check(j(c.fields.notes) === j(f.notes) && c.fields.gender === "moterims" && c.fields.family === "geliu"  && c.fields.sillage === 3, "žvakė: kvapo laukai paimti iš kvapo");
check(j(c.fields.sizes) === j([{ ml: 180, unit: "g", price: "" }]) && c.fields.attrs.burn === 40 && c.fields.attrs.wax === "Sojų vaškas", "žvakė: 180 g, degimo trukmė 40 h, sojų vaškas");
check(c.fields.description.length >= 350 && /sojų vaško/.test(c.fields.description) && /iki 40 val\./.test(c.fields.description), "žvakė: aprašymas su vašku ir degimo trukme");

// ── 3. Kiti tipai ir kalbos ──
const reed = afParse(
  `LUXURY REED DIFFUSER VELVET OUD 100ml with 8 natural rattan sticks
Inspired by: Maison Francis Kurkdjian - Baccarat Rouge 540
Top notes: saffron, jasmine
Heart notes: amberwood, ambergris
Base notes: fir resin, cedar
Lasts up to 10 weeks. Perfect for rooms up to 25 m2.`,
  { families }
);
check(reed.lang === "en" && reed.type === "difuzoriai" && reed.fields.name === "Difuzorius Velvet Oud", "EN difuzorius: tipas ir pavadinimas „Difuzorius Velvet Oud“");
check(reed.fields.inspired === "Maison Francis Kurkdjian – Baccarat Rouge 540" && reed.fields.family === "ambros", "EN difuzorius: originalo kvapas ir šeima ambros");
check(j(reed.fields.notes.top) === j(["Šafranas", "Jazminas"]) && reed.fields.notes.base.includes("Kedras") && !reed.unknown.length, "EN difuzorius: natos išverstos");
check(reed.fields.attrs.sticks === 8 && reed.fields.attrs.weeks === 10 && !("room" in reed.fields.attrs) && !/m²/.test(reed.fields.description) && reed.fields.sizes[0].ml === 100, "EN difuzorius: 100 ml, 8 lazdelės, 10 sav. (ploto m² nėra)");
check(/Komplekte – 8 lazdelės\./.test(reed.fields.description) && /iki 10 savaičių/.test(reed.fields.description), "EN difuzorius: aprašyme lazdelės ir trukmė (taisyklingi linksniai)");

const oil = afParse(
  `Aromatinis aliejus elektriniams difuzoriams SAULĖS SODAS 10 ml
Viršutinės natos: bergamotė, mandarinas
Širdies natos: jazminas, frezija
Bazinės natos: baltasis muskusas, kedras
Užtenka iki 6 savaičių.`,
  { families }
);
check(oil.lang === "lt" && oil.type === "aliejai" && oil.fields.name === "Aromatinis aliejus Saulės Sodas", "LT aliejus: tipas ir pavadinimas");
check(oil.fields.attrs.forDiffuser === true && oil.fields.attrs.weeks === 6 && oil.fields.sizes[0].ml === 10 && j(oil.fields.notes.heart) === j(["Jazminas", "Frezija"]), "LT aliejus: 10 ml, 6 sav., natos atpažintos");

const el = afParse(
  `Dyfuzor zapachowy elektryczny ultradźwiękowy nawilżacz powietrza AROMA LED 300ml
Pojemność zbiornika: 300 ml
Czas pracy: do 10 h
Podświetlenie LED 7 kolorów
Zasilanie: USB
Powierzchnia: do 30 m2`,
  { families }
);
check(el.type === "elektriniai-difuzoriai" && el.fields.name === "Elektrinis difuzorius", "PL elektrinis difuzorius: tipas ir pavadinimas");
check(j(el.fields.attrs) === j({ tank: 300, runtime: 10, light: "LED, 7 spalvos" }) && !/m²|Maitinimas/.test(el.fields.description), "PL elektrinis difuzorius: talpa, veikimo laikas, apšvietimas (be ploto ir maitinimo)");
check(!labels(el).includes("inspired") && !labels(el).includes("notes") && !el.fields.notes.top.length, "PL elektrinis difuzorius: be kvapo laukų ir be „Originalo kvapas“");

const en = afParse("VELVET NIGHT Eau de Parfum for men 100 ml – inspired by Dior Sauvage\nFragrance notes: bergamot, pink pepper, lavender, geranium, ambroxan, cedar, vetiver\nFragrance family: aromatic fougere", { families });
check(en.fields.name === "Velvet Night" && en.fields.gender === "vyrams" && en.fields.conc === "EDP" && en.fields.inspired === "Dior Sauvage", "EN kvepalai: pavadinimas, vyrams, EDP, originalas");
check(en.fields.family === "sviezi" && en.fields.notes.top.length + en.fields.notes.heart.length + en.fields.notes.base.length === 7, "EN kvepalai: šeima švieži, 7 natos paskirstytos");

const lt = afParse("LIBRA ROSE kvepalai moterims 33 ml\nĮkvėpta: Yves Saint Laurent – Libre\nViršutinės natos: mandarinas, levanda\nŠirdies natos: jazminas, apelsinmedžio žiedai\nBazinės natos: vanilė, ambra, muskusas", { families });
check(lt.lang === "lt" && lt.fields.name === "Libra Rose" && lt.fields.inspired === "Yves Saint Laurent – Libre" && lt.fields.gender === "moterims", "LT kvepalai: pavadinimas, originalas, lytis");
check(labels(lt).includes("conc") && !labels(lt).includes("inspired"), "LT kvepalai: koncentracija nenurodyta – pažymėta patikrinti");

// ── 4. Žodynas ──
check(new Set(Object.values(AF_NOTES)).size >= 250, `žodynas: ≥ 250 lietuviškų natų (${new Set(Object.values(AF_NOTES)).size})`);
check(afNote("kremowa wanilia").lt === "Kreminė vanilė" && afNote("creamy vanilla").lt === "Kreminė vanilė" && afNote("delikatne nuty drzewne").lt === "Medienos natos", "žodynas: būdvardžiai (kreminė vanilė, medienos natos)");
check(afNote("Białe piżmo").lt === "Baltasis muskusas" && afNote("biale pizmo").lt === "Baltasis muskusas" && afNote("Kvapioji nata X").ok === false, "žodynas: be diakritikų, neatpažinta – pažymima");
check(!afParse("", {}).fields.name && afParse("", {}).missing.some(m => m.key === "name"), "tuščias tekstas – be klaidų, pavadinimas – „Liko užpildyti“");

console.log(failed ? `\n✗ Nepavyko: ${failed}` : "\nAutomatinio užpildymo testai praėjo");
process.exit(failed ? 1 : 0);
