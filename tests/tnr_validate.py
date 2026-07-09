#!/usr/bin/env python3
"""TNR — Test de Non-Régression pour LLM Man.
Valide l'intégralité du site avant chaque push — CSS, JS, layout, données.
Usage: python3 tests/tnr_validate.py
Exit code: 0 = PASS, 1 = FAIL
"""

import re
import sys
import json
import os

errors = []
warnings = []

repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html_path = os.path.join(repo_root, "index.html")

with open(html_path) as f:
    content = f.read()


def css_block(name):
    """Extrait le bloc CSS d'un sélecteur (contenu entre les premières {})."""
    m = re.search(rf'{re.escape(name)}\s*\{{([^}}]+)}}', content)
    return m.group(1) if m else ''


def get_prop(css, prop):
    """Extrait la valeur d'une propriété CSS dans un bloc.
    Utilise un lookbehind pour éviter les faux positifs (ex: 'top' dans 'border-top')."""
    m = re.search(rf'(?<![-\w]){re.escape(prop)}\s*:\s*([^;]+)', css)
    return m.group(1).strip() if m else None


# ═══════════════════════════════════════════════
# 1.  DUPLICATE FUNCTIONS
# ═══════════════════════════════════════════════
for fn in ["esc", "renderExams", "renderTicker", "loadNews", "renderNews",
           "renderOutils", "renderCours", "startExam", "finishExam",
           "renderChat", "sendChatMsg", "renderForum", "postForumMsg"]:
    count = len(re.findall(rf"function {fn}\(\s*\)", content))
    if count > 1:
        errors.append(f"[DUP] function {fn}() defined {count}x")

# ═══════════════════════════════════════════════
# 2.  REQUIRED INIT CALLS
# ═══════════════════════════════════════════════
required_calls = ["renderOutils()", "renderExams()", "loadNews()", "renderCours()"]
for call in required_calls:
    count = content.count(call)
    if count == 0:
        errors.append(f"[MISSING] {call} not called on init")

# ═══════════════════════════════════════════════
# 3.  ALL SECTIONS EXIST
# ═══════════════════════════════════════════════
sections = ["sec-accueil", "sec-cours", "sec-chat", "sec-examens",
            "sec-outils", "sec-forum", "sec-news", "sec-glossaire"]
for s in sections:
    if s not in content:
        errors.append(f"[MISSING] Section #{s} not found")

# ═══════════════════════════════════════════════
# 4.  EXAM QUESTION FORMAT (object, not array)
# ═══════════════════════════════════════════════
for key in ['q.q', 'q.options', 'q.correct']:
    if key not in content:
        errors.append(f"[EXAM] Missing {key} in question renderer")

# ═══════════════════════════════════════════════
# 5.  NAV: ordered correctly
# ═══════════════════════════════════════════════
nav_order = re.findall(r'data-nav="(\w+)"', content)
# Deduplicate while preserving order — brand link may duplicate accueil
seen = set()
nav_unique = []
for item in nav_order:
    if item not in seen:
        seen.add(item)
        nav_unique.append(item)
nav_order = nav_unique

if len(nav_order) >= 2:
    try:
        acc_idx = nav_order.index("accueil")
        news_idx = nav_order.index("news")
        if news_idx < acc_idx:
            errors.append("[NAV] News appears BEFORE Accueil")

        # Verify Accueil → News are adjacent
        if news_idx != acc_idx + 1:
            between = nav_order[acc_idx + 1:news_idx]
            if between:
                warnings.append(f"[NAV] Items between Accueil and News: {between}")

        # Check no section is missing from nav
        expected_order = ["accueil", "news", "cours", "chat", "examens", "outils", "forum", "glossaire"]
        encountered = [it for it in nav_order if it in expected_order]
        for i, (expected, actual) in enumerate(zip(expected_order, encountered)):
            if expected != actual:
                warnings.append(f"[NAV] Order: expected '{expected}' at pos {i}, got '{actual}'")
                break
    except ValueError:
        errors.append("[NAV] Missing accueil or news in nav")

