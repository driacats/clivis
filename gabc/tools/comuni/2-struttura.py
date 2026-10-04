import json, re, sys
C = json.load(open(sys.argv[1]))
def garbage(l):
    if '=' in l or '*' in l or re.match(r'^\s*[A-Z] [A-Za-z]{1,3}[vbz]', l): return True
    toks = l.split()
    return sum(1 for t in toks if re.fullmatch(r'[vbzcx]+', t)) > 4 or re.search(r'[vbz]{2}[A-Za-z]{0,3}[vbz]{2}', l) is not None
def join(lines):
    out = ''
    for l in lines:
        l = l.strip()
        if not l: continue
        if out.endswith('-') and l[:1].islower(): out = out[:-1] + l
        elif out: out += ' ' + l
        else: out = l
    return re.sub(r'\s+', ' ', out).strip()
def italian_col(raw):
    # bilingual hymn lines: Latin left, Italian right (gap of 3+ spaces)
    s = raw.rstrip()
    m = re.match(r'^\s*(\S.*?\S)\s{3,}(\S.*)$', s)
    return m.group(2) if m else s.strip()
def hymn(lines):
    bil = sum(1 for l in lines if re.match(r'^\s*\S.*?\S\s{3,}\S', l)) > 3
    ls = [italian_col(l) if bil else l.strip() for l in lines]
    # stanzas start with "n." or "n "
    stanzas, cur = [], []
    for l in ls:
        if re.match(r'^\d+[. ]', l) and cur: stanzas.append(cur); cur = []
        cur.append(l)
    if cur: stanzas.append(cur)
    res = []
    for st in stanzas:
        if any(' / ' in x or x.endswith('/') for x in st) or not bil and len(st) <= 3 and len(join(st)) > 60:
            res.append(join(st))
        else:
            res.append(' / '.join(x.strip() for x in st))
    return '\n'.join(re.sub(r'^(\d+)\s', r'\1. ', re.sub(r'\s*/\s*/\s*', ' / ', r)) for r in res)
def invoc(lines):
    ls = [l.strip() for l in lines if l.strip()]
    intro, resp, items = [], None, []
    i = 0
    while i < len(ls) and not re.match(r'^[-+] ?', ls[i]): intro.append(ls[i]); i += 1
    k = next((j for j, l in enumerate(intro) if l.endswith(':')), None)
    if k is not None and k < len(intro) - 2:
        # response printed without the dash, right after the introduction
        rest = intro[k+2:]; resp0 = intro[k+1]; intro = intro[:k+1]
        ls = intro + ['- ' + resp0] + rest + ls[i:]; i = len(intro)
    if i < len(ls):
        r = [ls[i][1:].strip()]; i += 1
        while i < len(ls) and ls[i][:1].islower(): r.append(ls[i]); i += 1
        resp = join(r)
    pet, ans, mode = [], [], 'p'
    for l in ls[i:]:
        if l.startswith('-'):
            mode = 'a'; ans.append(l[1:].strip()); continue
        if mode == 'a' and l[:1].islower(): ans.append(l); continue
        if mode == 'a':
            items.append({'petition': join(pet), 'answer': join(ans)}); pet, ans, mode = [], [], 'p'
        pet.append(l)
        if l.endswith('+'):
            items.append({'petition': join(pet).rstrip('+ ').strip(), 'answer': ''}); pet = []
    if pet or ans: items.append({'petition': join(pet), 'answer': join(ans)})
    items = [x for x in items if x['petition'] or x['answer']]
    return {'intro': join(intro), 'response': resp or '', 'intercessions': items}
out = []
for c in C:
    d = {'id': c['id'], 'titolo': c['titolo'], 'pagine': f"pp. {c['pagine'][0]}-{c['pagine'][1]}", 'note': [n for n in c['note'] if not n.startswith('Nel Tempo')], 'parti': {}}
    pend = next((n for n in c['note'] if n.startswith('Nel Tempo')), None)
    for k, vs in c['parti'].items():
        lst = []
        for j, v in enumerate(vs):
            lines = [l for l in v['righe'] if not garbage(l)]
            rub = v['rubrica']
            if j == 0 and k == 'inno' and pend and not rub: rub = pend
            e = {'rubrica': rub.rstrip(':').strip() if rub else None}
            if rub and re.search(r'[Pp]asqu', rub) and 'fuori' not in rub: e['tp'] = True
            if k == 'inno': e['it'] = hymn(lines) if lines else None
            elif k == 'invocazioni': e['it'] = invoc(lines) if lines else None
            else: e['it'] = join(lines) or None
            if v.get('rif'): e['rif'] = re.sub(r'\s+', ' ', v['rif'])
            lst.append(e)
        d['parti'][k] = lst
    out.append(d)
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
