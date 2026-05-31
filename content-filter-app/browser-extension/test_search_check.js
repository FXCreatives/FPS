// Simple test harness for checkSearchQuery logic (Node.js)
const searchKeywords = [
    '18+', '18 plus', 'porn', 'pornography', 'xxx', 'adult', 'nsfw', 'sex', 'hentai', 'pornhub', 'xvideos', 'xhamster'
];
const searchQueryParamNames = ['q', 'query', 'p', 'text', 'search'];

function checkSearchQuery(url) {
    try {
        const u = new URL(url);

        const host = u.hostname.toLowerCase();
        const isSearchHost = host.includes('google') || host.includes('bing') || host.includes('duckduckgo') || host.includes('yahoo') || host.includes('yandex');
        const looksLikeSearchPath = u.pathname && u.pathname.toLowerCase().includes('search');

        if (!isSearchHost && !looksLikeSearchPath) return null;

        const params = new URLSearchParams(u.search);
        let combined = '';
        for (const k of searchQueryParamNames) {
            if (params.has(k)) combined += ' ' + (params.get(k) || '');
        }

        if (!combined) return null;

        const text = decodeURIComponent(combined).toLowerCase();

        for (const kw of searchKeywords) {
            if (text.includes(kw)) {
                return {
                    isBlocked: true,
                    category: 'search-query',
                    riskScore: 90,
                    recommendation: 'block'
                };
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

const tests = [
    'https://www.google.com/search?q=18%2B+videos',
    'https://www.google.com/search?q=cute+cats',
    'https://www.bing.com/search?q=porn',
    'https://duckduckgo.com/?q=sex+toys',
    'https://www.google.com/search?query=hentai+art',
    'https://www.google.com/search?q=how+to+cook',
    'https://example.com/?q=porn'
];

for (const t of tests) {
    const res = checkSearchQuery(t);
    console.log(t);
    if (res && res.isBlocked) {
        console.log(' => BLOCKED:', res.category, res.riskScore);
    } else {
        console.log(' => ALLOWED');
    }
}

process.exit(0);
