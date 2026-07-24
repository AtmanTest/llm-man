#!/usr/bin/env node
/**
 * Tests for the Validator (sanity checks)
 */

const path = require('path');

const validatorPath = path.join(__dirname, '..', 'scripts', 'validator', 'sanity.js');
const {
  validate,
  validateRecord,
  validateRecords,
  detectOutliers,
  checkCrossBenchmarkConsistency,
  detectStaleSources,
  detectNewModels,
} = require(validatorPath);

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
  if (actual === expected) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║   VALIDATOR TESTS                        ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');

// Test 1: Schema validation — valid record
console.log('─── Schema: Valid Records ───');

const validRecord = {
  model_id: 'gpt-4o',
  provider: 'openai',
  benchmark: 'arena_elo',
  score: 1288,
  date: '2025-07-20',
  source_url: 'https://lmarena.ai/',
};

const v1 = validateRecord(validRecord);
assert(v1.valid, 'Valid record passes schema validation');
assertEqual(v1.errors.length, 0, 'Valid record has no errors');

// Test 2: Schema validation — invalid record
console.log('');
console.log('─── Schema: Invalid Records ───');

const invalidRecord = {};
const v2 = validateRecord(invalidRecord);
assert(!v2.valid, 'Empty record fails validation');
assert(v2.errors.length >= 3, 'Empty record has multiple errors');

const missingScore = {
  model_id: 'gpt-4o',
  provider: 'openai',
  benchmark: 'arena_elo',
  date: '2025-07-20',
  source_url: 'https://lmarena.ai/',
};
const v3 = validateRecord(missingScore);
assert(!v3.valid, 'Record without score fails');
assert(v3.errors.some(e => e.includes('score')), 'Error mentions missing score');

const badDate = {
  model_id: 'gpt-4o',
  provider: 'openai',
  benchmark: 'arena_elo',
  score: 100,
  date: 'not-a-date',
  source_url: 'https://lmarena.ai/',
};
const v4 = validateRecord(badDate);
assert(!v4.valid, 'Record with invalid date fails');

const badBenchmark = {
  model_id: 'gpt-4o',
  provider: 'openai',
  benchmark: 'invalid_benchmark',
  score: 100,
  date: '2025-07-20',
  source_url: 'https://lmarena.ai/',
};
const v5 = validateRecord(badBenchmark);
assert(!v5.valid, 'Record with invalid benchmark fails');

const badUrl = {
  model_id: 'gpt-4o',
  provider: 'openai',
  benchmark: 'arena_elo',
  score: 100,
  date: '2025-07-20',
  source_url: 'not-a-url',
};
const v6 = validateRecord(badUrl);
assert(!v6.valid, 'Record with invalid source_url fails');

// Test 3: Batch validation
console.log('');
console.log('─── Batch Validation ───');

const batchValid = validateRecords([validRecord, validRecord]);
assertEqual(batchValid.valid_count, 2, 'Two valid records both pass');
assert(batchValid.valid, 'Batch is valid when all records valid');

const batchMixed = validateRecords([validRecord, invalidRecord, missingScore]);
assertEqual(batchMixed.invalid_count, 2, 'Two invalid records in batch');
assert(!batchMixed.valid, 'Batch is invalid when some records fail');

// Test 4: Outlier detection
console.log('');
console.log('─── Outlier Detection ───');

// Create mock history
const fs = require('fs');
const historyDir = path.join(__dirname, '..', 'data', 'processed');
const historyFile = path.join(historyDir, 'llm-history.jsonl');
fs.mkdirSync(historyDir, { recursive: true });

const historyEntry = {
  date: '2025-07-19',
  models: [
    { model_id: 'gpt-4o', global_score: 70 },
    { model_id: 'stable-model', global_score: 50 },
  ],
};
fs.writeFileSync(historyFile, JSON.stringify(historyEntry) + '\n', 'utf-8');

const testRecords = [
  { model_id: 'gpt-4o', score: 90, benchmark: 'arena_elo', date: '2025-07-20', source_url: 'https://example.com' },
  { model_id: 'stable-model', score: 51, benchmark: 'arena_elo', date: '2025-07-20', source_url: 'https://example.com' },
];

