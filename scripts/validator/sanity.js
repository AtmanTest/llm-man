#!/usr/bin/env node
/**
 * LLM Ranking Validator — Sanity checks for pipeline data
 *
 * Validates:
 * - Schema compliance (against normalizer/schema.json)
 * - Outliers (>15% daily change from historical data)
 * - Cross-benchmark consistency
 * - Stale source detection (>7 days without update)
 * - New model detection (not in existing registry)
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '..', 'normalizer', 'schema.json');
const HISTORY_PATH = path.join(__dirname, '..', '..', 'data', 'processed', 'llm-history.jsonl');
const MODEL_MAPPER_PATH = path.join(__dirname, '..', 'normalizer', 'model_mapper.json');

// =====================================================
// Schema Validator
// =====================================================

/**
 * Validate a record against the JSON schema
 */
function validateRecord(record) {
  const errors = [];

  // Required fields
  const required = ['model_id', 'provider', 'benchmark', 'score', 'date', 'source_url'];
  for (const field of required) {
    if (record[field] === undefined || record[field] === null || record[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Type checks
  if (record.model_id && typeof record.model_id !== 'string') {
    errors.push('model_id must be a string');
  }
  if (record.score !== undefined && typeof record.score !== 'number') {
    errors.push('score must be a number');
  }
  if (record.score !== undefined && (record.score < 0)) {
    errors.push('score must be >= 0');
  }

  // Benchmark enum validation
  const validBenchmarks = ['arena_elo', 'gpqa_diamond', 'swe_bench', 'livebench', 'hle', 'aime', 'mmlu_pro'];
  if (record.benchmark && !validBenchmarks.includes(record.benchmark)) {
    errors.push(`Invalid benchmark: ${record.benchmark}. Valid: ${validBenchmarks.join(', ')}`);
  }

  // Date format validation
  if (record.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(record.date)) {
      errors.push(`Invalid date format: ${record.date}. Expected YYYY-MM-DD`);
    } else {
      const d = new Date(record.date);
      if (isNaN(d.getTime())) {
        errors.push(`Invalid date value: ${record.date}`);
      }
    }
  }

  // Source URL validation
  if (record.source_url && typeof record.source_url === 'string') {
    if (!record.source_url.startsWith('http://') && !record.source_url.startsWith('https://')) {
      errors.push(`Invalid source_url: must start with http:// or https://`);
    }
  }

  // source_type validation
  const validSourceTypes = ['independent_benchmark', 'vendor_claim', 'community_reported'];
  if (record.source_type && !validSourceTypes.includes(record.source_type)) {
    errors.push(`Invalid source_type: ${record.source_type}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    record_id: `${record.model_id || '?'}/${record.benchmark || '?'}`,
  };
}

/**
 * Validate an array of records
 */
function validateRecords(records, options = {}) {
  const results = records.map(validateRecord);
  const valid = results.filter(r => r.valid);
  const invalid = results.filter(r => !r.valid);

  return {
    total: records.length,
    valid_count: valid.length,
    invalid_count: invalid.length,
    valid_rate: records.length > 0 ? Math.round((valid.length / records.length) * 1000) / 10 : 0,
    invalid_records: invalid.map(r => ({ id: r.record_id, errors: r.errors })),
    valid: invalid.length === 0,
  };
}

// =====================================================
// Outlier Detection
// =====================================================

/**
 * Detect outliers by comparing against historical data
 * Flags records with >15% daily change vs previous day
 */
function detectOutliers(normalizedRecords, historyPath = HISTORY_PATH) {
  const outliers = [];

  // Load historical data
  let history = [];
  try {
    if (fs.existsSync(historyPath)) {
      const lines = fs.readFileSync(historyPath, 'utf-8').split('\n').filter(l => l.trim());
      history = lines.map(l => JSON.parse(l));
    }
  } catch (err) {
    console.log(`[validator] Warning: could not load history: ${err.message}`);
  }

  if (history.length === 0) {
    return { outliers: [], has_history: false, message: 'No historical data to compare against' };
  }

  // Get most recent history entry
  const lastEntry = history[history.length - 1];
  const prevScores = {};
  if (lastEntry && lastEntry.models) {
    for (const model of lastEntry.models) {
      prevScores[model.model_id] = model.global_score || 0;
    }
  }

  for (const rec of normalizedRecords) {
    const prev = prevScores[rec.model_id];
    if (prev !== undefined && prev > 0) {
      const change = Math.abs(rec.score - prev) / prev * 100;
      if (change > 15) {
        outliers.push({
          model_id: rec.model_id,
          benchmark: rec.benchmark,
          previous_score: prev,
          current_score: rec.score,
          change_pct: Math.round(change * 10) / 10,
          severity: change > 30 ? 'critical' : change > 20 ? 'high' : 'medium',
        });
      }
    }
  }

  return {
    outliers,
    count: outliers.length,
    has_history: true,
  };
}

// =====================================================
// Cross-Benchmark Consistency
// =====================================================

/**
 * Check consistency across benchmarks for the same model
 * A model should perform relatively consistently across benchmarks
 * If it's top-tier on one and bottom-tier on another, flag it
 */
function checkCrossBenchmarkConsistency(normalizedRecords) {
  const warnings = [];

  // Group by model
  const byModel = {};
  for (const rec of normalizedRecords) {
    if (!byModel[rec.model_id]) byModel[rec.model_id] = [];
    byModel[rec.model_id].push(rec);
  }

  // For each model with multiple benchmarks, check if Z-scores are consistent
  for (const [modelId, recs] of Object.entries(byModel)) {
    if (recs.length < 2) continue;

    const zScores = recs
      .map(r => r.z_score)
      .filter(z => z !== undefined && z !== null);

    if (zScores.length < 2) continue;

    const minZ = Math.min(...zScores);
    const maxZ = Math.max(...zScores);
    const range = Math.abs(maxZ - minZ);

    if (range > 2.0) {
      warnings.push({
        model_id: modelId,
        type: 'inconsistency',
        z_range: Math.round(range * 100) / 100,
        min_z: Math.round(minZ * 100) / 100,
        max_z: Math.round(maxZ * 100) / 100,
        severity: range > 3.0 ? 'critical' : 'high',
        benchmarks: recs.map(r => ({ benchmark: r.benchmark, z_score: r.z_score, score: r.score })),
        message: `${modelId} has inconsistent performance (Z-range: ${Math.round(range * 100) / 100}) across benchmarks`,
      });
    }
  }

  return {
    warnings,
    count: warnings.length,
  };
}

// =====================================================
// Stale Source Detection
// =====================================================

/**
 * Detect sources that haven't been updated in >7 days
 */
function detectStaleSources(normalizedRecords) {
  const staleSources = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Group by source_url
  const bySource = {};
  for (const rec of normalizedRecords) {
    if (!bySource[rec.source_url]) {
      bySource[rec.source_url] = {
        source_url: rec.source_url,
        benchmark: rec.benchmark,
        dates: [],
        models: [],
      };
    }
    if (rec.date) bySource[rec.source_url].dates.push(rec.date);
    if (rec.model_id) bySource[rec.source_url].models.push(rec.model_id);
  }

  for (const [url, info] of Object.entries(bySource)) {
    const maxDate = info.dates.sort().reverse()[0];
    if (maxDate) {
      const d = new Date(maxDate);
      if (d < sevenDaysAgo) {
        const daysStale = Math.floor((now - d) / (24 * 60 * 60 * 1000));
        staleSources.push({
          source_url: url,
          benchmark: info.benchmark,
          last_update: maxDate,
          days_stale: daysStale,
          model_count: new Set(info.models).size,
          severity: daysStale > 30 ? 'critical' : daysStale > 14 ? 'high' : 'medium',
        });
      }
    }
  }

  return {
    stale_sources: staleSources,
    count: staleSources.length,
  };
}

// =====================================================
// New Model Detection
// =====================================================

/**
 * Detect models that are new (not in the model mapper)
 */
function detectNewModels(normalizedRecords) {
  const newModels = [];

  let knownModels = new Set();
  try {
    if (fs.existsSync(MODEL_MAPPER_PATH)) {
      const mapper = JSON.parse(fs.readFileSync(MODEL_MAPPER_PATH, 'utf-8'));
      if (mapper.model_mappings) {
        knownModels = new Set(Object.keys(mapper.model_mappings));
      }
    }
  } catch (err) {
    console.log(`[validator] Warning: could not load model mapper: ${err.message}`);
  }

  const seen = new Set();
  for (const rec of normalizedRecords) {
    const key = rec.model_id.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (!seen.has(key) && !knownModels.has(rec.model_id) && !knownModels.has(key)) {
      seen.add(key);
      newModels.push({
        model_id: rec.model_id,
        provider: rec.provider,
        benchmark: rec.benchmark,
        score: rec.score,
        display_name: rec.display_name || rec.model_id,
      });
    }
  }

  return {
    new_models: newModels,
    count: newModels.length,
  };
}

// =====================================================
// Full Validation Suite
// =====================================================

/**
 * Run all validations on the pipeline data
 */
function validate(normalizedRecords, options = {}) {
  const results = {
    timestamp: new Date().toISOString(),
    total_records: normalizedRecords.length,
    schema: null,
    outliers: null,
    consistency: null,
    stale_sources: null,
    new_models: null,
    summary: null,
  };

  // Schema validation
  results.schema = validateRecords(normalizedRecords, options);

  // Outlier detection
  results.outliers = detectOutliers(normalizedRecords, options.historyPath);

  // Cross-benchmark consistency
  results.consistency = checkCrossBenchmarkConsistency(normalizedRecords);

  // Stale sources
  results.stale_sources = detectStaleSources(normalizedRecords);

  // New models
  results.new_models = detectNewModels(normalizedRecords);

  // Summary
  const allIssues = (
    (results.schema?.invalid_count || 0) +
    (results.outliers?.count || 0) +
    (results.consistency?.count || 0) +
    (results.stale_sources?.count || 0) +
    (results.new_models?.count || 0)
  );

  results.summary = {
    passed: allIssues === 0,
    total_issues: allIssues,
    schema_errors: results.schema?.invalid_count || 0,
    outliers: results.outliers?.count || 0,
    consistency_warnings: results.consistency?.count || 0,
    stale_sources: results.stale_sources?.count || 0,
    new_models_discovered: results.new_models?.count || 0,
  };

  return results;
}

// =====================================================
// CLI
// =====================================================
if (require.main === module) {
  const inputFile = process.argv[2];

  if (!inputFile) {
    console.error('Usage: node sanity.js <normalized-records.json>');
    process.exit(1);
  }

  try {
    const records = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    const results = validate(records);
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.summary.passed ? 0 : 1);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  validate,
  validateRecord,
  validateRecords,
  detectOutliers,
  checkCrossBenchmarkConsistency,
  detectStaleSources,
  detectNewModels,
};
