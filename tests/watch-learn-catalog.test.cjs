'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCatalog, validateAllowlist } = require('../scripts/validate-watch-learn-catalog.cjs');

const base = () => ({
  schemaVersion: '1.0.0',
  catalogId: 'little-learners-watch-learn',
  releaseStatus: 'draft',
  updatedAt: '2026-10-29T00:00:00Z',
  videos: []
});
const allowlist = new Set(['UC1234567890123456789012']);
const video = overrides => ({
  id: 'class-1-counting',
  youtubeVideoId: 'abcdefghijk',
  title: { en: 'Counting to ten', hi: 'दस तक गिनती' },
  stageIds: ['class-1'],
  domains: ['numeracy'],
  topicIds: ['counting-to-ten'],
  languages: ['en', 'hi'],
  channelId: 'UC1234567890123456789012',
  channelTitle: 'Reviewed learning channel',
  reviewStatus: 'pending-review',
  reviewedAt: null,
  reviewedByRole: 'automated-candidate',
  ageSuitability: 'needs-review',
  curriculumFit: 'partial',
  availabilityStatus: 'unknown',
  madeForKidsStatus: 'unknown',
  lastVerifiedAt: null,
  ...overrides
});

test('accepts an empty draft catalogue before any source has been approved', () => {
  assert.deepEqual(validateCatalog(base(), new Set()), []);
});

test('accepts a well-formed pending candidate without treating it as publishable', () => {
  assert.deepEqual(validateCatalog({ ...base(), videos: [video()] }, allowlist), []);
});

test('rejects unsupported stage IDs', () => {
  const errors = validateCatalog({ ...base(), videos: [video({ stageIds: ['class-9'] })] }, allowlist);
  assert.ok(errors.some(x => x.includes('unsupported value: class-9')));
});

test('rejects duplicate YouTube video IDs', () => {
  const v = video();
  const errors = validateCatalog({ ...base(), videos: [v, { ...v, id: 'second-video' }] }, allowlist);
  assert.ok(errors.some(x => x.includes('duplicate YouTube video ID')));
});

test('rejects approved content from a channel outside the allowlist', () => {
  const approved = video({
    reviewStatus: 'approved',
    reviewedAt: '2026-10-29T00:00:00Z',
    reviewedByRole: 'educator',
    ageSuitability: 'suitable',
    curriculumFit: 'strong',
    availabilityStatus: 'available',
    madeForKidsStatus: 'verified',
    lastVerifiedAt: '2026-10-29T00:00:00Z',
    thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
    durationSeconds: 120
  });
  const errors = validateCatalog({ ...base(), videos: [approved] }, new Set());
  assert.ok(errors.some(x => x.includes('not in the approved channel allowlist')));
});

test('rejects a published catalogue containing pending review records', () => {
  const errors = validateCatalog({ ...base(), releaseStatus: 'published', videos: [video()] }, allowlist);
  assert.ok(errors.some(x => x.includes('published catalogues may contain only approved records')));
});

test('rejects automated candidate identity as a human approval', () => {
  const approved = video({
    reviewStatus: 'approved',
    reviewedAt: '2026-10-29T00:00:00Z',
    reviewedByRole: 'automated-candidate',
    ageSuitability: 'suitable',
    curriculumFit: 'strong',
    availabilityStatus: 'available',
    madeForKidsStatus: 'verified',
    lastVerifiedAt: '2026-10-29T00:00:00Z',
    thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
    durationSeconds: 120
  });
  const errors = validateCatalog({ ...base(), videos: [approved] }, allowlist);
  assert.ok(errors.some(x => x.includes('approved items require a human reviewer role')));
});

const watchLearnModule = require('../watch-learn.js');

test('runtime video eligibility requires explicit source allowlisting', () => {
  global.st = { lang: 'en' };
  const approved = video({
    reviewStatus: 'approved',
    reviewedAt: '2026-10-29T00:00:00Z',
    reviewedByRole: 'educator',
    ageSuitability: 'suitable',
    curriculumFit: 'strong',
    availabilityStatus: 'available',
    madeForKidsStatus: 'verified',
    lastVerifiedAt: '2026-10-29T00:00:00Z',
    thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
    durationSeconds: 120
  });
  assert.equal(watchLearnModule.eligible([approved], 'class-1', 'en', allowlist).length, 1);
  assert.equal(watchLearnModule.eligible([approved], 'class-1', 'en', new Set()).length, 0);
  delete global.st;
});

test('runtime eligibility blocks pending, unsuitable, wrong-stage and wrong-language videos', () => {
  const approved = video({
    reviewStatus: 'approved',
    reviewedAt: '2026-10-29T00:00:00Z',
    reviewedByRole: 'educator',
    ageSuitability: 'suitable',
    curriculumFit: 'strong',
    availabilityStatus: 'available',
    madeForKidsStatus: 'verified',
    lastVerifiedAt: '2026-10-29T00:00:00Z',
    thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
    durationSeconds: 120,
    languages: ['hi']
  });
  assert.equal(watchLearnModule.eligible([approved], 'class-1', 'en', allowlist).length, 0);
  assert.equal(watchLearnModule.eligible([approved], 'class-2', 'hi', allowlist).length, 0);
  assert.equal(watchLearnModule.eligible([video()], 'class-1', 'en', allowlist).length, 0);
});

test('accepts an empty channel allowlist before adult source review', () => {
  assert.deepEqual(validateAllowlist({
    schemaVersion: '1.0.0',
    catalogId: 'little-learners-watch-learn-approved-channels',
    channels: []
  }), []);
});

test('requires every allowlisted channel to have a valid ID and human approval record', () => {
  const errors = validateAllowlist({
    schemaVersion: '1.0.0',
    catalogId: 'little-learners-watch-learn-approved-channels',
    channels: [{
      channelId: 'not-a-channel',
      channelTitle: 'Unreviewed source',
      reviewStatus: 'pending-review',
      reviewedAt: null,
      reviewedByRole: 'automated-candidate'
    }]
  });
  assert.ok(errors.some(x => x.includes('valid-shaped YouTube channel ID')));
  assert.ok(errors.some(x => x.includes('only human-approved channels may be allowlisted')));
  assert.ok(errors.some(x => x.includes('must identify a human reviewer role')));
});
