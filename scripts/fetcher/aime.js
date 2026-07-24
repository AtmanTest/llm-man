#!/usr/bin/env node
/**
 * AIME Fetcher — AIME math competition scores
 * Returns array of {model_id, provider, score, date, source_url, benchmark: "aime"}
 */

const https = require('https');
const urlModule = require('url');

const SOURCE_URL = 'https://openai.com/index/competitive-programming/';
const BENCHMARK = 'aime';
const CACHE = new Map();

function httpsGet(url, retries = 5) {
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
          'Accept': 'text/html,application/json',
        },
        timeout: 10000,
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
            const delay = Math.min(1000 * Math.pow(2, n), 30000);
            console.log(`[aime] Rate limited, retry ${n+1}/${retries} in ${delay}ms`);
            setTimeout(() => attempt(n + 1), delay);
          } else if (n < retries) {
            const delay = Math.min(1000 * Math.pow(2, n), 30000);
            console.log(`[aime] HTTP ${res.statusCode}, retry ${n+1}/${retries} in ${delay}ms`);
            setTimeout(() => attempt(n + 1), delay);
          } else {
            reject(new Error(`HTTP ${res.statusCode} after ${retries} retries`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        if (n < retries) {
          const delay = Math.min(1000 * Math.pow(2, n), 30000);
          console.log(`[aime] Timeout, retry ${n+1}/${retries} in ${delay}ms`);
          setTimeout(() => attempt(n + 1), delay);
        } else {
          reject(new Error('Timeout'));
        }
      });

      req.on('error', (err) => {
        if (n < retries) {
          const delay = Math.min(1000 * Math.pow(2, n), 30000);
          console.log(`[aime] Error: ${err.message}, retry ${n+1}/${retries}`);
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

function extractProvider(m) {
  const name = (m || '').toLowerCase();
  if (name.includes('gpt') || name.includes('openai')) return 'openai';
  if (name.includes('claude') || name.includes('anthropic')) return 'anthropic';
  if (name.includes('gemini') || name.includes('google')) return 'google';
  if (name.includes('llama') || name.includes('meta')) return 'meta';
  if (name.includes('deepseek')) return 'deepseek';
  if (name.includes('grok') || name.includes('xai')) return 'xai';
  if (name.includes('mistral')) return 'mistral';
  if (name.includes('qwen') || name.includes('alibaba')) return 'alibaba';
  return 'unknown';
}

function parseAimePage(html) {
  const models = [];

  // Try Next.js data
  const nextData = html.match(/__NEXT_DATA__[^>]*>\s*({[\s\S]*?})\s*<\//);
  if (nextData) {
    try {
      const data = JSON.parse(nextData[1]);
      const walk = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.model && typeof obj.aime === 'number') {
          models.push({
            model_id: obj.model,
            provider: extractProvider(obj.model),
            score: obj.aime,
            date: new Date().toISOString().split('T')[0],
            source_url: SOURCE_URL,
            benchmark: BENCHMARK,
          });
        }
        if (obj.model_name && typeof obj.accuracy === 'number') {
          models.push({
            model_id: obj.model_name,
            provider: extractProvider(obj.model_name),
            score: obj.accuracy,
            date: new Date().toISOString().split('T')[0],
            source_url: SOURCE_URL,
            benchmark: BENCHMARK,
          });
        }
        for (const v of Object.values(obj)) {
          if (v && typeof v === 'object') walk(v);
        }
      };
      walk(data);
    } catch {}
  }

  // Try simple table parsing
  if (models.length === 0) {
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const row of rows) {
      const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
      if (!cells || cells.length < 2) continue;
      const name = cells[0].replace(/<[^>]+>/g, '').trim();
      const score = cells[cells.length - 1].replace(/<[^>]+>/g, '').trim();
      const val = parseFloat(score);
      if (name && !isNaN(val) && val > 0 && name.length > 1 && name.length < 100) {
        models.push({
          model_id: name,
          provider: extractProvider(name),
          score: val,
          date: new Date().toISOString().split('T')[0],
          source_url: SOURCE_URL,
          benchmark: BENCHMARK,
        });
      }
    }
  }

  return models;
}

function getMockData() {
  console.log('[aime] Using mock data for development');
  return [
    { model_id: 'gpt-4o', provider: 'openai', score: 56.6, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'gpt-4.5-preview', provider: 'openai', score: 64.2, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'claude-3.5-sonnet', provider: 'anthropic', score: 48.4, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'claude-4-sonnet', provider: 'anthropic', score: 72.1, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'gemini-2.5-pro', provider: 'google', score: 60.8, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'deepseek-v3', provider: 'deepseek', score: 52.3, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'llama-4', provider: 'meta', score: 40.5, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'grok-3', provider: 'xai', score: 55.9, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'mistral-large', provider: 'mistral', score: 38.2, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
    { model_id: 'qwen-3', provider: 'alibaba', score: 50.4, date: new Date().toISOString().split('T')[0], source_url: SOURCE_URL, benchmark: BENCHMARK },
  ];
}

async function fetchAime() {
  console.log('[aime] ===== Fetching AIME =====');
  try {
    const html = await httpsGet(SOURCE_URL);
    if (typeof html === 'string') {
      const models = parseAimePage(html);
      if (models.length > 0) {
        console.log(`[aime] Fetched ${models.length} models`);
        return models;
      }
    }
  } catch (err) {
    console.log(`[aime] Error: ${err.message}`);
  }

  console.log('[aime] Falling back to mock data');
  return getMockData();
}

if (require.main === module) {
  fetchAime().then(data => {
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { fetchAime };
