import json, re, sys
C = json.load(open(sys.argv[1]))
by = {c['id']: c for c in C}
def walk(o):
    if isinstance(o, str):
        for a, b in [('verso di fe.', 'verso di te.'), ('Peril nostro', 'Per il nostro'), ('l’inter- cessione', 'l’intercessione'),
                     ('qual gigio', 'qual giglio'), ('allelui alleluia', 'alleluia, alleluia'), (', alleuia', ', alleluia'),
                     ('la comminuta cristiana', 'la comunità cristiana'), ('cammnino', 'cammino'), ('Ave, maria', 'Ave, Maria'),
                     ('lodateLo', 'lodatelo'), ('e o mondo', 'e del mondo'), ('perfezione evangel', 'perfezione evangel'),
                     ('misericordia. di Dio', 'misericordia di Dio'), ('Iac. 3,17- 18', 'Sap. 7,13-14'), ('visione perfetta.Amen', 'visione perfetta. Amen'),
                     ('  ', ' ')]:
            o = o.replace(a, b)
        return o
    if isinstance(o, list): return [walk(x) for x in o]
    if isinstance(o, dict): return {k: walk(v) for k, v in o.items()}
    return o
C = walk(C); by = {c['id']: c for c in C}
def split_item(inv, needle):
    for i, x in enumerate(inv['intercessions']):
        if needle in x['answer']:
            a, rest = x['answer'].split(needle, 1)
            pet, ans = (needle + rest).rsplit(',', 1) if ',' in rest else (needle + rest, '')
            # the new petition ends at the last comma before the answer: find the answer by the libretto layout
            x['answer'] = a.strip()
            inv['intercessions'].insert(i + 1, {'petition': '', 'answer': ''})
            return i + 1, needle + rest
    raise SystemExit('needle not found: ' + needle)
# bvm, Oppure: «Redentore nostro, … fra noi, — trasformaci in tempio vivo del tuo Spirito.»
inv = by['bvm']['parti']['invocazioni'][1]['it']
i, txt = split_item(inv, 'Redentore nostro,')
inv['intercessions'][i] = {'petition': txt.split(' trasformaci')[0].strip(), 'answer': 'trasformaci' + txt.split(' trasformaci', 1)[1]}
# sante: «Signore Gesú, ascoltato come maestro da Maria e servito da Marta, — rendici …»
inv = by['sante']['parti']['invocazioni'][0]['it']
i, txt = split_item(inv, 'Signore Gesú, ascoltato')
pet, ans = txt.split(' rendici', 1)
inv['intercessions'][i] = {'petition': pet.strip(), 'answer': 'rendici' + ans}
# what each Comune takes from another one when the libretto does not print it
by['sabato-1']['note'] = by['sabato-2']['note'] = by['sabato-3']['note'] = by['sabato-4']['note'] = []
for k in ('sabato-1', 'sabato-2', 'sabato-3', 'sabato-4'):
    by[k]['salmodia'] = 'feria'
    by[k]['orazione'] = 'bvm'
by['sabato-4']['parti']['invocazioni'][1] = {'rubrica': 'Oppure', 'vedi': 'sabato-3'}
by['dottori']['eredita'] = {'ant1': 'pastori', 'ant2': 'pastori', 'ant3': 'pastori', 'invocazioni': 'pastori'}
by['dottori']['parti'].pop('invocazioni', None)
by['dottori']['note'] = ['Le antifone della salmodia non sono nel libretto: si prendono dal Comune dei pastori.', 'Invocazioni dal Comune dei pastori.']
by['monache']['eredita'] = {'inno': 'vergini'}
by['monache']['note'] = ['Inno dal Comune delle vergini.']
by['religiosi']['eredita'] = {k: 'santi' for k in ('ant1', 'ant2', 'ant3', 'lettura', 'responsorio', 'invocazioni')}
by['religiosi']['note'] = ['Le parti che il libretto non riporta si prendono dal Comune dei santi.']
by['apostoli']['note'] = ['L’inno è sempre nel Proprio dei Santi: il libretto riporta solo quelli di Quaresima e del Tempo pasquale.']
tp = by['martiri-tp']
tp['note'] = ['Nel Tempo pasquale inno, antifone e invocazioni sono quelli del Comune di un martire o di più martiri; alle antifone si aggiunge l’alleluia e la seconda è «Spiritus et animæ iustorum».']
tp['parti'].pop('inno', None)
for k in ('un-martire', 'piu-martiri'):
    by[k]['tempoPasquale'] = 'martiri-tp'
by['dedicazione']['note'] = []
# order of keys
out = []
for c in C:
    d = {k: c[k] for k in ('id', 'titolo', 'pagine') if k in c}
    for k in ('salmodia', 'orazione', 'eredita', 'tempoPasquale'):
        if k in c: d[k] = c[k]
    d['note'] = c.get('note', [])
    d['parti'] = c['parti']
    out.append(d)
json.dump({'_comment': 'Comune dei santi delle Lodi (libretto pp. 203-299): testi italiani stampati nel libretto, per ogni parte le varianti con la loro rubrica. "canto" = id in gabc/index.json quando la melodia è trascritta. Generato con gabc/tools/comuni/ e poi corretto a mano.', 'comuni': out},
          open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
print(len(out))
