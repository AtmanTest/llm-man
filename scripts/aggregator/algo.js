#!/usr/bin/env node
/**
 * BenchAlign Aggregator
 * Implements the BenchAlign-like algorithm for multi-benchmark LLM ranking.
 *
 * Features:
 * - Z-score normalization per benchmark
 * - Weighted averaging with configurable weights
 * - Freshness penalty (>30 days)
 * - Source trust penalty (vendor_claim = 0.7 factor)
 * - Confidence interval calculation (95% CI via bootstrap)
 * - Returns sorted array of models with global scores
 */

const fs = require('fs');
const path = require('path');

// =====================================================
// Default weights for BenchAlign (sum to 1.0)
// =====================================================
const DEFAULT_WEIGHTS = {
  gpqa_diamond: 0.25,
  swe_bench: 0.20,
  arena_elo: 0.20,
  hle: 0.15,
  aime: 0.10,
  livebench: 0.05,
  mmlu_pro: 0.05,
};

const DEFAULT_SOURCE_TRUST = {
  independent_benchmark: 1.0,
  community_reported: 0.85,
  vendor_claim: 0.70,
};

/**
 * Calculate Z-score for a set of values
 */
function zScores(values) {
  const n = values.length;
  if (n === 0) return [];
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance) || 1;
  return values.map(v => (v - mean) / std);
}

/**
 * Calculate freshness penalty factor
 * Scores >30 days old get penalized, scaling to 0.5 at 365 days
 */
function freshnessPenalty(dateStr) {
  if (!dateStr) return 0.5;
  const date = new Date(dateStr);
  const now = new Date();
  const daysOld = (now - date) / (1000 * 60 * 60 * 24);
  if (daysOld <= 30) return 1.0;
  // Linear decay from 1.0 at 30 days to 0.5 at 365 days
  return Math.max(0.5, 1.0 - (daysOld - 30) * 0.5 / 335);
}

/**
 * Calculate source trust factor
 */
function sourceTrustFactor(sourceType) {
  return DEFAULT_SOURCE_TRUST[sourceType] || DEFAULT_SOURCE_TRUST.community_reported;
}

/**
 * Bootstrap 95% confidence interval for mean
 */
function bootstrapCI(scores, iterations = 1000) {
  const n = scores.length;
  if (n < 2) return { low: scores[0] || 0, high: scores[0] || 0, mean: scores[0] || 0 };

  const means = [];
  for (let i = 0; i < iterations; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += scores[Math.floor(Math.random() * n)];
    }
    means.push(sum / n);
  }
  means.sort((a, b) => a - b);
  const low = means[Math.floor(iterations * 0.025)];
  const high = means[Math.floor(iterations * 0.975)];
  const mean = scores.reduce((a, b) => a + b, 0) / n;

  return { low, high, mean };
}

/**
 * Normalize scores across all models for each benchmark
 * Returns a map of benchmark -> { z_scores_map, raw_scores_map, mean, std }
 */
function normalizeByBenchmark(records) {
  const byBenchmark = {};
  for (const rec of records) {
    if (!byBenchmark[rec.benchmark]) byBenchmark[rec.benchmark] = [];
    byBenchmark[rec.benchmark].push(rec);
  }

  const result = {};
  for (const [benchmark, recs] of Object.entries(byBenchmark)) {
    const scores = recs.map(r => r.score);
    const zs = zScores(scores);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
    const std = Math.sqrt(variance) || 1;

    result[benchmark] = {
      zMap: {},
      rawMap: {},
      mean,
      std,
      count: scores.length,
    };

    recs.forEach((rec, i) => {
      result[benchmark].zMap[rec.model_id] = zs[i];
      result[benchmark].rawMap[rec.model_id] = rec.score;
    });
  }

  return result;
}

