#!/usr/bin/env node
'use strict';

// Collect YouTube Data API candidates for adult review only.
// This script never publishes directly into content/watch-learn-catalog.json.

const fs = require('node:fs');
const path = require('node:path');

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_DATA_API_KEY;
const MAX_PAGES = Math.min(3, Math.max(1, Number.parseInt(process.env.MAX_PAGES_PER_QUERY || '3', 10) || 2));
const MAX_QUERIES = Math.min(14, Math.max(1, Number.parseInt(process.env.MAX_SEARCH_QUERIES || '14', 10) || 14));
const OUT = process.env.CANDIDATE_OUTPUT || path.join('artifacts', 'watch-learn-candidates.json');

const plans = [
  { stageId: 'playgroup', language: 'en', query: 'preschool learning colors shapes animals songs for toddlers' },
  { stageId: 'playgroup', language: 'hi', query: 'प्लेग्रुप बच्चों के रंग आकार जानवर सीखने के वीडियो' },
  { stageId: 'nursery', language: 'en', query: 'nursery school counting colors phonics learning for kids' },
  { stageId: 'nursery', language: 'hi', query: 'नर्सरी बच्चों की गिनती रंग हिंदी सीखने के वीडियो' },
  { stageId: 'lkg', language: 'en', query: 'LKG phonics letter sounds numbers educational lesson' },
  { stageId: 'lkg', language: 'hi', query: 'एलकेजी हिंदी वर्णमाला अक्षर संख्या सीखने के वीडियो' },
  { stageId: 'ukg', language: 'en', query: 'UKG early reading short words counting educational lesson' },
  { stageId: 'ukg', language: 'hi', query: 'यूकेजी हिंदी पढ़ना शब्द गिनती शैक्षिक वीडियो' },
  { stageId: 'class-1', language: 'en', query: 'Class 1 English phonics maths science educational lesson' },
  { stageId: 'class-1', language: 'hi', query: 'कक्षा 1 हिंदी गणित विज्ञान शैक्षिक पाठ वीडियो' },
  { stageId: 'class-2', language: 'en', query: 'Class 2 reading comprehension maths science educational lesson' },
  { stageId: 'class-2', language: 'hi', query: 'कक्षा 2 हिंदी पढ़ना गणित पर्यावरण अध्ययन वीडियो' },
  { stageId: 'class-3', language: 'en', query: 'Class 3 reading mathematics science educational lesson' },
  { stageId: 'class-3', language: 'hi', query: 'कक्षा 3 हिंदी गणित विज्ञान शैक्षिक पाठ वीडियो' }
];

function fail(message) {
  console.error(message);
  process.exit(1);
}
async function api(resource, params) {
  const url = new URL(API_BASE + '/' + resource);
  for (const [key, value] of Object.entries({ ...params, key: API_KEY })) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  let response;
  try {
    response = await fetch(url, { headers: { accept: 'application/json' } });
  } catch (_) {
    throw new Error(resource + ' request failed before receiving a response');
  }
  if (!response.ok) {
    // Never log the request URL: the API key is a query parameter.
    throw new Error(resource + ' returned HTTP ' + response.status + '. Check API enablement, quota and secret configuration.');
  }
  return response.json();
}
async function main() {
  if (!API_KEY) fail('Missing YOUTUBE_DATA_API_KEY. Add it as a GitHub Actions repository secret before running candidate discovery.');
  const selectedPlans = plans.slice(0, MAX_QUERIES);
  const found = new Map();
  let searchCalls = 0;

  for (const plan of selectedPlans) {
    let pageToken;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const data = await api('search', {
        part: 'snippet',
        type: 'video',
        q: plan.query,
        maxResults: 50,
        pageToken,
        safeSearch: 'strict',
        videoEmbeddable: 'true',
        videoSyndicated: 'true',
        regionCode: 'IN',
        relevanceLanguage: plan.language,
        order: 'relevance'
      });
      searchCalls += 1;
      for (const item of data.items || []) {
        const videoId = item.id?.videoId;
        if (!videoId) continue;
        const existing = found.get(videoId) || {
          youtubeVideoId: videoId,
          queryMatches: [],
          rawTitle: item.snippet?.title || '',
          rawDescription: item.snippet?.description || '',
          channelId: item.snippet?.channelId || '',
          channelTitle: item.snippet?.channelTitle || '',
          thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
          publishedAt: item.snippet?.publishedAt || null,
          reviewStatus: 'pending-review'
        };
        existing.queryMatches.push({ stageId: plan.stageId, language: plan.language, query: plan.query });
        found.set(videoId, existing);
      }
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
  }

  const ids = [...found.keys()];
  const details = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const data = await api('videos', { part: 'snippet,contentDetails,status', id: batch.join(',') });
    for (const item of data.items || []) details.set(item.id, item);
  }

  const candidates = [];
  for (const [id, base] of found.entries()) {
    const detail = details.get(id);
    if (!detail) continue;
    const status = detail.status || {};
    const snippet = detail.snippet || {};
    const duration = detail.contentDetails?.duration || '';
    const durationMatch = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    const durationSeconds = durationMatch
      ? (Number(durationMatch[1] || 0) * 3600 + Number(durationMatch[2] || 0) * 60 + Number(durationMatch[3] || 0))
      : null;
    candidates.push({
      ...base,
      rawTitle: snippet.title || base.rawTitle,
      rawDescription: snippet.description || base.rawDescription,
      channelId: snippet.channelId || base.channelId,
      channelTitle: snippet.channelTitle || base.channelTitle,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || base.thumbnailUrl,
      publishedAt: snippet.publishedAt || base.publishedAt,
      durationSeconds,
      privacyStatus: status.privacyStatus || 'unknown',
      embeddable: status.embeddable === true,
      madeForKidsStatus: status.madeForKids === true || status.selfDeclaredMadeForKids === true ? 'reported-made-for-kids' :
        status.madeForKids === false || status.selfDeclaredMadeForKids === false ? 'reported-not-made-for-kids' : 'unknown',
      reviewStatus: 'pending-review',
      reviewRequired: true
    });
  }

  candidates.sort((a, b) => {
    const stageA = a.queryMatches[0]?.stageId || '';
    const stageB = b.queryMatches[0]?.stageId || '';
    return stageA.localeCompare(stageB) || a.rawTitle.localeCompare(b.rawTitle);
  });
  const output = {
    generatedAt: new Date().toISOString(),
    source: 'YouTube Data API v3',
    reviewStatus: 'pending-review',
    publishable: false,
    queryCount: selectedPlans.length,
    searchApiCalls: searchCalls,
    maxPagesPerQuery: MAX_PAGES,
    candidateCount: candidates.length,
    notes: [
      'Candidate discovery only; no record in this file is approved for children.',
      'Search ranking and SafeSearch are not substitutes for adult content review.',
      'Review channel identity, exact video content, age suitability, curriculum fit, language, availability, embed behaviour and applicable YouTube policies.',
      'Never copy this artifact directly into the published catalogue.'
    ],
    candidates
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n', { mode: 0o600 });
  console.log('Candidate discovery complete: ' + candidates.length + ' candidate(s), ' + searchCalls + ' search request(s). Output: ' + OUT);
  console.log('All records remain pending review. No production catalogue was changed.');
}
main().catch(error => fail(error.message || 'Candidate discovery failed.'));
