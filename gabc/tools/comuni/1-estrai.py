import re, json, subprocess, sys
PDF = sys.argv[1]
# pagine del Comune dei santi nel libretto delle Lodi
FIRST_PAGE, LAST_PAGE = 203, 299
pages = {}
for p in range(FIRST_PAGE, LAST_PAGE + 1):
    t = subprocess.run(['pdftotext','-f',str(p),'-l',str(p),'-layout',PDF,'-'],capture_output=True,text=True).stdout
    lines = [l.rstrip() for l in t.split('\n') if l.strip()]
    pages[p] = lines[1:]  # drop running header
TITLES = [
 ('dedicazione', r'DEDICAZIONE DI UNA CHIESA', 'Dedicazione di una chiesa'),
 ('bvm', r'COMUNE DELLA B\. VERGINE MARIA', 'Comune della Beata Vergine Maria'),
 ('sabato', r'MEMORIA DI S\. MARIA IN SABATO', 'Memoria di Santa Maria in sabato'),
 ('apostoli', r'COMUNE DEGLI APOSTOLI', 'Comune degli Apostoli'),
 ('piu-martiri', r'COMUNE DI PIÙ MARTIRI', 'Comune di più martiri'),
 ('un-martire', r'COMUNE DI UN MARTIRE', 'Comune di un martire'),
 ('martiri-tp', r'COMUNE DEI MARTIRI', 'Comune dei martiri nel Tempo pasquale'),
 ('pastori', r'COMUNE DEI PASTORI', 'Comune dei pastori'),
 ('dottori', r'COMUNE DEI DOTTORI DELLA CHIESA', 'Comune dei dottori della Chiesa'),
 ('monaci', r'COMUNE DEI SS\. MONACI', 'Comune dei santi monaci'),
 ('monache', r'COMUNE DELLE SANTE MONACHE', 'Comune delle sante monache'),
 ('vergini', r'COMUNE DELLE VERGINI', 'Comune delle vergini'),
 ('santi', r'COMUNE DEI SANTI', 'Comune dei santi'),
 ('sante', r'COMUNE DELLE SANTE', 'Comune delle sante'),
 ('religiosi', r'PER I RELIGIOSI', 'Comune dei religiosi'),
]
HEAD = [
 ('inno', r'^INNO$'), ('ant1', r'^1 Ant\.'), ('ant2', r'^2 Ant\.'), ('ant3', r'^3 Ant\.'),
 ('lettura', r'^Lettura breve'), ('responsorio', r'^Responsorio breve'),
 ('benedictus', r'^(Antifona al Benedictus|Ant\. ad Benedictus)'), ('invocazioni', r'^Invocazioni'),
 ('orazione', r'^Orazione'),
]
RUBRIC = re.compile(r'^(Per [^.]{0,55}:|Nel [Tt]empo( di)? [Pp]asqu\w+:?|Nel Tempo di Quaresima:|NEL TEMPO PASQUALE|Per (un|una|uno|più|piú|un’|il fondatore|le Sante|le altre)\b[^,.]{0,50}:?|[Oo]ppure.*|Tempo (di \w+|ordinario):|Nella chiesa dedicata:|Fuori della chiesa dedicata:|Se abate.*|Inno dal .*|L’inno è .*|Invocazioni dal .*|\d° schema)$')
def is_garbage(s):
    if '+br' in s or 'X' in s and re.search(r'[vbz]{3}', s): return True
    if re.search(r'[vbz]{2}[A-Za-z]?[vbz]{2}', s): return True
    if re.search(r'\w- \w', s) and ('*' in s or '=' in s or re.search(r'\w-\w', s)): return True
    if re.fullmatch(r'[A-Z]', s): return True
    if re.fullmatch(r'\d{3}', s): return True
    return False
comuni = []; cur = None; part = None; schema = 0
for p in range(203, 300):
    for raw in pages[p]:
        s = raw.strip()
        if is_garbage(s): continue
        t = next((x for x in TITLES if re.fullmatch(x[1], s)), None)
        if t and not (t[0]=='santi' and p==203):
            if t[0]=='martiri-tp' and cur and cur['id']=='martiri-tp': continue
            cid = t[0]
            if cid=='sabato':
                schema += 1; cid=f'sabato-{schema}'
            cur = {'id': cid, 'titolo': t[2] + (f', {schema}° schema' if t[0]=='sabato' else ''), 'pagine': [p, p], 'parti': {}, 'note': []}
            comuni.append(cur); part = None; rub = None; continue
        if cur is None: continue
        cur['pagine'][1] = p
        h = next((k for k,r in HEAD if re.match(r, s)), None)
        if h:
            part = h; rub = None
            ref = None
            if h=='lettura':
                m = re.search(r'\s{3,}(\S.*)$', raw.strip()); ref = m.group(1).strip() if m else None
            cur['parti'].setdefault(part, []).append({'rubrica': None, 'righe': [], **({'rif': ref} if ref else {})})
            continue
        if re.fullmatch(r'NEL TEMPO PASQUALE', s) or re.fullmatch(r'\d° schema', s): continue
        if RUBRIC.match(s) and len(s) < 75:
            if part is None:
                cur['note'].append(s); continue
            lst = cur['parti'][part]
            if lst[-1]['righe'] or (lst[-1]['rubrica'] and not re.match(r'^[Oo]ppure', s) and not re.match(r'^[Oo]ppure', lst[-1]['rubrica'])):
                lst.append({'rubrica': s, 'righe': []})
            else:
                lst[-1]['rubrica'] = (lst[-1]['rubrica'] + ' · ' + s) if lst[-1]['rubrica'] else s
            continue
        if part is None:
            if re.match(r'^\d\. |^[A-Z]', s) and cur['parti'] == {}:
                part = 'inno'; cur['parti']['inno'] = [{'rubrica': None, 'righe': []}]
            else:
                cur['note'].append(s); continue
        # Ref on separate line (e.g. "Eb 13,7-9a")
        if part=='lettura' and re.fullmatch(r'(Cfr\. )?\d? ?[A-Z][a-z]{0,4}\.? ?\d+[,\d\-.a-z ]*', s) and not cur['parti'][part][-1]['righe']:
            cur['parti'][part][-1]['rif'] = s; continue
        cur['parti'][part][-1]['righe'].append(raw)
json.dump(comuni, open(sys.argv[2],'w'), ensure_ascii=False, indent=1)
for c in comuni:
    print(c['id'], c['pagine'], {k: len(v) for k,v in c['parti'].items()}, c['note'][:3])
