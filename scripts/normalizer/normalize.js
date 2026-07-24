#!/usr/bin/env node
/**
 * Normalizer — Maps raw fetcher output to canonical model IDs and normalizes fields
 */

const fs = require('fs');
const path = require('path');

const MAPPER_PATH = path.join(__dirname, 'model_mapper.json');
const SCHEMA_PATH = path.join(__dirname, 'schema.json');

/**
 * Load model mapper
 */
function loadMapper() {
  try {
    const data = JSON.parse(fs.readFileSync(MAPPER_PATH, 'utf-8'));
    return data.model_mappings || {};
  } catch (err) {
    console.error(`[normalizer] Could not load model mapper: ${err.message}`);
    return {};
  }
}

/**
 * Normalize model ID using the mapper
 */
function mapModelId(rawModelId, mapper) {
  if (!rawModelId) return null;

  // Try exact match first
  if (mapper[rawModelId]) return mapper[rawModelId];

  // Try lowercase
  const lower = rawModelId.toLowerCase();
  if (mapper[lower]) return mapper[lower];

  // Try normalized version (lowercase + hyphens)
  const normalized = lower.replace(/[^a-z0-9.-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (mapper[normalized]) return mapper[normalized];

  // Try alternate patterns
  for (const [key, val] of Object.entries(mapper)) {
    const keyNorm = key.toLowerCase().replace(/[^a-z0-9.-]/g, '-').replace(/-+/g, '-');
    if (keyNorm === normalized) return val;
    // Substring match for long names
    if (normalized.length > 5 && keyNorm.includes(normalized)) return val;
    if (keyNorm.length > 5 && normalized.includes(keyNorm)) return val;
  }

  // No match found
  return null;
}

/**
 * Normalize a single record
 */
function normalizeRecord(record, mapper) {
  const mapping = mapModelId(record.model_id, mapper);

  return {
    model_id: mapping?.canonical_id || record.model_id || 'unknown',
    display_name: mapping?.display_name || record.model_id || record.display_name || 'Unknown',
    provider: mapping?.provider || record.provider || 'unknown',
    family: mapping?.family || record.family || '',
    benchmark: record.benchmark || 'unknown',
    score: typeof record.score === 'number' ? record.score : parseFloat(record.score) || 0,
    raw_score: record.score || 0,
    date: record.date || new Date().toISOString().split('T')[0],
    source_url: record.source_url || '',
    source_type: record.source_type || 'independent_benchmark',
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Normalize an array of raw records from fetchers
 */
function normalize(records) {
  console.log('[normalizer] ===== Normalizing Records =====');

  if (!Array.isArray(records) || records.length === 0) {
    console.log('[normalizer] No records to normalize');
    return [];
  }

  const mapper = loadMapper();
  const knownModels = new Set(Object.keys(mapper));
  const mapped = new Set();
  const unmapped = new Set();

  const normalized = records.map(rec => {
    const result = normalizeRecord(rec, mapper);
    if (mapper[rec.model_id] || mapper[rec.model_id?.toLowerCase()]) {
      mapped.add(result.model_id);
    } else {
      unmapped.add(rec.model_id);
    }
    return result;
  });

  console.log(`[normalizer] Normalized ${normalized.length} records`);
  console.log(`[normalizer] Mapped models: ${mapped.size}`);
  console.log(`[normalizer] Unmapped models: ${unmapped.size}`);

  if (unmapped.size > 0) {
    console.log(`[normalizer] Unmapped: ${[...unmapped].join(', ')}`);
  }

  return normalized;
}

// =====================================================
// CLI
// =====================================================
if (require.main === module) {
  const inputFile = process.argv[2];

  let records;
  if (inputFile) {
    records = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  } else {
    // Read from stdin
    let body = '';
    process.stdin.on('data', chunk => { body += chunk; });
    process.stdin.on('end', () => {
      records = JSON.parse(body);
      const result = normalize(records);
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    });
    return;
  }

  const result = normalize(records);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

module.exports = { normalize, normalizeRecord, mapModelId, loadMapper };
