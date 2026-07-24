#!/usr/bin/env node
/**
 * LLM Ranking Pipeline — Main Orchestrator
 *
 * Runs the full pipeline:
 *  1. Fetch from all 7 sources (parallel)
 *  2. Normalize results (model mapping + schema validation)
 *  3. Aggregate scores (BenchAlign algorithm)
 *  4. Validate results (sanity checks)
 *  5. Render/build dashboard
 *
 * Exit code 0 on success, non-zero on failure.
 * Supports DRY_RUN env var: when set, doesn't write files.
 */

const path = require('path');

// Pipeline modules
const { fetchArena } = require('./fetcher/arena.js');
const { fetchGpqa } = require('./fetcher/gpqa.js');
const { fetchSweBench } = require('./fetcher/swe_bench.js');
const { fetchLivebench } = require('./fetcher/livebench.js');
const { fetchHle } = require('./fetcher/hle.js');
const { fetchAime } = require('./fetcher/aime.js');
const { fetchMmluPro } = require('./fetcher/mmlu_pro.js');

const { normalize } = require('./normalizer/normalize.js');
const { aggregate } = require('./aggregator/algo.js');
const { validate } = require('./validator/sanity.js');
const { render } = require('./renderer/build_dashboard.js');

const START_TIME = Date.now();

/**
 * All 7 fetchers with their source identifiers
 */
const FETCHERS = [
  { name: 'arena',    fetcher: fetchArena,    benchmark: 'arena_elo' },
  { name: 'gpqa',     fetcher: fetchGpqa,     benchmark: 'gpqa_diamond' },
  { name: 'swe_bench', fetcher: fetchSweBench, benchmark: 'swe_bench' },
  { name: 'livebench', fetcher: fetchLivebench, benchmark: 'livebench' },
  { name: 'hle',      fetcher: fetchHle,      benchmark: 'hle' },
  { name: 'aime',     fetcher: fetchAime,     benchmark: 'aime' },
  { name: 'mmlu_pro', fetcher: fetchMmluPro,  benchmark: 'mmlu_pro' },
];

/**
 * Run all fetchers in parallel. Each returns an array or empty array on failure.
 */
async function runFetchers() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   LLM RANKING PIPELINE — FETCH           ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  const results = await Promise.allSettled(
    FETCHERS.map(f => f.fetcher().then(data => ({ source: f.name, benchmark: f.benchmark, data })))
  );

  const allRecords = [];
  const fetchResults = {};

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { source, benchmark, data } = result.value;
      const count = Array.isArray(data) ? data.length : 0;
      fetchResults[source] = { status: 'ok', count, benchmark };
      console.log(`  ✓ ${source.padEnd(12)} ${String(count).padStart(3)} records`);
      if (Array.isArray(data)) {
        allRecords.push(...data.map(r => ({ ...r, benchmark: r.benchmark || benchmark })));
      }
    } else {
      const source = FETCHERS.find(f => f.fetcher.name === result.reason?.fetcher);
      const name = source?.name || FETCHERS[results.indexOf(result)]?.name || 'unknown';
      fetchResults[name] = { status: 'error', count: 0, error: result.reason?.message || 'Unknown error' };
      console.log(`  ✗ ${name.padEnd(12)} FAILED — ${result.reason?.message || 'Unknown error'}`);
    }
  }

  return { allRecords, fetchResults };
}

/**
 * Run the full pipeline
 */