/**
 * Aggregate scores using BenchAlign algorithm
 *
 * @param {Array} normalizedRecords - Array of normalized {model_id, benchmark, score, date, source_type, ...}
 * @param {Object} options
 * @param {Object} options.weights - Custom weights per benchmark
 * @param {number} options.freshnessWeight - Weight of freshness factor (0-1)
 * @returns {Array} Sorted array of {model_id, display_name, provider, family, global_score, confidence_interval, benchmarks}
 */
function aggregate(normalizedRecords, options = {}) {
  const weights = options.weights || DEFAULT_WEIGHTS;
  const freshnessWeight = options.freshnessWeight ?? 0.8;

  // Group by model_id, collecting all records
  const byModel = {};
  for (const rec of normalizedRecords) {
    if (!byModel[rec.model_id]) byModel[rec.model_id] = { records: [], meta: rec };
    byModel[rec.model_id].records.push(rec);
  }

  // Normalize per benchmark
  const normData = normalizeByBenchmark(normalizedRecords);

  // Calculate global score for each model
  const results = [];
  for (const [modelId, { records, meta }] of Object.entries(byModel)) {
    let totalWeight = 0;
    let weightedZ = 0;
    let adjustedScores = [];
    const perBenchmark = {};

    for (const rec of records) {
      const benchmark = rec.benchmark;
      const weight = weights[benchmark];
      if (!weight) continue;

      const z = normData[benchmark]?.zMap[modelId];
      if (z === undefined || z === null) continue;

      const fp = freshnessPenalty(rec.date);
      const st = sourceTrustFactor(rec.source_type || 'independent_benchmark');

      // Freshness weight applied to the weight
      const freshnessAdjustment = freshnessWeight * fp + (1 - freshnessWeight) * 1.0;
      const effectiveWeight = weight * freshnessAdjustment * st;

      weightedZ += z * effectiveWeight;
      totalWeight += effectiveWeight;

      perBenchmark[benchmark] = {
        raw_score: rec.raw_score || rec.score,
        z_score: z,
        weight: weight,
        effective_weight: effectiveWeight,
        freshness_penalty: fp,
        source_trust: st,
        score: rec.score,
        date: rec.date,
      };

      adjustedScores.push(z * effectiveWeight);
    }

    if (totalWeight === 0) continue;

    const globalZ = weightedZ / totalWeight;
    const ci = bootstrapCI(adjustedScores);

    // Convert Z-score to 0-100 scale for readability
    const globalScore = Math.round((globalZ * 15 + 50) * 10) / 10;

    results.push({
      model_id: modelId,
      display_name: meta.display_name || modelId,
      provider: meta.provider || 'unknown',
      family: meta.family || '',
      global_score: globalScore,
      global_z: Math.round(globalZ * 100) / 100,
      rank: 0, // will be set after sort
      confidence_interval: {
        low: Math.round((ci.low * 15 + 50) * 10) / 10,
        high: Math.round((ci.high * 15 + 50) * 10) / 10,
        mean: Math.round((ci.mean * 15 + 50) * 10) / 10,
      },
      benchmarks: perBenchmark,
      benchmark_count: Object.keys(perBenchmark).length,
    });
  }

  // Sort by global score descending
  results.sort((a, b) => b.global_score - a.global_score);

  // Assign ranks
  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  return results;
}

// =====================================================
// CLI support
// =====================================================
if (require.main === module) {
  const inputFile = process.argv[2];
  const weightsFile = process.argv[3];

  let records;
  if (inputFile) {
    records = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  } else {
    // Read from stdin
    let body = '';
    process.stdin.on('data', chunk => { body += chunk; });
    process.stdin.on('end', () => {
      records = JSON.parse(body);
      run(records);
    });
    return;
  }

  function run(records) {
    let options = {};
    if (weightsFile) {
      options.weights = JSON.parse(fs.readFileSync(weightsFile, 'utf-8'));
    }
    const results = aggregate(records, options);
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  }

  if (inputFile) run(records);
}

module.exports = { aggregate, DEFAULT_WEIGHTS, zScores, freshnessPenalty, sourceTrustFactor, bootstrapCI, normalizeByBenchmark };
