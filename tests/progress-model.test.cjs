const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeKid, mergeKid, mergeKids, resetKid, mergeProfile } = require('../progress-model.js');

test('legacy progress is normalized without losing existing stars', () => {
  const kid = normalizeKid({ name: 'Ari', stars: 4 }, 'device-a');
  assert.equal(kid.stars, 4);
  assert.equal(kid.starCounters['device-a'], 4);
  assert.equal(kid.resetGeneration, 0);
});

test('reset clears aggregate stars and counters and advances generation', () => {
  const reset = resetKid({ name: 'Ari', stars: 8, starCounters: { 'device-a': 8 } });
  assert.equal(reset.stars, 0);
  assert.deepEqual(reset.starCounters, {});
  assert.equal(reset.resetGeneration, 1);
  assert.ok(reset.pendingResetId);
});

test('a newer cloud reset beats stale offline rewards', () => {
  const merged = mergeKid(
    { name: 'Ari', stars: 9, starCounters: { 'device-a': 9 }, resetGeneration: 0 },
    { name: 'Ari', stars: 0, starCounters: {}, resetGeneration: 1, resetId: 'reset-cloud' },
    'device-a'
  );
  assert.equal(merged.stars, 0);
  assert.equal(merged.resetGeneration, 1);
  assert.equal(merged.resetId, 'reset-cloud');
});

test('a pending local reset is not merged with old cloud rewards', () => {
  const reset = { name: 'Ari', stars: 0, starCounters: {}, resetGeneration: 1, pendingResetId: 'reset-local' };
  const merged = mergeKid(reset, { name: 'Ari', stars: 10, starCounters: { 'device-b': 10 }, resetGeneration: 0 }, 'device-a');
  assert.equal(merged.stars, 0);
  assert.equal(merged.pendingResetId, 'reset-local');
});

test('transaction merge applies an offline reset after the latest cloud generation', () => {
  const incoming = { kids: { a: { name: 'Ari', stars: 0, starCounters: {}, resetGeneration: 1, pendingResetId: 'reset-local' } }, settings: { lang: 'both', sound: 1 } };
  const remote = { kids: { a: { name: 'Ari', stars: 3, starCounters: { 'device-b': 3 }, resetGeneration: 1, resetId: 'reset-other' } }, settings: { lang: 'en', sound: 1 }, createdAt: 123 };
  const merged = mergeProfile(incoming, remote, 'device-a');
  assert.equal(merged.kids.a.stars, 0);
  assert.equal(merged.kids.a.resetGeneration, 2);
  assert.equal(merged.kids.a.resetId, 'reset-local');
  assert.equal('pendingResetId' in merged.kids.a, false);
  assert.equal(merged.createdAt, 123);
});

test('progress earned after reset survives the reset transaction', () => {
  const incoming = { kids: { a: { name: 'Ari', stars: 2, starCounters: { 'device-a': 2 }, resetGeneration: 1, pendingResetId: 'reset-local' } } };
  const merged = mergeProfile(incoming, { kids: { a: { name: 'Ari', stars: 10, starCounters: { 'device-b': 10 }, resetGeneration: 1, resetId: 'reset-other' } } }, 'device-a');
  assert.equal(merged.kids.a.stars, 2);
  assert.equal(merged.kids.a.starCounters['device-a'], 2);
  assert.equal(merged.kids.a.resetGeneration, 2);
});

test('children are reconciled independently', () => {
  const merged = mergeKids(
    { a: { name: 'Ari', stars: 0, starCounters: {}, resetGeneration: 1, resetId: 'reset-a' }, b: { name: 'Bea', stars: 4, starCounters: { d: 4 }, resetGeneration: 0 } },
    { a: { name: 'Ari', stars: 6, starCounters: { d: 6 }, resetGeneration: 0 }, b: { name: 'Bea', stars: 4, starCounters: { d: 4 }, resetGeneration: 0 } },
    'device-local'
  );
  assert.equal(merged.a.stars, 0);
  assert.equal(merged.b.stars, 4);
});

test('selected learning stage survives profile merges and progress reset', () => {
  const local = {name:'Ari',stageId:'nursery',stars:4,starCounters:{'device-a':4},resetGeneration:0};
  const merged = mergeKid(local,{name:'Ari',stars:5,starCounters:{'device-b':5},resetGeneration:0},'device-a');
  assert.equal(merged.stageId,'nursery');
  const reset = resetKid(merged);
  assert.equal(reset.stageId,'nursery');
  assert.equal(reset.stars,0);
});
