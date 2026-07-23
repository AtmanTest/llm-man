/**
 * LLM Man — Mise à jour dataset Puissance & Prix des LLMs
 * 
 * Collecte TOUS les modèles depuis OpenRouter API,
 * normalise les prix, calcule blended_price,
 * génère data/llm-models.latest.json et data/llm-models.latest.md
 * 
 * Usage : node scripts/update-llm-models.mjs
 * Node 20+ requis (native fetch)
 * Zéro dépendance, zéro token LLM consommé
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const JSON_FILE = path.join(DATA_DIR, 'llm-models.latest.json');
const MD_FILE = path.join(DATA_DIR, 'llm-models.latest.md');

const USER_AGENT = 'LLM-Man-Dataset/1.0 (+https://github.com/AtmanTest/llm-man)';

// ===== HELPERS =====
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractVendor(modelId) {
  if (!modelId) return 'Inconnu';
  const parts = modelId.split('/');
  if (parts.length >= 2) {
    const vendor = parts[0];
    // Capitalize nicely
    return vendor.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return modelId;
}

function extractModelName(modelId, displayName) {
  if (displayName && displayName !== modelId) return displayName;
  if (!modelId) return 'Inconnu';
  const parts = modelId.split('/');
  if (parts.length >= 2) {
    // Return the part after the vendor
    return parts.slice(1).join('/');
  }
  return modelId;
}

// ===== COLLECTE DEPUIS OPENROUTER =====
async function collectFromOpenRouter() {
  console.log('[OR] Fetching OpenRouter models...');
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      console.log(`[OR] HTTP ${resp.status}, aborting`);
      return [];
    }
    const data = await resp.json();
    const models = (data.data || data.models || []);
    console.log(`[OR] Got ${models.length} models`);
    return models;
  } catch (e) {
    console.log(`[OR] Failed: ${e.message}`);
    return [];
  }
}

// ===== TRAITEMENT =====
function processModels(orModels) {
  console.log('[PROCESS] Processing models...');
  
  const processed = [];
  const seen = new Set();
  
  for (const m of orModels) {
    const id = m.id || '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    
    const pricing = m.pricing || {};
    const promptPrice = parseFloat(pricing.prompt);
    const completionPrice = parseFloat(pricing.completion);
    
    // Skip models where both prices are 0 or undefined (free models)
    if ((!promptPrice || promptPrice <= 0) && (!completionPrice || completionPrice <= 0)) {
      continue;
    }
    
    const inputUsd = promptPrice > 0 ? promptPrice * 1_000_000 : null;
    const outputUsd = completionPrice > 0 ? completionPrice * 1_000_000 : null;
    
    // Calculate blended if both exist
    let blended = null;
    if (inputUsd != null && outputUsd != null) {
      blended = parseFloat(((inputUsd + outputUsd * 3) / 4).toFixed(6));
    } else if (inputUsd != null) {
      blended = inputUsd;
    } else if (outputUsd != null) {
      blended = outputUsd;
    }
    
    // Extract name and vendor
    const vendor = extractVendor(id);
    const name = extractModelName(id, m.name);
    
    // Determine context window
    let context = m.context_length || null;
    if (context == null && m.metadata?.context_length) context = m.metadata.context_length;
    if (context == null && m.top_provider?.context_length) context = m.top_provider.context_length;
    if (context != null) context = Math.round(context);
    
    // Architecture info
    const architecture = m.architecture || m.metadata?.architecture || {};
    const modalities = m.modalities || m.metadata?.modalities || null;
    
    // Determine multimodal
    let multimodal = null;
    if (modalities && Array.isArray(modalities)) {
      multimodal = modalities.some(mod => 
        typeof mod === 'string' && (mod.toLowerCase().includes('image') || mod.toLowerCase().includes('vision'))
      );
    } else if (architecture?.modality) {
      multimodal = architecture.modality === 'multimodal';
    } else {
      // Check if model ID suggests vision
      multimodal = id.toLowerCase().includes('vision') || id.toLowerCase().includes('multimodal');
      if (!multimodal) multimodal = null; // uncertain
    }
    
    // Describe the model
    let bestFor = null;
    if (blended != null) {
      if (blended < 0.1) bestFor = '💰 Ultra low-cost';
      else if (blended < 0.5) bestFor = '👍 Bon marché';
      else if (blended < 2) bestFor = '💰 Abordable';
      else if (blended < 10) bestFor = '🔋 Milieu de gamme';
      else if (blended < 50) bestFor = '⚡ Premium';
      else bestFor = '👑 Très haut de gamme';
    }
    
    // Determine status based on naming conventions
    let status = 'open-weight'; // default guess
    const idLower = id.toLowerCase();
    if (idLower.includes('gpt-4') || idLower.includes('gpt-4o') || 
        idLower.includes('claude-3.5') || idLower.includes('claude-3-opus') ||
        idLower.includes('gemini-2.0') || idLower.includes('grok') ||
        idLower.includes('gemini-exp')) {
      if (!idLower.includes('free')) status = 'frontier';
    }
    if (idLower.includes('gguf') || idLower.includes('local') || idLower.includes('7b') || 
        idLower.includes('8b') || idLower.includes('13b') || idLower.includes('30b') ||
        idLower.includes('70b') || idLower.includes('120b') || idLower.includes('180b')) {
      status = status === 'frontier' ? 'frontier' : 'open-weight';
    }
    
    processed.push({
      id: id,
      name: name,
      vendor: vendor,
      status: status,
      multimodal: multimodal,
      context_window_tokens: context,
      pricing: {
        input_usd_per_1m: inputUsd != null ? parseFloat(inputUsd.toFixed(6)) : null,
        output_usd_per_1m: outputUsd != null ? parseFloat(outputUsd.toFixed(6)) : null,
        blended_usd_per_1m: blended,
      },
      best_for: bestFor,
      updated_at: new Date().toISOString().split('T')[0],
      source: 'https://openrouter.ai/api/v1/models',
    });
  }
  
  // Sort: alphabetically by vendor then name
  processed.sort((a, b) => {
    const v = a.vendor.localeCompare(b.vendor);
    if (v !== 0) return v;
    return a.name.localeCompare(b.name);
  });
  
  console.log(`[PROCESS] ${processed.length} models with pricing`);
  return processed;
}

// ===== GÉNÉRATION MARKDOWN =====
function generateMarkdown(models, date) {
  let md = `# 📊 Puissance et Prix des LLMs — ${date}\n\n`;
  md += `> Mise à jour automatique quotidienne. Source : OpenRouter API. ${models.length} modèles.\n\n`;
  
  // Stats
  const withContext = models.filter(m => m.context_window_tokens != null).length;
  const withInput = models.filter(m => m.pricing.input_usd_per_1m != null).length;
  const withOutput = models.filter(m => m.pricing.output_usd_per_1m != null).length;
  
  md += `**Statistiques :** ${models.length} modèles | Prix input: ${withInput} | Prix output: ${withOutput} | Contexte connu: ${withContext}\n\n`;
  
  // Top 5 cheapest with good context
  const topCheap = models
    .filter(m => m.pricing.blended_usd_per_1m != null && m.context_window_tokens != null && m.context_window_tokens >= 32000)
    .sort((a, b) => a.pricing.blended_usd_per_1m - b.pricing.blended_usd_per_1m)
    .slice(0, 5);
  
  md += `## 🏆 Top 5 moins chers (context ≥ 32K)\n\n`;
  md += `| Modèle | Blended/1M | Contexte |\n`;
  md += `|--------|-----------|---------|\n`;
  for (const m of topCheap) {
    md += `| ${m.id} | $${m.pricing.blended_usd_per_1m.toFixed(4)} | ${(m.context_window_tokens / 1000).toFixed(0)}K |\n`;
  }
  
  md += `\n## Tableau complet (${models.length} modèles)\n\n`;
  md += `| Modèle | Éditeur | Input/1M | Output/1M | Blended/1M | Contexte | Best for |\n`;
  md += `|--------|---------|----------|-----------|------------|---------|----------|\n`;
  
  for (const m of models) {
    const inp = m.pricing.input_usd_per_1m != null ? '$' + m.pricing.input_usd_per_1m.toFixed(4) : '—';
    const out = m.pricing.output_usd_per_1m != null ? '$' + m.pricing.output_usd_per_1m.toFixed(4) : '—';
    const blend = m.pricing.blended_usd_per_1m != null ? '$' + m.pricing.blended_usd_per_1m.toFixed(4) : '—';
    const ctx = m.context_window_tokens != null ? (m.context_window_tokens / 1000).toFixed(0) + 'K' : '—';
    const best = m.best_for || '—';
    md += `| ${m.id} | ${m.vendor} | ${inp} | ${out} | ${blend} | ${ctx} | ${best} |\n`;
  }
  
  md += `\n## Méthodologie\n\n`;
  md += `- Source : OpenRouter API (prix temps réel, par token convertis en USD/1M tokens)\n`;
  md += `- **Blended Price** = (input + output × 3) / 4\n`;
  md += `- Modèles gratuits (prix = 0) exclus\n`;
  md += `- Mise à jour : quotidienne via GitHub Actions\n`;
  md += `- Zéro consommation de tokens LLM — simple collecte HTTP\n`;
  md += `- ${date}\n`;
  
  return md;
}

// ===== MAIN =====
async function main() {
  console.log('=== LLM Man — Dataset Puissance & Prix ===');
  console.log(`Date: ${new Date().toISOString()}`);
  
  // Collecte
  const orModels = await collectFromOpenRouter();
  if (orModels.length === 0) {
    console.error('[FATAL] No models collected, aborting');
    process.exit(1);
  }
  
  // Traitement
  const models = processModels(orModels);
  console.log(`Processed: ${models.length} models with valid pricing`);
  
  // Sortie
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  const date = new Date().toISOString().split('T')[0];
  
  // JSON compact
  const output = {
    updatedAt: new Date().toISOString(),
    total: models.length,
    currency: 'USD',
    source: 'https://openrouter.ai/api/v1/models',
    methodology: 'Blended = (input + output × 3) / 4. Free models excluded.',
    models,
  };
  
  fs.writeFileSync(JSON_FILE, JSON.stringify(output));
  console.log(`✓ Wrote ${JSON_FILE} (${(fs.statSync(JSON_FILE).size / 1024).toFixed(1)} KB, ${models.length} models)`);
  
  // Markdown
  const md = generateMarkdown(models, date);
  fs.writeFileSync(MD_FILE, md);
  console.log(`✓ Wrote ${MD_FILE} (${(fs.statSync(MD_FILE).size / 1024).toFixed(1)} KB)`);
  
  console.log('\n=== DONE ===');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
