// 13 - automatinio produktų pridėjimo žodynai (v15): natos PL / EN → LT, būdvardžiai, kvapų grupės, rinkodaros žodžiai.
// Grynas JS be DOM - tą patį failą tikrina tools/test-autofill.mjs. Variklis - 13-autofill.js.
// Raktai - mažosiomis raidėmis; reikšmė - lietuviškas parfumerijos pavadinimas (vardininkas, didžioji raidė).

const AF_NOTES = {
  // ── Citrusai ──
  bergamotka: "Bergamotė", "bergamotka kalabryjska": "Kalabrijos bergamotė", bergamot: "Bergamotė", "calabrian bergamot": "Kalabrijos bergamotė",
  cytryna: "Citrina", "skórka cytryny": "Citrinos žievelė", "skórka cytrynowa": "Citrinos žievelė", lemon: "Citrina", "lemon zest": "Citrinos žievelė", "amalfi lemon": "Amalfio citrina",
  pomarańcza: "Apelsinas", "słodka pomarańcza": "Saldusis apelsinas", "gorzka pomarańcza": "Kartusis apelsinas", "czerwona pomarańcza": "Raudonasis apelsinas", "krwista pomarańcza": "Kraujo apelsinas",
  orange: "Apelsinas", "sweet orange": "Saldusis apelsinas", "bitter orange": "Kartusis apelsinas", "blood orange": "Kraujo apelsinas",
  mandarynka: "Mandarinas", "zielona mandarynka": "Žaliasis mandarinas", mandarin: "Mandarinas", "green mandarin": "Žaliasis mandarinas", tangerine: "Mandarinas",
  grejpfrut: "Greipfrutas", "różowy grejpfrut": "Rožinis greipfrutas", grapefruit: "Greipfrutas", "pink grapefruit": "Rožinis greipfrutas",
  limonka: "Laimas", lime: "Laimas", yuzu: "Judzu", neroli: "Neroli", petitgrain: "Petitgrenas", cytrusy: "Citrusai", citrus: "Citrusai", citruses: "Citrusai",
  "nuty cytrusowe": "Citrusų natos", "citrus notes": "Citrusų natos", "kwiat pomarańczy": "Apelsinmedžio žiedai", "kwiat pomarańczowy": "Apelsinmedžio žiedai",
  "kwiaty pomarańczy": "Apelsinmedžio žiedai", "orange blossom": "Apelsinmedžio žiedai", "orange flower": "Apelsinmedžio žiedai", "kwiat cytryny": "Citrinmedžio žiedai",
  // ── Vaisiai ir uogos ──
  gruszka: "Kriaušė", pear: "Kriaušė", jabłko: "Obuolys", apple: "Obuolys", "zielone jabłko": "Žaliasis obuolys", "green apple": "Žaliasis obuolys",
  "czerwone jabłko": "Raudonasis obuolys", "red apple": "Raudonasis obuolys", brzoskwinia: "Persikas", peach: "Persikas", morela: "Abrikosas", apricot: "Abrikosas",
  śliwka: "Slyva", plum: "Slyva", malina: "Avietė", raspberry: "Avietė", truskawka: "Braškė", strawberry: "Braškė", "czarna porzeczka": "Juodieji serbentai",
  blackcurrant: "Juodieji serbentai", "black currant": "Juodieji serbentai", cassis: "Juodieji serbentai", porzeczka: "Serbentai", wiśnia: "Vyšnia", cherry: "Vyšnia",
  "black cherry": "Juodoji vyšnia", czereśnia: "Trešnė", ananas: "Ananasas", pineapple: "Ananasas", melon: "Melionas", arbuz: "Arbūzas", watermelon: "Arbūzas",
  kokos: "Kokosas", coconut: "Kokosas", liczi: "Ličiai", lychee: "Ličiai", litchi: "Ličiai", mango: "Mangas", marakuja: "Pasiflora", "passion fruit": "Pasiflora",
  figa: "Figa", fig: "Figa", granat: "Granatas", pomegranate: "Granatas", "owoce leśne": "Miško uogos", "wild berries": "Miško uogos", "czerwone owoce": "Raudonieji vaisiai",
  "red fruits": "Raudonieji vaisiai", "red berries": "Raudonosios uogos", jeżyna: "Gervuogė", blackberry: "Gervuogė", borówka: "Mėlynė", blueberry: "Mėlynė",
  "nuty owocowe": "Vaisių natos", "fruity notes": "Vaisių natos", rabarbar: "Rabarbaras", rhubarb: "Rabarbaras", kiwi: "Kivis", banan: "Bananas", banana: "Bananas",
  "suszone owoce": "Džiovinti vaisiai", "dried fruits": "Džiovinti vaisiai", daktyle: "Datulės", dates: "Datulės", rodzynki: "Razinos", raisins: "Razinos",
  pigwa: "Svarainis", quince: "Svarainis", nektarynka: "Nektarinas", nectarine: "Nektarinas", żurawina: "Spanguolė", cranberry: "Spanguolė",
  // ── Prieskoniai ir žolės ──
  pieprz: "Pipirai", pepper: "Pipirai", "czarny pieprz": "Juodieji pipirai", "black pepper": "Juodieji pipirai", "różowy pieprz": "Rožiniai pipirai",
  "pink pepper": "Rožiniai pipirai", "pieprz syczuański": "Sičuano pipirai", "sichuan pepper": "Sičuano pipirai", kardamon: "Kardamonas", cardamom: "Kardamonas",
  imbir: "Imbieras", ginger: "Imbieras", cynamon: "Cinamonas", cinnamon: "Cinamonas", goździki: "Gvazdikėliai", goździk: "Gvazdikėliai", clove: "Gvazdikėliai",
  cloves: "Gvazdikėliai", "gałka muszkatołowa": "Muskato riešutas", nutmeg: "Muskato riešutas", szafran: "Šafranas", saffron: "Šafranas", anyż: "Anyžius",
  anise: "Anyžius", "anyż gwiazdkowaty": "Žvaigždanyžis", "star anise": "Žvaigždanyžis", kmin: "Kmynai", cumin: "Kmynai", kolendra: "Kalendra", coriander: "Kalendra",
  przyprawy: "Prieskoniai", spices: "Prieskoniai", "nuty przyprawowe": "Prieskonių natos", "spicy notes": "Prieskonių natos", lawenda: "Levanda", lavender: "Levanda",
  mięta: "Mėta", mint: "Mėta", "mięta pieprzowa": "Pipirmėtė", peppermint: "Pipirmėtė", bazylia: "Bazilikas", basil: "Bazilikas", rozmaryn: "Rozmarinas",
  rosemary: "Rozmarinas", szałwia: "Šalavijas", sage: "Šalavijas", "szałwia muszkatołowa": "Muskatinis šalavijas", "clary sage": "Muskatinis šalavijas",
  tymianek: "Čiobrelis", thyme: "Čiobrelis", estragon: "Peletrūnas", tarragon: "Peletrūnas", bylica: "Kietis", artemizja: "Kietis", artemisia: "Kietis",
  "zielone nuty": "Žaliosios natos", "nuty zielone": "Žaliosios natos", "green notes": "Žaliosios natos", trawa: "Žolė", grass: "Žolė", "liść figowca": "Figmedžio lapai",
  "fig leaf": "Figmedžio lapai", "liście fiołka": "Žibuoklės lapai", "violet leaf": "Žibuoklės lapai", galbanum: "Galbanas", "liść pomidora": "Pomidoro lapai",
  "tomato leaf": "Pomidoro lapai", herbata: "Arbata", tea: "Arbata", "zielona herbata": "Žalioji arbata", "green tea": "Žalioji arbata", "czarna herbata": "Juodoji arbata",
  "black tea": "Juodoji arbata", "biała herbata": "Baltoji arbata", "white tea": "Baltoji arbata", matcha: "Matcha", bambus: "Bambukas", bamboo: "Bambukas",
  eukaliptus: "Eukaliptas", eucalyptus: "Eukaliptas", "trawa cytrynowa": "Citrinžolė", lemongrass: "Citrinžolė", werbena: "Verbena", verbena: "Verbena",
  // ── Gėlės ──
  róża: "Rožė", rose: "Rožė", "róża damasceńska": "Damasko rožė", "damask rose": "Damasko rožė", "róża bułgarska": "Bulgariška rožė", "bulgarian rose": "Bulgariška rožė",
  "róża turecka": "Turkiška rožė", "turkish rose": "Turkiška rožė", "róża majowa": "Gegužės rožė", "may rose": "Gegužės rožė", jaśmin: "Jazminas", jasmine: "Jazminas",
  "jaśmin sambac": "Sambako jazminas", "jasmine sambac": "Sambako jazminas", tuberoza: "Tuberozė", tuberose: "Tuberozė", irys: "Irisas", iris: "Irisas", orris: "Irisas",
  "korzeń irysa": "Irisų šaknis", "orris root": "Irisų šaknis", fiołek: "Žibuoklė", violet: "Žibuoklė", konwalia: "Pakalnutė", "lily of the valley": "Pakalnutė",
  piwonia: "Bijūnas", peony: "Bijūnas", magnolia: "Magnolija", frezja: "Frezija", freesia: "Frezija", gardenia: "Gardenija", "ylang-ylang": "Ilang ilangas",
  "ylang ylang": "Ilang ilangas", heliotrop: "Heliotropas", heliotrope: "Heliotropas", orchidea: "Orchidėja", orchid: "Orchidėja", lilia: "Lelija", lily: "Lelija",
  mimoza: "Mimoza", mimosa: "Mimoza", geranium: "Pelargonija", pelargonia: "Pelargonija", lotos: "Lotosas", lotus: "Lotosas", "kwiat lotosu": "Lotoso žiedas",
  "kwiat wiśni": "Vyšnių žiedai", "cherry blossom": "Vyšnių žiedai", "kwiat jabłoni": "Obels žiedai", "apple blossom": "Obels žiedai", "kwiat bawełny": "Medvilnės žiedai",
  "cotton flower": "Medvilnės žiedai", osmantus: "Osmantas", osmanthus: "Osmantas", "kwiat osmantusa": "Osmantas", hibiskus: "Hibiskas", hibiscus: "Hibiskas",
  akacja: "Akacija", acacia: "Akacija", kamelia: "Kamelija", camellia: "Kamelija", "lilia wodna": "Vandens lelija", "water lily": "Vandens lelija",
  "białe kwiaty": "Baltosios gėlės", "white flowers": "Baltosios gėlės", "white floral": "Baltosios gėlės", "nuty kwiatowe": "Gėlių natos", "floral notes": "Gėlių natos",
  kwiaty: "Gėlės", flowers: "Gėlės", tiare: "Tiarės žiedai", "kwiat tiare": "Tiarės žiedai", "tiare flower": "Tiarės žiedai", wiciokrzew: "Sausmedis",
  honeysuckle: "Sausmedis", bez: "Alyvos", lilac: "Alyvos", "kwiat lipy": "Liepos žiedai", linden: "Liepos žiedai", mak: "Aguona", poppy: "Aguona",
  nagietek: "Medetka", marigold: "Medetka", rumianek: "Ramunėlė", chamomile: "Ramunėlė", carnation: "Gvazdikas", narcyz: "Narcizas",
  narcissus: "Narcizas", hiacynt: "Hiacintas", hyacinth: "Hiacintas", "kwiat kawy": "Kavos žiedai", "coffee blossom": "Kavos žiedai",
  // ── Mediena, samanos ──
  "drzewo sandałowe": "Santalas", sandałowiec: "Santalas", sandalwood: "Santalas", sandal: "Santalas", "drzewo cedrowe": "Kedras", cedr: "Kedras", cedar: "Kedras",
  cedarwood: "Kedras", "cedr atlaski": "Atlaso kedras", "atlas cedar": "Atlaso kedras", "cedr wirginijski": "Virdžinijos kedras", "virginia cedar": "Virdžinijos kedras",
  wetiwer: "Vetiveris", wetyweria: "Vetiveris", vetiver: "Vetiveris", paczula: "Pačiulis", patchouli: "Pačiulis", "drzewo agarowe": "Agaras (oud)", agarwood: "Agaras (oud)",
  oud: "Oud", "mech dębowy": "Ąžuolo samanos", oakmoss: "Ąžuolo samanos", "oak moss": "Ąžuolo samanos", mech: "Samanos", moss: "Samanos", "nuty drzewne": "Medienos natos",
  "woody notes": "Medienos natos", woods: "Mediena", drewno: "Mediena", wood: "Mediena", "drzewo kaszmirowe": "Kašmyro mediena", "cashmere wood": "Kašmyro mediena",
  kaszmeran: "Kašmeranas", cashmeran: "Kašmeranas", gwajak: "Gvajako mediena", "drzewo gwajakowe": "Gvajako mediena", "guaiac wood": "Gvajako mediena",
  guaiacwood: "Gvajako mediena", brzoza: "Beržas", birch: "Beržas", sosna: "Pušis", pine: "Pušis", jodła: "Eglė", fir: "Eglė", "igły jodły": "Eglės spygliai",
  "fir needles": "Eglės spygliai", "balsam jodłowy": "Balzaminė eglė", "fir balsam": "Balzaminė eglė", jałowiec: "Kadagys", juniper: "Kadagys", cyprys: "Kiparisas",
  cypress: "Kiparisas", "drzewo różane": "Rožmedis", rosewood: "Rožmedis", palisander: "Palisandras", "drzewo tekowe": "Tikmedis", teak: "Tikmedis", kora: "Žievė",
  bark: "Žievė", "drzewo oliwne": "Alyvmedis", "olive wood": "Alyvmedis", "drewno dębowe": "Ąžuolas", oak: "Ąžuolas",
  amberwood: "Ambrinė mediena", "amber wood": "Ambrinė mediena", "drewno ambrowe": "Ambrinė mediena", "ambrowe drewno": "Ambrinė mediena",
  "fir resin": "Eglės sakai", "żywica jodłowa": "Eglės sakai", "żywica jodły": "Eglės sakai", "pine resin": "Pušies sakai",
  // ── Ambra, muskusas, sakai ──
  ambra: "Ambra", amber: "Ambra", "szara ambra": "Pilkoji ambra", ambergris: "Pilkoji ambra", ambroksan: "Ambroksanas", ambroxan: "Ambroksanas",
  ambrette: "Ambretė", ambretta: "Ambretė", bursztyn: "Gintaras", piżmo: "Muskusas", musk: "Muskusas", "białe piżmo": "Baltasis muskusas", "piżmo białe": "Baltasis muskusas",
  "white musk": "Baltasis muskusas", "czyste piżmo": "Švarus muskusas", "clean musk": "Švarus muskusas", "skin musk": "Odos muskusas", "nuty piżmowe": "Muskuso natos",
  "musky notes": "Muskuso natos", kadzidło: "Smilkalai", incense: "Smilkalai", olibanum: "Olibanas", frankincense: "Olibanas", mirra: "Mira", myrrh: "Mira",
  labdanum: "Labdanas", benzoes: "Benzojus", benzoin: "Benzojus", żywica: "Sakai", żywice: "Sakai", resin: "Sakai", resins: "Sakai", elemi: "Elemis",
  styraks: "Stirakas", styrax: "Stirakas", "balsam tolu": "Tolu balzamas", "tolu balsam": "Tolu balzamas", "balsam peruwiański": "Peru balzamas",
  "peru balsam": "Peru balzamas", "iso e super": "Iso E Super", aldehydy: "Aldehidai", aldehydes: "Aldehidai", kumaryna: "Kumarinas", coumarin: "Kumarinas",
  skóra: "Oda", leather: "Oda", zamsz: "Zomša", suede: "Zomša", tytoń: "Tabakas", tobacco: "Tabakas", "liście tytoniu": "Tabako lapai", "liść tytoniu": "Tabako lapai",
  "tobacco leaf": "Tabako lapai", "nuty ambrowe": "Ambros natos", "amber notes": "Ambros natos", "nuty orientalne": "Rytietiškos natos", "oriental notes": "Rytietiškos natos",
  // ── Gurmaniškos ──
  wanilia: "Vanilė", vanilla: "Vanilė", "wanilia madagaskarska": "Madagaskaro vanilė", "madagascar vanilla": "Madagaskaro vanilė", "wanilia bourbon": "Burbono vanilė",
  "bourbon vanilla": "Burbono vanilė", "kremowa wanilia": "Kreminė vanilė", "creamy vanilla": "Kreminė vanilė", "laska wanilii": "Vanilės ankštis",
  "vanilla bean": "Vanilės ankštis", "vanilla pod": "Vanilės ankštis", "fasola tonka": "Tonkos pupelės", "fasolka tonka": "Tonkos pupelės", "bób tonka": "Tonkos pupelės",
  tonka: "Tonkos pupelės", "tonka bean": "Tonkos pupelės", "tonka beans": "Tonkos pupelės", karmel: "Karamelė", caramel: "Karamelė", "słony karmel": "Sūdyta karamelė",
  "salted caramel": "Sūdyta karamelė", pralina: "Pralinė", praline: "Pralinė", pralinka: "Pralinė", czekolada: "Šokoladas", chocolate: "Šokoladas",
  "gorzka czekolada": "Juodasis šokoladas", "dark chocolate": "Juodasis šokoladas", "biała czekolada": "Baltasis šokoladas", "white chocolate": "Baltasis šokoladas",
  kakao: "Kakava", cocoa: "Kakava", cacao: "Kakava", kawa: "Kava", coffee: "Kava", miód: "Medus", honey: "Medus", migdał: "Migdolai", migdały: "Migdolai",
  almond: "Migdolai", almonds: "Migdolai", "orzech laskowy": "Lazdyno riešutai", hazelnut: "Lazdyno riešutai", pistacja: "Pistacijos", pistachio: "Pistacijos",
  cukier: "Cukrus", sugar: "Cukrus", "brązowy cukier": "Rudasis cukrus", "brown sugar": "Rudasis cukrus", "wata cukrowa": "Cukraus vata", "cotton candy": "Cukraus vata",
  "bita śmietana": "Plakta grietinėlė", "whipped cream": "Plakta grietinėlė", mleko: "Pienas", milk: "Pienas", toffi: "Irisas", toffee: "Irisas", beza: "Morengas",
  bezy: "Morengai", meringue: "Morengas", ciasteczka: "Sausainiai", cookies: "Sausainiai", biscuit: "Sausainiai", rum: "Romas", koniak: "Konjakas", cognac: "Konjakas",
  whisky: "Viskis", whiskey: "Viskis", likier: "Likeris", liqueur: "Likeris", szampan: "Šampanas", champagne: "Šampanas", "nuty gurmańskie": "Gurmaniškos natos",
  "gourmand notes": "Gurmaniškos natos", "słodkie nuty": "Saldžiosios natos", "sweet notes": "Saldžiosios natos", piernik: "Meduolis", gingerbread: "Meduolis",
  // ── Vanduo, gaivumas, pudra ──
  "nuty morskie": "Jūros natos", "marine notes": "Jūros natos", "sea notes": "Jūros natos", "nuty wodne": "Vandens natos", "aquatic notes": "Vandens natos",
  "water notes": "Vandens natos", "akord morski": "Jūros akordas", "marine accord": "Jūros akordas", "sól morska": "Jūros druska", "sea salt": "Jūros druska",
  ozon: "Ozonas", ozone: "Ozonas", "nuty ozonowe": "Ozono natos", "ozonic notes": "Ozono natos", "akord wodny": "Vandens akordas", "aquatic accord": "Vandens akordas",
  "świeże powietrze": "Gaivus oras", "fresh air": "Gaivus oras", "nuty świeże": "Gaivios natos", "fresh notes": "Gaivios natos", "nuty pudrowe": "Pudros natos",
  "powdery notes": "Pudros natos", puder: "Pudra", powder: "Pudra", "nuty zielone i świeże": "Žaliosios natos", "czyste pranie": "Švarūs skalbiniai",
  "clean linen": "Švarūs skalbiniai", "fresh linen": "Švarūs skalbiniai", "nuty mineralne": "Mineralinės natos", "mineral notes": "Mineralinės natos"
};

