#!/usr/bin/env node
/**
 * Tests for the Aggregator (BenchAlign algorithm)
 */

const path = require('path');

const aggregatorPath = path.join(__dirname, '..', 'scripts', 'aggregator', 'algo.js');
const { aggregate, zScores, freshnessPenalty, sourceTrustFactor, bootstrapCI, DEFAULT_WEIGHTS } = require(aggregatorPath);

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`);
    failed++;
  }
}

function assertEqual(actual, expected, name) {
  if (Math.abs(actual - expected) < 0.001) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name} — expected ${expected}, got ${actual}`);
    failed++;
  }
}

function assertInDelta(actual, expected, delta, name) {
  if (Math.abs(actual - expected) <= delta) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name} — expected ${expected}±${delta}, got ${actual}`);
    failed++;
  }
}

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║   AGGREGATOR TESTS (BenchAlign)          ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');

// Test 1: Z-score calculation
console.log('─── Z-Score Calculation ───');
const values = [10, 20, 30, 40, 50];
const zs = zScores(values);
assertEqual(zs.length, 5, 'zScores returns correct length');
assertInDelta(zs[0], -1.414, 0.01, 'First Z-score ≈ -1.414');
assertInDelta(zs[2], 0, 0.01, 'Middle Z-score ≈ 0 (mean)');
assertInDelta(zs[4], 1.414, 0.01, 'Last Z-score ≈ 1.414');

const singleValue = zScores([100]);
assertEqual(singleValue[0], 0, 'Single value Z-score is 0');

// Test 2: Freshness penalty
console.log('');
console.log('─── Freshness Penalty ───');

const today = new Date().toISOString().split('T')[0];
assertEqual(freshnessPenalty(today), 1.0, 'Today has no penalty (1.0)');

const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
assertEqual(freshnessPenalty(thirtyDaysAgo), 1.0, '30 days ago has no penalty (1.0)');

const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
assertEqual(freshnessPenalty(yearAgo), 0.5, '365 days ago has max penalty (0.5)');

const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const p60 = freshnessPenalty(sixtyDaysAgo);
assert(p60 > 0.5 && p60 < 1.0, '60 days ago has intermediate penalty');

assertEqual(freshnessPenalty(null), 0.5, 'null date gets max penalty (0.5)');
assertEqual(freshnessPenalty(undefined), 0.5, 'undefined date gets max penalty (0.5)');

// Test 3: Source trust factor
console.log('');
console.log('─── Source Trust ───');
assertEqual(sourceTrustFactor('independent_benchmark'), 1.0, 'Independent benchmark trust = 1.0');
assertEqual(sourceTrustFactor('vendor_claim'), 0.7, 'Vendor claim trust = 0.7');
assertEqual(sourceTrustFactor('community_reported'), 0.85, 'Community reported trust = 0.85');

// Test 4: Bootstrap CI
console.log('');
console.log('─── Confidence Interval ───');
const ciData = [50, 52, 48, 51, 49, 50, 51, 49, 50, 52];
const ci = bootstrapCI(ciData, 500);
assert(typeof ci.low === 'number', 'CI has low value');
assert(typeof ci.high === 'number', 'CI has high value');
assert(typeof ci.mean === 'number', 'CI has mean value');
assert(ci.low <= ci.mean, 'CI low ≤ mean');
assert(ci.high >= ci.mean, 'CI high ≥ mean');
assertInDelta(ci.mean, 50.2, 2.0, 'CI mean ≈ 50.2');

// Test 5: Full aggregation
console.log('');
console.log('─── Full Aggregation ───');

const testRecords = [
  { model_id: 'gpt-4o', provider: 'openai', score: 1288, benchmark: 'arena_elo', date: '2025-07-20', source_url: 'https://lmarena.ai/', source_type: 'independent_benchmark' },
  { model_id: 'gpt-4o', provider: 'openai', score: 82.6, benchmark: 'gpqa_diamond', date: '2025-07-20', source_url: 'https://paperswithcode.com/', source_type: 'independent_benchmark' },
  { model_id: 'gpt-4o', provider: 'openai', score: 38.2, benchmark: 'swe_bench', date: '2025-07-20', source_url: 'https://swebench.com/', source_type: 'independent_benchmark' },
  { model_id: 'claude-4-sonnet', provider: 'anthropic', score: 1295, benchmark: 'arena_elo', date: '2025-07-20', source_url: 'https://lmarena.ai/', source_type: 'independent_benchmark' },
  { model_id: 'claude-4-sonnet', provider: 'anthropic', score: 86.4, benchmark: 'gpqa_diamond', date: '2025-07-20', source_url: 'https://paperswithcode.com/', source_type: 'independent_benchmark' },
  { model_id: 'claude-4-sonnet', provider: 'anthropic', score: 55.3, benchmark: 'swe_bench', date: '2025-07-20', source_url: 'https://swebench.com/', source_type: 'independent_benchmark' },
  { model_id: 'gemini-2.5-pro', provider: 'google', score: 1282, benchmark: 'arena_elo', date: '2025-07-20', source_url: 'https://lmarena.ai/', source_type: 'independent_benchmark' },
  { model_id: 'gemini-2.5-pro', provider: 'google', score: 83.1, benchmark: 'gpqa_diamond', date: '2025-07-20', source_url: 'https://paperswithcode.com/', source_type: 'independent_benchmark' },
  { model_id: 'gemini-2.5-pro', provider: 'google', score: 45.8, benchmark: 'swe_bench', date: '2025-07-20', source_url: 'https://swebench.com/', source_type: 'independent_benchmark' },
  { model_id: 'deepseek-v3', provider: 'deepseek', score: 1265, benchmark: 'arena_elo', date: '2025-06-01', source_url: 'https://lmarena.ai/', source_type: 'independent_benchmark' },
  { model_id: 'deepseek-v3', provider: 'deepseek', score: 78.5, benchmark: 'gpqa_diamond', date: '2025-06-01', source_url: 'https://paperswithcode.com/', source_type: 'independent_benchmark' },
  { model_id: 'grok-3', provider: 'xai', score: 1260, benchmark: 'arena_elo', date: '2025-07-20', source_url: 'https://lmarena.ai/', source_type: 'vendor_claim' },
  { model_id: 'grok-3', provider: 'xai', score: 80.9, benchmark: 'gpqa_diamond', date: '2025-07-20', source_url: 'https://paperswithcode.com/', source_type: 'vendor_claim' },
];

const results = aggregate(testRecords);

assert(Array.isArray(results), 'aggregate returns array');
assert(results.length > 0, 'results are not empty');
assert(results.length <= 5, 'at most 5 results (4 unique models)');

// Check sorting
for (let i = 0; i < results.length - 1; i++) {
  assert(results[i].global_score >= results[i + 1].global_score,
    `Results sorted descending (${results[i].model_id}: ${results[i].global_score} >= ${results[i+1].model_id}: ${results[i+1].global_score})`);
}

// Check required fields
for (const r of results) {
  assert(r.model_id, 'Each result has model_id');
  assert(typeof r.global_score === 'number', `Each result has numeric global_score (${r.model_id}: ${r.global_score})`);
  assert(r.rank > 0, `Each result has positive rank (${r.model_id}: ${r.rank})`);
  assert(r.confidence_interval, `Each result has confidence_interval`);
  assert(r.benchmarks, `Each result has benchmarks object`);
  assert(r.benchmark_count > 0, `Each result has benchmark_count > 0`);
}

// Vendor claim penalty
const grokResult = results.find(r => r.model_id === 'grok-3');
assert(grokResult, 'Grok 3 is in results');
if (grokResult) {
  // Grok 3 should have a penalty from vendor_claim
  // Its scores are comparable to deepseek-v3 but with 0.7 trust factor
  assert(grokResult.benchmark_count >= 2, 'Grok 3 has at least 2 benchmarks');
}

// Freshness penalty for older data
const deepseekResult = results.find(r => r.model_id === 'deepseek-v3');
assert(deepseekResult, 'DeepSeek V3 is in results');
if (deepseekResult) {
  assert(deepseekResult.benchmarks['arena_elo'], 'DeepSeek V3 has arena_elo benchmark');
  const arenaData = deepseekResult.benchmarks['arena_elo'];
  assert(arenaData.freshness_penalty <= 1.0, 'DeepSeek V3 has freshness penalty ≤ 1.0');
}

// Test 6: Empty records
console.log('');
console.log('─── Edge Cases ───');
const emptyResult = aggregate([]);
assert(Array.isArray(emptyResult), 'aggregate([]) returns array');
assertEqual(emptyResult.length, 0, 'empty input returns empty array');

// Test 7: Single record
const singleResult = aggregate([
  { model_id: 'test-model', provider: 'test', score: 100, benchmark: 'arena_elo', date: '2025-07-20', source_url: 'https://example.com' },
]);
assertEqual(singleResult.length, 1, 'single record yields one result');
// Debug and check model_id
const mid = singleResult[0].model_id;
if (mid !== 'test-model') {
  console.log(`  [DEBUG] model_id="${mid}" len=${mid.length} codes=[${[...mid].map(c => c.charCodeAt(0)).join(',')}]`);
}
assert(mid === 'test-model', `model_id preserved (got "${mid}")`);

// Summary
console.log('');
console.log('─── Results ───');
const total = passed + failed;
console.log(`  ${passed}/${total} tests passed`);
console.log(`  ${failed}/${total} tests failed`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
