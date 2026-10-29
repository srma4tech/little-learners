#!/usr/bin/env node
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { triageCandidate } = require('../scripts/discover-watch-learn-candidates.cjs');

function candidate(rawTitle, stageIds = ['class-1']) {
  return {
    rawTitle,
    rawDescription: '',
    queryMatches: stageIds.map(stageId => ({ stageId, language: 'en', query: 'test query' }))
  };
}

test('retains a relevant early-learning title with human review still required downstream', () => {
  const result = triageCandidate(candidate('Class 1 English Phonics and Letter Sounds'));
  assert.equal(result.keep, true);
  assert.equal(result.automatedTriage, 'keyword-match-needs-human-review');
  assert.deepEqual(result.matchedStageIds, ['class-1']);
});

test('filters obvious higher-grade titles', () => {
  for (const title of ['Class 10 Mathematics Full Course', 'Grade 8 Science Exam', 'NEET Biology Preparation']) {
    assert.equal(triageCandidate(candidate(title)).keep, false, title);
    assert.equal(triageCandidate(candidate(title)).reason, 'blocked-title-term', title);
  }
});

test('filters recruitment and government-job titles', () => {
  const result = triageCandidate(candidate('Government Jobs Vacancy Recruitment 2026'));
  assert.equal(result.keep, false);
  assert.equal(result.reason, 'blocked-title-term');
});

test('filters titles that do not match any queried learning stage', () => {
  const result = triageCandidate(candidate('Funny Family Travel Vlog', ['playgroup']));
  assert.equal(result.keep, false);
  assert.equal(result.reason, 'no-stage-title-match');
});

test('retains multi-stage results when the title matches at least one matched stage', () => {
  const result = triageCandidate(candidate('Learn Colors and Shapes for Kids', ['playgroup', 'class-2']));
  assert.equal(result.keep, true);
  assert.deepEqual(result.matchedStageIds, ['playgroup']);
});
