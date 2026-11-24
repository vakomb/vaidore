-- v31c: žvakių natos - tik pagrindinės (2-4 kiekviename lygyje, pagal gamintojo piramidę ir žvakės nuotrauką),
-- aprašymai ir šūkiai pagal jas. Paleisti galima kelis kartus.
begin;

-- SIDORE
update public.products set notes = '{"top": ["Kriaušė", "Juodieji serbentai", "Rožiniai pipirai"], "heart": ["Rožė", "Jazminas", "Heliotropas"], "base": ["Vanilė", "Kedras", "Pačiulis"]}'::jsonb, description = 'Kvapni žvakė SIDORE - sultingas vaisių ir gėlių aromatas jaukiai namų atmosferai. Viršutinės natos - kriaušė, juodieji serbentai ir rožiniai pipirai, širdies - rožė, jazminas ir heliotropas, bazinės - vanilė, kedras ir pačiulis. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Namai prisipildo šilumos ir aistringos elegancijos.' where id = 'kvapni-zvake-sired' and type = 'zvakes';

-- SAUVADORE
update public.products set notes = '{"top": ["Bergamotė", "Pipirai"], "heart": ["Sičuano pipirai", "Levanda", "Vetiveris"], "base": ["Ambroksanas", "Kedras", "Labdanas"]}'::jsonb, description = 'Kvapni žvakė SAUVADORE - gaivus, švarus aromatas jaukiai namų atmosferai. Viršutinės natos - bergamotė ir pipirai, širdies - Sičuano pipirai, levanda ir vetiveris, bazinės - ambroksanas, kedras ir labdanas. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Namuose kvepia lengvai ir švariai, lyg po lietaus.' where id = 'kvapni-zvake-sauvadore' and type = 'zvakes';

-- WAYDORE
update public.products set notes = '{"top": ["Bergamotė", "Apelsinmedžio žiedai"], "heart": ["Tuberozė", "Jazminas"], "base": ["Vanilė", "Baltasis muskusas", "Kedras"]}'::jsonb, description = 'Kvapni žvakė WAYDORE - švelnus baltųjų gėlių aromatas jaukiai namų atmosferai. Viršutinės natos - bergamotė ir apelsinmedžio žiedai, širdies - tuberozė ir jazminas, bazinės - vanilė, baltasis muskusas ir kedras. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Kuria šviesią, ramią namų nuotaiką.' where id = 'zvake-waydore' and type = 'zvakes';

-- LIBRADORE
update public.products set notes = '{"top": ["Mandarinas", "Petitgrenas", "Juodieji serbentai"], "heart": ["Levanda", "Apelsinmedžio žiedai", "Jazminas"], "base": ["Vanilė", "Pilkasis ambra", "Muskusas"]}'::jsonb, description = 'Kvapni žvakė LIBRADORE - šiltas, gaubiantis ambros aromatas jaukiai namų atmosferai. Viršutinės natos - mandarinas, petitgrenas ir juodieji serbentai, širdies - levanda, apelsinmedžio žiedai ir jazminas, bazinės - vanilė, pilkasis ambra ir muskusas. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Namai prisipildo šilumos ir jaukumo. Puikiai tinka vonios ritualams ar dovanai.' where id = 'kvapni-zvake-libradore' and type = 'zvakes';

-- INVIDORE
update public.products set notes = '{"top": ["Greipfrutas", "Jūros natos", "Mandarinas"], "heart": ["Lauro lapai", "Jazminas"], "base": ["Gvajako mediena", "Pilkasis ambra", "Pačiulis"]}'::jsonb, description = 'Kvapni žvakė INVIDORE - šiltas medienos aromatas jaukiai namų atmosferai. Viršutinės natos - greipfrutas, jūros natos ir mandarinas, širdies - lauro lapai ir jazminas, bazinės - gvajako mediena, pilkasis ambra ir pačiulis. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Suteikia namams šilumos ir ramybės. Puikiai tinka vonios ritualams ar dovanai.' where id = 'kvapni-zvake-invidore' and type = 'zvakes';

