#!/usr/bin/env node
/**
 * Tests for the Normalizer module
 */

const path = require('path');

// Load the normalizer module
const normalizerPath = path.join(__dirname, '..', 'scripts', 'normalizer', 'normalize.js');
const { normalize, normalizeRecord, mapModelId, loadMapper } = require(normalizerPath);

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
    console.log(`  ✗ ${name} — expected "${expected}", got "${actual}"`);
    failed++;
  }
}

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║   NORMALIZER TESTS                       ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');

// Test 1: Load mapper
console.log('─── Load Mapper ───');
const mapper = loadMapper();
assert(typeof mapper === 'object' && mapper !== null, 'Mapper loaded as object');
assert(Object.keys(mapper).length > 50, `Mapper has ${Object.keys(mapper).length} entries (>= 50)`);

// Test 2: mapModelId
console.log('');
console.log('─── Model Mapping ───');

const tests = [
  { input: 'gpt-4o', expected: 'gpt-4o' },
  { input: 'gpt-4o-2024-05-13', expected: 'gpt-4o' },
  { input: 'claude-3-5-sonnet-20240620', expected: 'claude-3.5-sonnet' },
  { input: 'claude-3.5-sonnet', expected: 'claude-3.5-sonnet' },
  { input: 'gemini-2.5-pro-preview-05-06', expected: 'gemini-2.5-pro' },
  { input: 'DeepSeek V3', expected: 'deepseek-v3' },
  { input: 'DeepSeek R1', expected: 'deepseek-r1' },
  { input: 'Grok 3', expected: 'grok-3' },
  { input: 'Mistral Large', expected: 'mistral-large' },
  { input: 'Qwen 3', expected: 'qwen-3' },
  { input: 'gpt-4.5-preview', expected: 'gpt-4.5' },
  { input: 'claude-4-sonnet', expected: 'claude-4-sonnet' },
  { input: 'llama-4', expected: 'llama-4' },
];

for (const { input, expected } of tests) {
  const mapping = mapModelId(input, mapper);
  assertEqual(mapping?.canonical_id, expected, `mapModelId("${input}") → "${expected}"`);
}

// Test 3: normalizeRecord
console.log('');
console.log('─── Record Normalization ───');

const record = normalizeRecord({
  model_id: 'gpt-4o-2024-05-13',
  provider: 'openai',
  score: 1288,
  benchmark: 'arena_elo',
  date: '2025-06-15',
  source_url: 'https://lmarena.ai/leaderboard/',
}, mapper);

assertEqual(record.model_id, 'gpt-4o', 'model_id mapped to canonical gpt-4o');
assertEqual(record.display_name, 'GPT-4o', 'display_name set to GPT-4o');
assertEqual(record.provider, 'openai', 'provider is openai');
assertEqual(record.family, 'gpt-4', 'family is gpt-4');
assertEqual(record.benchmark, 'arena_elo', 'benchmark preserved');
assertEqual(record.score, 1288, 'score preserved');
assertEqual(record.date, '2025-06-15', 'date preserved');
assert(record.fetched_at, 'fetched_at timestamp set');

// Test 4: Unmapped model
console.log('');
console.log('─── Unmapped Model ───');

const unknownRecord = normalizeRecord({
  model_id: 'brand-new-model-v99',
  provider: 'acme-corp',
  score: 95.5,
  benchmark: 'mmlu_pro',
  date: '2025-07-01',
  source_url: 'https://example.com',
}, mapper);

assertEqual(unknownRecord.model_id, 'brand-new-model-v99', 'unknown model passes through as-is');
assertEqual(unknownRecord.provider, 'acme-corp', 'provider preserved for unknown model');

// Test 5: Empty records
console.log('');
console.log('─── Edge Cases ───');

const emptyResult = normalize([]);
assert(Array.isArray(emptyResult), 'normalize([]) returns array');
assertEqual(emptyResult.length, 0, 'empty array returns empty array');

const nullResult = normalize(null);
assert(Array.isArray(nullResult), 'normalize(null) returns array');
assertEqual(nullResult.length, 0, 'null returns empty array');

// Test 6: Missing fields
const partialRecord = normalizeRecord({
  score: 42,
  benchmark: 'aime',
}, mapper);

assertEqual(partialRecord.model_id, 'unknown', 'no model_id defaults to "unknown"');
assertEqual(partialRecord.provider, 'unknown', 'no provider defaults to "unknown"');
assert(partialRecord.source_url === '', 'no source_url defaults to empty string');
assert(partialRecord.date, 'date is set even when missing');

// Summary
console.log('');
console.log('─── Results ───');
const total = passed + failed;
console.log(`  ${passed}/${total} tests passed`);
console.log(`  ${failed}/${total} tests failed`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
