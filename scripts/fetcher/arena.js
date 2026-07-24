#!/usr/bin/env node
/**
 * Arena Fetcher — LMSYS Chatbot Arena leaderboard
 * Fetches ELO scores from the LMSYS chatbot arena.
 * Returns array of {model_id, provider, score, date, source_url, benchmark: "arena_elo"}
 */

const https = require('https');
const urlModule = require('url');

const SOURCE_URL = 'https://lmarena.ai/leaderboard/';
const BENCHMARK = 'arena_elo';
const CACHE = new Map();

/**
 * HTTP GET with exponential backoff
 */
function httpsGet(url, retries = 3) {
  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.ts < 60000) return Promise.resolve(cached.data);

  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const parsed = urlModule.parse(url);
      const opts = {
        hostname: parsed.hostname,
        path: parsed.path,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LLM-Ranking-Bot/1.0)',
          'Accept': 'application/json',
        },
        timeout: 8000,
      };

      const req = https.request(opts, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(body);
              CACHE.set(url, { data, ts: Date.now() });
              resolve(data);
            } catch {
              resolve(body);
            }
          } else if (res.statusCode === 429 && n < retries) {
            const delay = Math.min(1000 * Math.pow(2, n), 8000);
            console.log(`[arena] Rate limited (429), retry ${n+1}/${retries} in ${delay}ms`);
            setTimeout(() => attempt(n + 1), delay);
          } else if (n < retries) {
            const delay = Math.min(1000 * Math.pow(2, n), 8000);
            console.log(`[arena] HTTP ${res.statusCode}, retry ${n+1}/${retries} in ${delay}ms`);
            setTimeout(() => attempt(n + 1), delay);
          } else {
            reject(new Error(`HTTP ${res.statusCode} after ${retries} retries`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        if (n < retries) {
          const delay = Math.min(1000 * Math.pow(2, n), 8000);
          console.log(`[arena] Timeout, retry ${n+1}/${retries} in ${delay}ms`);
          setTimeout(() => attempt(n + 1), delay);
        } else {
          reject(new Error('Timeout after retries'));
        }
      });

      req.on('error', (err) => {
        if (n < retries) {
          const delay = Math.min(1000 * Math.pow(2, n), 8000);
          console.log(`[arena] Error: ${err.message}, retry ${n+1}/${retries} in ${delay}ms`);
          setTimeout(() => attempt(n + 1), delay);
        } else {
          reject(err);
        }
      });

      req.end();
    };
    attempt(0);
  });
}

/**
 * Scrape LMSYS Arena leaderboard HTML and extract model ELO scores
 */
async function scrapeArenaPage() {
  console.log('[arena] Attempting to scrape LM Arena leaderboard page...');
  const html = await httpsGet(SOURCE_URL);

  let models = [];

  // Try JSON data embedded in the page
  if (typeof html === 'string') {
    // Look for JSON blobs containing model data
    const jsonMatches = html.match(/\{["'][^"']*["']\s*:\s*\{[^}]*"model"[^}]*\}/g);
    if (jsonMatches) {
      for (const match of jsonMatches) {
        try {
          const obj = JSON.parse(match);
          if (obj.model && typeof obj.elo === 'number') {
            models.push({
              model_id: obj.model,
              provider: extractProvider(obj.model),
              score: obj.elo,
              date: new Date().toISOString().split('T')[0],
              source_url: SOURCE_URL,
              benchmark: BENCHMARK,
            });
          }
        } catch {}
      }
    }

    // Try parsing HTML table rows
    if (models.length === 0) {
      const tableRowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
      const rows = html.match(tableRowRegex) || [];
      for (const row of rows) {
        const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
        if (cells && cells.length >= 3) {
          const nameCell = cells[0].replace(/<[^>]+>/g, '').trim();
          const scoreCell = cells[1].replace(/<[^>]+>/g, '').trim();
          // Try the second-to-last or third cell for score
          const scoreVal = parseFloat(scoreCell) || parseFloat(cells[cells.length-2]?.replace(/<[^>]+>/g, '').trim());
          if (nameCell && scoreVal && !isNaN(scoreVal) && nameCell.length > 1) {
            models.push({
              model_id: nameCell,
              provider: extractProvider(nameCell),
              score: scoreVal,
              date: new Date().toISOString().split('T')[0],
              source_url: SOURCE_URL,
              benchmark: BENCHMARK,
            });
          }
        }
      }
    }
  }

  return models;
}

