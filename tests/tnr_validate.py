#!/usr/bin/env python3
"""TNR — Test de Non-Régression pour LLM Man.
Valide l'intégrité du site avant chaque push.
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

# ── 1. Duplicate functions ──
for fn in ["esc", "renderExams", "renderTicker", "loadNews", "renderNews",
           "renderOutils", "renderCours", "startExam", "finishExam"]:
    count = len(re.findall(rf"function {fn}\(", content))
    if count > 1:
        errors.append(f"[DUPLICATE] function {fn}() defined {count}x")

# ── 2. Required init calls ──
required_calls = ["renderOutils()", "renderExams()", "loadNews()", "renderCours()"]
for call in required_calls:
    count = content.count(call)
    if count == 0:
        errors.append(f"[MISSING] {call} not called on init")
    elif count > 1:
        warnings.append(f"[WARN] {call} called {count}x")

# ── 3. All sections exist ──
sections = ["sec-accueil", "sec-cours", "sec-chat", "sec-examens",
            "sec-outils", "sec-forum", "sec-news", "sec-glossaire"]
for s in sections:
    if s not in content:
        errors.append(f"[MISSING] Section #{s} not found")

# ── 4. Exam questions format (object access, not array) ──
# Questions should use {q, options, correct} not [q, options, correctIndex]
if "q.q" not in content:
    errors.append("[EXAM] Question renderer missing q.q access")
if "q.options" not in content:
    errors.append("[EXAM] Question renderer missing q.options access")
if "q.correct" not in content:
    errors.append("[EXAM] Question renderer missing q.correct access")

# ── 5. Ticker replaces top-news ──
if "news-ticker-wrap" not in content:
    errors.append("[TICKER] Missing .news-ticker-wrap CSS")
if "renderTicker" not in content:
    errors.append("[TICKER] Missing renderTicker() function")
if "ticker-scroll" not in content:
    errors.append("[TICKER] Missing @keyframes ticker-scroll")
if ".top-news" in content:
    warnings.append("[TICKER] Old .top-news CSS still present (safe to keep)")
if "top-news-list" in content:
    errors.append("[TICKER] Old #top-news-list ID still present")

# ── 6. News JSON file exists ──
news_path = os.path.join(repo_root, "news.json")
if os.path.exists(news_path):
    try:
        with open(news_path) as f:
            nd = json.load(f)
        if not nd.get("articles"):
            warnings.append("[NEWS] news.json has no articles")
    except:
        warnings.append("[NEWS] news.json invalid JSON")
else:
    errors.append("[NEWS] news.json missing")

# ── 7. External question files exist ──
for qf in ["questions_ctfl.js", "questions_ctai.js", "questions_ctgenai.js"]:
    qp = os.path.join(repo_root, qf)
    if not os.path.exists(qp):
        warnings.append(f"[EXAM] {qf} missing (optional — questions in index.html)")

# ── 8. Exam objects have time/pass ──
if 'time:60, pass:26' not in content:
    errors.append("[EXAM] Missing time/pass in exam objects")

# ── 9. Nav order: News after Accueil ──
nav_order = re.findall(r'data-nav="(\w+)"', content)
if len(nav_order) >= 2:
    # Find position of 'accueil' and 'news' in nav
    try:
        acc_idx = nav_order.index("accueil")
        news_idx = nav_order.index("news")
        if news_idx < acc_idx:
            errors.append("[NAV] News appears BEFORE Accueil (wrong order)")
        elif news_idx == acc_idx + 1:
            pass  # correct order
    except ValueError:
        errors.append("[NAV] Missing accueil or news in nav")

# ── 10. Ticker blue color + position ──
if "color: var(--blue)" not in content:
    errors.append("[TICKER] News items not blue (missing color: var(--blue))")
if "background: var(--blue)" not in content:
    errors.append("[TICKER] Ticker dots not blue (missing background: var(--blue))")
if "position: sticky" not in content and ".news-ticker-wrap" in content:
    ticker_css = re.search(r'\.news-ticker-wrap\{[^}]+\}', content)
    if ticker_css and "sticky" not in ticker_css.group():
        errors.append("[TICKER] Ticker not sticky (missing position: sticky)")
if "animation: ticker-scroll 70s" not in content:
    warnings.append("[TICKER] Animation speed not 70s (check if changed intentionally)")
if 'data-nav="accueil"' in content and '<main>' in content:
    nav_idx = content.find('</nav>')
    main_idx = content.find('<main>')
    ticker_idx = content.find('id="news-ticker"')
    if nav_idx > 0 and main_idx > 0 and ticker_idx > 0:
        if not (nav_idx < ticker_idx < main_idx):
            errors.append("[TICKER] Ticker not positioned between </nav> and <main>")

# ── 11. Stats ──
question_count = len(re.findall(r"\{q:'", content))
print(f"📊 Questions totales: {question_count}")
print(f"📄 Fichier: {len(content):,} octets, {content.count(chr(10))} lignes")

# ── Results ──
if errors:
    print(f"\n❌ TNR FAILED — {len(errors)} erreur(s) à corriger:")
    for e in errors:
        print(f"   {e}")
    if warnings:
        print(f"\n⚠️  {len(warnings)} avertissement(s):")
        for w in warnings:
            print(f"   {w}")
    sys.exit(1)
else:
    print(f"\n✅ TNR PASSED — 0 erreurs")
    if warnings:
        print(f"⚠️  {len(warnings)} avertissement(s):")
        for w in warnings:
            print(f"   {w}")
    sys.exit(0)
