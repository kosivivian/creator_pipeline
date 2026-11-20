import { workflow, node, trigger, sticky, newCredential, ifElse, merge, expr } from '@n8n/workflow-sdk';

const SB = 'https://wrasywunmrhhgwxcxngc.supabase.co/rest/v1';

const weekly = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Every Monday 07:00',
    parameters: { rule: { interval: [{ field: 'weeks', weeksInterval: 1, triggerAtDay: [1], triggerAtHour: 7, triggerAtMinute: 0 }] } },
    output: [{ timestamp: '2026-11-16T07:00:00+01:00' }]
  }
});

const manual = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Run Finder now', output: [{}] }
});

const settings = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Finder Settings',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 's1', name: 'tagsPerNiche', value: 2, type: 'number' },
          { id: 's2', name: 'postsPerTag', value: 15, type: 'number' },
          { id: 's3', name: 'maxProfiles', value: 100, type: 'number' },
          { id: 's4', name: 'maxCommentCreators', value: 10, type: 'number' },
          { id: 's5', name: 'postsPerCreator', value: 3, type: 'number' },
          { id: 's6', name: 'commentsPerPost', value: 20, type: 'number' },
          { id: 's7', name: 'minFollowers', value: 10000, type: 'number' },
          { id: 's8', name: 'maxFollowers', value: 300000, type: 'number' },
          { id: 's9', name: 'minEngagement', value: 1, type: 'number' },
          { id: 's11', name: 'reviewEngagement', value: 0.5, type: 'number' },
          { id: 's12', name: 'reviewMinComments', value: 15, type: 'number' },
          { id: 's13', name: 'maxDaysSincePost', value: 14, type: 'number' },
          { id: 's10', name: 'priceUsd', value: 97, type: 'number' }
        ]
      }
    },
    output: [{ tagsPerNiche: 2, postsPerTag: 15, maxProfiles: 100, maxCommentCreators: 10, postsPerCreator: 3, commentsPerPost: 20, minFollowers: 10000, maxFollowers: 300000, minEngagement: 1, reviewEngagement: 0.5, reviewMinComments: 15, maxDaysSincePost: 14, priceUsd: 97 }]
  }
});

const logStart = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Log Run Start',
    parameters: {
      method: 'POST',
      url: SB + '/agent_runs',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'supabaseApi',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Prefer', value: 'return=representation' }] },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: '{"agent":"finder","status":"running"}'
    },
    credentials: { supabaseApi: newCredential('Supabase creator-pipeline') },
    output: [{ id: 'run-uuid', agent: 'finder', status: 'running' }]
  }
});

const getNiches = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Get Active Niches',
    executeOnce: true,
    parameters: {
      method: 'GET',
      url: SB + '/niches?active=eq.true&select=id,name,hashtags,demand_keywords',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'supabaseApi'
    },
    credentials: { supabaseApi: newCredential('Supabase creator-pipeline') },
    output: [{ id: 'niche-1', name: 'Relationships & dating', hashtags: ['lagosdating'], demand_keywords: ['teach me'] }]
  }
});

const getKnown = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Get Known Creators',
    executeOnce: true,
    alwaysOutputData: true,
    parameters: {
      method: 'GET',
      url: SB + '/creators?select=handle&limit=10000',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'supabaseApi'
    },
    credentials: { supabaseApi: newCredential('Supabase creator-pipeline') },
    output: [{ handle: 'someone' }]
  }
});