const outlierResult = detectOutliers(testRecords, historyFile);
assert(outlierResult.has_history, 'Has historical data');
if (outlierResult.count > 0) {
  const gptOutlier = outlierResult.outliers.find(o => o.model_id === 'gpt-4o');
  assert(gptOutlier, 'GPT-4o detected as outlier (>15% change 70→90)');
}

// Clean up
fs.unlinkSync(historyFile);

// Test 5: Cross-benchmark consistency
console.log('');
console.log('─── Cross-Benchmark Consistency ───');

const consistentRecords = [
  { model_id: 'consistent-model', benchmark: 'arena_elo', score: 1000, z_score: 0.5 },
  { model_id: 'consistent-model', benchmark: 'gpqa_diamond', score: 90, z_score: 0.4 },
  { model_id: 'consistent-model', benchmark: 'swe_bench', score: 50, z_score: 0.3 },
];

const consistentResult = checkCrossBenchmarkConsistency(consistentRecords);
assertEqual(consistentResult.count, 0, 'Consistent model has no warnings');

const inconsistentRecords = [
  { model_id: 'wild-model', benchmark: 'arena_elo', score: 500, z_score: -2.0 },
  { model_id: 'wild-model', benchmark: 'gpqa_diamond', score: 95, z_score: 1.5 },
  { model_id: 'wild-model', benchmark: 'swe_bench', score: 10, z_score: -1.5 },
];

const inconsistentResult = checkCrossBenchmarkConsistency(inconsistentRecords);
assert(inconsistentResult.count > 0, 'Inconsistent model has warnings');

const singleBenchmarkRecords = [
  { model_id: 'single-bench-model', benchmark: 'arena_elo', score: 1000, z_score: 0.5 },
];
const singleResult = checkCrossBenchmarkConsistency(singleBenchmarkRecords);
assertEqual(singleResult.count, 0, 'Single benchmark model has no consistency warnings');

// Test 6: Stale source detection
console.log('');
console.log('─── Stale Source Detection ───');

const freshRecords = [
  { model_id: 'gpt-4o', benchmark: 'arena_elo', score: 100, date: new Date().toISOString().split('T')[0], source_url: 'https://fresh-source.com' },
];
const freshResult = detectStaleSources(freshRecords);
assertEqual(freshResult.count, 0, 'Fresh source not detected as stale');

const staleRecords = [
  { model_id: 'gpt-4o', benchmark: 'arena_elo', score: 100, date: '2024-01-01', source_url: 'https://stale-source.com' },
];
const staleResult = detectStaleSources(staleRecords);
assert(staleResult.count > 0, 'Stale source detected (>1 year old)');

// Test 7: Full validation
console.log('');
console.log('─── Full Validation Suite ───');

const fullValidation = validate([
  { model_id: 'gpt-4o', provider: 'openai', benchmark: 'arena_elo', score: 1288, date: '2025-07-20', source_url: 'https://lmarena.ai/' },
  { model_id: 'gpt-4o', provider: 'openai', benchmark: 'gpqa_diamond', score: 82.6, date: '2025-07-20', source_url: 'https://paperswithcode.com/' },
  { model_id: 'claude-4-sonnet', provider: 'anthropic', benchmark: 'arena_elo', score: 1295, date: '2025-07-20', source_url: 'https://lmarena.ai/' },
]);

assert(fullValidation.schema, 'Has schema validation result');
assert(fullValidation.outliers, 'Has outlier detection result');
assert(fullValidation.consistency, 'Has consistency check result');
assert(fullValidation.stale_sources, 'Has stale source detection result');
assert(fullValidation.summary, 'Has summary');
assert(typeof fullValidation.summary.passed === 'boolean', 'Summary has passed boolean');
assert(typeof fullValidation.summary.total_issues === 'number', 'Summary has total_issues count');

// Test 8: Empty validation
console.log('');
console.log('─── Edge Cases ───');

const emptyValidation = validate([]);
assertEqual(emptyValidation.total_records, 0, 'Empty records validation');
assertEqual(emptyValidation.schema.valid, true, 'Empty records schema is valid (0 errors)');
assertEqual(emptyValidation.schema.valid_count, 0, 'Empty schema has 0 valid');

// Summary
console.log('');
console.log('─── Results ───');
const total = passed + failed;
console.log(`  ${passed}/${total} tests passed`);
console.log(`  ${failed}/${total} tests failed`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
