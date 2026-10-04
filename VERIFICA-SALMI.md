# Verifica salmi e cantici contro i libretti PDF (3 ottobre 2026)

Confronto automatico parola per parola di tutti gli 88 file in `salmi/` con `sources/Lodi complete.2.pdf` (pp. 1-176) e `sources/Compieta piccola.pdf` (colonna italiana e latina separate), più controllo di titoli, epigrafi e struttura dei versetti (un `*` per versetto, al massimo una `†`). Nessun file è stato modificato.

**Esito in breve**: a parte i 6 file della sezione 1, il testo dei salmi e cantici di Lodi corrisponde al libretto parola per parola e nessuno è troncato. I problemi sono: 6 file di Lodi con testo estraneo in coda, 41 epigrafi troncate, e errori o sfasamenti in 7 testi di Compieta (Simeone, Sal 85, 87, 90, 129, 142, più il latino non del libretto in Sal 15).

## 1. Testo estraneo finito dentro il salmo (Lodi) — da correggere

Sul sito compaiono come versetti in più dopo la fine del salmo.

| File | Versetti estranei | Cosa contengono |
| --- | --- | --- |
| `ps-150-lodate-il-signore-nel-suo-santuario.json` | v6-v35 (30 versetti) | lettura breve Ez 36, responsorio con codici di notazione, invocazioni, orazione, inno del lunedì sett. 2. Il salmo vero sono i vv. 1-5 (identici a `-2`) |
| `ps-117-celebrate-il-signore-perche-e-buono.json` | v30-v31 | «2ª Ant.» + codici di notazione + «Cantiamo un inno al Signore, Dio nostro» |
| `ps-117-celebrate-il-signore-perche-e-buono-2.json` | v30-v32 | «2ª Ant.» + antifona «Cantiamo l'inno dei tre fanciulli… infuo-cata…» |
| `cant-dan-3-52-57-benedetto-sei-tu-signore-dio-dei.json` | coda di v7 + v8 | v7 continua con «3ª Ant. … codici di notazione … Euouae», v8 = «Lodate Dio nel suo santuario» |
| `cant-dan-3-52-57-benedetto-sei-tu-signore-dio-dei-2.json` | v8-v9 | «3ª Ant.» + «Ogni vivente lodi il Signore» |
| `ps-41-22-17.json` | v1 | «22,17)» — è il riferimento dell'epigrafe finito come primo versetto |

## 2. Compieta — differenze dal libretto

### Errori veri (testo mancante o diverso)