// Būdvardžiai prieš natą: LT formos (moteriškoji vns., vyriškoji vns., vyriškoji dgs., moteriškoji dgs.).
// Taikoma tik vieno žodžio natai (pvz. „kremowa wanilia“ → „Kreminė vanilė“); kitais atvejais būdvardis atmetamas.
const AF_ADJ = [
  [/^(kremow\w*|creamy)$/i, ["kreminė", "kreminis", "kreminiai", "kreminės"]],
  [/^(słodk\w*|sweet)$/i, ["saldi", "saldus", "saldūs", "saldžios"]],
  [/^(ciepł\w*|warm)$/i, ["šilta", "šiltas", "šilti", "šiltos"]],
  [/^(dzik\w*|wild)$/i, ["laukinė", "laukinis", "laukiniai", "laukinės"]],
  [/^(ciemn\w*|dark)$/i, ["tamsi", "tamsus", "tamsūs", "tamsios"]],
  [/^(soczyst\w*|juicy)$/i, ["sultinga", "sultingas", "sultingi", "sultingos"]],
  [/^(śwież\w*|swiez\w*|fresh)$/i, ["gaivi", "gaivus", "gaivūs", "gaivios"]],
  [/^(wędzon\w*|smoked|smoky)$/i, ["rūkyta", "rūkytas", "rūkyti", "rūkytos"]],
  [/^(prażon\w*|roasted|toasted)$/i, ["skrudinta", "skrudintas", "skrudinti", "skrudintos"]]
];
// Būdvardžiai, kurie atmetami (natos pavadinimas be jų)
const AF_ADJ_DROP =
  /^(delikatn\w*|subteln\w*|zmysłow\w*|egzotyczn\w*|lekk\w*|intensywn\w*|głębok\w*|aksamitn\w*|naturaln\w*|szlachetn\w*|orzeźwiając\w*|otulając\w*|pikantn\w*|jasn\w*|luksusow\w*|wyrazist\w*|uwodzicielsk\w*|soft|subtle|delicate|sensual|exotic|light|intense|deep|velvety|natural|precious|luxurious|sparkling|airy|rich|elegant|spicy|bright|musujac\w*|musując\w*)$/i;