const buildTags = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Pick Hashtags',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const cfg = $('Finder Settings').first().json;
const niches = $('Get Active Niches').all().map(i => i.json).filter(n => n.id);
const directUrls = [];
for (const n of niches) {
  const tags = [...(n.hashtags || [])].sort(() => Math.random() - 0.5).slice(0, cfg.tagsPerNiche);
  for (const t of tags) directUrls.push('https://www.instagram.com/explore/tags/' + encodeURIComponent(t) + '/');
}
return [{ json: { directUrls, postsPerTag: cfg.postsPerTag } }];`
    },
    output: [{ directUrls: ['https://www.instagram.com/explore/tags/lagosdating/'], postsPerTag: 15 }]
  }
});

const scrapePosts = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Scrape Hashtag Posts',
    parameters: {
      method: 'POST',
      url: 'https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpTemplatedCustomAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ directUrls: $json.directUrls, resultsType: "posts", resultsLimit: $json.postsPerTag, addParentData: false }) }}'),
      options: { timeout: 300000 }
    },
    credentials: { httpTemplatedCustomAuth: newCredential('Apify token') },
    output: [{ ownerUsername: 'creator_one', inputUrl: 'https://www.instagram.com/explore/tags/lagosdating/', caption: 'Talking stage tips #lagosdating', hashtags: ['lagosdating'] }]
  }
});

const pickNew = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Pick New Creators',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const cfg = $('Finder Settings').first().json;
const niches = $('Get Active Niches').all().map(i => i.json).filter(n => n.id);
const known = new Set($('Get Known Creators').all().map(i => (i.json.handle || '').toLowerCase()).filter(Boolean));
const tagToNiche = {};
for (const n of niches) for (const t of (n.hashtags || [])) tagToNiche[t.toLowerCase()] = n.id;
const seen = {};
for (const it of $input.all()) {
  const p = it.json;
  const u = (p.ownerUsername || '').toLowerCase();
  if (!u || known.has(u)) continue;
  const fromUrl = ((p.inputUrl || '').match(/tags\\/([^/?]+)/) || [])[1];
  const tags = [fromUrl, ...(p.hashtags || [])].filter(Boolean).map(t => decodeURIComponent(t).toLowerCase());
  const nicheId = tags.map(t => tagToNiche[t]).find(Boolean) || null;
  if (!seen[u]) seen[u] = { count: 0, nicheId };
  seen[u].count += 1;
  if (!seen[u].nicheId && nicheId) seen[u].nicheId = nicheId;
}
const ranked = Object.entries(seen).sort((a, b) => b[1].count - a[1].count).slice(0, cfg.maxProfiles);
const nicheByUser = Object.fromEntries(ranked.map(([u, v]) => [u, v.nicheId]));
return [{ json: { usernames: ranked.map(r => r[0]), nicheByUser, postsScanned: $input.all().length } }];`
    },
    output: [{ usernames: ['creator_one'], nicheByUser: { creator_one: 'niche-1' }, postsScanned: 45 }]
  }
});

const anyNew = ifElse({
  version: 2.2,
  config: {
    name: 'Any New Creators?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.usernames }}'), operator: { type: 'array', operation: 'notEmpty', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const scrapeProfiles = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Scrape Profiles',
    parameters: {
      method: 'POST',
      url: 'https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpTemplatedCustomAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ usernames: $json.usernames }) }}'),
      options: { timeout: 300000 }
    },
    credentials: { httpTemplatedCustomAuth: newCredential('Apify token') },
    output: [{ username: 'creator_one', fullName: 'Creator One', biography: 'Lagos | dating tips', externalUrl: 'https://linktr.ee/creatorone', followersCount: 32000, latestPosts: [{ url: 'https://www.instagram.com/p/abc/', caption: 'abeg', commentsCount: 120, likesCount: 2400, timestamp: '2026-11-10T10:00:00.000Z', displayUrl: 'https://img' }] }]
  }
});

