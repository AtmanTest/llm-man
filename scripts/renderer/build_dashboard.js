#!/usr/bin/env node
/**
 * Dashboard Renderer — Builds the LLM Ranking dashboard data files
 *
 * Generates:
 * - public/data/llm-ranking.json (current snapshot for the frontend)
 * - data/processed/llm-history.jsonl (append new day's data)
 *
 * Returns summary of what was generated
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data');
const HISTORY_DIR = path.join(__dirname, '..', '..', 'data', 'processed');
const HISTORY_FILE = path.join(HISTORY_DIR, 'llm-history.jsonl');
const RANKING_FILE = path.join(PUBLIC_DATA_DIR, 'llm-ranking.json');

/**
 * Build the ranking dashboard data
 *
 * @param {Array} aggregatedResults - Results from the aggregator (sorted, with global scores)
 * @param {Object} metadata - Pipeline run metadata
 * @param {Object} validationResults - Results from the validator
 * @returns {Object} The generated dashboard data
 */
function buildDashboard(aggregatedResults, metadata = {}, validationResults = null) {
  // Build the snapshot
  const snapshot = {
    schema_version: '1.0',
    generated_at: new Date().toISOString(),
    metadata: {
      source_count: metadata.sourceCount || 0,
      benchmark_count: metadata.benchmarkCount || 0,
      model_count: aggregatedResults.length,
      run_duration_ms: metadata.runDurationMs || 0,
      pipeline_version: metadata.pipelineVersion || '1.0.0',
      date: new Date().toISOString().split('T')[0],
    },
    rankings: aggregatedResults.map(model => ({
      rank: model.rank,
      model_id: model.model_id,
      display_name: model.display_name,
      provider: model.provider,
      family: model.family || undefined,
      global_score: model.global_score,
      global_z: model.global_z,
      confidence_interval: model.confidence_interval,
      benchmark_count: model.benchmark_count,
      benchmarks: model.benchmarks,
      score_breakdown: Object.entries(model.benchmarks || {}).reduce((acc, [bench, data]) => {
        acc[bench] = {
          score: data.score,
          z_score: data.z_score,
          weight: data.weight,
          date: data.date,
        };
        return acc;
      }, {}),
    })),
    benchmarks_meta: getBenchmarkMeta(aggregatedResults),
    providers: getProviderSummary(aggregatedResults),
    validation: validationResults ? {
      passed: validationResults.summary?.passed ?? true,
      total_issues: validationResults.summary?.total_issues ?? 0,
      outliers: validationResults.outliers?.count ?? 0,
      stale_sources: validationResults.stale_sources?.count ?? 0,
      new_models: validationResults.new_models?.count ?? 0,
    } : undefined,
  };

  return snapshot;
}

/**
 * Get metadata about which benchmarks were used and how many models per benchmark
 */
function getBenchmarkMeta(aggregatedResults) {
  const benchmarkCounts = {};
  const benchmarkWeights = {};

  for (const model of aggregatedResults) {
    if (!model.benchmarks) continue;
    for (const [bench, data] of Object.entries(model.benchmarks)) {
      if (!benchmarkCounts[bench]) {
        benchmarkCounts[bench] = { count: 0, total_score: 0, scores: [] };
        benchmarkWeights[bench] = data.weight || 0;
      }
      benchmarkCounts[bench].count++;
      benchmarkCounts[bench].total_score += data.score;
      benchmarkCounts[bench].scores.push(data.score);
    }
  }

  const meta = {};
  for (const [bench, info] of Object.entries(benchmarkCounts)) {
    const mean = info.total_score / info.count;
    const variance = info.scores.reduce((a, s) => a + (s - mean) ** 2, 0) / info.count;
    meta[bench] = {
      model_count: info.count,
      avg_score: Math.round(mean * 100) / 100,
      std_dev: Math.round(Math.sqrt(variance) * 100) / 100,
      weight: benchmarkWeights[bench],
    };
  }

  return meta;
}

/**
 * Get a summary of providers
 */
