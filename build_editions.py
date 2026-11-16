#!/usr/bin/env python3
"""Fabrique les éditions de Mon Budget à partir du dossier src/ (même code, réglages différents)."""
import json, re, shutil, pathlib
ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
EDITIONS = {
  # dossier : (réglages de l'édition, préfixe du cache hors connexion)
  'v2':           (dict(name='Budget_GFib',  key='mon-budget-v2', drive='data-v2',    file='Mon Budget v2 - données.json', token='mon-budget-gtoken',   v1=True),  'mon-budget-v2-'),
  'Budget_GFib':  (dict(name='Budget_GFib',  key='mon-budget-v2', drive='data-v2',    file='Mon Budget v2 - données.json', token='mon-budget-gtoken',   v1=True),  'budget-gfib-'),
  'Budget_BHoff': (dict(name='Budget_BHoff', key='budget-bhoff',  drive='data-bhoff', file='Budget_BHoff - données.json',  token='budget-bhoff-gtoken', v1=False), 'budget-bhoff-'),
}
VERSION = (ROOT / 'VERSION').read_text().strip()
for folder, (ed, prefix) in EDITIONS.items():
    out = ROOT / folder
    out.mkdir(exist_ok=True)
    for f in ['app.js', 'views.js', 'sync.js']:
        shutil.copy(SRC / f, out / f)
    (out / 'edition.js').write_text('/* Réglages de cette édition (le reste du code est commun) */\nwindow.EDITION = ' + json.dumps(ed, ensure_ascii=False) + ';\n', encoding='utf-8')
    html = (SRC / 'index.html').read_text(encoding='utf-8')
    html = re.sub(r'<title>.*?</title>', f"<title>{ed['name']}</title>", html, count=1)
    html = re.sub(r'(name="apple-mobile-web-app-title" content=")[^"]*', r'\g<1>' + ed['name'], html, count=1)
    if 'edition.js' not in html:
        html = html.replace('<script src="../config.js"></script>', '<script src="../config.js"></script>\n<script src="edition.js"></script>', 1)
    assert 'edition.js' in html
    (out / 'index.html').write_text(html, encoding='utf-8')
    man = json.loads((SRC / 'manifest.webmanifest').read_text(encoding='utf-8'))
    man['name'] = man['short_name'] = ed['name']
    man['description'] = 'Budget personnel : comptes, échéances, carte différée, classement automatique. Données sur votre appareil et dans votre Google Drive.'
    (out / 'manifest.webmanifest').write_text(json.dumps(man, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    sw = (SRC / 'sw.js').read_text(encoding='utf-8')
    sw = re.sub(r"const CACHE = '[^']*';", f"const CACHE = '{prefix}{VERSION}';", sw, count=1)
    sw = re.sub(r"k\.startsWith\('[^']*'\)", f"k.startsWith('{prefix}')", sw, count=1)
    if "'./edition.js'" not in sw:
        sw = sw.replace("'./app.js', ", "'./edition.js', './app.js', ", 1)
    assert f"'{prefix}" in sw and "'./edition.js'" in sw
    (out / 'sw.js').write_text(sw, encoding='utf-8')
    print('ok', folder, ed['name'], prefix + VERSION)