// Kvapų grupė / natos → Vaidore šeima (families: geliu, sviezi, medienos, ambros, gurmaniski)
const AF_FAMILY_WORDS = [
  ["geliu", /kwiat|flor|kvet|gėl|gel(i|ių)|róż|rose|jaśmin|jasmin|tuberoz|irys|iris|piwon|peony/],
  ["medienos", /drzew|drewn|wood|medien|szypr|chypre|mech|moss|cedr|cedar|sandał|sandal|wetiw|vetiv|paczul|patchoul/],
  ["ambros", /orient|ambr|przypraw|spic|prieskon|korzen|skór|leather|kadz|incense|oud|żywic|resin|tytoń|tobacco|rytiet/],
  ["gurmaniski", /gurman|gourmand|słod|slod|sweet|sald|wanil|vanil|karmel|caramel|pralin|czekol|chocolat|kakao|cocoa|kaw|coffee|miód|honey|tonka|owoc|fruit|vais/],
  ["sviezi", /cytrus|citrus|śwież|swiez|fresh|gaiv|wodn|aqua|water|morsk|marine|jūr|aromat|zielon|green|žali|fougere|fougère|paproc|ozon|bergam|cytryn|lemon|grejpfr|limonk|lime|mięt|mint|herbat|tea/]
];