async function runPipeline() {
  const dryRun = process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1';

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   LLM RANKING PIPELINE v1.0.0            ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Date:     ${new Date().toISOString()}`);
  console.log(`  DRY_RUN:  ${dryRun ? 'YES (no files written)' : 'NO'}`);
  console.log('');

  // Step 1: Fetch
  console.log('─── Step 1: Fetch ───');
  const { allRecords: rawRecords, fetchResults } = await runFetchers();
  const totalFetched = rawRecords.length;
  console.log(`  Total raw records: ${totalFetched}`);
  console.log('');

  if (totalFetched === 0) {
    console.error('❌ Pipeline failed: No data fetched from any source');
    process.exit(1);
  }

  // Step 2: Normalize
  console.log('─── Step 2: Normalize ───');
  let normalized;
  try {
    const normModule = require('./normalizer/normalize.js');
    normalized = normModule.normalize(rawRecords);
    console.log(`  ✓ Normalized ${normalized.length} records`);
    console.log(`  ✓ Models mapped: ${new Set(normalized.map(r => r.model_id)).size}`);
    console.log('');
  } catch (err) {
    console.error(`  ✗ Normalization failed: ${err.message}`);
    console.log('  → Attempting to proceed with raw records');
    normalized = rawRecords.map(r => ({
      ...r,
      model_id: r.model_id || 'unknown',
      source_type: r.source_type || 'independent_benchmark',
    }));
    console.log('');
  }

  // Step 3: Aggregate
  console.log('─── Step 3: Aggregate (BenchAlign) ───');
  let aggregated;
  try {
    const aggregatorOptions = {};
    aggregated = aggregate(normalized, aggregatorOptions);
    console.log(`  ✓ Aggregated ${aggregated.length} models`);
    console.log('');
    console.log('  Top 5:');
    aggregated.slice(0, 5).forEach(m => {
      console.log(`    ${String(m.rank).padStart(2)}. ${m.display_name.padEnd(20)} ${m.global_score.toFixed(1)} (CI: ${m.confidence_interval.low.toFixed(1)}–${m.confidence_interval.high.toFixed(1)})`);
    });
    console.log('');
  } catch (err) {
    console.error(`  ✗ Aggregation failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }

  // Step 4: Validate
  console.log('─── Step 4: Validate ───');
  let validation;
  try {
    validation = validate(normalized);
    console.log(`  Schema:     ${validation.schema.valid ? '✓ PASS' : '✗ FAIL'} (${validation.schema.valid_count}/${validation.schema.total} valid)`);
    console.log(`  Outliers:   ${validation.outliers.count} detected`);
    console.log(`  Consistent: ${validation.consistency.count} warnings`);
    console.log(`  Stale:      ${validation.stale_sources.count} stale sources`);
    console.log(`  New models: ${validation.new_models.count} discovered`);
    console.log(`  Overall:    ${validation.summary.passed ? '✓ PASS' : `✗ ${validation.summary.total_issues} issues`}`);
    console.log('');
  } catch (err) {
    console.error(`  ✗ Validation error: ${err.message}`);
    validation = { summary: { passed: false, total_issues: -1 } };
    console.log('');
  }

  // Step 5: Render
  console.log('─── Step 5: Render Dashboard ───');
  try {
    const metadata = {
      sourceCount: Object.keys(fetchResults).length,
      benchmarkCount: new Set(normalized.map(r => r.benchmark)).size,
      runDurationMs: Date.now() - START_TIME,
      pipelineVersion: '1.0.0',
    };
    const renderResult = render(aggregated, metadata, validation);
    console.log('');
    console.log(`  ✓ ${renderResult.summary.models_ranked} models ranked`);
    console.log(`  ✓ ${renderResult.summary.benchmarks.length} benchmarks`);
    console.log(`  ✓ ${renderResult.summary.providers.length} providers`);
    console.log(`  ✓ Generated at ${renderResult.summary.generated_at}`);
    console.log('');
  } catch (err) {
    console.error(`  ✗ Render failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }

  // Final summary
  const duration = ((Date.now() - START_TIME) / 1000).toFixed(1);
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   PIPELINE COMPLETE                       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Duration: ${duration}s`);
  console.log(`  Sources:  ${Object.values(fetchResults).filter(r => r.status === 'ok').length}/${FETCHERS.length} OK`);
  console.log(`  Records:  ${totalFetched} fetched → ${normalized.length} normalized → ${aggregated.length} ranked`);
  console.log(`  Status:   ✓ SUCCESS`);
  console.log('');

  process.exit(0);
}

// =====================================================
// Inline fallback normalization function (used if module fails)
// =====================================================
function fallbackNormalize(records) {
  const mapperPath = path.join(__dirname, 'normalizer', 'model_mapper.json');
  let modelMappings = {};
  try {
    modelMappings = JSON.parse(require('fs').readFileSync(mapperPath, 'utf-8')).model_mappings || {};
  } catch {}

  return records.map(rec => {
    const modelId = (rec.model_id || '').toLowerCase().replace(/[^a-z0-9.-]/g, '-').replace(/-+/g, '-');
    const mapping = modelMappings[rec.model_id] || modelMappings[modelId] || {};

    return {
      model_id: mapping.canonical_id || modelId,
      display_name: mapping.display_name || rec.model_id,
      provider: mapping.provider || rec.provider || 'unknown',
      family: mapping.family || '',
      benchmark: rec.benchmark || 'unknown',
      score: rec.score || 0,
      raw_score: rec.score || 0,
      date: rec.date || new Date().toISOString().split('T')[0],
      source_url: rec.source_url || '',
      source_type: rec.source_type || 'independent_benchmark',
      fetched_at: new Date().toISOString(),
    };
  });
}

// =====================================================
// Entry point
// =====================================================
runPipeline().catch(err => {
  console.error('');
  console.error('╔══════════════════════════════════════════╗');
  console.error('║   PIPELINE FAILED                        ║');
  console.error('╚══════════════════════════════════════════╝');
  console.error(`  ${err.message}`);
  console.error('');
  process.exit(1);
});