-- CREEDORE
update public.products set notes = '{"top": ["Bergamotė", "Juodieji serbentai", "Obuolys"], "heart": ["Ananasas", "Pačiulis", "Jazminas"], "base": ["Beržas", "Ąžuolo samanos", "Muskusas"]}'::jsonb, description = 'Kvapni žvakė CREEDORE - lengvas ir gaivus aromatas jaukiai namų atmosferai. Viršutinės natos - bergamotė, juodieji serbentai ir obuolys, širdies - ananasas, pačiulis ir jazminas, bazinės - beržas, ąžuolo samanos ir muskusas. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Gaivina erdvę ir suteikia švaros pojūtį.', tagline = 'Ananasas, beržas ir ąžuolo samanos' where id = 'kvapni-zvake-creedore' and type = 'zvakes';

-- SCENTDORE
update public.products set notes = '{"top": ["Imbieras", "Mandarinas", "Bergamotė"], "heart": ["Maninkos vaisius", "Levanda"], "base": ["Oda", "Medienos natos"]}'::jsonb, description = 'Kvapni žvakė SCENTDORE - šiltas, prieskoniais dvelkiantis aromatas jaukiai namų atmosferai. Viršutinės natos - imbieras, mandarinas ir bergamotė, širdies - maninkos vaisius ir levanda, bazinės - oda ir medienos natos. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Vakarais kuria šiltą, elegantišką nuotaiką.' where id = 'kvapni-zvake-scentdore' and type = 'zvakes';
update public.scents set notes = '{"top": ["Imbieras", "Mandarinas", "Bergamotė"], "heart": ["Maninkos vaisius", "Levanda"], "base": ["Oda", "Medienos natos"]}'::jsonb where id = 'scentdore';

-- JADORE
update public.products set notes = '{"top": ["Kriaušė", "Persikas", "Mandarinas"], "heart": ["Ilang ilangas", "Jazminas", "Rožė"], "base": ["Vanilė", "Muskusas", "Kedras"]}'::jsonb, description = 'Kvapni žvakė JADORE - prabangus vaisių ir gėlių aromatas jaukiai namų atmosferai. Viršutinės natos - kriaušė, persikas ir mandarinas, širdies - ilang ilangas, jazminas ir rožė, bazinės - vanilė, muskusas ir kedras. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Namai prisipildo šviesos ir švelnios elegancijos.', tagline = 'Kriaušė, ilang ilangas ir jazminas' where id = 'kvapni-zvake-jadore' and type = 'zvakes';
update public.scents set notes = '{"top": ["Kriaušė", "Persikas", "Mandarinas"], "heart": ["Ilang ilangas", "Jazminas", "Rožė"], "base": ["Vanilė", "Muskusas", "Kedras"]}'::jsonb where id = 'jadore';

-- CLEDORE
update public.products set notes = '{"top": ["Bijūnas", "Ličiai", "Frezija"], "heart": ["Rožė", "Pakalnutė", "Magnolija"], "base": ["Gintaras", "Kedras"]}'::jsonb, description = 'Kvapni žvakė CLEDORE - švelnus, pudrinis rožių aromatas jaukiai namų atmosferai. Viršutinės natos - bijūnas, ličiai ir frezija, širdies - rožė, pakalnutė ir magnolija, bazinės - gintaras ir kedras. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Kuria ramią, švarią ir moterišką erdvės nuotaiką.' where id = 'kvapni-zvake-cledore' and type = 'zvakes';
update public.scents set notes = '{"top": ["Bijūnas", "Ličiai", "Frezija"], "heart": ["Rožė", "Pakalnutė", "Magnolija"], "base": ["Gintaras", "Kedras"]}'::jsonb where id = 'cledore';

-- GOODORE
update public.products set notes = '{"top": ["Migdolai", "Kava", "Bergamotė"], "heart": ["Tuberozė", "Jazminas", "Apelsinmedžio žiedai"], "base": ["Tonkos pupelės", "Kakava", "Vanilė"]}'::jsonb, description = 'Kvapni žvakė GOODORE - gundantis, šiltas gėlių ir kakavos aromatas jaukiai namų atmosferai. Viršutinės natos - migdolai, kava ir bergamotė, širdies - tuberozė, jazminas ir apelsinmedžio žiedai, bazinės - tonkos pupelės, kakava ir vanilė. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Namai prisipildo šilumos ir paslapties.' where id = 'kvapni-zvake-goodore' and type = 'zvakes';
update public.scents set notes = '{"top": ["Migdolai", "Kava", "Bergamotė"], "heart": ["Tuberozė", "Jazminas", "Apelsinmedžio žiedai"], "base": ["Tonkos pupelės", "Kakava", "Vanilė"]}'::jsonb where id = 'goodore';

