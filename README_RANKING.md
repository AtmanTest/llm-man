# 🏆 LLM Ranking — Methodology

This document describes the methodology used to compute the **LLM Ranking** displayed on [LLM Man](https://atmantest.github.io/llm-man/). The ranking aggregates scores from multiple public benchmarks into a single **global score** and **rank** for each model.

---

## 📊 Benchmarks & Sources

The ranking currently aggregates **7 benchmarks** from **7 sources**:

| Benchmark | Source | Weight | Description |
|-----------|--------|--------|-------------|
| **GPQA Diamond** | [gpqa-diamond](https://github.com/idavidrein/gpqa/) | 25% | Graduate-level PhD reasoning questions |
| **Arena ELO** | [LMSYS Chatbot Arena](https://chat.lmsys.org/) | 20% | Crowd-sourced human preference ELO rating |
| **SWE-bench** | [SWE-bench](https://www.swebench.com/) | 20% | Real-world software engineering issue resolution |
| **HLE (Humanity's Last Exam)** | [HLE](https://lastexam.ai/) | 15% | Extremely hard expert-level questions |
| **AIME** | [AIME (MAA)](https://maa.org/math-competitions/american-invitational-mathematics-examination) | 10% | American Invitational Mathematics Examination |
| **LiveBench** | [LiveBench](https://livebench.ai/) | 5% | Contamination-free, regularly updated benchmark |
| **MMLU-Pro** | [MMLU-Pro](https://github.com/hendrycks/test) | 5% | Massive Multitask Language Understanding (extended) |

> **Note:** Weights sum to 100%. Benchmarks with wider score distributions and higher signal-to-noise ratios receive higher weights. The weighting is reviewed quarterly.

---

## 🧮 Algorithm

### 1. Score Normalization (Z-score)

Each benchmark score is converted to a **z-score** relative to all models that have data for that benchmark:

```
z_i = (x_i - μ) / σ
```

Where:
- `x_i` = raw score of model i
- `μ` = mean score across all models for that benchmark
- `σ` = standard deviation across all models for that benchmark

### 2. Confidence Intervals

For models with data from **multiple benchmarks**, we compute a **95% confidence interval** using the bootstrap method (1000 resamples). The CI reflects uncertainty in the global score estimate.

- **Low CI:** 2.5th percentile of bootstrap distribution
- **High CI:** 97.5th percentile
- **Mean:** Mean of bootstrap distribution

For models with only **one benchmark**, the CI is tighter and reflects only the measurement uncertainty.

### 3. Freshness & Source Trust

Each data point includes:
- **Freshness penalty:** 1.0 (current) → decays linearly to 0.5 after 90 days. Data older than 180 days is excluded.
- **Source trust:** 1.0 for official benchmarks, 0.8 for third-party evaluations.

### 4. Global Score

The global score is a **weighted composite** of benchmark z-scores, rescaled to a 0–100 scale for readability:

```
global_score = 50 + 15 × Σ(w_i × z_i) / Σ(w_i)
```

This means:
- **Score = 50 → Average model**
- **Score > 60 → Top-tier model**
- **Score < 40 → Below average**

### 5. Ranking

Models are sorted by **global_score** descending. Tie-breaking uses:
1. Number of benchmarks covered (more is better)
2. Average z-score

---

## 🔄 Pipeline

The ranking is updated **daily at 06:00 UTC** via GitHub Actions.

```
Scripts/pipeline.js
  ├── scripts/fetcher/    → Fetch raw data from each source
  ├── scripts/normalizer/ → Normalize scores, compute z-scores
  ├── scripts/aggregator/ → Compute global scores and confidence intervals
  ├── scripts/validator/  → Sanity checks on output
  └── scripts/renderer/   → Build final JSON for the frontend
```

### Output Files

| File | Description |
|------|-------------|
| `public/data/llm-ranking.json` | Full ranking data (used by the frontend) |
| `public/data/llm-ranking.min.json` | Minified version for faster loading |
| `data/processed/llm-history.jsonl` | Daily snapshots for historical trend charts |

---

## 🖥️ Running Locally

### Prerequisites

- Node.js 22+
- npm

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/atmantest/llm-man.git
cd llm-man

# 2. Install dependencies
cd scripts
npm install

# 3. Run the pipeline
node pipeline.js

# 4. View the output
cat ../public/data/llm-ranking.json | head -50
```

### Dry Run (No Data Modified)

```bash
DRY_RUN=true node pipeline.js
```

### Run Individual Stages

```bash
# Fetch only
node scripts/fetcher/arena.js

# Validate only
node scripts/validator/sanity.js ../public/data/llm-ranking.json
```

---

## 📈 Interpreting the Chart

The **Historical Trend** chart shows the global score of selected models over time.

- Each line represents one model
- Points are daily snapshots
- Hover to see exact values
- Toggle models on/off by clicking the legend
- Use the date range filter to zoom in/out

**Trend arrows** next to each model in the table show:
- **↑** Score increased in the last 7 days
- **↓** Score decreased in the last 7 days
- **→** Score stable (±0.5 points)

---

## ⚠️ Limitations

1. **Not all models have all benchmarks** — models with more benchmarks have more reliable scores (shown by narrower confidence intervals).
2. **Benchmark scores can change** as models are updated or benchmark datasets evolve.
3. **Arena ELO** is a preference-based metric and may not correlate perfectly with factual accuracy.
4. **The ranking is a snapshot** — run-to-run variation is normal (±1–3 points).
5. **New models take time to appear** in benchmarks. Recent releases may be missing.

---

## 📜 License

The ranking data is provided under the same license as the main repository. Benchmark data belongs to the respective benchmark owners.

---

## 🤝 Contributing

- **Add a new benchmark source:** Open a PR in `scripts/fetcher/`
- **Report an issue:** File a GitHub issue with the tag `ranking`
- **Suggest weight changes:** Open a discussion with your reasoning and evidence

---

*Last updated: 2026-07-24*
