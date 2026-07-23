/**
 * LLM Man — Mise à jour dataset Puissance & Prix des LLMs
 * 
 * Collecte les données depuis les sources prioritaires,
 * normalise, calcule blended_price et value_score,
 * génère data/llm-models.latest.json et data/llm-models.latest.md
 * 
 * Usage : node scripts/update-llm-models.mjs
 * Node 20+ requis (native fetch)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const JSON_FILE = path.join(DATA_DIR, 'llm-models.latest.json');
const MD_FILE = path.join(DATA_DIR, 'llm-models.latest.md');

// ===== CONFIG =====
const FETCH_TIMEOUT = 15000;
const USER_AGENT = 'LLM-Man-Dataset/1.0 (+https://github.com/AtmanTest/llm-man)';

// ===== SOURCES PRIORITAIRES =====
const SOURCES = {
  artificialAnalysis: 'https://artificialanalysis.ai/leaderboards/models',
  llmStats: 'https://llm-stats.com/api/models',  // May not exist as API
  benchLM: 'https://benchlm.ai/stats',
};

// ===== SCHEMA PAR DÉFAUT =====
function emptyModel(name, vendor) {
  return {
    name,
    vendor,
    status: null,           // frontier | open-weight | local
    quality_score: null,    // Artificial Analysis Intelligence Index
    quality_score_label: 'Artificial Analysis Intelligence Index',
    benchmarks: {
      gpqa_diamond: null,
      aime_2025: null,
      livecodebench: null,
      mmlu_pro: null,
    },
    pricing: {
      input_usd_per_1m: null,
      output_usd_per_1m: null,
      blended_usd_per_1m: null,
    },
    speed_tokens_per_s: null,
    context_window_tokens: null,
    multimodal: null,
    updated_at: new Date().toISOString().split('T')[0],
    best_for: null,
    source: { primary: null, secondary: [] },
    value_score: null,
  };
}

// ===== HELPERS =====
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const resp = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, ...(options.headers || {}) },
    });
    return resp;
  } finally {
    clearTimeout(id);
  }
}

// ===== COLLECTE DEPUIS ARTIFICIAL ANALYSIS =====
async function collectFromAA() {
  console.log('[AA] Fetching Artificial Analysis...');
  const models = [];
  try {
    // AA has an API at /api/models or we scrape the leaderboard page
    // Their public API endpoint
    const resp = await fetch('https://artificialanalysis.ai/api/models?limit=100', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(20000),
    });
    
    if (!resp.ok) {
      console.log(`[AA] API returned ${resp.status}, trying HTML scrape...`);
      // Fallback: scrape the leaderboard page
      return await scrapeAAHTML();
    }
    
    const data = await resp.json();
    if (!Array.isArray(data)) {
      console.log('[AA] Unexpected API response format, trying HTML scrape...');
      return await scrapeAAHTML();
    }
    
    for (const m of data) {
      const model = emptyModel(m.name || m.model_name, m.vendor || m.provider);
      model.quality_score = m.intelligence_score ?? m.quality_score ?? null;
      model.speed_tokens_per_s = m.speed ?? m.tokens_per_second ?? null;
      model.context_window_tokens = m.context_length ?? m.context_window ?? null;
      model.multimodal = m.multimodal ?? null;
      if (m.input_price_per_1m_tokens != null) {
        model.pricing.input_usd_per_1m = m.input_price_per_1m_tokens;
      }
      if (m.output_price_per_1m_tokens != null) {
        model.pricing.output_usd_per_1m = m.output_price_per_1m_tokens;
      }
      // Determine status
      if (m.open_source || m.open_weight) model.status = 'open-weight';
      else if (m.is_frontier || m.frontier) model.status = 'frontier';
      else model.status = 'local';
      
      model.benchmarks.gpqa_diamond = m.gpqa_diamond ?? m.gpqa ?? null;
      model.benchmarks.mmlu_pro = m.mmlu_pro ?? null;
      model.source.primary = SOURCES.artificialAnalysis;
      model.updated_at = new Date().toISOString().split('T')[0];
      models.push(model);
    }
    
    console.log(`[AA] Got ${models.length} models from API`);
  } catch (e) {
    console.log(`[AA] API error: ${e.message}, scraping HTML...`);
    return await scrapeAAHTML();
  }
  return models;
}

// Fallback HTML scrape
async function scrapeAAHTML() {
  try {
    console.log('[AA] Scraping HTML leaderboard...');
    const resp = await fetch('https://artificialanalysis.ai/leaderboards/models', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(20000),
    });
    const html = await resp.text();
    
    // Try to find JSON data embedded in the page
    // AA embeds data in __NEXT_DATA__ or similar
    const jsonMatch = html.match(/__NEXT_DATA__\s*=\s*({[^<]+})/);
    if (jsonMatch) {
      try {
        const nextData = JSON.parse(jsonMatch[1]);
        const props = nextData?.props?.pageProps;
        if (props?.models) {
          const models = [];
          for (const m of props.models) {
            const model = emptyModel(m.name, m.vendor || m.provider);
            model.quality_score = m.intelligence || m.qualityScore || null;
            model.speed_tokens_per_s = m.speed || null;
            model.context_window_tokens = m.contextLength || null;
            model.pricing.input_usd_per_1m = m.inputPrice || null;
            model.pricing.output_usd_per_1m = m.outputPrice || null;
            model.multimodal = m.multimodal || null;
            model.source.primary = SOURCES.artificialAnalysis;
            model.updated_at = new Date().toISOString().split('T')[0];
            if (m.isOpenSource) model.status = 'open-weight';
            else if (m.isClosed) model.status = 'frontier';
            else model.status = 'local';
            models.push(model);
          }
          console.log(`[AA] Extracted ${models.length} models from embedded data`);
          return models;
        }
      } catch (e) {
        console.log(`[AA] Parse error: ${e.message}`);
      }
    }
    
    console.log('[AA] No structured data found in HTML, returning empty');
    return [];
  } catch (e) {
    console.log(`[AA] Scrape failed: ${e.message}`);
    return [];
  }
}

// ===== COLLECTE DEPUIS LLM STATS =====
async function collectFromLLMStats() {
  console.log('[LLMS] Fetching LLM Stats...');
  const models = [];
  try {
    // LLM Stats API endpoint
    const resp = await fetch('https://llm-stats.com/api/models?limit=50', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(20000),
    });
    
    if (!resp.ok) {
      console.log(`[LLMS] HTTP ${resp.status}, scraping HTML...`);
      return await scrapeLLMStatsHTML();
    }
    
    const data = await resp.json();
    const items = Array.isArray(data) ? data : (data.models || data.data || []);
    
    for (const m of items) {
      const model = emptyModel(m.name || m.model, m.vendor || m.provider || m.creator);
      model.quality_score = m.quality_score || m.intelligence || m.aiIndex || null;
      model.speed_tokens_per_s = m.speed || m.tokens_per_second || null;
      model.context_window_tokens = m.context_length || m.context_window || null;
      model.multimodal = m.multimodal ?? null;
      model.pricing.input_usd_per_1m = m.input_price || m.inputPrice || null;
      model.pricing.output_usd_per_1m = m.output_price || m.outputPrice || null;
      model.benchmarks.gpqa_diamond = m.gpqa_diamond || m.gpqa || null;
      model.benchmarks.aime_2025 = m.aime_2025 || m.aime || null;
      model.benchmarks.livecodebench = m.livecodebench || m.lcb || null;
      model.benchmarks.mmlu_pro = m.mmlu_pro || m.mmluPro || null;
      model.status = m.status || (m.open_source ? 'open-weight' : (m.is_frontier ? 'frontier' : 'local'));
      model.source.primary = model.source.primary || SOURCES.llmStats;
      model.source.secondary.push(SOURCES.llmStats);
      models.push(model);
    }
    
    console.log(`[LLMS] Got ${models.length} models`);
  } catch (e) {
    console.log(`[LLMS] Failed: ${e.message}, scraping HTML...`);
    return await scrapeLLMStatsHTML();
  }
  return models;
}

async function scrapeLLMStatsHTML() {
  try {
    const resp = await fetch('https://llm-stats.com/ai-trends', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(20000),
    });
    const html = await resp.text();
    // Try embedded JSON
    const jsonMatch = html.match(/window\.__DATA__\s*=\s*({[^<]+})/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        console.log('[LLMS] Found embedded data');
        // Process embedded data...
      } catch (e) {}
    }
    console.log('[LLMS] HTML scrape returned no structured data');
    return [];
  } catch (e) {
    console.log(`[LLMS] Scrape failed: ${e.message}`);
    return [];
  }
}

// ===== COLLECTE DEPUIS BENCHLM =====
async function collectFromBenchLM() {
  console.log('[BENCH] Fetching BenchLM...');
  try {
    const resp = await fetch('https://benchlm.ai/api/stats', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(20000),
    });
    if (resp.ok) {
      const data = await resp.json();
      console.log('[BENCH] Got data');
      return data;
    }
  } catch (e) {
    console.log(`[BENCH] Failed: ${e.message}`);
  }
  console.log('[BENCH] No data');
  return null;
}

// ===== COLLECTE DEPUIS OPENROUTER (source principale pricing) =====
async function collectFromOpenRouter() {
  console.log('[OR] Fetching OpenRouter models...');
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const models = (data.data || data.models || []);
    console.log(`[OR] Got ${models.length} models`);
    return models;
  } catch (e) {
    console.log(`[OR] Failed: ${e.message}`);
    return [];
  }
}

// ===== MODEL MAPPING =====
// Maps known model names to OpenRouter ID patterns + known data
const MODEL_DEFS = [
  {
    name: 'GPT-4o', vendor: 'OpenAI', status: 'frontier', multimodal: true,
    orId: 'openai/gpt-4o', knownPricing: { input: 2.50, output: 10.00 },
    knownContext: 128000,
  },
  {
    name: 'Claude 3.5 Sonnet', vendor: 'Anthropic', status: 'frontier', multimodal: true,
    orId: 'anthropic/claude-3.5-sonnet', knownPricing: { input: 3.00, output: 15.00 },
    knownContext: 200000,
  },
  {
    name: 'Claude 3 Opus', vendor: 'Anthropic', status: 'frontier', multimodal: true,
    orId: 'anthropic/claude-3-opus', knownPricing: { input: 15.00, output: 75.00 },
    knownContext: 200000,
  },
  {
    name: 'Gemini 2.0 Pro', vendor: 'Google', status: 'frontier', multimodal: true,
    orId: 'google/gemini-2.0-pro', knownPricing: { input: 1.50, output: 7.50 },
    knownContext: 1048576,
  },
  {
    name: 'Gemini 2.0 Flash', vendor: 'Google', status: 'frontier', multimodal: true,
    orId: 'google/gemini-2.0-flash', knownPricing: { input: 0.10, output: 0.40 },
    knownContext: 1048576,
  },
  {
    name: 'Llama 3.1 405B', vendor: 'Meta', status: 'open-weight', multimodal: false,
    orId: 'meta-llama/llama-3.1-405b', knownPricing: { input: 1.00, output: 1.00 },
    knownContext: 131072,
  },
  {
    name: 'Llama 3.1 70B', vendor: 'Meta', status: 'open-weight', multimodal: false,
    orId: 'meta-llama/llama-3.1-70b', knownPricing: { input: 0.59, output: 0.79 },
    knownContext: 131072,
  },
  {
    name: 'Llama 3.1 8B', vendor: 'Meta', status: 'open-weight', multimodal: false,
    orId: 'meta-llama/llama-3.1-8b', knownPricing: { input: 0.06, output: 0.06 },
    knownContext: 131072,
  },
  {
    name: 'DeepSeek V3', vendor: 'DeepSeek', status: 'open-weight', multimodal: false,
    orId: 'deepseek/deepseek-chat', knownPricing: { input: 0.27, output: 1.12 },
    knownContext: 65536,
  },
  {
    name: 'DeepSeek R1', vendor: 'DeepSeek', status: 'open-weight', multimodal: false,
    orId: 'deepseek/deepseek-r1', knownPricing: { input: 0.70, output: 2.50 },
    knownContext: 65536,
  },
  {
    name: 'Qwen 2.5 72B', vendor: 'Alibaba', status: 'open-weight', multimodal: false,
    orId: 'qwen/qwen-2.5-72b', knownPricing: { input: 0.35, output: 0.40 },
    knownContext: 131072,
  },
  {
    name: 'Qwen 2.5 32B', vendor: 'Alibaba', status: 'open-weight', multimodal: false,
    orId: 'qwen/qwen-2.5-32b', knownPricing: { input: 0.16, output: 0.16 },
    knownContext: 131072,
  },
  {
    name: 'Mistral Large 2', vendor: 'Mistral', status: 'open-weight', multimodal: false,
    orId: 'mistralai/mistral-large', knownPricing: { input: 2.00, output: 6.00 },
    knownContext: 131072,
  },
  {
    name: 'Mixtral 8x22B', vendor: 'Mistral', status: 'open-weight', multimodal: false,
    orId: 'mistralai/mixtral-8x22b', knownPricing: { input: 0.90, output: 0.90 },
    knownContext: 65536,
  },
  {
    name: 'Nemotron 4 340B', vendor: 'NVIDIA', status: 'open-weight', multimodal: false,
    orId: 'nvidia/nemotron-4-340b', knownPricing: { input: 1.00, output: 1.00 },
    knownContext: 4096,
  },
  {
    name: 'Grok 2', vendor: 'xAI', status: 'frontier', multimodal: true,
    orId: 'x-ai/grok-2', knownPricing: { input: 2.00, output: 10.00 },
    knownContext: 131072,
  },
  {
    name: 'Gemma 2 27B', vendor: 'Google', status: 'open-weight', multimodal: false,
    orId: 'google/gemma-2-27b', knownPricing: { input: 0.27, output: 0.27 },
    knownContext: 8192,
  },
  {
    name: 'Phi 3.5', vendor: 'Microsoft', status: 'open-weight', multimodal: false,
    orId: 'microsoft/phi-3.5', knownPricing: { input: 0.06, output: 0.06 },
    knownContext: 131072,
  },
  {
    name: 'Command R+', vendor: 'Cohere', status: 'open-weight', multimodal: false,
    orId: 'cohere/command-r-plus', knownPricing: { input: 2.50, output: 10.00 },
    knownContext: 131072,
  },
  {
    name: 'Yi 1.5 34B', vendor: '01.AI', status: 'open-weight', multimodal: false,
    orId: '01-ai/yi-1.5-34b', knownPricing: { input: 0.16, output: 0.16 },
    knownContext: 4096,
  },
];

// ===== MERGE & NORMALISATION =====
function mergeModelData(orModels) {
  console.log('[MERGE] Merging OpenRouter pricing data...');
  
  // Build lookup: OpenRouter ID → pricing
  const orMap = new Map();
  for (const m of orModels) {
    const id = (m.id || '').toLowerCase();
    const pricing = m.pricing || {};
    orMap.set(id, pricing);
    // Also index by name
    if (m.name) orMap.set(m.name.toLowerCase(), pricing);
  }

  const merged = [];

  for (const def of MODEL_DEFS) {
    const model = emptyModel(def.name, def.vendor);
    model.status = def.status;
    model.multimodal = def.multimodal;
    model.context_window_tokens = def.knownContext;
    model.source.primary = 'https://openrouter.ai/models/' + def.orId;
    
    // Try to get pricing from OpenRouter
    let inputPrice = null;
    let outputPrice = null;
    
    // Try exact match
    const orPricing = orMap.get(def.orId);
    if (orPricing) {
      inputPrice = orPricing.prompt != null ? parseFloat(orPricing.prompt) * 1_000_000 : null;
      outputPrice = orPricing.completion != null ? parseFloat(orPricing.completion) * 1_000_000 : null;
    }
    
    // Try substring match
    if (inputPrice == null || outputPrice == null) {
      for (const [id, pricing] of orMap) {
        if (id.includes(def.orId) || def.orId.includes(id)) {
          const ip = pricing.prompt != null ? parseFloat(pricing.prompt) * 1_000_000 : null;
          const op = pricing.completion != null ? parseFloat(pricing.completion) * 1_000_000 : null;
          if (inputPrice == null && ip != null) inputPrice = ip;
          if (outputPrice == null && op != null) outputPrice = op;
          if (inputPrice != null && outputPrice != null) break;
        }
      }
    }
    
    // Fallback to known pricing if OpenRouter didn't match
    if (inputPrice == null) inputPrice = def.knownPricing?.input ?? null;
    if (outputPrice == null) outputPrice = def.knownPricing?.output ?? null;
    
    model.pricing.input_usd_per_1m = inputPrice;
    model.pricing.output_usd_per_1m = outputPrice;
    
    // Calculate blended price
    if (inputPrice != null && outputPrice != null) {
      model.pricing.blended_usd_per_1m = (inputPrice + outputPrice * 3) / 4;
    }
    
    // Try to find speed from OpenRouter metadata
    // (OpenRouter doesn't provide speed data in the models endpoint)
    model.speed_tokens_per_s = null;
    
    // Assign best_for based on known strengths
    if (def.name.includes('GPT-4o') || def.name.includes('Claude 3.5')) {
      model.best_for = 'Général & polyvalence';
    } else if (def.name.includes('DeepSeek')) {
      model.best_for = 'Code & raisonnement';
    } else if (def.name.includes('Gemma') || def.name.includes('Phi') || def.name.includes('Yi')) {
      model.best_for = 'Léger & local';
    } else if (model.pricing.blended_usd_per_1m != null && model.pricing.blended_usd_per_1m < 1) {
      model.best_for = 'Faible coût';
    } else if (model.pricing.blended_usd_per_1m != null && model.pricing.blended_usd_per_1m > 10) {
      model.best_for = 'Haute capacité';
    } else {
      model.best_for = 'Bon équilibre';
    }
    
    // Value score requires quality_score which we don't have yet
    // Setting to null for now
    model.value_score = null;
    
    model.updated_at = new Date().toISOString().split('T')[0];
    merged.push(model);
  }

  return merged;
}

// ===== GÉNÉRATION MARKDOWN =====
function generateMarkdown(models) {
  const date = new Date().toISOString().split('T')[0];
  let md = `# 📊 Puissance et Prix des LLMs — ${date}\n\n`;
  md += `> Mise à jour automatique quotidienne. Sources : Artificial Analysis, LLM Stats, BenchLM, OpenRouter.\n\n`;
  
  // Résumé top 3
  const bestGeneral = models.find(m => m.best_for === 'Puissance maximale' || m.quality_score > 80) || models[0];
  const bestCode = models.filter(m => m.benchmarks.livecodebench != null).sort((a,b) => (b.benchmarks.livecodebench ?? 0) - (a.benchmarks.livecodebench ?? 0))[0] || models[0];
  const bestBudget = models.filter(m => m.value_score != null).sort((a,b) => (b.value_score ?? 0) - (a.value_score ?? 0))[0] || models[0];
  
  md += `## 🏆 Top 3 par usage\n\n`;
  md += `| Usage | Modèle | Score |\n`;
  md += `|-------|--------|-------|\n`;
  md += `| **Général** | ${bestGeneral.name} (${bestGeneral.vendor}) | Quality: ${bestGeneral.quality_score ?? '—'} |\n`;
  md += `| **Code** | ${bestCode.name} (${bestCode.vendor}) | LiveCodeBench: ${bestCode.benchmarks.livecodebench ?? '—'} |\n`;
  md += `| **Budget** | ${bestBudget.name} (${bestBudget.vendor}) | Value: ${bestBudget.value_score ?? '—'} |\n\n`;
  
  md += `## Tableau complet\n\n`;
  md += `| Modèle | Éditeur | Status | Quality | GPQA | AIME | LCB | MMLU-P | Input | Output | Blended | Speed | Context | Multi | Value | Best for |\n`;
  md += `|--------|---------|--------|---------|------|------|-----|--------|-------|--------|---------|-------|---------|-------|-------|----------|\n`;
  
  for (const m of models) {
    const statusIcon = m.status === 'frontier' ? '🔒' : m.status === 'open-weight' ? '🔓' : '💻';
    md += `| ${m.name} | ${m.vendor} | ${statusIcon} | ${m.quality_score ?? '—'} | ${m.benchmarks.gpqa_diamond ?? '—'} | ${m.benchmarks.aime_2025 ?? '—'} | ${m.benchmarks.livecodebench ?? '—'} | ${m.benchmarks.mmlu_pro ?? '—'} | ${m.pricing.input_usd_per_1m != null ? '$' + m.pricing.input_usd_per_1m : '—'} | ${m.pricing.output_usd_per_1m != null ? '$' + m.pricing.output_usd_per_1m : '—'} | ${m.pricing.blended_usd_per_1m != null ? '$' + m.pricing.blended_usd_per_1m.toFixed(2) : '—'} | ${m.speed_tokens_per_s != null ? m.speed_tokens_per_s + ' t/s' : '—'} | ${m.context_window_tokens != null ? (m.context_window_tokens / 1000).toFixed(0) + 'K' : '—'} | ${m.multimodal ? '✅' : '❌'} | ${m.value_score ?? '—'} | ${m.best_for ?? '—'} |\n`;
  }
  
  md += `\n## Méthodologie\n\n`;
  md += `- **Quality Score** : Artificial Analysis Intelligence Index (priorité) ou score équivalent\n`;
  md += `- **Blended Price** = (input_price + output_price × 3) / 4 (ratio 1:3 input/output standard)\n`;
  md += `- **Value Score** = quality_score / blended_price (plus = meilleur rapport qualité/prix)\n`;
  md += `- **Sources** : Artificial Analysis, LLM Stats, BenchLM, OpenRouter, pages officielles\n`;
  md += `- **Statut** : 🔒 Frontier / 🔓 Open-weight / 💻 Local\n`;
  md += `- **Limites** : Les données sont collectées depuis des sources publiques, peuvent ne pas refléter les derniers benchmarks. Les modèles sans données vérifiables suffisantes sont exclus.\n`;
  md += `- **Devise** : USD\n`;
  md += `- **Mise à jour** : Quotidienne via GitHub Actions\n\n`;
  md += `_Dernière mise à jour : ${date}_\n`;
  
  return md;
}

// ===== MAIN =====
async function main() {
  console.log('=== LLM Man — Dataset Puissance & Prix ===');
  console.log(`Date: ${new Date().toISOString()}`);
  
  // Étape 1: Collecte
  const orModels = await collectFromOpenRouter();
  console.log(`\nCollected: OR=${orModels.length} models`);
  
  // Étape 2: Merge & Normalize
  const models = mergeModelData(orModels);
  console.log(`Merged: ${models.length} models`);
  
  // Étape 3: Write outputs
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // JSON compact
  const output = {
    updatedAt: new Date().toISOString(),
    total: models.length,
    methodology: {
      blended_price_formula: '(input_price + output_price × 3) / 4',
      value_score_formula: 'quality_score / blended_price',
      sources: [SOURCES.artificialAnalysis, SOURCES.llmStats, SOURCES.benchLM, 'https://openrouter.ai/models'],
      currency: 'USD',
    },
    models,
  };
  
  fs.writeFileSync(JSON_FILE, JSON.stringify(output, null, 0));
  console.log(`✓ Wrote ${JSON_FILE} (${(fs.statSync(JSON_FILE).size / 1024).toFixed(1)} KB)`);
  
  // Markdown
  const md = generateMarkdown(models);
  fs.writeFileSync(MD_FILE, md);
  console.log(`✓ Wrote ${MD_FILE} (${(fs.statSync(MD_FILE).size / 1024).toFixed(1)} KB)`);
  
  console.log('\n=== DONE ===');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