-- AMODORE
update public.products set notes = '{"top": ["Juodieji serbentai", "Greipfrutas", "Apelsinas"], "heart": ["Rožė", "Jazminas", "Abrikosas"], "base": ["Vanilė", "Tonkos pupelės", "Muskusas"]}'::jsonb, description = 'Kvapni žvakė AMODORE - sultingas vaisių ir gėlių aromatas jaukiai namų atmosferai. Viršutinės natos - juodieji serbentai, greipfrutas ir apelsinas, širdies - rožė, jazminas ir abrikosas, bazinės - vanilė, tonkos pupelės ir muskusas. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Suteikia namams džiugios, šiltos nuotaikos.' where id = 'kvapni-zvake-amodore' and type = 'zvakes';
update public.scents set notes = '{"top": ["Juodieji serbentai", "Greipfrutas", "Apelsinas"], "heart": ["Rožė", "Jazminas", "Abrikosas"], "base": ["Vanilė", "Tonkos pupelės", "Muskusas"]}'::jsonb where id = 'amodore';

-- ANGEDORE
update public.products set notes = '{"top": ["Cukraus vata", "Bergamotė", "Juodieji serbentai"], "heart": ["Medus", "Raudonosios uogos", "Slyva"], "base": ["Pačiulis", "Šokoladas", "Karamelė", "Vanilė"]}'::jsonb, description = 'Kvapni žvakė ANGEDORE - saldus, gurmaniškas aromatas jaukiai namų atmosferai. Viršutinės natos - cukraus vata, bergamotė ir juodieji serbentai, širdies - medus, raudonosios uogos ir slyva, bazinės - pačiulis, šokoladas, karamelė ir vanilė. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Namai prisipildo saldaus, gaubiančio jaukumo.' where id = 'kvapni-zvake-angedore' and type = 'zvakes';
update public.scents set notes = '{"top": ["Cukraus vata", "Bergamotė", "Juodieji serbentai"], "heart": ["Medus", "Raudonosios uogos", "Slyva"], "base": ["Pačiulis", "Šokoladas", "Karamelė", "Vanilė"]}'::jsonb where id = 'angedore';

-- EUFODORE
update public.products set notes = '{"top": ["Granatas", "Persimonas"], "heart": ["Juodoji orchidėja", "Lotosas", "Čampaka"], "base": ["Raudonmedis", "Gintaras", "Juodoji žibuoklė"]}'::jsonb, description = 'Kvapni žvakė EUFODORE - egzotiškas, gaubiantis aromatas jaukiai namų atmosferai. Viršutinės natos - granatas ir persimonas, širdies - juodoji orchidėja, lotosas ir čampaka, bazinės - raudonmedis, gintaras ir juodoji žibuoklė. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Vakarais kuria paslaptingą, šiltą nuotaiką.' where id = 'kvapni-zvake-eufodore' and type = 'zvakes';
update public.scents set notes = '{"top": ["Granatas", "Persimonas"], "heart": ["Juodoji orchidėja", "Lotosas", "Čampaka"], "base": ["Raudonmedis", "Gintaras", "Juodoji žibuoklė"]}'::jsonb where id = 'eufodore';

-- DELADORE
update public.products set notes = '{"top": ["Agurkas", "Greipfrutas", "Magnolija"], "heart": ["Žaliasis obuolys", "Tuberozė", "Pakalnutė"], "base": ["Santalas", "Baltasis gintaras"]}'::jsonb, description = 'Kvapni žvakė DELADORE - gaivus, sultingas aromatas jaukiai namų atmosferai. Viršutinės natos - agurkas, greipfrutas ir magnolija, širdies - žaliasis obuolys, tuberozė ir pakalnutė, bazinės - santalas ir baltasis gintaras. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Gaivina erdvę ir suteikia lengvumo.' where id = 'kvapni-zvake-deladore' and type = 'zvakes';
update public.scents set notes = '{"top": ["Agurkas", "Greipfrutas", "Magnolija"], "heart": ["Žaliasis obuolys", "Tuberozė", "Pakalnutė"], "base": ["Santalas", "Baltasis gintaras"]}'::jsonb where id = 'deladore';