function getProviderSummary(aggregatedResults) {
  const providers = {};
  for (const model of aggregatedResults) {
    const prov = model.provider || 'unknown';
    if (!providers[prov]) {
      providers[prov] = { count: 0, models: [], avg_score: 0, total_score: 0 };
    }
    providers[prov].count++;
    providers[prov].models.push(model.model_id);
    providers[prov].total_score += model.global_score;
  }

  for (const [prov, info] of Object.entries(providers)) {
    info.avg_score = Math.round((info.total_score / info.count) * 100) / 100;
    delete info.total_score;
  }

  return providers;
}

/**
 * Write all output files. If DRY_RUN env var is set, don't write.
 */
function writeOutput(snapshot, dryRun = false) {
  const results = {
    ranking_file: null,
    ranking_size: 0,
    history_file: null,
    history_appended: 0,
    dry_run: dryRun,
  };

  if (dryRun) {
    console.log('[renderer] DRY RUN — would write:');
    console.log(`  ${RANKING_FILE} (${JSON.stringify(snapshot).length} bytes)`);
    console.log(`  ${HISTORY_FILE} (append 1 entry)`);
    return results;
  }

  // Ensure directories exist
  fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  fs.mkdirSync(HISTORY_DIR, { recursive: true });

  // Write current snapshot
  const rankingJson = JSON.stringify(snapshot, null, 2);
  fs.writeFileSync(RANKING_FILE, rankingJson, 'utf-8');
  results.ranking_file = RANKING_FILE;
  results.ranking_size = rankingJson.length;

  // Append to history
  const historyEntry = {
    date: snapshot.metadata.date,
    generated_at: snapshot.generated_at,
    model_count: snapshot.rankings.length,
    top_models: snapshot.rankings.slice(0, 10).map(m => ({
      rank: m.rank,
      model_id: m.model_id,
      global_score: m.global_score,
    })),
    validation_passed: snapshot.validation?.passed ?? true,
    total_issues: snapshot.validation?.total_issues ?? 0,
  };

  fs.appendFileSync(HISTORY_FILE, JSON.stringify(historyEntry) + '\n', 'utf-8');
  results.history_file = HISTORY_FILE;
  results.history_appended = 1;

  // Also save a compact version for faster frontend loading
  const compactFile = path.join(PUBLIC_DATA_DIR, 'llm-ranking.min.json');
  fs.writeFileSync(compactFile, JSON.stringify(snapshot), 'utf-8');

  return results;
}

/**
 * Full render pipeline
 */
function render(aggregatedResults, metadata = {}, validationResults = null) {
  console.log('[renderer] ===== Building Dashboard =====');

  const dryRun = process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1';

  const snapshot = buildDashboard(aggregatedResults, metadata, validationResults);
  const output = writeOutput(snapshot, dryRun);

  console.log(`[renderer] Dashboard built successfully`);
  console.log(`[renderer] Models ranked: ${snapshot.rankings.length}`);
  console.log(`[renderer] Benchmarks: ${Object.keys(snapshot.benchmarks_meta).length}`);
  console.log(`[renderer] Providers: ${Object.keys(snapshot.providers).length}`);

  if (output.dry_run) {
    console.log('[renderer] DRY RUN — files not written');
  } else {
    console.log(`[renderer] Wrote ${output.ranking_file}`);
    console.log(`[renderer] Appended to ${output.history_file}`);
  }

  return {
    snapshot,
    output,
    summary: {
      models_ranked: snapshot.rankings.length,
      benchmarks: Object.keys(snapshot.benchmarks_meta),
      providers: Object.keys(snapshot.providers),
      generated_at: snapshot.generated_at,
      files_written: !output.dry_run,
    },
  };
}

// =====================================================
// CLI
// =====================================================
if (require.main === module) {
  const inputFile = process.argv[2];

  if (!inputFile) {
    console.error('Usage: node build_dashboard.js <aggregated-results.json> [metadata.json] [validation.json]');
    process.exit(1);
  }

  try {
    const results = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    let metadata = {};
    let validation = null;

    if (process.argv[3]) {
      metadata = JSON.parse(fs.readFileSync(process.argv[3], 'utf-8'));
    }
    if (process.argv[4]) {
      validation = JSON.parse(fs.readFileSync(process.argv[4], 'utf-8'));
    }

    const result = render(results, metadata, validation);
    console.log(JSON.stringify(result.summary, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { render, buildDashboard, writeOutput };
