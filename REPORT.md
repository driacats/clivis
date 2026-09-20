# Report — canti GABC trovati per Compieta e Lodi

Riepiloga, per ogni canto gregoriano individuato nei due libretti sorgente, se è stata trovata (e con quale grado di confidenza) una trascrizione GABC corrispondente su [GregoBase](https://gregobase.selapa.net/), riusabile nel database `gabc/` di questo repository e renderizzabile con [exsurge](../../exsurge).

**Perimetro**: `sources/Compieta piccola.pdf` per intero (56 pagine); `sources/Lodi complete.2.pdf` solo pp. 1-176 (salterio delle quattro settimane) — la sezione "Proprio del Tempo" (Avvento, Natale, Quaresima, Pasqua, da p. 177 in poi) è esclusa volutamente, su indicazione dell'utente, e non è coperta da questo report.

Le corrispondenze sono state trovate in due fasi: (1) un abbinamento automatico per incipit/modo/office-part con preferenza per le edizioni Solesmes, come da nota del colophon di Compieta p. 54; (2) per i casi ambigui, una disambiguazione visiva in cui l'utente ha confrontato l'immagine della pagina del libretto con le anteprime dei candidati GregoBase e scelto la corrispondenza corretta (o segnalato l'assenza di corrispondenza, o indicato di persona il canto giusto quando non era nella rosa automatica).

## Riepilogo

| Libretto | Trovati | Non trovati | Non applicabile | Totale |
| --- | --- | --- | --- | --- |
| Compieta | 54 | 0 | 0 | 54 |
| Lodi (sett. 1-4) | 144 | 0 | 1 | 145 |
| **Totale** | **198** | **0** | **1** | **199** |

Inoltre, il tempo pasquale sostituisce nella maggior parte delle antifone salmiche di Lodi il testo proprio con la formula generica "Allelúia, allelúia, allelúia": questa formula non è stata cercata riga per riga su GregoBase (sarebbero decine di ricerche identiche) — resta da coprire a parte con poche formule riusabili per modo, se e quando servirà.

## Testi dei salmi, cantici e letture brevi (italiano/latino)

Oltre ai canti gregoriani notati (sopra), i due libretti stampano per intero anche i salmi e i cantici che seguono ogni antifona, e la lettura breve di ogni giorno/vespri. Questi testi **non sono notazione gregoriana** (in Compieta sono stampati in due colonne, italiano e latino, ma senza puntatura musicale; in Lodi sono stampati **solo in italiano**) e quindi **non sono stati cercati su GregoBase**: sono stati estratti direttamente dal testo dei due PDF sorgente.

**Salmi e cantici** — salvati come JSON strutturato (campi `ref`, `title`, `epigraph`, `verses[]`, con `it`/`la` per versetto — `la` è `null` dove il latino non è stampato) nella cartella `salmi/`, collegati agli slot corrispondenti di `gabc/index.json` tramite il campo `psalm`. **Copertura**: 87 testi unici estratti (10 di Compieta, con italiano e latino; 77 di Lodi, solo italiano), che coprono 120 slot in `gabc/index.json` (15 di Compieta: i salmi feriali/domenicali dopo l'antifona più il Cantico di Simeone/Nunc Dimittis; 105 di Lodi, comprese le antifone con sostituto pasquale a testo reale che riusano il salmo/cantico della riga base). Le formule pasquali generiche "Allelúia, allelúia, allelúia" (vedi sopra) non hanno un testo salmico proprio da estrarre.

**Letture brevi** — salvate come JSON semplice (`{ "ref", "it", "la" }`, prosa continua senza struttura a versetti) nella cartella `letture/`, referenziate da `gabc/liturgy.json` (campo `letturaBreve` di ogni blocco/giorno). **Copertura: completa, 35/35** — le 7 di Compieta (una per blocco: Domenica I e II Vespri, Lunedì-Venerdì, italiano e latino) e le 28 di Lodi (una per ciascuna delle 4 settimane × 7 giorni — risultate **uniche per ogni combinazione settimana+giorno**, non condivise a coppie di settimane come inni/responsori/antifone al Benedictus; solo italiano, Lodi non stampa mai il latino). Un refuso di stampa nel testo originale (parole ripetute nella lettura di Giac./sett. 4 Lunedì, Iudt 8,25-26a.27) è stato trascritto fedelmente, non corretto.

Come per il resto di questo report, la copertura di Lodi si ferma al solo salterio delle quattro settimane (pp. 1-176); la sezione "Proprio del Tempo" non è coperta.

## Note e criticità da verificare

Le righe seguenti sono marcate **trovato** in questo report, ma portano un limite noto segnalato durante la disambiguazione — da tenere presente prima dell'uso liturgico/di stampa:

**Alleluia del tempo pasquale mancante** (la trascrizione GregoBase scelta non include l'alleluia proprio del tempo pasquale che il libretto prevede in coda all'antifona — non ricostruito automaticamente):
- `lodi.LA9` — Benedícite Dóminum, omnes elécti eius: agite dies lætítiæ, et confitémini illi, allelúia — `gabc/chants/9037-benedicite-dominum-omnes-electi-eius-agite-dies-laetitiae-et.gabc`
- `lodi.LA38` — Exsultávit cor meum in Dómino, qui humíliat et sublévat — `gabc/chants/4903-exsultavit-cor-meum-in-domino-qui-humiliat-et-sublevat.gabc`
- `lodi.LA79` — Omnis sapiéntia a Dómino Deo est, et cum illo fuit semper, et est ante ævum, allelúia — `gabc/chants/8579-omnis-sapientia-a-domino-deo-est-et-cum-illo-fuit-semper-et-.gabc`
- `lodi.LA85` — Cantáte Dómino cánticum novum: laus eius ab extrémis terræ — `gabc/chants/8407-cantate-domino-canticum-novum-laus-eius-ab-extremis-terrae.gabc`
- `lodi.LA98` — Nemo te condemnávit, múlier? Nemo, Dómine. Nec ego te condemnábo: iam ámplius noli peccáre, allelúia — `gabc/chants/19722-nemo-te-condemnavit-mulier-nemo-domine-nec-ego-te-condemnabo.gabc`

**EUOUAE (formula del Sæculorum Amen) diverso da quello del libretto**:
- `lodi.LA16` — Pópulus meus, ait Dóminus, bonis meis adimplébitur — `gabc/chants/15195-populus-meus-ait-dominus-bonis-meis-adimplebitur.gabc` — il finale euouae della trascrizione GregoBase è diverso da quello del libretto (lasciato come scaricato, non ricostruito)
- `lodi.LA59` — Cantáte Dómino, et benedícite nómini eius — `gabc/chants/12541-cantate-domino-et-benedicite-nomini-eius.gabc` — l'EUOUAE della trascrizione GregoBase è sbagliato/diverso rispetto al libretto

**Testo corretto manualmente rispetto al download GregoBase originale**:
- `compieta.C27` — Caro mea requiéscet in spe — `gabc/chants/10086-caro-mea-requiescet-in-spe.gabc` — la trascrizione originale includeva un incipit salmico aggiuntivo ("Consérva me, Deus" + formula EUOUAE) non facente parte dell'antifona: rimosso.
- `lodi.LA38` — Exsultávit cor meum in Dómino — `gabc/chants/4903-exsultavit-cor-meum-in-domino-qui-humiliat-et-sublevat.gabc` — rimossa un'etichetta di rubrica "Ant." erroneamente inclusa all'inizio del corpo GABC (vedi anche l'alleluia mancante sopra).

**Trascritte manualmente dallo spartito stampato (non presenti su GregoBase) — da verificare prima dell'uso liturgico**: per queste 9 antifone/responsori non esiste alcuna trascrizione GABC su GregoBase; il codice è stato scritto leggendo direttamente la notazione quadrata stampata nel libretto (rilevamento preciso delle righe del pentagramma dall'immagine ad alta risoluzione, altezze delle note lette una per una contro una griglia di riferimento). Non esiste modo automatico di verificare la correttezza musicale di una trascrizione a mano — da far controllare da chi legge la notazione quadrata prima di un uso liturgico o di stampa:
- `lodi.LA20` — Meménto mei, Dómine Deus, dum véneris in regnum tuum, allelúia — `gabc/chants/manual-memento-mei-domine-deus.gabc` — **nota aggiuntiva**: il testo di questa riga era stato registrato erroneamente nella fase di estrazione iniziale (copiato per errore dalla riga `lodi.LA45`, "Dixit Dóminus paralýtico..."); il testo corretto, quello realmente stampato a p. 33-34 del libretto ("Oppure:", dopo l'alleluia pasquale generico), è quello riportato qui — corretto in `gabc/inventory.json` e `gabc/index.json` in questa sessione, insieme alla riga qui sotto nella sezione Settimana 1.
- `lodi.LA58` — Veníte, ascendámus ad montem Dómini, et ad domum Dei Iacob, allelúia, allelúia, allelúia — `gabc/chants/manual-venite-ascendamus-ad-montem-domini.gabc` — testo confermato corretto contro il PDF sorgente (l'avviso precedente sulla pagina era dovuto a un problema del solo strumento di disambiguazione visiva, non a un errore nei dati)
- `lodi.LA75` — Alligávit Dóminus plagam pópuli sui, et percussúram eius sanávit, allelúia — `gabc/chants/manual-alligavit-dominus-plagam-populi-sui.gabc`
- `lodi.LA89` — Et nunc séquimur in toto corde, timémus te et quærimus fáciem tuam vidére, allelúia — `gabc/chants/manual-et-nunc-sequimur-in-toto-corde.gabc`
- `lodi.LA90` — Misericórdia mea et refúgium meum Dóminus: suscéptor meus, et liberátor meus — `gabc/chants/manual-misericordia-mea-et-refugium.gabc`
- `lodi.LA100` — Ierúsalem, cívitas Dei, luce spléndida fulgébis, et omnes fines terræ te adorábunt, allelúia — `gabc/chants/manual-ierusalem-civitas-dei.gabc`
- `lodi.LA104` — Effúndam super vos aquam mundam, et mundabímini ab ómnibus inquinaméntis vestris, dicit Dóminus, allelúia — `gabc/chants/manual-effundam-super-vos-aquam-mundam.gabc`
- `lodi.LR12` — Clamábo ad Dóminum altíssimum, Qui benefécit mihi. Mittet de cælo, et liberávit me — `gabc/chants/manual-clamabo-ad-dominum-altissimum.gabc`
- `lodi.LR14` — Exsultábunt lábia mea, Cum cantávero tibi. Lingua mea meditábitur iustítiam tuam — `gabc/chants/manual-exsultabunt-labia-mea.gabc`

## Compieta piccola.pdf

- ✓ Deus, in adiutórium meum inténde (ogni giorno (con variante "in Quadragesima" senza Alleluia)) — GregoBase #4121 — `gabc/chants/4121-deus-in-adiutorium-meum-intende.gabc`
- ✓ Te lucis ante términum (ferie durante l'anno) — GregoBase #4681 — `gabc/chants/4681-te-lucis-ante-terminum.gabc`
- ✓ Te lucis ante términum (memorie) — GregoBase #4681 — `gabc/chants/4681-te-lucis-ante-terminum.gabc`
- ✓ Te lucis ante términum (feste) — GregoBase #8892 — `gabc/chants/8892-te-lucis-ante-terminum.gabc`
- ✓ Te lucis ante términum (domeniche per annum) — GregoBase #4681 — `gabc/chants/4681-te-lucis-ante-terminum.gabc`
- ✓ Te lucis ante términum (solennità) — GregoBase #4681 — `gabc/chants/4681-te-lucis-ante-terminum.gabc`
- ✓ Christe, qui splendor et dies (ferie durante l'anno) — GregoBase #7518 — `gabc/chants/7518-christe-qui-splendor-et-dies.gabc`
- ✓ Christe, qui splendor et dies (memorie) — GregoBase #7518 — `gabc/chants/7518-christe-qui-splendor-et-dies.gabc`
- ✓ Christe, qui splendor et dies (feste) — GregoBase #7517 — `gabc/chants/7517-christe-qui-splendor-et-dies.gabc`
- ✓ Christe, qui splendor et dies (domeniche per annum) — GregoBase #7518 — `gabc/chants/7518-christe-qui-splendor-et-dies.gabc`
- ✓ Christe, qui splendor et dies (solennità) — GregoBase #7518 — `gabc/chants/7518-christe-qui-splendor-et-dies.gabc`
- ✓ In manus tuas Dómine, comméndo spíritum meum. Redemísti nos Dómine, Deus veritátis (tempo ordinario e Natale) — GregoBase #13059 — `gabc/chants/13059-in-manus-tuas-domine-commendo-spiritum-meum-redemisti-nos-do.gabc`
- ✓ Salva nos, Dómine, vigilántes, custódi nos dormiéntes (ogni giorno) — GregoBase #17654 — `gabc/chants/17654-salva-nos-domine-vigilantes-custodi-nos-dormientes.gabc`
- ✓ Nunc dimíttis servum tuum, Dómine (ogni giorno (Lc 2,29-32)) — GregoBase #13718 — `gabc/chants/13718-nunc-dimittis-servum-tuum-domine.gabc`
- ✓ Noctem quiétam et finem perféctum concédat nobis Dóminus omnípotens (ogni giorno) — GregoBase #20685 — `gabc/chants/20685-noctem-quietam-et-finem-perfectum-concedat-nobis-dominus-omn.gabc`
- ✓ Miserére mihi Dómine, et exáudi oratiónem meam (Domenica I Vespri, 1a ant.) — GregoBase #12592 — `gabc/chants/12592-miserere-mihi-domine-et-exaudi-orationem-meam.gabc`
- ✓ In nóctibus benedícite Dóminum (Domenica I Vespri, 2a ant.) — GregoBase #16102 — `gabc/chants/16102-in-noctibus-benedicite-dominum.gabc`
- ✓ Qui hábitat in adiutório Altíssimi, in protectióne Dei cæli commorábitur (Domenica II Vespri) — GregoBase #11232 — `gabc/chants/11232-qui-habitat-in-adiutorio-altissimi-in-protectione-dei-caeli-.gabc`
- ✓ Angelis suis Deus mandávit de te (Domenica II Vespri) — GregoBase #9007 — `gabc/chants/9007-angelis-suis-deus-mandavit-de-te.gabc`
- ✓ Inclína, Dómine, aurem tuam mihi, et exáudi verba mea (Lunedì) — GregoBase #8664 — `gabc/chants/8664-inclina-domine-aurem-tuam-mihi-et-exaudi-verba-mea.gabc`
- ✓ Inténde vóci oratiónis meæ (Lunedì) — GregoBase #15401 — `gabc/chants/15401-intende-voci-orationis-meae.gabc`
- ✓ In veritáte tua exáudi me, Dómine (Martedì) — GregoBase #10433 — `gabc/chants/10433-in-veritate-tua-exaudi-me-domine.gabc`
- ✓ Ne intres in iudícium cum servo tuo, Dómine (Martedì) — GregoBase #11234 — `gabc/chants/11234-ne-intres-in-iudicium-cum-servo-tuo-domine.gabc`
- ✓ In tua iustítia líbera me, Dómine (Mercoledì (1a ant.)) — GregoBase #11031 — `gabc/chants/11031-in-tua-iustitia-libera-me-domine.gabc`
- ✓ Esto mihi, Dómine, in Deum protectórem (Mercoledì (1a ant.)) — GregoBase #17590 — `gabc/chants/17590-esto-mihi-domine-in-deum-protectorem.gabc`
- ✓ De profúndis clamávi ad te, Dómine (Mercoledì (2a ant.)) — GregoBase #7565 — `gabc/chants/7565-de-profundis-clamavi-ad-te-domine.gabc`
- ⚠ Caro mea requiéscet in spe (Giovedì) — GregoBase #10086 — `gabc/chants/10086-caro-mea-requiescet-in-spe.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ Intret orátio mea in conspéctu tuo, Dómine (Venerdì) — GregoBase #9603 — `gabc/chants/9603-intret-oratio-mea-in-conspectu-tuo-domine.gabc`
- ✓ Dómine, Deus salútis meæ, in die clamávi et nocte coram te (Venerdì) — GregoBase #11240 — `gabc/chants/11240-domine-deus-salutis-meae-in-die-clamavi-et-nocte-coram-te.gabc`
- ✓ Te lucis ante términum (Avvento fino al 16 dic.) — GregoBase #7413 — `gabc/chants/7413-te-lucis-ante-terminum.gabc`
- ✓ Christe, qui splendor et dies (Avvento dal 17 dic.) — GregoBase #4685 — `gabc/chants/4685-christe-qui-splendor-et-dies.gabc`
- ✓ Te lucis ante términum (Natale fino all'Epifania) — GregoBase #8892 — `gabc/chants/8892-te-lucis-ante-terminum.gabc`
- ✓ Christe, qui splendor et dies (Natale dopo l'Epifania) — GregoBase #7518 — `gabc/chants/7518-christe-qui-splendor-et-dies.gabc`
- ✓ Te lucis ante términum (Quaresima, settimane 1-3-5) — GregoBase #8892 — `gabc/chants/8892-te-lucis-ante-terminum.gabc`
- ✓ Christe, qui splendor et dies (Quaresima, settimane 2-4) — GregoBase #7517 — `gabc/chants/7517-christe-qui-splendor-et-dies.gabc`
- ✓ Iesu, redémptor sæculi, Verbum Patris altíssimi (Pasqua e Pentecoste) — GregoBase #4676 — `gabc/chants/4676-iesu-redemptor-saeculi-verbum-patris-altissimi.gabc`
- ✓ In manus tuas, Dómine, comméndo spíritum meum (Avvento e Quaresima) — GregoBase #12702 — `gabc/chants/12702-in-manus-tuas-domine-commendo-spiritum-meum.gabc`
- ✓ Christus factus est pro nobis obédiens usque ad mortem (Triduo Pasquale (+ "mortem autem crucis" Venerdì Santo, + "Propter quod et Deus exaltávit illum" Sabato Santo)) — GregoBase #6737 — `gabc/chants/6737-christus-factus-est-pro-nobis-obediens-usque-ad-mortem.gabc`
- ✓ Haec dies, quam fecit Dóminus: exsultémus, et laetémur in ea (Pasqua e Ottava) — GregoBase #12993 — `gabc/chants/12993-haec-dies-quam-fecit-dominus-exsultemus-et-laetemur-in-ea.gabc`
- ✓ In manus tuas Dómine, comméndo spíritum meum. Allelúia, allelúia (Tempo di Pasqua) — GregoBase #12649 — `gabc/chants/12649-in-manus-tuas-domine-commendo-spiritum-meum-alleluia-allelui.gabc`
- ✓ Alma Redemptóris Mater, quæ pérvia cæli porta manes (Avvento e Natale (fino al 2 feb.)) — GregoBase #15264 — `gabc/chants/15264-alma-redemptoris-mater-quae-pervia-caeli-porta-manes.gabc`
- ✓ Ave, Regína cælórum, Ave Dómina Angelórum (Quaresima (dal 2 feb.)) — GregoBase #15265 — `gabc/chants/15265-ave-regina-caelorum-ave-domina-angelorum.gabc`
- ✓ Regína cæli lætáre, allelúia (Tempo di Pasqua) — GregoBase #15266 — `gabc/chants/15266-regina-caeli-laetare-alleluia.gabc`
- ✓ Salve, Regína, máter misericórdiæ (Tempo Ordinario) — GregoBase #18655 — `gabc/chants/18655-salve-regina-mater-misericordiae.gabc`
- ✓ Sub tuum praesídium confúgimus, sancta Dei Génitrix (-) — GregoBase #18652 — `gabc/chants/18652-sub-tuum-praesidium-confugimus-sancta-dei-genitrix.gabc`
- ✓ Ave María, grátia pléna, Dóminus técum (-) — GregoBase #12596 — `gabc/chants/12596-ave-maria-gratia-plena-dominus-tecum.gabc`
- ✓ Memoráre, o píissima Vírgo María (S. Bernardo) — GregoBase #13125 — `gabc/chants/13125-memorare-o-piissima-virgo-maria.gabc`
- ✓ Inviolata, íntegra et casta es, María (-) — GregoBase #13025 — `gabc/chants/13025-inviolata-integra-et-casta-es-maria.gabc`
- ✓ Tota pulchra es, María (Immacolata Concezione) — GregoBase #7556 — `gabc/chants/7556-tota-pulchra-es-maria.gabc`
- ✓ Regína cæli lætáre, allelúia (Tempo di Pasqua (Officium Parvum, melodia distinta da C43/C53)) — GregoBase #14963 — `gabc/chants/14963-regina-caeli-laetare-alleluia.gabc`
- ✓ Alma Redemptóris Mater (Avvento e Natale (fino al 2 feb.)) — GregoBase #8146 — `gabc/chants/8146-alma-redemptoris-mater.gabc`
- ✓ Ave Regína cælórum (Quaresima (dal 2 feb.)) — GregoBase #3300 — `gabc/chants/3300-ave-regina-caelorum.gabc`
- ✓ Regína cæli lætáre (Tempo di Pasqua) — GregoBase #3301 — `gabc/chants/3301-regina-caeli-laetare.gabc`
- ✓ Salve, Regína, máter misericórdiæ (Tempo Ordinario) — GregoBase #3299 — `gabc/chants/3299-salve-regina-mater-misericordiae.gabc`

## Lodi complete.2.pdf (pp. 1-176, salterio delle quattro settimane)

### Inni

- ✓ Aeterne rerum cónditor (Domenica, settimane 1 e 3) — GregoBase #15724 — `gabc/chants/15724-aeterne-rerum-conditor.gabc`
- ✓ Splendor patérnae glóriae (Lunedì, settimane 1 e 3) — GregoBase #15608 — `gabc/chants/15608-splendor-paternae-gloriae.gabc`
- ✓ Pergráta mundo núntiat auróra solis spícula (Martedì, settimane 1 e 3) — GregoBase #15629 — `gabc/chants/15629-pergrata-mundo-nuntiat-aurora-solis-spicula.gabc`
- ✓ Nox et ténebrae et núbila (Mercoledì, settimane 1 e 3) — GregoBase #15630 — `gabc/chants/15630-nox-et-tenebrae-et-nubila.gabc`
- ✓ Sol ecce súrgit ígneus (Giovedì, settimane 1 e 3) — GregoBase #15631 — `gabc/chants/15631-sol-ecce-surgit-igneus.gabc`
- ✓ Aetérna cæli glória (Venerdì, settimane 1 e 3) — GregoBase #15632 — `gabc/chants/15632-aeterna-caeli-gloria.gabc`
- ✓ Auróra iam spárgit polum (Sabato, settimane 1 e 3) — GregoBase #15633 — `gabc/chants/15633-aurora-iam-spargit-polum.gabc`
- ✓ Ecce iam noctis tenuátur umbra (Domenica, settimane 2 e 4) — GregoBase #19480 — `gabc/chants/19480-ecce-iam-noctis-tenuatur-umbra.gabc`
- ✓ Lucis largítor spléndide (Lunedì, settimane 2 e 4) — GregoBase #7502 — `gabc/chants/7502-lucis-largitor-splendide.gabc`
- ✓ Aetérne lucis cónditor (Martedì, settimane 2 e 4) — GregoBase #16710 — `gabc/chants/16710-aeterne-lucis-conditor.gabc`
- ✓ Fulgéntis auctor ætheris (Mercoledì, settimane 2 e 4) — GregoBase #14141 — `gabc/chants/14141-fulgentis-auctor-aetheris.gabc`
- ✓ Iam lucis orto sídere (Giovedì, settimane 2 e 4) — GregoBase #18673 — `gabc/chants/18673-iam-lucis-orto-sidere.gabc`
- ✓ Deus, qui cæli lumen es (Venerdì, settimane 2 e 4) — GregoBase #16748 — `gabc/chants/16748-deus-qui-caeli-lumen-es.gabc`
- ✓ Diéi luce reddíta (Sabato, settimane 2 e 4) — GregoBase #16058 — `gabc/chants/16058-diei-luce-reddita.gabc`

### Responsori brevi

- ✓ Christe, Fili Dei vivi, Miserére nobis. Qui sedes ad déxteram Patris (Domenica, sett. 1 e 3) — GregoBase #19019 — `gabc/chants/19019-christe-fili-dei-vivi-miserere-nobis-qui-sedes-ad-dexteram-p.gabc`
- ✓ Confitébimur tibi, Deus, et invocábimus nomen tuum. Narrábimus mirabília tua (Domenica, sett. 2 e 4) — GregoBase #20806 — `gabc/chants/20806-confitebimur-tibi-deus-et-invocabimus-nomen-tuum-narrabimus-.gabc`
- ✓ Benedíctus Dóminus a sæculo et usque in sæculum. Qui facit mirabília solus (Lunedì, sett. 1 e 3) — GregoBase #19022 — `gabc/chants/19022-benedictus-dominus-a-saeculo-et-usque-in-saeculum-qui-facit-.gabc`
- ✓ Exsultáte, iusti, in Dómino; Rectos decet collaudátio. Cantáte ei cánticum novum (Lunedì, sett. 2 e 4) — GregoBase #7731 — `gabc/chants/7731-exsultate-iusti-in-domino-rectos-decet-collaudatio-cantate-e.gabc`
- ✓ Deus meus, adiútor meus, et sperábo in eum. Refúgium meum et liberátor meus (Martedì, sett. 1 e 3) — GregoBase #19084 — `gabc/chants/19084-deus-meus-adiutor-meus-et-sperabo-in-eum-refugium-meum-et-li.gabc`
- ✓ Vocem meam audi, Dómine, in verba tua supersperávi. Prævéni díluculo et clamávi (Martedì, sett. 2 e 4) — GregoBase #20765 — `gabc/chants/20765-vocem-meam-audi-domine-in-verba-tua-supersperavi-praeveni-di.gabc`
- ✓ Inclína cor meum, Deus, in testimónia tua. In via tua vivífica me (Mercoledì, sett. 1 e 3) — GregoBase #20372 — `gabc/chants/20372-inclina-cor-meum-deus-in-testimonia-tua-in-via-tua-vivifica-.gabc`
- ✓ Benedícam Dóminum in omni témpore. Semper laus eius in ore meo (Mercoledì, sett. 2 e 4) — GregoBase #19030 — `gabc/chants/19030-benedicam-dominum-in-omni-tempore-semper-laus-eius-in-ore-me.gabc`
- ✓ Clamávi in toto corde meo: Exáudi me, Dómine. Iustificatiónes tuas servábo (Giovedì, sett. 1 e 3) — GregoBase #19037 — `gabc/chants/19037-clamavi-in-toto-corde-meo-exaudi-me-domine-iustificationes-t.gabc`
- ✓ In matutínis, Dómine, meditábor de te. Quia factus es adiútor meus (Giovedì, sett. 2 e 4) — GregoBase #19746 — `gabc/chants/19746-in-matutinis-domine-meditabor-de-te-quia-factus-es-adiutor-m.gabc`
- ✓ Audítam fac mihi mane misericórdiam tuam. Notam fac mihi viam in qua ámbulem (Venerdì, sett. 1 e 3) — GregoBase #19045 — `gabc/chants/19045-auditam-fac-mihi-mane-misericordiam-tuam-notam-fac-mihi-viam.gabc`
- ⚠ Clamábo ad Dóminum altíssimum, Qui benefécit mihi. Mittet de cælo, et liberávit me (Venerdì, sett. 2 e 4) — trascrizione manuale — `gabc/chants/manual-clamabo-ad-dominum-altissimum.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ Clamávi ad te, Dómine; Tu es refúgium meum. Pórtio mea in terra vivéntium (Sabato, sett. 1 e 3) — GregoBase #19074 — `gabc/chants/19074-clamavi-ad-te-domine-tu-es-refugium-meum-portio-mea-in-terra.gabc`
- ⚠ Exsultábunt lábia mea, Cum cantávero tibi. Lingua mea meditábitur iustítiam tuam (Sabato, sett. 2 e 4) — trascrizione manuale — `gabc/chants/manual-exsultabunt-labia-mea.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*

### Antifone al Benedictus

- ✓ Benedíctus Deus Israel (Lunedì, sett. 1 e 3 (Lc 1,68)) — GregoBase #8452 — `gabc/chants/8452-benedictus-deus-israel.gabc`
- ✓ Benedíctus Dóminus Deus Israel, quia visitávit et liberávit nos (Lunedì, sett. 2 e 4) — GregoBase #19023 — `gabc/chants/19023-benedictus-dominus-deus-israel-quia-visitavit-et-liberavit-n.gabc`
- ✓ Eréxit Dóminus nobis cornu salútis in domo David púeri sui (Martedì, sett. 1 e 3 (Lc 1,69)) — GregoBase #18039 — `gabc/chants/18039-erexit-dominus-nobis-cornu-salutis-in-domo-david-pueri-sui.gabc`
- ✓ De manu ómnium qui odérunt nos líberet nos Dómine (Martedì, sett. 2 e 4) — GregoBase #8453 — `gabc/chants/8453-de-manu-omnium-qui-oderunt-nos-liberet-nos-domine.gabc`
- ✓ Salútem ex inimícis nostris, et de manu ómnium qui nos odérunt, líberet nos, Dómine (Mercoledì, sett. 1 e 3 (Lc 1,71)) — GregoBase #19025 — `gabc/chants/19025-salutem-ex-inimicis-nostris-et-de-manu-omnium-qui-nos-oderun.gabc`
- ✓ Liberáti serviámus Deo nostro in sanctitáte (Mercoledì, sett. 2 e 4) — GregoBase #19031 — `gabc/chants/19031-liberati-serviamus-deo-nostro-in-sanctitate.gabc`
- ✓ In sanctitáte serviámus Dómino, et liberábit nos ab inimícis nostris (Giovedì, sett. 1 e 3 (Lc 1,74-75)) — GregoBase #8454 — `gabc/chants/8454-in-sanctitate-serviamus-domino-et-liberabit-nos-ab-inimicis-.gabc`
- ✓ Da sciéntiam plebi tuæ, Dómine, in remissiónem peccatórum eórum (Giovedì, sett. 2 e 4) — GregoBase #19039 — `gabc/chants/19039-da-scientiam-plebi-tuae-domine-in-remissionem-peccatorum-eor.gabc`
- ✓ Visitávit et fecit redemptiónem Dóminus plebis suæ (Venerdì, sett. 1 e 3 (Lc 1,68)) — GregoBase #18058 — `gabc/chants/18058-visitavit-et-fecit-redemptionem-dominus-plebis-suae.gabc`
- ✓ Per víscera misericórdiæ Dei nostri visitávit nos Oriens ex alto (Venerdì, sett. 2 e 4) — GregoBase #8455 — `gabc/chants/8455-per-viscera-misericordiae-dei-nostri-visitavit-nos-oriens-ex.gabc`
- ✓ Illumináre Dómine his qui in ténebris sedent et dírige pedes nostros in viam pacis, Deus Israel (Sabato, sett. 1 e 3) — GregoBase #8456 — `gabc/chants/8456-illuminare-domine-his-qui-in-tenebris-sedent-et-dirige-pedes.gabc`
- ✓ In viam pacis dírige nos, Dómine (Sabato, sett. 2 e 4 (Lc 2,79)) — GregoBase #19078 — `gabc/chants/19078-in-viam-pacis-dirige-nos-domine.gabc`

### Antifone salmiche e al cantico


#### Settimana 1

- ✓ A te de luce vigilo, Deus, ut videam virtútem tuam (settimana 1, Domenica, 1a ant., Ps 62) — GregoBase #11116 — `gabc/chants/11116-ad-te-de-luce-vigilo-deus-ut.gabc`
- ✓ Res púeri iussu regis in fornácem missi sunt, non timéntes flammam ignis, dicéntes: Benedíctus Deus (settimana 1, Domenica, 2a ant., Cant. Dan 3,57-88.56) — GregoBase #3309 — `gabc/chants/3309-tres-pueri.gabc`
- ✓ Beneplácitum est Dómino in pópulo suo, et honorábit mansuétos in salútem (settimana 1, Domenica, 3a ant., Ps 149) — GregoBase #14493 — `gabc/chants/14493-beneplacitum-est-domino-in-populo-suo-et-honorabit-mansuetos.gabc`
- ✓ Intéllege clamórem meum, Dómine (settimana 1, Lunedì, 1a ant., Ps 5) — GregoBase #10415 — `gabc/chants/10415-intellege-clamorem-meum-domine.gabc`
- ✓ Laudámus nomen tuum inclytum, Deus noster (settimana 1, Lunedì, 2a ant., Cant. 1 Cron 29,10-13) — GregoBase #11128 — `gabc/chants/11128-laudamus-nomen-tuum-inclytum-deus-noster.gabc`
- ✓ Adoráte Dóminum in aula sancta eius (settimana 1, Lunedì, 3a ant., Ps 28) — GregoBase #17988 — `gabc/chants/17988-adorate-dominum-in-aula-sancta-eius.gabc`
- ✓ Innocens mánibus et mundo corde ascéndet in montem Dómini (settimana 1, Martedì, 1a ant., Ps 23) — GregoBase #12545 — `gabc/chants/12545-innocens-manibus-et-mundo-corde-ascendet-in-montem-domini.gabc`
- ✓ Exaltáte regem sæculórum in opéribus vestris (settimana 1, Martedì, 2a ant., Cant. Tob 13,2-10a) — GregoBase #15187 — `gabc/chants/15187-exaltate-regem-saeculorum-in-operibus-vestris.gabc`
- ⚠ Benedícite Dóminum, omnes elécti eius: agite dies lætítiæ, et confitémini illi, allelúia (settimana 1, Martedì, 2a ant., Cant. Tob 13,2-10a (T.P.)) — GregoBase #9037 — `gabc/chants/9037-benedicite-dominum-omnes-electi-eius-agite-dies-laetitiae-et.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ Rectos decet collaudátio (settimana 1, Martedì, 3a ant., Ps 32) — GregoBase #7732 — `gabc/chants/7732-rectos-decet-collaudatio.gabc`
- ✓ Dómine, in cælo misericórdia tua (settimana 1, Mercoledì, 1a ant., Ps 35) — GregoBase #9158 — `gabc/chants/9158-domine-in-caelo-misericordia-tua.gabc`
- ✓ Dómine, magnus es tu, et præclárus in virtúte tua (settimana 1, Mercoledì, 2a ant., Cant. Giuditta 16,1-2a.13-15) — GregoBase #15190 — `gabc/chants/15190-domine-magnus-es-tu-et-praeclarus-in-virtute-tua.gabc`
- ✓ Emítte Spíritum tuum, et creabúntur: et renovábis fáciem terræ, allelúia, allelúia (settimana 1, Mercoledì, 2a ant., Cant. Giuditta 16,1-2a.13-15 (T.P.)) — GregoBase #17799 — `gabc/chants/17799-emitte-spiritum-tuum-et-creabuntur-et-renovabis-faciem-terra.gabc`
- ✓ Iubiláte Deo in voce exsultatiónis (settimana 1, Mercoledì, 3a ant., Ps 46) — GregoBase #18057 — `gabc/chants/18057-iubilate-deo-in-voce-exsultationis.gabc`
- ✓ Quóniam in te confídit ánima mea (settimana 1, Giovedì, 1a ant., Ps 56) — GregoBase #10422 — `gabc/chants/10422-quoniam-in-te-confidit-anima-mea.gabc`
- ⚠ Pópulus meus, ait Dóminus, bonis meis adimplébitur (settimana 1, Giovedì, 2a ant., Cant. Ger 31,10-14) — GregoBase #15195 — `gabc/chants/15195-populus-meus-ait-dominus-bonis-meis-adimplebitur.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ Pastor bonus ánimam suam ponit pro óvibus suis, allelúia (settimana 1, Giovedì, 2a ant., Cant. Ger 31,10-14 (T.P.)) — GregoBase #10148 — `gabc/chants/10148-pastor-bonus-animam-suam-ponit-pro-ovibus-suis-alleluia.gabc`
- ✓ Magnus Dóminus et laudábilis nimis (settimana 1, Giovedì, 3a ant., Ps 47) — GregoBase #18049 — `gabc/chants/18049-magnus-dominus-et-laudabilis-nimis.gabc`
- ✓ Miserére mei, Deus (settimana 1, Venerdì, 1a ant., Ps 50) — GregoBase #10436 — `gabc/chants/10436-miserere-mei-deus.gabc`
- ⚠ Meménto mei, Dómine Deus, dum véneris in regnum tuum, allelúia (settimana 1, Venerdì, 1a ant., Ps 50 (T.P.)) — trascrizione manuale — `gabc/chants/manual-memento-mei-domine-deus.gabc` *(testo corretto in questa sessione, vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ In Dómino iustificábitur, et laudábitur omne semen Israel (settimana 1, Venerdì, 2a ant., Cant. Is 45,15-26) — GregoBase #10879 — `gabc/chants/10879-in-domino-iustificabitur-et-laudabitur-omne-semen-israel.gabc`
- — null (settimana 1, Venerdì, 2a ant., Cant. Is 45,15-26 (T.P.)) — non applicabile: verificare — nessuna alternativa pasquale indicata per questa settimana
- ✓ Iubiláte Deo, omnis terra (settimana 1, Venerdì, 3a ant., Ps 99) — GregoBase #18057 — `gabc/chants/18057-iubilate-deo-omnis-terra.gabc`
- ✓ Da mihi intelléctum et scrutábor, Dómine, legem tuam (settimana 1, Sabato, 1a ant., Ps 118 (145-152, XIX Coph)) — GregoBase #10759 — `gabc/chants/10759-da-mihi-intellectum-et-scrutabor-domine-legem-tuam.gabc`
- ✓ Fortitúdo mea et laus mea Dóminus: et factus est mihi in salútem (settimana 1, Sabato, 2a ant., Cant. Es 15,1-4a.8-13.17-18) — GregoBase #12852 — `gabc/chants/12852-fortitudo-mea-et-laus-mea-dominus-et-factus-est-mihi-in-salu.gabc`
- ✓ Laudáte Dóminum, omnes gentes (settimana 1, Sabato, 3a ant., Ps 116) — GregoBase #12483 — `gabc/chants/12483-laudate-dominum-omnes-gentes.gabc`

#### Settimana 2

- ✓ Si mihi Dóminus salvátor fúerit, non timébo quid fáciat mihi homo (settimana 2, Domenica, 1a ant., Ps 117) — GregoBase #20470 — `gabc/chants/20470-si-mihi-dominus-salvator-fuerit-non-timebo-quid-faciat-mihi-.gabc`
- ✓ Hymnum dicámus Dómino Deo nostro (settimana 2, Domenica, 2a ant., Cant. Dan 3,52-57) — GregoBase #9771 — `gabc/chants/9771-hymnum-dicamus-domino-deo-nostro.gabc`
- ✓ In sanctis eius laudáte Deum (settimana 2, Domenica, 3a ant., Ps 150) — GregoBase #10427 — `gabc/chants/10427-in-sanctis-ejus.gabc`
- ✓ Sitívit ánima mea ad Deum vivum: quando véniam, et apparébo ante fáciem Dómini? (settimana 2, Lunedì, 1a ant., Ps 41) — GregoBase #15659 — `gabc/chants/15659-sitivit-anima-mea-ad-deum-vivum-quando-veniam-et-apparebo-an.gabc`
- ✓ Osténde nobis, Dómine, lucem misericordiárum tuárum (settimana 2, Lunedì, 2a ant., Cant. Sir 36,1-6.10-13) — GregoBase #15203 — `gabc/chants/15203-ostende-nobis-domine-lucem-misericordiarum-tuarum.gabc`
- ✓ Cæli enárrant glóriam Dei (settimana 2, Lunedì, 3a ant., Ps 18A) — GregoBase #18605 — `gabc/chants/18605-caeli-enarrant-gloriam-dei.gabc`
- ✓ Salutáre vultus mei, Deus meus (settimana 2, Martedì, 1a ant., Ps 42) — GregoBase #13345 — `gabc/chants/13345-salutare-vultus-mei-deus-meus.gabc`
- ✓ Cunctis diébus vitæ nostræ salvos nos fac Dómine (settimana 2, Martedì, 2a ant., Cant. Is 38,10-14.17-20) — GregoBase #10127 — `gabc/chants/10127-cunctis-diebus-vitae-nostrae-salvos-nos-fac-domine.gabc`
- ✓ Corrípies me Dómine, et vivificábis me, allelúia (settimana 2, Martedì, 2a ant., Cant. Is 38,10-14.17-20 (T.P.)) — GregoBase #12351 — `gabc/chants/12351-corripies-me-domine-et-vivificabis-me-alleluia.gabc`
- ✓ Te decet hymnus, Deus, in Sion (settimana 2, Martedì, 3a ant., Ps 64) — GregoBase #19028 — `gabc/chants/19028-te-decet-hymnus-deus-in-sion.gabc`
- ✓ Deus, in sancto via tua; quis Deus magnus sicut Deus noster? (settimana 2, Mercoledì, 1a ant., Ps 76) — GregoBase #10686 — `gabc/chants/10686-deus-in-sancto-via-tua-quis-deus-magnus-sicut-deus-noster.gabc`
- ⚠ Exsultávit cor meum in Dómino, qui humíliat et sublévat (settimana 2, Mercoledì, 2a ant., Cant. 1 Sam 2,1-10) — GregoBase #4903 — `gabc/chants/4903-exsultavit-cor-meum-in-domino-qui-humiliat-et-sublevat.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ Dóminus regnávit, exsúltet terra (settimana 2, Mercoledì, 3a ant., Ps 96) — GregoBase #12452 — `gabc/chants/12452-dominus-regnavit-exsultet-terra.gabc`
- ✓ Excita, Dómine, poténtiam tuam, ut salvos fácias nos (settimana 2, Giovedì, 1a ant., Ps 79) — GregoBase #13278 — `gabc/chants/13278-excita-domine-potentiam-tuam-ut-salvos-facias-nos.gabc`
- ✓ Convérsus est furor tuus Dómine, et consolátus es me (settimana 2, Giovedì, 2a ant., Cant. Is 12,1-6) — GregoBase #10126 — `gabc/chants/10126-conversus-est-furor-tuus-domine-et-consolatus-es-me.gabc`
- ✓ Hauriétis aquas in gáudio de fóntibus Salvatóris, allelúia (settimana 2, Giovedì, 2a ant., Cant. Is 12,1-6 (T.P.)) — GregoBase #18878 — `gabc/chants/18878-haurietis-aquas-in-gaudio-de-fontibus-salvatoris-alleluia.gabc`
- ✓ Exsultáte Deo adiutóri nostro (settimana 2, Giovedì, 3a ant., Ps 80) — GregoBase #20596 — `gabc/chants/20596-exsultate-deo-adiutori-nostro.gabc`
- ✓ Dele, Dómine, iniquitátem meam (settimana 2, Venerdì, 1a ant., Ps 50) — GregoBase #10420 — `gabc/chants/10420-dele-domine-iniquitatem-meam.gabc`
- ✓ Dixit Dóminus paralýtico: Confíde fili: remittúntur tibi peccáta tua, allelúia (settimana 2, Venerdì, 1a ant., Ps 50 (T.P.)) — GregoBase #8314 — `gabc/chants/8314-dixit-dominus-paralytico-confide-fili-remittuntur-tibi-pecca.gabc`
- ✓ Cum irátus fúeris Dómine, misericórdiæ recordáberis (settimana 2, Venerdì, 2a ant., Cant. Ab 3,2-4.13a.15-19) — GregoBase #12804 — `gabc/chants/12804-cum-iratus-fueris-domine-misericordiae-recordaberis.gabc`
- ✓ Ego autem in Dómino gaudébo, et exsultábo in Deo Iesu meo, allelúia (settimana 2, Venerdì, 2a ant., Cant. Ab 3,2-4.13a.15-19 (T.P.)) — GregoBase #20431 — `gabc/chants/20431-ego-autem-in-domino-gaudebo-et-exsultabo-in-deo-iesu-meo-all.gabc`
- ✓ Lauda, Ierúsalem, Dóminum (settimana 2, Venerdì, 3a ant., Ps 147) — GregoBase #19391 — `gabc/chants/19391-lauda-ierusalem-dominum.gabc`
- ✓ Quam magnificáta sunt ópera tua, Dómine (settimana 2, Sabato, 1a ant., Ps 91) — GregoBase #13235 — `gabc/chants/13235-quam-magnificata-sunt-opera-tua-domine.gabc`
- ✓ Date magnitúdinem Deo nostro (settimana 2, Sabato, 2a ant., Cant. Deut 32,1-12) — GregoBase #10128 — `gabc/chants/10128-date-magnitudinem-deo-nostro.gabc`
- ✓ In servis suis miserébitur Dóminus, et propítius erit terræ pópuli sui, allelúia (settimana 2, Sabato, 2a ant., Cant. Deut 32,1-12 (T.P.)) — GregoBase #13132 — `gabc/chants/13132-in-servis-suis-miserebitur-dominus-et-propitius-erit-terrae-.gabc`
- ✓ Quam admirábile est nomen tuum, Dómine, in univérsa terra (settimana 2, Sabato, 3a ant., Ps 8) — GregoBase #8657 — `gabc/chants/8657-quam-admirabile-est-nomen-tuum-domine-in-universa-terra.gabc`

#### Settimana 3

- ✓ Regnávit Dóminus, decórem indútus est (settimana 3, Domenica, 1a ant., Ps 92) — GregoBase #3305 — `gabc/chants/3305-regnavit-dominus-decorem-indutus-est.gabc`
- ✓ Hymnum dícite, et superexaltáte eum in sæcula (settimana 3, Domenica, 2a ant., Cant. Dan 3,57-88.56) — GregoBase #9786 — `gabc/chants/9786-hymnum-dicite-et-superexaltate-eum-in-saecula.gabc`
- ✓ Laudáte Dóminum de cælis (settimana 3, Domenica, 3a ant., Ps 148) — GregoBase #18347 — `gabc/chants/18347-laudate-dominum-de-caelis.gabc`
- ✓ Beáti qui hábitant in domo tua, Dómine (settimana 3, Lunedì, 1a ant., Ps 83) — GregoBase #2372 — `gabc/chants/2372-beati-qui-habitant-in-domo-tua-domine.gabc`
- ✓ De Sion exíbit lex, et verbum Dómini de Ierúsalem (settimana 3, Lunedì, 2a ant., Cant. Is 2,2-5) — GregoBase #4373 — `gabc/chants/4373-de-sion-exibit-lex-et-verbum-domini-de-ierusalem.gabc`
- ⚠ Veníte, ascendámus ad montem Dómini, et ad domum Dei Iacob, allelúia, allelúia, allelúia (settimana 3, Lunedì, 2a ant., Cant. Is 2,2-5 (T.P.)) — trascrizione manuale — `gabc/chants/manual-venite-ascendamus-ad-montem-domini.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ⚠ Cantáte Dómino, et benedícite nómini eius (settimana 3, Lunedì, 3a ant., Ps 95) — GregoBase #12541 — `gabc/chants/12541-cantate-domino-et-benedicite-nomini-eius.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ Benedixísti Dómine terram tuam (settimana 3, Martedì, 1a ant., Ps 84) — GregoBase #20422 — `gabc/chants/20422-benedixisti-domine-terram-tuam.gabc`
- ✓ Deus Deus meus, ad te de luce vígilo, quia factus es adiútor meus (settimana 3, Martedì, 2a ant., Cant. Is 26,1-4.7-9.12) — GregoBase #12711 — `gabc/chants/12711-deus-deus-meus-ad-te-de-luce-vigilo-quia-factus-es-adiutor-m.gabc`
- ✓ Urbs fortitúdinis nostræ Sion, Salvátor ponétur in ea murus et antemurále: aperíte portas, quia nobíscum Deus, allelúia (settimana 3, Martedì, 2a ant., Cant. Is 26,1-4.7-9.12 (T.P.)) — GregoBase #15565 — `gabc/chants/15565-urbs-fortitudinis-nostrae-sion-salvator-ponetur-in-ea-murus-.gabc`
- ✓ Illúmina, Dómine, vultum tuum super nos (settimana 3, Martedì, 3a ant., Ps 66) — GregoBase #12398 — `gabc/chants/12398-illumina-domine-vultum-tuum-super-nos.gabc`
- ✓ Inclína, Dómine, aurem tuam mihi, et exáudi verba mea (settimana 3, Mercoledì, 1a ant., Ps 85) — GregoBase #8664 — `gabc/chants/8664-inclina-domine-aurem-tuam-mihi-et-exaudi-verba-mea.gabc`
- ✓ Habitábit in tabernáculo tuo, requiéscet in monte sancto tuo (settimana 3, Mercoledì, 2a ant., Cant. Is 33,13-16) — GregoBase #18663 — `gabc/chants/18663-habitabit-in-tabernaculo-tuo-requiescet-in-monte-sancto-tuo.gabc`
- ✓ In civitáte Dómini clare sonant iúgiter órgana Sanctórum: ibi cinnamómum et bálsamum odor suavíssimus cármina eórum: ibi Angeli et Archángeli hymnum Deo decántant ante thronum Dei, allelúia (settimana 3, Mercoledì, 2a ant., Cant. Is 33,13-16 (T.P.)) — GregoBase #16182 — `gabc/chants/16182-in-civitate-domini-clare-sonant-iugiter-organa-sanctorum-ibi.gabc`
- ✓ Quia mirabília fecit Dóminus (settimana 3, Mercoledì, 3a ant., Ps 97) — GregoBase #10733 — `gabc/chants/10733-quia-mirabilia-fecit-dominus.gabc`
- ✓ Fundaménta eius in móntibus sanctis (settimana 3, Giovedì, 1a ant., Ps 86) — GregoBase #7797 — `gabc/chants/7797-fundamenta-eius-in-montibus-sanctis.gabc`
- ✓ Ecce vénio cito et merces mea mecum est, dicit Dóminus: dare unicuíque secúndum ópera sua (settimana 3, Giovedì, 2a ant., Cant. Is 40,10-17) — GregoBase #7636 — `gabc/chants/7636-ecce-venio-cito-et-merces-mea-mecum-est-dicit-dominus-dare-u.gabc`
- ✓ Ego sum pastor bonus, qui pasco oves meas, et pro óvibus meis pono ánimam meam, allelúia (settimana 3, Giovedì, 2a ant., Cant. Is 40,10-17 (T.P.)) — GregoBase #10145 — `gabc/chants/10145-ego-sum-pastor-bonus-qui-pasco-oves-meas-et-pro-ovibus-meis-.gabc`
- ✓ Exaltáte Dóminum Deum nostrum, et adoráte ad montem sanctum eius (settimana 3, Giovedì, 3a ant., Ps 98) — GregoBase #11808 — `gabc/chants/11808-exaltate-dominum-deum-nostrum-et-adorate-ad-montem-sanctum-e.gabc`
- ✓ Tibi soli peccávi, Dómine, miserére mei (settimana 3, Venerdì, 1a ant., Ps 50) — GregoBase #12456 — `gabc/chants/12456-tibi-soli-peccavi-domine-miserere-mei.gabc`
- ✓ Amplius lava me, Dómine ab iniustítia mea, allelúia (settimana 3, Venerdì, 1a ant., Ps 50 (T.P.)) — GregoBase #15612 — `gabc/chants/15612-amplius-lava-me-domine-ab-iniustitia-mea-alleluia.gabc`
- ✓ Ne reminiscáris Dómine delícta mea, vel paréntum meórum: neque vindíctam sumas de peccátis meis (settimana 3, Venerdì, 2a ant., Cant. Ger 14,17-21) — GregoBase #8513 — `gabc/chants/8513-ne-reminiscaris-domine-delicta-mea-vel-parentum-meorum-neque.gabc`
- ⚠ Alligávit Dóminus plagam pópuli sui, et percussúram eius sanávit, allelúia (settimana 3, Venerdì, 2a ant., Cant. Ger 14,17-21 (T.P.)) — trascrizione manuale — `gabc/chants/manual-alligavit-dominus-plagam-populi-sui.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ Suávis est Dóminus, et in ætérnum misericórdia eius (settimana 3, Venerdì, 3a ant., Ps 99) — GregoBase #5806 — `gabc/chants/5806-suavis-est-dominus-et-in-aeternum-misericordia-eius.gabc`
- ✓ Adspíce in me, et miserére mei, Dómine (settimana 3, Sabato, 1a ant., Ps 118 (145-152, XIX Coph)) — GregoBase #20364 — `gabc/chants/20364-adspice-in-me-et-miserere-mei-domine.gabc`
- ✓ Ego in altíssimis hábito, et thronus meus in colúmna nubis (settimana 3, Sabato, 2a ant., Cant. Sap 9,1-6.9-11) — GregoBase #8565 — `gabc/chants/8565-ego-in-altissimis-habito-et-thronus-meus-in-columna-nubis.gabc`
- ⚠ Omnis sapiéntia a Dómino Deo est, et cum illo fuit semper, et est ante ævum, allelúia (settimana 3, Sabato, 2a ant., Cant. Sap 9,1-6.9-11 (T.P.)) — GregoBase #8579 — `gabc/chants/8579-omnis-sapientia-a-domino-deo-est-et-cum-illo-fuit-semper-et-.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ Laudáte Dóminum, omnes gentes (settimana 3, Sabato, 3a ant., Ps 116) — GregoBase #12483 — `gabc/chants/12483-laudate-dominum-omnes-gentes.gabc`

#### Settimana 4

- ✓ Dóminus mihi adiútor est, non timébo quid fáciat mihi homo (settimana 4, Domenica, 1a ant., Ps 117) — GregoBase #18756 — `gabc/chants/18756-dominus-mihi-adiutor-est-non-timebo-quid-faciat-mihi-homo.gabc`
- ✓ Trium puerórum cantémus hymnum, quem cantábant in camíno ignis, benedicéntes Dóminum (settimana 4, Domenica, 2a ant., Cant. Dan 3,52-57) — GregoBase #3310 — `gabc/chants/3310-trium-puerorum-cantemus-hymnum-quem-cantabant-in-camino-igni.gabc`
- ✓ Omnis spíritus laudet Dóminum (settimana 4, Domenica, 3a ant., Ps 150) — GregoBase #9096 — `gabc/chants/9096-omnis-spiritus-laudet-dominum.gabc`
- ✓ Dómine, refúgium factus es nobis (settimana 4, Lunedì, 1a ant., Ps 89) — GregoBase #19032 — `gabc/chants/19032-domine-refugium-factus-es-nobis.gabc`
- ⚠ Cantáte Dómino cánticum novum: laus eius ab extrémis terræ (settimana 4, Lunedì, 2a ant., Cant. Is 42,10-16) — GregoBase #8407 — `gabc/chants/8407-cantate-domino-canticum-novum-laus-eius-ab-extremis-terrae.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ Laudáte nomen Dómini, qui statis in domo Dómini (settimana 4, Lunedì, 3a ant., Ps 134 (1-12)) — GregoBase #12909 — `gabc/chants/12909-laudate-nomen-domini-qui-statis-in-domo-domini.gabc`
- ✓ Tibi, Dómine, psallam, et intéllegam in via immaculáta (settimana 4, Martedì, 1a ant., Ps 100) — GregoBase #12835 — `gabc/chants/12835-tibi-domine-psallam-et-intellegam-in-via-immaculata.gabc`
- ✓ In spíritu humilitátis et in ánimo contríto suscipiámur, Dómine, a te: et sic fiat sacrifícium nostrum, ut a te suscipiátur hódie, et pláceat tibi, Dómine Deus (settimana 4, Martedì, 2a ant., Cant. Dan 3,26.27.29.34-41) — GregoBase #9749 — `gabc/chants/9749-in-spiritu-humilitatis-et-in-animo-contrito-suscipiamur-domi.gabc`
- ⚠ Et nunc séquimur in toto corde, timémus te et quærimus fáciem tuam vidére, allelúia (settimana 4, Martedì, 2a ant., Cant. Dan 3,26.27.29.34-41 (T.P.)) — trascrizione manuale — `gabc/chants/manual-et-nunc-sequimur-in-toto-corde.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ⚠ Misericórdia mea et refúgium meum Dóminus: suscéptor meus, et liberátor meus (settimana 4, Martedì, 3a ant., Ps 143 (1-10)) — trascrizione manuale — `gabc/chants/manual-misericordia-mea-et-refugium.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ Psallam tibi in natiónibus, quia magna est super cælos misericórdia tua (settimana 4, Mercoledì, 1a ant., Ps 107) — GregoBase #15342 — `gabc/chants/15342-psallam-tibi-in-nationibus-quia-magna-est-super-caelos-miser.gabc`
- ✓ Propter Sion non tacébo, donec egrediátur ut splendor iustus eius (settimana 4, Mercoledì, 2a ant., Cant. Is 61,10-62,5) — GregoBase #7460 — `gabc/chants/7460-propter-sion-non-tacebo-donec-egrediatur-ut-splendor-iustus-.gabc`
- ✓ Laudábo Deum meum in vita mea (settimana 4, Mercoledì, 3a ant., Ps 145) — GregoBase #19389 — `gabc/chants/19389-laudabo-deum-meum-in-vita-mea.gabc`
- ✓ In veritáte tua exáudi me, Dómine (settimana 4, Giovedì, 1a ant., Ps 142 (1-11)) — GregoBase #19071 — `gabc/chants/19071-in-veritate-tua-exaudi-me-domine.gabc`
- ✓ Lætámini cum Ierúsalem, et exsultáte in ea omnes qui dilígitis eam, in ætérnum (settimana 4, Giovedì, 2a ant., Cant. Is 66,10-14a) — GregoBase #4418 — `gabc/chants/4418-laetamini-cum-ierusalem-et-exsultate-in-ea-omnes-qui-diligit.gabc`
- ✓ Deo nostro iucúnda sit laudátio (settimana 4, Giovedì, 3a ant., Ps 146) — GregoBase #19390 — `gabc/chants/19390-deo-nostro-iucunda-sit-laudatio.gabc`
- ✓ Cor mundum crea in me Deus: spíritum rectum ínnova in viscéribus meis (settimana 4, Venerdì, 1a ant., Ps 50) — GregoBase #9745 — `gabc/chants/9745-cor-mundum-crea-in-me-deus-spiritum-rectum-innova-in-visceri.gabc`
- ⚠ Nemo te condemnávit, múlier? Nemo, Dómine. Nec ego te condemnábo: iam ámplius noli peccáre, allelúia (settimana 4, Venerdì, 1a ant., Ps 50 (T.P.)) — GregoBase #19722 — `gabc/chants/19722-nemo-te-condemnavit-mulier-nemo-domine-nec-ego-te-condemnabo.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ Benedícite Dóminum, omnes elécti eius: agite dies lætítiæ, et confitémini illi (settimana 4, Venerdì, 2a ant., Cant. Tob 13,8-11.13.14ab.16) — GregoBase #9037 — `gabc/chants/9037-benedicite-dominum-omnes-electi-eius-agite-dies-laetitiae-et.gabc`
- ⚠ Ierúsalem, cívitas Dei, luce spléndida fulgébis, et omnes fines terræ te adorábunt, allelúia (settimana 4, Venerdì, 2a ant., Cant. Tob 13,8-11.13.14ab.16 (T.P.)) — trascrizione manuale — `gabc/chants/manual-ierusalem-civitas-dei.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ Lauda Deum tuum Sion, qui annúntiat iudícia sua Israel (settimana 4, Venerdì, 3a ant., Ps 147) — GregoBase #12280 — `gabc/chants/12280-lauda-deum-tuum-sion-qui-annuntiat-iudicia-sua-israel.gabc`
- ✓ Bonum est confitéri Dómino (settimana 4, Sabato, 1a ant., Ps 91) — GregoBase #19042 — `gabc/chants/19042-bonum-est-confiteri-domino.gabc`
- ✓ Aquam quam ego dédero, qui bíberit ex ea, non sítiet unquam (settimana 4, Sabato, 2a ant., Cant. Ez 36,24-28) — GregoBase #12769 — `gabc/chants/12769-aquam-quam-ego-dedero-qui-biberit-ex-ea-non-sitiet-unquam.gabc`
- ⚠ Effúndam super vos aquam mundam, et mundabímini ab ómnibus inquinaméntis vestris, dicit Dóminus, allelúia (settimana 4, Sabato, 2a ant., Cant. Ez 36,24-28 (T.P.)) — trascrizione manuale — `gabc/chants/manual-effundam-super-vos-aquam-mundam.gabc` *(vedi [Note e criticità](#note-e-criticità-da-verificare))*
- ✓ Glória et honóre coronásti eum, Dómine; ómnia subiecísti sub pédibus eius (settimana 4, Sabato, 3a ant., Ps 8) — GregoBase #20027 — `gabc/chants/20027-gloria-et-honore-coronasti-eum-domine-omnia-subiecisti-sub-p.gabc`