# ═══════════════════════════════════════════════
# 6.  NAV STACKING (nav must be ABOVE ticker)
# ═══════════════════════════════════════════════
nav_css = css_block('nav')
nav_zi = get_prop(nav_css, 'z-index')
if nav_zi is None:
    errors.append("[LAYOUT] nav has no z-index")
elif not nav_zi.isdigit() or int(nav_zi) < 100:
    errors.append(f"[LAYOUT] nav z-index is {nav_zi}, expected ≥ 100")
nav_top = get_prop(nav_css, 'position')
if nav_top != 'fixed':
    errors.append("[LAYOUT] nav position is not fixed")
nav_fixed_prop = get_prop(nav_css, 'top')
if nav_fixed_prop != '0':
    errors.append(f"[LAYOUT] nav top is '{nav_fixed_prop}', expected '0'")

# ═══════════════════════════════════════════════
# 7.  TICKER STACKING (must be BELOW nav)
# ═══════════════════════════════════════════════
ticker_css = css_block('.news-ticker-wrap')
if not ticker_css:
    errors.append("[TICKER] .news-ticker-wrap CSS block not found")
else:
    ticker_pos = get_prop(ticker_css, 'position')
    if ticker_pos != 'sticky':
        errors.append(f"[TICKER] position is '{ticker_pos}', expected 'sticky'")

    ticker_top = get_prop(ticker_css, 'top')
    expected_top = 'var(--nav-h)'
    if ticker_top != expected_top:
        errors.append(f"[TICKER] top is '{ticker_top}', expected '{expected_top}' — ticker was overlapping nav!")

    ticker_zi = get_prop(ticker_css, 'z-index')
    if ticker_zi is None:
        errors.append("[TICKER] Missing z-index (prevents overlay on nav)")
    elif ticker_zi.isdigit():
        tzi = int(ticker_zi)
        if tzi > 99:
            errors.append(f"[TICKER] z-index is {ticker_zi}, must be ≤ 49 to stay below nav")
        elif tzi > 60 and tzi < 100:
            warnings.append(f"[TICKER] z-index {ticker_zi} is risky — nav is ~100")

    ticker_height = get_prop(ticker_css, 'height')
    if ticker_height and ticker_height != '42px':
        warnings.append(f"[TICKER] height is '{ticker_height}', expected '42px'")

# ═══════════════════════════════════════════════
# 8.  MAIN PADDING (must account for nav + ticker)
# ═══════════════════════════════════════════════
main_css = css_block('main')
if not main_css:
    errors.append("[LAYOUT] main CSS block not found")
else:
    main_pt = get_prop(main_css, 'padding-top')
    expected_pt = 'calc(var(--nav-h) + 42px)'
    if main_pt != expected_pt:
        errors.append(f"[LAYOUT] main padding-top is '{main_pt}', expected '{expected_pt}' — content hidden behind ticker!")

# ═══════════════════════════════════════════════
# 9.  TICKER IN HTML: between </nav> and <main>
# ═══════════════════════════════════════════════
nav_close = content.find('</nav>')
main_open = content.find('<main')
ticker_id = content.find('id="news-ticker"')
if nav_close > 0 and main_open > 0 and ticker_id > 0:
    if not (nav_close < ticker_id < main_open):
        errors.append("[TICKER] HTML: ticker not positioned between </nav> and <main>")
else:
    if ticker_id < 0:
        errors.append("[TICKER] id='news-ticker' not found in HTML")

# ═══════════════════════════════════════════════
# 10. TICKER: blue color, animation, label
# ═══════════════════════════════════════════════
if "color: var(--blue)" not in content:
    errors.append("[TICKER] Missing color: var(--blue) on ticker items")
if "background: var(--blue)" not in content:
    errors.append("[TICKER] Missing background: var(--blue) on ticker dots")
if "animation: ticker-scroll 70s" not in content:
    warnings.append("[TICKER] Animation speed not 70s")

# Check label exists
if '📰 FLASH IA' not in content:
    errors.append("[TICKER] Missing label '📰 FLASH IA'")