// Rinkodaros, tipų, lyties ir kiekio žodžiai, kurie išmetami iš pavadinimo (PL / EN / LT)
const AF_NAME_DROP = [
  "trwałe", "trwały", "trwała", "francuskie", "francuski", "oryginalne", "oryginalny", "nowe", "nowy", "nowość", "luksusowe", "luksusowy", "intensywne", "mocne",
  "perfumy", "perfum", "perfumetki", "perfumetka", "perfumka", "perfumki", "woda", "perfumowana", "toaletowa", "kolońska", "edp", "edt", "parfum", "extrait",
  "eau", "de", "toilette", "zapach", "zapachowy", "zapachowa", "zapachowe", "damskie", "damski", "damska", "męskie", "męski", "meskie", "meski", "unisex",
  "dla", "niej", "niego", "kobiet", "mężczyzn", "kobiety", "mężczyzny", "prezent", "zestaw", "świeca", "świeczka", "sojowa", "sojowy", "dyfuzor", "dyfuzory",
  "patyczkami", "patyczki", "z", "olejek", "olejki", "eteryczny", "do", "nawilżacza", "dyfuzora", "elektryczny", "ultradźwiękowy", "aromaterapia",
  "perfume", "perfumes", "room", "home", "linen", "wosk", "woski", "kominek", "kominka", "kominków", "wax", "melt", "melts", "burner", "sojowe", "fragrance", "spray", "for", "women", "men", "woman", "man", "her", "him", "long", "lasting", "longlasting", "candle", "scented",
  "reed", "diffuser", "sticks", "with", "oil", "essential", "aroma", "electric", "ultrasonic", "new", "original", "gift", "set", "home",
  "luxury", "luksus", "premium", "natural", "naturalne", "naturalny", "rattan", "rattanowe", "handmade", "ręcznie", "robione", "led", "usb", "powietrza",
  "nawilżacz", "zapachowy", "kvepalai", "moterims", "vyrams", "kvapni", "žvakė", "difuzorius", "aromatinis", "aliejus", "elektrinis", "su", "lazdelėmis", "kvapusis", "vanduo", "ilgalaikiai"
];