-- GABIDORE
update public.products set notes = '{"top": ["Greipfrutas", "Mandarinas", "Juodieji serbentai"], "heart": ["Tuberozė", "Jazminas", "Apelsinmedžio žiedai", "Ilang ilangas"], "base": ["Santalas", "Muskusas"]}'::jsonb, description = 'Kvapni žvakė GABIDORE - šviesus baltųjų gėlių aromatas jaukiai namų atmosferai. Viršutinės natos - greipfrutas, mandarinas ir juodieji serbentai, širdies - tuberozė, jazminas, apelsinmedžio žiedai ir ilang ilangas, bazinės - santalas ir muskusas. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Namai prisipildo šviesos ir švaros.' where id = 'kvapni-zvake-gabidore' and type = 'zvakes';
update public.scents set notes = '{"top": ["Greipfrutas", "Mandarinas", "Juodieji serbentai"], "heart": ["Tuberozė", "Jazminas", "Apelsinmedžio žiedai", "Ilang ilangas"], "base": ["Santalas", "Muskusas"]}'::jsonb where id = 'gabidore';

-- CHADORE
update public.products set notes = '{"top": ["Bergamotė", "Mandarinas", "Persikas", "Imbieras"], "heart": ["Kedras", "Vetiveris", "Pipirai"], "base": ["Tonkos pupelės", "Vanilė", "Labdanas"]}'::jsonb, description = 'Kvapni žvakė CHADORE - elegantiškas, šiltas medienos aromatas jaukiai namų atmosferai. Viršutinės natos - bergamotė, mandarinas, persikas ir imbieras, širdies - kedras, vetiveris ir pipirai, bazinės - tonkos pupelės, vanilė ir labdanas. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Suteikia namams ramybės ir elegancijos.' where id = 'kvapni-zvake-chadore' and type = 'zvakes';
update public.scents set notes = '{"top": ["Bergamotė", "Mandarinas", "Persikas", "Imbieras"], "heart": ["Kedras", "Vetiveris", "Pipirai"], "base": ["Tonkos pupelės", "Vanilė", "Labdanas"]}'::jsonb where id = 'chadore';

-- MAVIDORE
update public.products set notes = '{"top": ["Kaktusų žiedai"], "heart": ["Rožinė frezija", "Rožių pumpurai", "Jazminas"], "base": ["Kedras", "Medienos natos"]}'::jsonb, description = 'Kvapni žvakė MAVIDORE - švelnus, šviesus gėlių aromatas jaukiai namų atmosferai. Viršutinės natos - kaktusų žiedai, širdies - rožinė frezija, rožių pumpurai ir jazminas, bazinės - kedras ir medienos natos. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Kuria lengvą, gaivią ir moterišką nuotaiką.' where id = 'kvapni-zvake-mavidore' and type = 'zvakes';
update public.scents set notes = '{"top": ["Kaktusų žiedai"], "heart": ["Rožinė frezija", "Rožių pumpurai", "Jazminas"], "base": ["Kedras", "Medienos natos"]}'::jsonb where id = 'mavidore';

-- CRYDORE
update public.products set notes = '{"top": ["Granatas", "Juzu"], "heart": ["Bijūnas", "Magnolija", "Lotosas"], "base": ["Gintaras", "Muskusas", "Raudonmedis"]}'::jsonb, description = 'Kvapni žvakė CRYDORE - gaivus, šviesus gėlių aromatas jaukiai namų atmosferai. Viršutinės natos - granatas ir juzu, širdies - bijūnas, magnolija ir lotosas, bazinės - gintaras, muskusas ir raudonmedis. Pirmą kartą uždekite bent valandai, kad vaškas tolygiai išsilydytų visu paviršiumi. Namai prisipildo gaivos ir šviesos.' where id = 'kvapni-zvake-crydore' and type = 'zvakes';
update public.scents set notes = '{"top": ["Granatas", "Juzu"], "heart": ["Bijūnas", "Magnolija", "Lotosas"], "base": ["Gintaras", "Muskusas", "Raudonmedis"]}'::jsonb where id = 'crydore';

commit;