- **Cantico di Simeone** (`cant-lc-2-29-32-ora-lascia-signore.json`): latino v1 «Nunc dimittis servum Domine» → manca **tuum**. Inoltre italiano e latino sono **sfasati di un versetto**: l'italiano ha 3 versetti di cantico (il v2 unisce «Perché i miei occhi…» e «preparata da te…»), il latino 4, quindi da v3 in poi in vista «Entrambi» l'italiano sta accanto al latino sbagliato (es. «Gloria al Padre» accanto a «lumen ad revelationem»), e «Amen» è un versetto a sé solo in italiano. Il riferimento è «Lc 2,29-33» (dovrebbe essere 2,29-32).
- **Sal 90**: lat. v2 manca `*` (libretto: «venantium * et a verbo maligno»); it. v5 «ma nulla potrà colpire» → libretto «ma nulla **ti** potrà colpire»; it. v6 manca `*` («con i tuoi occhi * vedrai»); «La sua fedeltà ti sarà scudo e corazza» sta nel v4 italiano mentre il suo corrispondente latino («scutum et lorica veritas eius») è nel v3 → coppie it/la sfasate in v3-v4.
- **Sal 85** (`…-compieta.json`): lat. v14 «miserere mei; **\*** da fortitudinem» → nel libretto è **†**; lat. v15 «in bonum, **\*** ut videant» → libretto **†**, manca il `*` prima di «quoniam tu, Domine» e manca **me** finale («consolatus es me»).
- **Sal 142** (`…-compieta.json`): it. v1 «* per la tua giustizia» → libretto «* **e** per la tua giustizia»; it. v5 manca `*` prima di «medito sui tuoi prodigi»; it. v11 «Salvami dai miei nemici, *» → libretto «Salvami dai miei nemici, **Signore**, *»; it. v4 «si agghiaccia **in me** il mio cuore» (il libretto non ha «in me»); lat. v13-14: manca **«et in misericórdia tua dispérdes inimícos meos;»** e il v13 latino non ha `*`.
- **Sal 87**: it. v5 «dei quali non conservi» → libretto «dei quali **tu** non conservi»; it. v9 «per il patire» → libretto «**nel** patire»; lat. v12 «misericórdiam tuam * veritátem» → manca **et**; lat. v9 «non egrédior» → libretto «egrédi**a**r» (corretto il libretto).
- **Sal 129**: il libretto stampa in latino il versetto «Magis quam custodes auroram * speret Israel in Domino», che nel JSON manca (il latino è stato ricomposto per tornare a 8 versetti come l'italiano).

### Latino preso da un'altra edizione (non dal libretto)
Il latino di **Sal 15, 87 e 142** nel JSON è accentato e in alcuni punti segue la Nova Vulgata invece del libretto: Sal 15 «In sanctis… ínclitis viris… accelerárunt» (libretto: «In sanctos… inclitos viros… acceleraverunt»); Sal 87 «Circumdedérunt me sicut aqua» (libretto: «Circuierunt»). Da decidere quale testo tenere.

### Refusi del libretto già corretti nel JSON (ok, solo per memoria)
Sal 129 «porta» → «potrà»; Sal 90 lat. «Refugim» → «Refugium», «mundábit» → «mandábit»; Simeone «mei» → «miei». Restano invece copiati dal libretto: Simeone «va da in pace seconda la tua parola» e «i miei occhi ha visto».

## 3. Versetti con due asterischi (struttura)

Questi versetti contengono due mezzi versetti completi (due `*`), quasi sempre perché così sono impaginati nel libretto. Per il tono salmodico vanno divisi in due versetti; in Compieta occorre poi riallineare italiano e latino.

- Lodi: Ger 31 v1, Is 38 v10, Sal 142 (1-11) v3.
- Compieta: Sal 4 lat. v1; Sal 133 it. v1; Sal 15 lat. v4; Sal 85 it./lat. v9-v11; Sal 87 it./lat. v5 e v17 (nel v17 l'italiano usa † dove il libretto ha `*`); Sal 90 it./lat. v1, v4, v7.

## 4. Epigrafi troncate o diverse (41)

L'estrazione ha tenuto solo la prima riga dell'epigrafe. Testo completo dal libretto:

| File | Pagina | JSON finisce con | Testo del libretto |
| --- | --- | --- | --- |
| `cant-1-sam-2-1-10-il-mio-cuore-esulta-nel-signore.json` | p. 65 | …ato gli umili, ha ricolmati di beni | Ha rovesciato i potenti dai troni ha innalzato gli umili, ha ricolmati di beni gli affamati (Lc. 1,53) |
| `cant-ab-3-2-4-13a-15-19-signore-ho-ascoltato-il-tuo-annunzio.json` | p. 78 | …e su una nube, con potenza e gloria | Vedranno il Figlio dell’uomo venire su una nube, con potenza e gloria grande. Levate il capo perché la vostra liberazione è vicina. (Lc. 21,27. 28) |
| `cant-dan-3-26-27-29-34-41-benedetto-sei-tu-signore-dio-dei.json` | p. 148 | …é siano cancellati i vostri peccati | Pentitevi dunque e cambiate vita, perché siano cancellati i vostri peccati (At. 3,19) |
| `cant-dan-3-57-88-56-benedite-opere-tutte-del-signore-il-2.json` | p. 4 | …ore voi tutti suoi servi (Ap. 19,5) | Lodate il nostro Dio, voi tutti suoi servi (Ap. 19,5) |
| `cant-deut-32-1-12-ascoltate-o-cieli-io-voglio-parlare.json` | p. 85 | … figli come una gallina raccoglie i | Quante volte ho voluto raccogliere i tuoi figli come una gallina raccoglie i pulcini sotto le ali! (Mt. 23,37) |
| `cant-es-15-1-4a-8-13-17-18-voglio-cantare-in-onore-del-signore.json` | p. 41 | …tavano il cantico di Mosè, servo di | Coloro che avevano vinto la bestia cantavano il cantico di Mosè, servo di Dio (cfr. Ap. 15, 2-3) |
| `cant-ger-14-17-21-i-miei-occhi-grondano-lacrime.json` | p. 124 | …è vicino: convertitevi e credete al | Il tempo è compiuto, e il regno di Dio è vicino: convertitevi e credete al vangelo. (Mc. 1,15) |
| `cant-ger-31-10-14-ascoltate-popoli-la-parola-del-signore.json` | p. 29 | …gli di Dio, che erano dispersi (Gv. | Gesù doveva morire ... per riunire i figli di Dio, che erano dispersi (Gv. 11,51. 52) |
| `cant-is-33-13-16-sentiranno-i-lontani-quanto-ho-fatto.json` | p. 111 | …per tutti quelli che sono lontani ( | Per voi è la promessa e per i vostri figli e per tutti quelli che sono lontani (At. 2,39) |
| `cant-is-61-10-62-5-io-gioisco-pienamente-nel-signore.json` | p. 154 | …mme ... pronta come una sposa ador- | Vidi la città santa, la nuova Gerusalemme ... pronta come una sposa adorna per il suo sposo (Ap. 21,2) |
| `cant-sap-9-1-6-9-11-dio-dei-padri-e-signore-di.json` | p. 130 | …i vostri avversari non potranno re- | Io vi darò lingua e sapienza a cui tutti i vostri avversari non potranno resistere (Lc. 21,15) |
| `cant-sir-36-1-6-10-13-abbi-pieta-di-noi-signore-dio.json` | p. 53 | …, l’unico vero Dio, e colui che hai | Questa è la vita eterna: che conoscano te, l’unico vero Dio, e colui che hai mandato, Gesù Cristo (Gv. 17,3). |
| `cant-tob-13-2-10a-benedetto-dio-che-vive-in-eterno.json` | p. 15 | …ostro Gesù Cristo: nella sua grande | Sia benedetto Dio, Padre del Signore nostro Gesù Cristo: nella sua grande misericordia egli ci ha rigenerati a una vita nuova (cfr: 1 Pt. 1,3) |
| `cant-tob-13-8-11-13-14ab-16-tutti-parlino-del-signore.json` | p. 167 | ….. risplendente della gloria di Dio | Mi mostrò la città santa Gerusalemme ... risplendente della gloria di Dio (Ap. 21,10-11) |
| `ps-107-saldo-e-il-mio-cuore-dio.json` | p. 153 | …ieli, la sua gloria viene predicata | Perché il Figlio di Dio fu esaltato sopra i cieli, la sua gloria viene predicata su tutta la terra (Arnobio) |
| `ps-116-lodate-il-signore-popoli-tutti.json` | p. 42 | …icheranno Dio per la sua misericor- | Qusto io dico: le nazioni pagane glorificheranno Dio per la sua misericordia (cfr. Rom. 15,8.9) |
| `ps-117-celebrate-il-signore-perche-e-buono-2.json` | p. 46 | …el cielo e della terra. (Le. 10,21) | Io ti confesso Padre, Signore del cielo e della terra. (Lc. 10,21) |
| `ps-118-145-152-xix-coph-t-invoco-con-tutto-il-cuore-2.json` | p. 40 | …’osservanza dei comandamenti (1 Gv. | In questo consiste l’amore di Dio, nell’osservanza dei comandamenti (1 Gv. 5,3) |
| `ps-118-145-152-xix-coph-t-invoco-con-tutto-il-cuore.json` | p. 40 | …’osservanza dei comandamenti (1 Gv. | In questo consiste l’amore di Dio, nell’osservanza dei comandamenti (1 Gv. 5,3) |
| `ps-134-1-12-lodate-il-nome-del-signore.json` | p. 143 | …oclama le opere meravigliose di lui | Popolo che il Signore si è acquistato, proclama le opere meravigliose di lui che ti ha chiamato dalle tenebre alla sua ammirabile luce (cfr. 1 Pt. 2,9) |
| `ps-142-1-11-signore-ascolta-la-mia-preghiera.json` | p. 159 | …e non dalle opere della legge (Gal. | Siamo giustificati dalla fede in Cristo e non dalle opere della legge (Gal. 2,16) |
| `ps-148-lodate-il-signore-dai-cieli.json` | p. 93 | …o lode, onore, gloria e potenza nei | A colui che siede sulò trono e all’Agnello lode, onore, gloria e potenza nei sewcop,i dei secoli (Ap. 5,13) |
| `ps-149-cantate-al-signore-un-canto-nuovo.json` | p. 5 | … esultino nel loro re, Cristo (Esi- | I figli della Chiesa, i figli del nuovo popolo esultino nel loro re, Cristo (Esichio) |
| `ps-18a-i-cieli-narrano-la-gloria-di.json` | p. 54 | …a dirigere i nostri passi sulla via | Ci ha visitato dall’alto un sole che sorge ... a dirigere i nostri passi sulla via della pace (Lc. 1,78.79) |
| `ps-23-del-signore-e-la-terra-e.json` | p. 14 | …o Signore,quando salì nel cielo (S. | Le porte del cielo si sono aperte a Cristo Signore,quando salì nel cielo (S. Ireneo) |
| `ps-35-nel-cuore-dell-empio-parla-il.json` | p. 21 | …elle tenebre, ma avrà la luce della | Chiunque segue me non camminerà nelle tenebre, ma avrà la luce della vita (Gv. 8,12) |
| `ps-41-22-17.json` | p. 52 | …atuitamente l’acqua della vita (Ap. | Chi ha sete venga: chi vuole attinga gratuitamente l’acqua della vita (Ap. 22,17) |
| `ps-47-grande-e-il-signore-e-degno.json` | p. 30 | …e mi mostrò la città santa, Gerusa- | Mi trasportò in spirito su un monte alto e mi mostrò la città santa, Gerusalemme (Ap. 21,10) |
| `ps-5-porgi-l-orecchio-signore-alle-mie.json` | p. 9 | …ventano sua dimora, esulteranno per | Quelli che hanno accolto il Verbo e diventano sua dimora, esulteranno per sempre. |
| `ps-50-pieta-di-me-o-dio-secondo-2.json` | p. 34 | …mente e rivestitevi dell’uomo nuovo | Rinnovatevi nello spirito della vostra mente e rivestitevi dell’uomo nuovo (cfr. Ef. 4,2324) |
| `ps-50-pieta-di-me-o-dio-secondo.json` | p. 34 | …mente e rivestitevi dell’uomo nuovo | Rinnovatevi nello spirito della vostra mente e rivestitevi dell’uomo nuovo (cfr. Ef. 4,2324) |
| `ps-62-o-dio-tu-sei-il-mio.json` | p. 3 | …, bramando di dissetarsi alla fonte | La chiesa ha sete del suo Salvatore, bramando di dissetarsi alla fonte dell'acqua viva che zampilla per la vita eterna (cfr Cassiodoro). |
| `ps-64-a-te-si-deve-lode-o.json` | p. 60 | … prova di sé concedendovi dal cielo | Il Dio vivente... non ha cessato di dar prova di sé concedendovi dal cielo piogge e stagioni ricche di frutti, fornendovi di cibo e riempiendo i vostri cuori di letizia (cfr. Act. 14,15.17) |
| `ps-76-la-mia-voce-sale-a-dio.json` | p. 63 | …hiacciati; colui che ha risuscitato | Siamo tribolati da ogni parte, ma non schiacciati; colui che ha risuscitato Gesù, risusciterà anche noi. (Cfr. 2 Cor. 4,8.14) |
| `ps-8-o-signore-nostro-dio.json` | p. 86 | … costituito su tutte le cose a capo | Tutto ha sottomesso ai suoi piedi e lo ha costituito su tutte le cose a capo della Chiesa (Ef. 1,22) |
| `ps-80-esultate-in-dio-nostra-forza.json` | p. 73 | … nessuno di voi un cuore perverso e | Guardate, fratelli che non si trovi in nessuno di voi un cuore perverso e senza fede (Ebr. 3,12) |
| `ps-89-signore-tu-sei-stato-per-noi.json` | p. 140 | …lle anni e mille anni come un gior- | Davanti al Signore un giorno è come mille anni e mille anni come un giorno solo (2 Pt. 3,8) |
| `ps-92-il-signore-regna-si-ammanta-di.json` | p. 91 | …nore, il nostro Dio, l’Onnipotente. | Ha preso possesso del suo regno il Signore, il nostro Dio, l’Onnipotente. Rallegriamoci, esultiamo e rendiamo a lui gloria. (Ap. 19, 6.7) |
| `ps-96-il-signore-regna-esulti-la-terra.json` | p. 66 | …la fede di tutte le genti in Cristo | Questo salmo si riferisce alla salvezza e alla fede di tutte le genti in Cristo (S. Atanasio) |
| `ps-97-cantate-al-signore-un-canto-nuovo.json` | p. 112 | …a del Signore e la fede di tutte le | Questo salmo significa la prima venuta del Signore e la fede di tutte le genti. (S. Atanasio) |
| `ps-98-il-signore-regna-tremino-i-popoli.json` | p. 118 | …mbiato la miserabile condizione del | Tu sei sopra i cherubini, tu che hai cambiato la miserabile condizione del mondo quando ti sei fatto carne come noi (S. Atanasio) |

Refusi presenti nel libretto e copiati nei titoli/epigrafi: «Peghiera» (Sal 142, il file di Compieta lo corregge), «popoplo» (Tob 13,8), «Qusto» (Sal 116), «sulò trono… sewcop,i dei secoli» (Sal 148).

## 5. Non verificabile dal PDF
- **Benedictus** (`cant-lc-1-68-79-benedictus.json`): il libretto stampa solo l'incipit di ogni versetto in notazione (p. 312), coerente col JSON; l'italiano viene dalla Liturgia delle Ore e nel libretto non c'è.

---

## Correzioni applicate (3 ottobre 2026, sera)

Tutto quanto sopra è stato corretto in `salmi/` (55 file; copia degli originali in `_da_eliminare/salmi-prima-della-correzione/`). Dopo la correzione ogni versetto di ogni file ha esattamente un `*` e al più una `†`, e il testo italiano di Lodi coincide parola per parola col libretto.

- **Lodi**: tolto il testo estraneo dai 6 file; divisi Ger 31 v1, Is 38 v10, Sal 142 v3; completate le 41 epigrafi (correggendo i refusi del libretto «Qusto», «sulò trono… sewcop,i»); titoli «Peghiera» → «Preghiera», «popoplo» → «popolo» (anche in `gabc/index.json` e nei file di collegamento).
- **Compieta**: ripristinate le parole mancanti (vedi sezione 2) e riallineati italiano e latino. Scelte fatte:
  - Latino di Sal 15 e 87 riportato alle lezioni del libretto (sanctos, inclitos viros, acceleraverunt, Circuierunt), mantenendo gli accenti già presenti; «egrédiar» come nel libretto.
  - Dove italiano e latino hanno struttura diversa sono stati spostati solo i segni `*`/`†`, mai le parole: Sal 4 lat. v1, Sal 15 lat. v4, Sal 133 lat. v1, Sal 129 vv. 7-8, Sal 90 it. vv. 4-5 (ora «Ti coprirà con le sue penne, † … * la sua fedeltà ti sarà scudo e corazza;» come nella Liturgia delle Ore), Sal 142 vv. 3 e 12-15.
  - Cantico di Simeone: corretti anche i refusi del libretto «va da in pace seconda» → «vada in pace secondo» e «i miei occhi ha visto» → «hanno visto»; «Amen» unito all'ultimo versetto; riferimento Lc 2,29-32.
- `site/dist/salmi` riallineato ai nuovi file.