const audit = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Audit Profiles',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const cfg = $('Finder Settings').first().json;
const nicheByUser = $('Pick New Creators').first().json.nicheByUser || {};
const DIGITAL_STORE = /(selar\\.(co|com)|stan\\.store|gumroad|mainstack|payhip|kajabi|teachable|thinkific|podia|systeme\\.io|chariow|nestuge|learnworlds|skool\\.com|thecreatorshop)/i;
const MAYBE_STORE = /(shopify|myshopify|paystack\\.(shop|com)|flutterwave\\.(store|com)|paypal\\.me|selfany|koji|conectr\\.me|calendly|eventbrite|bit\\.ly)/i;
const PRODUCT_WORDS = /(e-?book|masterclass|my course|\\/course|enrol|enroll|academy|cohort|bootcamp|grab my|buy my|get my guide|digital product|pre-?order my)/i;
const LINKPAGE = /(linktr\\.ee|beacons\\.ai|bio\\.link|linkin\\.bio|lnk\\.bio|taplink|campsite\\.bio|solo\\.to|msha\\.ke|snipfeed|komi\\.io|hoo\\.be|withkoji)/i;
const NG_PLACE = /(lagos|abuja|nigeria|naija|(^|[^a-z0-9])9ja|port ?harcourt|ibadan|enugu|owerri|kaduna|\\bkano\\b|benin city|asaba|\\buyo\\b|calabar|abeokuta|ilorin|\\bjos\\b|\\+234|₦|\\bnaira\\b|🇳🇬|,\\s*ng\\b)/i;
const NG_SLANG = /\\b(abeg|wahala|omo|oya|chai|jare|wetin|owambe|jollof|japa|danfo|abi|shey|sef|ehn|o jare|na so|una)\\b/i;
const FACELESS = /(\\bai\\b|a\\.i\\.|animation|animated|cartoon|stickman|\\bfilms?\\b|storyteller|story time|stories|skits? channel|memes?|compilation)/i;
const BRAND = /(welcome to|official (page|account)|\\bwe (are|make|sell|deliver)|our (store|products|brand)|shop now|order now|\\bltd\\b|limited|enterprises|\\bnews\\b|updates|\\bgist\\b|\\bblog\\b|\\btv\\b|media|magazine)/i;
const BRAND_CATEGORY = /(product\\/service|brand|company|shopping|retail|media|news|entertainment website|publisher|magazine|baby goods|kids store)/i;
const EMAIL = /[\\w.+-]+@[\\w-]+\\.[\\w.]+/;
const LEAD_MAGNET = /(comment ["“']?[A-Z]{3,}["”']?\\b|free (money |)guide|free (e-?book|checklist|template|class|webinar|session)|join (my|our) (free )?(whatsapp|telegram|community)|dm me ["“']?[A-Z]{3,})/;
const DAY = 86400000;
const out = [];
for (const it of $input.all()) {
  const p = it.json;
  if (!p.username) continue;
  const followers = p.followersCount || 0;
  const posts = (p.latestPosts || []).filter(x => x && x.url);
  const links = [p.externalUrl, ...((p.externalUrls || []).map(x => x && x.url))].filter(Boolean);
  const bio = p.biography || '';
  const name = p.fullName || '';
  const captions = posts.map(x => x.caption || '').join(' \\n ');
  const likesHidden = posts.length > 0 && posts.every(x => x.likesCount == null || x.likesCount < 0);
  const eng = x => (likesHidden ? 0 : Math.max(x.likesCount || 0, 0)) + Math.max(x.commentsCount || 0, 0);
  const avgEng = posts.length ? posts.reduce((s, x) => s + eng(x), 0) / posts.length : 0;
  const er = followers ? Math.round((avgEng / followers) * 1000) / 10 : 0;
  const now = Date.now();
  const recent = posts.filter(x => x.timestamp && now - new Date(x.timestamp).getTime() < 30 * DAY).length;
  const newest = posts.map(x => new Date(x.timestamp || 0).getTime()).sort((a, b) => b - a)[0] || 0;
  const digitalStore = links.find(l => DIGITAL_STORE.test(l));
  const maybeStore = links.find(l => MAYBE_STORE.test(l));
  const linkPage = links.find(l => LINKPAGE.test(l));
  const productInText = PRODUCT_WORDS.test(bio) || links.some(l => PRODUCT_WORDS.test(l));
  const text = p.username + ' ' + bio + ' ' + name + ' ' + captions;
  const ngPlace = text.match(NG_PLACE);
  const ngSlang = text.match(NG_SLANG);
  const faceless = FACELESS.test(bio + ' ' + name + ' ' + p.username);
  const brand = BRAND.test(bio + ' ' + name) || BRAND_CATEGORY.test(p.businessCategoryName || '');
  const email = (bio.match(EMAIL) || [])[0] || p.businessEmail || p.publicEmail || null;
  const a = {
    followers_in_range: followers >= cfg.minFollowers && followers <= cfg.maxFollowers,
    real_engagement: er >= cfg.minEngagement,
    contact_email: !!email,
    business_links: links.length > 0,
    no_digital_product: !digitalStore && !productInText,
    niche_fit: !!nicheByUser[p.username.toLowerCase()],
    buying_power: er >= 2 && followers >= cfg.minFollowers,
    posts_consistently: recent >= 4 && now - newest < cfg.maxDaysSincePost * DAY
  };
  const reasons = [];
  if (!a.followers_in_range) reasons.push('followers outside ' + cfg.minFollowers + '-' + cfg.maxFollowers);
  if (!a.no_digital_product) reasons.push('already sells something (' + (digitalStore || 'bio mentions a product') + ')');
  if (!ngPlace && !ngSlang) reasons.push('no Nigerian signal');
  if (!a.posts_consistently) reasons.push('not posting consistently');
  const avgComments = posts.length ? posts.reduce((s, x) => s + Math.max(x.commentsCount || 0, 0), 0) / posts.length : 0;
  const lowButTalkative = !a.real_engagement && er >= cfg.reviewEngagement && avgComments >= cfg.reviewMinComments;
  if (!a.real_engagement && !lowButTalkative) reasons.push('engagement ' + er + '% is under ' + cfg.minEngagement + '%');
  const review = [];
  if (maybeStore && a.no_digital_product) review.push('has a ' + maybeStore.replace(/^https?:\\/\\//, '').split('/')[0] + ' link that may sell digital products');
  if (!ngPlace && ngSlang) review.push('only Nigerian slang ("' + ngSlang[0] + '"), no Nigerian place');
  if (faceless) review.push('may be a faceless, AI or animation page');
  if (brand) review.push('may be a brand or media page, not a person');
  if (likesHidden) review.push('likes are hidden; engagement uses comments only');
  if (lowButTalkative) review.push('engagement is only ' + er + '% but posts average ' + Math.round(avgComments) + ' comments');
  const leadMagnet = (captions + ' ' + bio).match(LEAD_MAGNET);
  out.push({ json: {
    handle: p.username,
    full_name: p.fullName || null,
    profile_url: 'https://www.instagram.com/' + p.username + '/',
    niche_id: nicheByUser[p.username.toLowerCase()] || null,
    followers,
    avg_likes: posts.length && !likesHidden ? Math.round(posts.reduce((s, x) => s + Math.max(x.likesCount || 0, 0), 0) / posts.length) : null,
    avg_comments: posts.length ? Math.round(posts.reduce((s, x) => s + Math.max(x.commentsCount || 0, 0), 0) / posts.length) : null,
    engagement_rate: er,
    bio,
    bio_link: links[0] || null,
    link_type: digitalStore ? 'store' : linkPage ? 'linkinbio' : links.length ? 'website' : 'none',
    link_page: linkPage || null,
    contact_email: email,
    location_signal: ngPlace ? 'Mentions "' + ngPlace[0].trim() + '"' : ngSlang ? 'Uses Nigerian slang "' + ngSlang[0] + '"' : null,
    audit: a,
    passes: reasons.length === 0,
    lead_magnet: leadMagnet ? leadMagnet[0] : null,
    reject_reasons: reasons,
    review_reasons: review,
    recent_posts: posts.slice(0, 6).map(x => ({ url: x.url, caption: (x.caption || '').slice(0, 400), comments: x.commentsCount || 0, likes: likesHidden ? null : x.likesCount || 0, posted_at: x.timestamp || null, image: x.displayUrl || null })),
    profile_pic: p.profilePicUrlHD || p.profilePicUrl || null
  }});
}
return out;`
    },
    output: [{ handle: 'creator_one', passes: true, link_page: 'https://linktr.ee/creatorone', link_type: 'linkinbio', audit: {}, recent_posts: [], reject_reasons: [] }]
  }
});

const hasLinkPage = ifElse({
  version: 2.2,
  config: {
    name: 'Check Link-in-bio Page?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.passes }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } },
          { leftValue: expr('{{ $json.link_page }}'), operator: { type: 'string', operation: 'notEmpty', singleValue: true } }
        ],
        combinator: 'and'
      }
    }
  }
});

const fetchLinkPage = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Fetch Link-in-bio Page',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: expr('{{ $json.link_page }}'),
      options: { timeout: 15000, response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'page' } } }
    },
    output: [{ page: '<html>linktr.ee ... wa.me ... youtube</html>' }]
  }
});

const markLinkPage = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Look For Store Links',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode: `const c = { ...$('Check Link-in-bio Page?').item.json };
const html = String($json.page || '');
const DIGITAL_STORE = /(selar\\.(co|com)|stan\\.store|gumroad|mainstack|payhip|kajabi|teachable|thinkific|podia|systeme\\.io|chariow|nestuge|learnworlds|skool\\.com)/i;
const MAYBE_STORE = /(myshopify|shopify\\.com|paystack\\.(shop|com)|flutterwave\\.(store|com)|paypal\\.me|conectr\\.me|eventbrite)/i;
const m = html.match(DIGITAL_STORE);
const maybe = html.match(MAYBE_STORE);
if (m) {
  c.audit = { ...c.audit, no_digital_product: false };
  c.passes = false;
  c.reject_reasons = [...(c.reject_reasons || []), 'link-in-bio page has a store link (' + m[0] + ')'];
} else {
  c.link_note = html ? 'Link-in-bio page has no digital store links' : 'Could not read link-in-bio page';
  if (maybe) c.review_reasons = [...(c.review_reasons || []), 'link-in-bio page has a ' + maybe[0] + ' link that may sell digital products'];
}
return { json: c };`
    },
    output: [{ handle: 'creator_one', passes: true, link_note: 'Link-in-bio page has no store links' }]
  }
});

const joinLinkChecks = merge({
  version: 3.2,
  config: { name: 'Join Link Checks', parameters: { mode: 'append' } }
});

const pickPosts = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Pick Posts To Read',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const cfg = $('Finder Settings').first().json;
const survivors = $input.all().map(i => i.json).filter(c => c.passes).sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0)).slice(0, cfg.maxCommentCreators);
const directUrls = [];
for (const c of survivors) {
  const top = [...(c.recent_posts || [])].sort((a, b) => (b.comments || 0) - (a.comments || 0)).slice(0, cfg.postsPerCreator);
  for (const p of top) directUrls.push(p.url);
}
return [{ json: { directUrls, commentsPerPost: cfg.commentsPerPost, readHandles: survivors.map(s => s.handle) } }];`
    },
    output: [{ directUrls: ['https://www.instagram.com/p/abc/'], commentsPerPost: 20, readHandles: ['creator_one'] }]
  }
});