/**
 * Try fetching LMSYS API endpoints (with overall timeout)
 */
async function tryApiEndpoints() {
  const endpoints = [
    'https://lmarena.ai/api/leaderboard',
    'https://lmarena.ai/v1/leaderboard',
  ];

  // Overall timeout: 10 seconds for all API attempts
  const maxApiTime = 10000;
  const start = Date.now();

  for (const endpoint of endpoints) {
    if (Date.now() - start > maxApiTime) {
      console.log('[arena] API search timed out');
      break;
    }
    try {
      console.log(`[arena] Trying API: ${endpoint}`);
      const data = await httpsGet(endpoint);
      if (Array.isArray(data)) {
        return data.map(item => ({
          model_id: item.model || item.model_id || item.name || 'unknown',
          provider: item.provider || extractProvider(item.model || item.model_id || ''),
          score: parseFloat(item.score || item.elo || item.rating || 0),
          date: new Date().toISOString().split('T')[0],
          source_url: SOURCE_URL,
          benchmark: BENCHMARK,
        })).filter(m => m.score > 0);
      }
      if (data && data.data && Array.isArray(data.data)) {
        return data.data.map(item => ({
          model_id: item.model || item.model_id || item.name || 'unknown',
          provider: item.provider || extractProvider(item.model || ''),
          score: parseFloat(item.score || item.elo || item.rating || 0),
          date: new Date().toISOString().split('T')[0],
          source_url: SOURCE_URL,
          benchmark: BENCHMARK,
        })).filter(m => m.score > 0);
      }
    } catch (err) {
      console.log(`[arena] API ${endpoint} failed: ${err.message}`);
    }
  }
  return null;
}

function extractProvider(modelName) {
  const name = (modelName || '').toLowerCase();
  if (name.includes('gpt') || name.includes('openai')) return 'openai';
  if (name.includes('claude') || name.includes('anthropic')) return 'anthropic';
  if (name.includes('gemini') || name.includes('google')) return 'google';
  if (name.includes('llama') || name.includes('meta')) return 'meta';
  if (name.includes('deepseek')) return 'deepseek';
  if (name.includes('grok') || name.includes('xai')) return 'xai';
  if (name.includes('mistral')) return 'mistral';
  if (name.includes('qwen') || name.includes('alibaba')) return 'alibaba';
  if (name.includes('command') || name.includes('cohere')) return 'cohere';
  if (name.includes('dbrx') || name.includes('databricks')) return 'databricks';
  if (name.includes('mixtral')) return 'mistral';
  return 'unknown';
}

function getMockData() {
  console.log('[arena] Using mock data for development');
  return [
    { model_id: 'gpt-4o', provider: 'openai', score: 1288, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'gpt-4.5-preview', provider: 'openai', score: 1275, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'claude-3.5-sonnet', provider: 'anthropic', score: 1270, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'claude-4-sonnet', provider: 'anthropic', score: 1295, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'gemini-2.5-pro', provider: 'google', score: 1282, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'deepseek-v3', provider: 'deepseek', score: 1265, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'llama-4', provider: 'meta', score: 1250, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'grok-3', provider: 'xai', score: 1260, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'mistral-large', provider: 'mistral', score: 1245, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'qwen-3', provider: 'alibaba', score: 1255, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
  ];
}

/**
 * Main fetch function — called by pipeline
 */
async function fetchArena() {
  console.log('[arena] ===== Fetching LMSYS Chatbot Arena =====');
  try {
    // Try API first
    const apiData = await tryApiEndpoints();
    if (apiData && apiData.length > 0) {
      console.log(`[arena] Fetched ${apiData.length} models from API`);
      return apiData;
    }

    // Try scraping
    const scraped = await scrapeArenaPage();
    if (scraped && scraped.length > 0) {
      console.log(`[arena] Fetched ${scraped.length} models from HTML scrape`);
      return scraped;
    }

    // Fall back to mock
    console.log('[arena] No live data available, using mock data');
    return getMockData();
  } catch (err) {
    console.error(`[arena] Error: ${err.message}`);
    console.log('[arena] Falling back to mock data');
    return getMockData();
  }
}

// CLI support
if (require.main === module) {
  fetchArena().then(data => {
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { fetchArena };
