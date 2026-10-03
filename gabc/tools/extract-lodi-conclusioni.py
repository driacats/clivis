"""Estrae invocazioni e orazione di ogni giorno delle Lodi (settimane 1-4)
da sources/Lodi complete.2.pdf (pp. 1-176) in testi/lodi-conclusioni.json.

Uso: python3 gabc/tools/extract-lodi-conclusioni.py  (dalla radice del repo)
Richiede pdftotext (poppler)."""
import json, re, subprocess

PDF = 'sources/Lodi complete.2.pdf'
DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
FURNITURE = re.compile(r'\s*(\d+|PRIMA SETTIMANA|SECONDA SETTIMANA|TERZA SETTIMANA|QUARTA SETTIMANA|DOMENICA|LUNEDÌ|LUNEDI|'
                       r'MARTEDÌ|MERCOLEDÌ|GIOVEDÌ|VENERDÌ|SABATO)?\s*')
END = re.compile(r'(Per il nostro Signore|Per Cristo nostro Signore|Per Cristo|nei secoli dei secoli|Egli è Dio)[^.]*\.')

raw = subprocess.run(['pdftotext', '-f', '1', '-l', '176', PDF, '-'], capture_output=True, text=True, check=True).stdout
lines = []
for l in raw.replace('\f', '\n').split('\n'):
    if FURNITURE.fullmatch(l):
        continue
    lines.append(re.sub(r'(\w)\d+$', r'\1', l.rstrip()))  # page number glued to a hyphenated word

def join(ls):
    """Join wrapped lines, removing end-of-line hyphenation."""
    out = ''
    for l in ls:
        l = l.strip()
        if not out:
            out = l
        elif out.endswith('-') and not out.endswith(' -'):
            out = out[:-1] + l
        else:
            out += ' ' + l
    return out

def ends_sentence(s):
    return s.rstrip().endswith(('.', ',', ';', ':', '!', '?'))

text = '\n'.join(lines)
blocks = re.split(r'\nInvocazioni\n', text)[1:]
assert len(blocks) == 28, len(blocks)

result = []
for i, block in enumerate(blocks):
    week, day = i // 7 + 1, DAYS[i % 7]
    bl = block.split('\n')
    k = next(j for j, l in enumerate(bl) if l.startswith('Orazione'))
    inv, rest = bl[:k], bl[k:]

    # invocations: intro lines, "- response", then (petition, - answer) pairs
    r = next(j for j, l in enumerate(inv) if l.startswith('- '))
    intro = join(inv[:r])
    j = r + 1
    response_lines = [inv[r][2:]]
    while j < len(inv) and not ends_sentence(response_lines[-1]) and not inv[j].startswith('- '):
        response_lines.append(inv[j]); j += 1
    pairs, a, b = [], [], None
    for l in inv[j:]:
        if l.startswith('- '):
            b = [l[2:]]
            pairs.append((a, b)); a = []
        elif b is not None and not a and (b[-1].endswith('-') or not ends_sentence(b[-1])):
            b.append(l)
        else:
            a.append(l)
    intercessions = [{'petition': join(p), 'answer': join(q)} for p, q in pairs]

    if 'Proprio' in rest[0]:
        oration = None
    else:
        body = []
        for l in rest[1:]:
            body.append(l)
            if END.search(join(body)):
                break
        oration = join(body)[:END.search(join(body)).end()]

    result.append({'week': week, 'day': day,
                   'invocazioni': {'intro': intro, 'response': join(response_lines), 'intercessions': intercessions},
                   'orazione': oration})


# --- correzioni a mano: refusi del PDF e invocazioni che pdftotext ha unito ---
def pair(p, a):
    return {'petition': p, 'answer': a}

def day_of(week, day):
    return next(e for e in result if e['week'] == week and e['day'] == day)

def replace_text(entry, old, new):
    s = json.dumps(entry, ensure_ascii=False)
    assert old in s, old
    entry.clear(); entry.update(json.loads(s.replace(old, new)))

replace_text(day_of(1, 'Domenica'), 'gior no', 'giorno')
replace_text(day_of(1, 'Venerdì'), 'igno-ranza', 'ignoranza')
replace_text(day_of(2, 'Domenica'), 'che e disceso', 'che è disceso')
replace_text(day_of(3, 'Domenica'), 'Pente coste', 'Pentecoste')
replace_text(day_of(4, 'Lunedì'), 'collabo riamo', 'collaboriamo')
day_of(4, 'Lunedì')['orazione'] = day_of(4, 'Lunedì')['orazione'].split('Per il nostro Signore')[0] + 'Per il nostro Signore.'

day_of(1, 'Mercoledì')['invocazioni']['intercessions'][2:] = [
    pair('Insegnaci a riconoscerti in tutti gli uomini,', 'e soprattutto nei poveri e sofferenti.'),
    pair('Donaci di vivere in pace con tutti,', 'e di non rendere a nessuno male per male.')]
day_of(2, 'Mercoledì')['invocazioni']['intercessions'][2:] = [
    pair('Fa’ che viviamo il tempo che ci dai, come un dono della tua bontà', 'per divenire il sale della terra e la luce del mondo.'),
    pair('Il tuo Spirito orienti i nostri pensieri e le nostre parole,', 'perché rimaniamo sempre nel tuo amore e nella tua lode.')]
day_of(4, 'Mercoledì')['invocazioni']['intercessions'][2:] = [
    pair('Concedi a noi di rimanere sempre nel tuo amore,', 'per non essere divisi gli uni dagli altri.'),
    pair('Donaci fortezza nella tentazione e costanza nella prova,', 'e fa’ che ti rendiamo grazie nella prosperità.')]
day_of(4, 'Domenica')['invocazioni']['intercessions'][:3] = [
    pair('Benedetto sii tu, Re dell’universo, che ci hai tratto dalle tenebre dell’errore e del peccato alla splendida luce del tuo regno,',
         'e ci hai chiamati a servirti nella santa Chiesa.'),
    pair('Tu che ci hai aperto le braccia della tua misericordia,', 'non permettere che deviamo mai dal sentiero della vita.'),
    pair('Concedici di trascorrere in letizia questo giorno,', 'in cui celebriamo la risurrezione del tuo Figlio.')]
replace_text(day_of(4, 'Domenica'), 'Dona ai tuoi fedeli, lo spirito', 'Dona ai tuoi fedeli lo spirito')

with open('testi/lodi-conclusioni.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=1)
print('ok', len(result))