# ═══════════════════════════════════════════════
# 11. NEWS JSON
# ═══════════════════════════════════════════════
news_path = os.path.join(repo_root, "news.json")
if os.path.exists(news_path):
    try:
        with open(news_path) as f:
            nd = json.load(f)
        arts = nd.get("articles", [])
        if not arts:
            warnings.append("[NEWS] news.json has no articles")
        else:
            for idx, art in enumerate(arts):
                if not all(k in art for k in ("title", "url", "source")):
                    warnings.append(f"[NEWS] Article {idx} missing title/url/source")
                elif not art["url"].startswith("http"):
                    warnings.append(f"[NEWS] Article {idx} url not absolute: {art['url']}")
    except Exception as e:
        warnings.append(f"[NEWS] news.json parse error: {e}")
else:
    errors.append("[NEWS] news.json missing")

# ═══════════════════════════════════════════════
# 12. EXAM CONSISTENCY
# ═══════════════════════════════════════════════
# Each exam object must have: time, pass, title, questions array
exam_pattern = re.findall(r'\{\s*title:\s*["\'](.*?)["\'].*?time:\s*(\d+).*?pass:\s*(\d+).*?questions:', content[:60000])
for title, time_str, pass_str in exam_pattern:
    t = int(time_str)
    p = int(pass_str)
    if t != 60:
        warnings.append(f"[EXAM] '{title}' time={t}, expected 60")
    if p != 26:
        warnings.append(f"[EXAM] '{title}' pass={p}, expected 26")

if 'time:60, pass:26' not in content:
    errors.append("[EXAM] Missing time:60, pass:26 in any exam object")

# ═══════════════════════════════════════════════
# 13. QUESTION COUNT (minimum 40)
# ═══════════════════════════════════════════════
question_count = len(re.findall(r"\{q:\s*['\"]", content))
if question_count < 40:
    errors.append(f"[EXAM] Only {question_count} questions found, expected ≥ 40")

# ═══════════════════════════════════════════════
# 14. RENDER FUNCTION EXISTS
# ═══════════════════════════════════════════════
required_functions = [
    ("renderTicker", "renderTicker()"),
    ("loadNews", "loadNews()"),
    ("renderExams", "renderExams()"),
    ("startExam", "startExam()"),
    ("renderCours", "renderCours()"),
    ("renderOutils", "renderOutils()"),
    ("renderChat", "renderChat()"),
    ("sendChatMsg", "sendChatMsg()"),
    ("saveNvidiaKey", "saveNvidiaKey()"),
    ("renderForum", "renderForum()"),
    ("postForumMsg", "postForumMsg()"),
    ("likeForumPost", "likeForumPost()"),
]
for fn_name, fn_sig in required_functions:
    if f"function {fn_name}(" not in content:
        errors.append(f"[JS] Missing function {fn_name}()")

# ═══════════════════════════════════════════════
# 15. HERO SECTION EXISTS
# ═══════════════════════════════════════════════
if '.hero' not in content:
    errors.append("[LAYOUT] Missing .hero CSS class")
if 'hero-badge' not in content:
    errors.append("[LAYOUT] Missing hero badge")

# ═══════════════════════════════════════════════
# 16. THEME TOGGLE EXISTS
# ═══════════════════════════════════════════════
if '#theme-toggle' not in content:
    errors.append("[UI] Missing #theme-toggle button")

# ═══════════════════════════════════════════════
# STATS
# ═══════════════════════════════════════════════
print(f"📊 Questions: {question_count}")
print(f"📄 Fichier: {len(content):,} octets, {content.count(chr(10))} lignes")
print(f"🔗 Liens nav: {len(nav_order)}")

# ═══════════════════════════════════════════════
# RESULTS
# ═══════════════════════════════════════════════
if errors:
    print(f"\n❌ TNR FAILED — {len(errors)} erreur(s) à corriger:")
    for e in errors:
        print(f"   • {e}")
    if warnings:
        print(f"\n⚠️  {len(warnings)} avertissement(s):")
        for w in warnings:
            print(f"   • {w}")
    sys.exit(1)
else:
    print(f"\n✅ TNR PASSED — 0 erreurs")
    if warnings:
        print(f"⚠️  {len(warnings)} avertissement(s):")
        for w in warnings:
            print(f"   • {w}")
    sys.exit(0)
