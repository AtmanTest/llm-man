const fs = require('fs');
const Parser = require('rss-parser');
const parser = new Parser({
  headers: { 'User-Agent': 'LLM-Man-News/1.0' },
  timeout: 8000
});

const QUERIES = encodeURIComponent('"LLM testing" OR "AI agents" OR "AI testing" OR "LLM evaluation" OR "LLM quality"');
const NEWS_FILE = 'news.json';

// Sources RSS
const RSS_FEEDS = [
  { url: 'https://dev.to/feed/tag/llm', source: 'Dev.to #LLM' },
  { url: 'https://dev.to/feed/tag/testing', source: 'Dev.to #Testing' },
  { url: 'https://dev.to/feed/tag/ai', source: 'Dev.to #AI' },
  { url: 'https://blog.agent.ai/rss.xml', source: 'Agent AI Blog' },
  { url: 'https://blog.actionagents.co/feed', source: 'ActionAgents' },
  { url: 'https://lyzr.ai/feed/', source: 'Lyzr AI' },
  { url: 'https://medium.com/feed/tag/llm', source: 'Medium #LLM' },
  { url: 'https://www.reddit.com/r/LocalLLaMA/.rss', source: 'Reddit r/LocalLLaMA' },
];

// Mots-clés pour le filtrage
const KEYWORDS = [
  'llm', 'testing', 'agent', 'eval', 'benchmark', 'hallucination',
  'rag', 'prompt', 'fine-tuning', 'quality', 'guardrails', 'red team',
  'automation', 'pipeline', 'deployment', 'monitoring'
];

function isRelevant(article) {
  if (!article.title && !article.contentSnippet) return false;
  const text = ((article.title || '') + ' ' + (article.contentSnippet || '')).toLowerCase();
  return KEYWORDS.some(kw => text.includes(kw));
}

async function fetchTensorFeed() {
  try {
    const res = await fetch('https://tensorfeed.ai/api/news');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.articles || data.data || []);
    return items.filter(item => {
      const t = (item.title || '').toLowerCase();
      return KEYWORDS.some(kw => t.includes(kw));
    }).map(item => ({
      title: item.title || 'Sans titre',
      url: item.url || item.link || '#',
      source: item.source || 'TensorFeed',
      date: item.date || item.publishedAt || new Date().toISOString(),
      type: 'API - TensorFeed'
    }));
  } catch (e) {
    console.error('TensorFeed error:', e.message);
    return [];
  }
}

async function fetchAllRSS() {
  let results = [];
  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = parsed.items
        .filter(isRelevant)
        .map(item => ({
          title: item.title || 'Sans titre',
          url: item.link || '#',
          source: feed.source || parsed.title || 'RSS',
          date: item.isoDate || item.pubDate || new Date().toISOString(),
          type: 'RSS'
        }));
      results = results.concat(items);
      console.log(`RSS ${feed.source}: ${items.length} articles`);
    } catch (e) {
      console.error(`RSS error (${feed.url}):`, e.message);
    }
  }
  return results;
}

async function main() {
  console.log('🚀 LLM Man — Récupération des news LLM & Agents...');
  console.log(`Début: ${new Date().toISOString()}\n`);

  const [tensorData, rssData] = await Promise.all([
    fetchTensorFeed(),
    fetchAllRSS()
  ]);

  let allNews = [...tensorData, ...rssData];

  // Déduplication par URL
  const unique = Array.from(new Map(allNews.map(item => [item.url, item])).values());

  // Tri par date (plus récent d'abord)
  unique.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  // Limiter à 100 articles max
  const final = unique.slice(0, 100);

  // Timestamp de mise à jour
  const output = {
    updatedAt: new Date().toISOString(),
    total: final.length,
    sources: {
      tensorfeed: tensorData.length > 0,
      rssFeeds: RSS_FEEDS.map(f => f.source)
    },
    articles: final
  };

  fs.writeFileSync(NEWS_FILE, JSON.stringify(output, null, 2));
  console.log(`\n✅ Terminé: ${final.length} articles sauvegardés dans ${NEWS_FILE}`);
  console.log(`   TensorFeed: ${tensorData.length}`);
  console.log(`   RSS: ${rssData.length}`);
  console.log(`   Total uniques: ${final.length}`);
}

main().catch(e => {
  console.error('❌ Erreur fatale:', e);
  process.exit(1);
});