const anyPosts = ifElse({
  version: 2.2,
  config: {
    name: 'Any Posts To Read?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.directUrls }}'), operator: { type: 'array', operation: 'notEmpty', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const scrapeComments = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Scrape Comments',
    parameters: {
      method: 'POST',
      url: 'https://api.apify.com/v2/acts/apify~instagram-comment-scraper/run-sync-get-dataset-items',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpTemplatedCustomAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ directUrls: $json.directUrls, resultsLimit: $json.commentsPerPost }) }}'),
      options: { timeout: 300000 }
    },
    credentials: { httpTemplatedCustomAuth: newCredential('Apify token') },
    output: [{ postUrl: 'https://www.instagram.com/p/abc/', text: 'Please teach me how you do this', ownerUsername: 'fan_1' }]
  }
});

const score = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Score Demand And Build Rows',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const cfg = $('Finder Settings').first().json;
const niches = $('Get Active Niches').all().map(i => i.json).filter(n => n.id);
const kw = new Set(['teach','how do i','how did you','how do you','how can i','how to','tutorial','please do a video','drop the','drop a','please share','can you share','share the','send me','i need this','i need the','where can i learn','where did you learn','do you have a class','class?','course','i wan learn','i want to learn','part 2','more of this','show us how','step by step','guide','mentor','coach me','help me','full video','full plan','recipe','template','checklist']);
for (const n of niches) for (const k of (n.demand_keywords || [])) kw.add(String(k).toLowerCase());
const words = [...kw];
const isAsk = t => { const s = String(t || '').toLowerCase(); return words.some(w => s.includes(w)) || /\\bhow\\b.*\\?/.test(s); };
let comments = [];
try { comments = $('Scrape Comments').all().map(i => i.json); } catch (e) { comments = []; }
const read = new Set(($('Pick Posts To Read').first().json.readHandles || []));
const creators = $('Join Link Checks').all().map(i => i.json);
const norm = x => String(x || '').split('?')[0].replace(/\\/$/, '');
const postOwner = {};
for (const c of creators) for (const p of (c.recent_posts || [])) postOwner[norm(p.url)] = c.handle;
const byCreator = {};
for (const cm of comments) {
  const url = cm.postUrl || cm.inputUrl || '';
  const owner = postOwner[norm(url)] || null;
  if (!owner || !cm.text) continue;
  if ((cm.ownerUsername || '').toLowerCase() === owner.toLowerCase()) continue;
  (byCreator[owner] = byCreator[owner] || []).push({ text: cm.text, username: cm.ownerUsername || null, post_url: url });
}
const rows = [];
let qualified = 0;
let review = 0;
for (const c of creators) {
  const asks = (byCreator[c.handle] || []).filter(x => isAsk(x.text));
  const distinct = [...new Map(asks.map(a => [(a.username || a.text).toLowerCase(), a])).values()];
  const demand = distinct.length;
  const engaged = (c.followers || 0) * ((c.engagement_rate || 0) / 100);
  const est = Math.round(engaged * 0.03 * cfg.priceUsd);
  const wasRead = read.has(c.handle);
  const ok = c.passes;
  const reviewReasons = c.review_reasons || [];
  const stage = ok ? (reviewReasons.length ? 'needs_review' : 'qualified') : 'rejected';
  if (stage === 'qualified') qualified += 1;
  if (stage === 'needs_review') review += 1;
  const reasons = [...(c.reject_reasons || [])];
  const sample = distinct.sort((a, b) => b.text.length - a.text.length).slice(0, 6);
  const parts = [
    (c.followers || 0).toLocaleString('en-US') + ' followers, ' + c.engagement_rate + '% engagement.',
    wasRead ? (demand ? 'Bonus: ' + (demand === 1 ? '1 person' : demand + ' different people') + ' asked to learn in the comments of their top ' + cfg.postsPerCreator + ' posts.' : 'Nobody asked to learn in the comments we read (not required).') : null,
    c.lead_magnet ? 'Bonus: already gives away a free resource ("' + c.lead_magnet + '"), so the audience takes offers but there is nothing to buy.' : null,
    sample[0] ? 'For example: "' + sample[0].text.slice(0, 140) + '".' : null,
    c.link_type === 'none' ? 'No link in bio.' : (c.link_note ? c.link_note + '.' : (c.link_type === 'store' ? 'Has a store link.' : 'Link in bio has no store.')),
    c.location_signal ? c.location_signal + '.' : null,
    stage === 'needs_review' ? 'Needs review: ' + reviewReasons.join('; ') + '.' : null,
    ok ? null : 'Not a lead: ' + reasons.join('; ') + '.'
  ].filter(Boolean);
  rows.push({
    platform: 'instagram',
    handle: c.handle,
    full_name: c.full_name,
    profile_url: c.profile_url,
    niche_id: c.niche_id,
    followers: c.followers,
    avg_likes: c.avg_likes,
    avg_comments: c.avg_comments,
    engagement_rate: c.engagement_rate,
    bio: c.bio,
    bio_link: c.bio_link,
    link_type: c.link_type,
    contact_email: c.contact_email,
    location_signal: c.location_signal,
    audit: { ...c.audit, niche_fit: !!c.niche_id },
    audit_passed: ok,
    review_reasons: stage === 'needs_review' ? reviewReasons : [],
    demand_score: demand,
    evidence_summary: parts.join(' '),
    sample_comments: sample,
    recent_posts: c.recent_posts,
    top_question: sample[0] ? sample[0].text.slice(0, 300) : null,
    est_launch_revenue: est,
    stage
  });
}
return [{ json: { rows, qualified, review, audited: creators.length, commentsRead: comments.length } }];`
    },
    output: [{ rows: [{ handle: 'creator_one', stage: 'qualified' }], qualified: 1, audited: 1, commentsRead: 60 }]
  }
});

const saveCreators = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Save Creators',
    parameters: {
      method: 'POST',
      url: SB + '/creators?on_conflict=platform,handle',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'supabaseApi',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Prefer', value: 'resolution=merge-duplicates,return=minimal' }] },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify($json.rows) }}')
    },
    credentials: { supabaseApi: newCredential('Supabase creator-pipeline') },
    output: [{}]
  }
});

const summarize = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Summarize Run',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const get = (name, f) => { try { return f($(name)); } catch (e) { return null; } };
const posts = get('Pick New Creators', n => n.first().json.postsScanned) || 0;
const s = get('Score Demand And Build Rows', n => n.first().json) || { qualified: 0, review: 0, audited: 0, commentsRead: 0 };
const runId = $('Log Run Start').first().json.id;
const notes = posts === 0 ? 'No new creators found on these hashtags this run.' :
  'Read ' + posts + ' hashtag posts, audited ' + s.audited + ' new profiles, read ' + s.commentsRead + ' comments; ' + s.qualified + ' qualified, ' + (s.review || 0) + ' need your review.';
return [{ json: { runId, body: { status: 'success', finished_at: new Date().toISOString(), items_in: s.audited || 0, items_out: (s.qualified || 0) + (s.review || 0), notes } } }];`
    },
    output: [{ runId: 'run-uuid', body: { status: 'success', items_in: 12, items_out: 3, notes: 'ok' } }]
  }
});

