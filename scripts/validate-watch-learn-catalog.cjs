#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const STAGES = new Set(['playgroup', 'nursery', 'lkg', 'ukg', 'class-1', 'class-2', 'class-3']);
const DOMAINS = new Set(['phonics', 'hindi-varnamala', 'literacy', 'numeracy', 'science', 'environment', 'stories', 'art', 'music-movement', 'life-skills', 'reasoning']);
const LANGUAGES = new Set(['en', 'hi', 'both']);
const REVIEW_STATES = new Set(['pending-review', 'approved', 'rejected', 'needs-recheck']);
const APPROVED_REVIEWERS = new Set(['educator', 'parent-reviewer', 'content-editor']);

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}
function isDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && /^\d{4}-\d\d-\d\dT/.test(value);
}
function isYouTubeId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value);
}
function isChannelId(value) {
  return typeof value === 'string' && /^UC[A-Za-z0-9_-]{22}$/.test(value);
}
function validateAllowlist(data) {
  const errors = [];
  const error = (where, message) => errors.push(`${where}: ${message}`);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['allowlist: must be an object'];
  if (data.schemaVersion !== '1.0.0') error('allowlist.schemaVersion', 'must equal 1.0.0');
  if (data.catalogId !== 'little-learners-watch-learn-approved-channels') error('allowlist.catalogId', 'unexpected allowlist ID');
  if (!Array.isArray(data.channels)) return errors.concat('allowlist.channels: must be an array');
  const ids = new Set();
  for (const [i, channel] of data.channels.entries()) {
    const p = `allowlist.channels[${i}]`;
    if (!channel || typeof channel !== 'object' || Array.isArray(channel)) { error(p, 'must be an object'); continue; }
    if (!isChannelId(channel.channelId)) error(p + '.channelId', 'must be a valid-shaped YouTube channel ID');
    if (ids.has(channel.channelId)) error(p + '.channelId', 'duplicate channel ID');
    ids.add(channel.channelId);
    if (typeof channel.channelTitle !== 'string' || !channel.channelTitle.trim() || channel.channelTitle.length > 120) error(p + '.channelTitle', 'must be a non-empty channel title (max 120 chars)');
    if (channel.reviewStatus !== 'approved') error(p + '.reviewStatus', 'only human-approved channels may be allowlisted');
    if (!isDate(channel.reviewedAt)) error(p + '.reviewedAt', 'must be an ISO date-time');
    if (!APPROVED_REVIEWERS.has(channel.reviewedByRole)) error(p + '.reviewedByRole', 'must identify a human reviewer role');
  }
  return errors;
}