const logFinish = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Log Run Finish',
    parameters: {
      method: 'PATCH',
      url: expr(SB + '/agent_runs?id=eq.{{ $json.runId }}'),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'supabaseApi',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify($json.body) }}')
    },
    credentials: { supabaseApi: newCredential('Supabase creator-pipeline') },
    output: [{}]
  }
});

const onFailure = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'When Finder Fails', output: [{ execution: { error: { message: 'Apify timed out' } } }] }
});

const logError = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Mark Run As Failed',
    parameters: {
      method: 'PATCH',
      url: SB + '/agent_runs?agent=eq.finder&status=eq.running',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'supabaseApi',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ status: "error", finished_at: new Date().toISOString(), notes: "Failed at " + ($json.execution?.lastNodeExecuted || "unknown step") + ": " + ($json.execution?.error?.message || "unknown error") }) }}')
    },
    credentials: { supabaseApi: newCredential('Supabase creator-pipeline') },
    output: [{}]
  }
});

const note = sticky('## Finder\nFinds Nigerian Instagram creators in your active niches, audits them (10k-300k followers, Nigerian, no digital product, posting in the last 14 days, 1%+ engagement), and saves leads to Supabase. People asking to learn in the comments, or a free guide/lead magnet, are a bonus noted in the evidence, not a requirement.\n\n**Cost per run** with these settings is about $2 of Apify credit. Change the numbers in **Finder Settings** to scan more or less.\n\n**Credentials:** `Apify token` (header Authorization: Bearer <token>) and `Supabase creator-pipeline` (service role key).', [], { color: 4 });

export default workflow('creator-finder', 'Creator Pipeline - Finder')
  .add(weekly)
  .to(settings)
  .add(manual)
  .to(settings)
  .add(settings)
  .to(logStart)
  .to(getNiches)
  .to(getKnown)
  .to(buildTags)
  .to(scrapePosts)
  .to(pickNew)
  .to(anyNew
    .onTrue(scrapeProfiles.to(audit).to(hasLinkPage
      .onTrue(fetchLinkPage.to(markLinkPage).to(joinLinkChecks.input(0)))
      .onFalse(joinLinkChecks.input(1))))
    .onFalse(summarize))
  .add(joinLinkChecks)
  .to(pickPosts)
  .to(anyPosts
    .onTrue(scrapeComments.to(score))
    .onFalse(score))
  .add(score)
  .to(saveCreators)
  .to(summarize)
  .add(summarize)
  .to(logFinish)
  .add(onFailure)
  .to(logError)
  .add(note);