function validateCatalog(catalog, allowlist) {
  const errors = [];
  const error = (where, message) => errors.push(`${where}: ${message}`);
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) return ['catalog: must be an object'];
  if (catalog.schemaVersion !== '1.0.0') error('schemaVersion', 'must equal 1.0.0');
  if (catalog.catalogId !== 'little-learners-watch-learn') error('catalogId', 'unexpected catalogue ID');
  if (!['draft', 'pilot', 'published'].includes(catalog.releaseStatus)) error('releaseStatus', 'must be draft, pilot, or published');
  if (!isDate(catalog.updatedAt)) error('updatedAt', 'must be an ISO date-time');
  if (!Array.isArray(catalog.videos)) {
    error('videos', 'must be an array');
    return errors;
  }

  const ids = new Set();
  const videoIds = new Set();
  for (const [i, video] of catalog.videos.entries()) {
    const p = `videos[${i}]`;
    if (!video || typeof video !== 'object' || Array.isArray(video)) { error(p, 'must be an object'); continue; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(video.id || '')) error(p + '.id', 'must be a stable lowercase kebab-case ID');
    if (ids.has(video.id)) error(p + '.id', 'duplicate catalogue ID');
    ids.add(video.id);
    if (!isYouTubeId(video.youtubeVideoId)) error(p + '.youtubeVideoId', 'must be an 11-character YouTube video ID');
    if (videoIds.has(video.youtubeVideoId)) error(p + '.youtubeVideoId', 'duplicate YouTube video ID');
    videoIds.add(video.youtubeVideoId);
    for (const lang of ['en', 'hi']) {
      if (typeof video.title?.[lang] !== 'string' || !video.title[lang].trim() || video.title[lang].length > 160) error(p + '.title.' + lang, 'must be a non-empty reviewed title (max 160 chars)');
    }
    for (const [field, allowed, required] of [
      ['stageIds', STAGES, true], ['domains', DOMAINS, true], ['languages', LANGUAGES, true], ['topicIds', null, true]
    ]) {
      const values = video[field];
      if (!Array.isArray(values) || (required && values.length === 0)) { error(p + '.' + field, 'must be a non-empty array'); continue; }
      if (new Set(values).size !== values.length) error(p + '.' + field, 'must not contain duplicates');
      for (const value of values) {
        if (allowed && !allowed.has(value)) error(p + '.' + field, `unsupported value: ${value}`);
        if (field === 'topicIds' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) error(p + '.topicIds', `invalid topic ID: ${value}`);
      }
    }
    if (!isChannelId(video.channelId)) error(p + '.channelId', 'must be a valid-shaped YouTube channel ID');
    if (typeof video.channelTitle !== 'string' || !video.channelTitle.trim()) error(p + '.channelTitle', 'must be a non-empty source title');
    if (!REVIEW_STATES.has(video.reviewStatus)) error(p + '.reviewStatus', 'unknown review state');
    if (!['suitable', 'needs-review', 'unsuitable'].includes(video.ageSuitability)) error(p + '.ageSuitability', 'unknown suitability state');
    if (!['strong', 'partial', 'none'].includes(video.curriculumFit)) error(p + '.curriculumFit', 'unknown curriculum-fit state');
    if (!['available', 'unavailable', 'restricted', 'unknown'].includes(video.availabilityStatus)) error(p + '.availabilityStatus', 'unknown availability state');
    if (!['verified', 'unknown', 'not-applicable'].includes(video.madeForKidsStatus)) error(p + '.madeForKidsStatus', 'unknown Made for Kids state');
    if (video.reviewedAt !== null && video.reviewedAt !== undefined && !isDate(video.reviewedAt)) error(p + '.reviewedAt', 'must be an ISO date-time or null');
    if (video.lastVerifiedAt !== null && video.lastVerifiedAt !== undefined && !isDate(video.lastVerifiedAt)) error(p + '.lastVerifiedAt', 'must be an ISO date-time or null');

    if (video.reviewStatus === 'approved') {
      if (!APPROVED_REVIEWERS.has(video.reviewedByRole)) error(p + '.reviewedByRole', 'approved items require a human reviewer role');
      if (!isDate(video.reviewedAt)) error(p + '.reviewedAt', 'approved items require a review timestamp');
      if (!isDate(video.lastVerifiedAt)) error(p + '.lastVerifiedAt', 'approved items require a verification timestamp');
      if (video.ageSuitability !== 'suitable') error(p + '.ageSuitability', 'approved items must be marked suitable');
      if (!['strong', 'partial'].includes(video.curriculumFit)) error(p + '.curriculumFit', 'approved items must have curriculum fit');
      if (video.availabilityStatus !== 'available') error(p + '.availabilityStatus', 'approved items must be available');
      if (!allowlist.has(video.channelId)) error(p + '.channelId', 'approved item source is not in the approved channel allowlist');
      if (typeof video.thumbnailUrl !== 'string' || !/^https:\/\/(i\.ytimg\.com|img\.youtube\.com)\//.test(video.thumbnailUrl)) error(p + '.thumbnailUrl', 'approved items require an HTTPS YouTube thumbnail URL');
      if (!Number.isInteger(video.durationSeconds) || video.durationSeconds < 1 || video.durationSeconds > 14400) error(p + '.durationSeconds', 'approved items require a verified duration between 1 second and 4 hours');
    }
    if (video.reviewStatus === 'pending-review' && video.reviewedByRole === 'automated-candidate' && video.reviewedAt) {
      error(p + '.reviewedAt', 'automated discovery must not imply human review');
    }
  }

  if (catalog.releaseStatus === 'published' && catalog.videos.some(v => v?.reviewStatus !== 'approved')) {
    error('releaseStatus', 'published catalogues may contain only approved records');
  }
  if (catalog.releaseStatus === 'published' && catalog.videos.length === 0) {
    error('releaseStatus', 'published catalogue cannot be empty');
  }
  return errors;
}

function main() {
  const catalog = readJson('content/watch-learn-catalog.json');
  const allowlistData = readJson('content/watch-learn-approved-channels.json');
  const allowlistErrors = validateAllowlist(allowlistData);
  const allowlist = new Set(Array.isArray(allowlistData.channels) ? allowlistData.channels.map(c => c.channelId) : []);
  const errors = [...allowlistErrors, ...validateCatalog(catalog, allowlist)];
  if (errors.length) {
    console.error('Watch & Learn catalogue validation failed:');
    for (const item of errors) console.error(' - ' + item);
    process.exitCode = 1;
    return;
  }
  console.log(`Watch & Learn catalogue valid: ${catalog.videos.length} record(s), releaseStatus=${catalog.releaseStatus}, approved channels=${allowlist.size}.`);
}

if (require.main === module) main();
module.exports = { validateCatalog, validateAllowlist };
