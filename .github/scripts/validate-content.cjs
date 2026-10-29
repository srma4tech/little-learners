#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const stageCatalog = read('content/learning-stages.json');
const STAGE_IDS = new Set(stageCatalog.stages.map(s => s.id));
const DOMAINS = new Set(['english','hindi','mathematics','environmental-learning','reasoning','creative-learning','life-skills','reading-listening']);
const LANGUAGES = new Set(['en','hi']);
function assert(ok, message) { if (!ok) throw new Error(message); }
function unique(values, label) { assert(new Set(values).size === values.length, 'Duplicate ' + label + ' IDs'); }
function validateStageCatalog(c) {
  assert(c && c.schemaVersion === '1.0.0', 'Stage catalog schemaVersion must be 1.0.0');
  assert(Array.isArray(c.stages) && c.stages.length === 7, 'Expected seven learning stages');
  unique(c.stages.map(s => s.id), 'stage'); unique(c.stages.map(s => s.order), 'stage order');
  for (const s of c.stages) {
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.id), 'Invalid stage ID: ' + s.id);
    assert(s.label && s.label.en && s.label.hi, 'Missing bilingual label: ' + s.id);
    assert(s.typicalAge && s.typicalAge.min > 0 && s.typicalAge.max >= s.typicalAge.min, 'Invalid age guidance: ' + s.id);
    assert(Array.isArray(s.focus) && s.focus.length, 'Missing focus tags: ' + s.id);
  }
  return true;
}
function validateQuestions(questions, label) {
  assert(Array.isArray(questions) && questions.length, 'Missing questions: ' + label);
  for (const q of questions) {
    assert(q.prompt && Array.isArray(q.options) && q.options.length >= 2, 'Malformed question: ' + label);
    assert(q.options.includes(q.answer), 'Answer not present in options: ' + (q.id || label));
    assert(new Set(q.options).size === q.options.length, 'Duplicate options: ' + (q.id || label));
    assert(q.explanation, 'Missing answer explanation: ' + (q.id || label));
  }
}
function validateFoundationPack(pack) {
  assert(pack && pack.schemaVersion === '1.0.0', 'Foundation pack schemaVersion must be 1.0.0');
  assert(Array.isArray(pack.strands) && pack.strands.length, 'Foundation pack needs strands');
  unique(pack.strands.map(s => s.id), 'strand');
  const lessons = []; let questions = 0;
  for (const strand of pack.strands) {
    assert(strand.id && strand.title && Array.isArray(strand.lessons), 'Malformed strand');
    for (const lesson of strand.lessons) {
      assert(lesson.id && lesson.title && lesson.concept, 'Malformed lesson in ' + strand.id);
      lessons.push(lesson.id); validateQuestions(lesson.questions, lesson.id); questions += lesson.questions.length;
    }
  }
  unique(lessons, 'lesson'); return {strands:pack.strands.length,lessons:lessons.length,questions};
}
function validateReadingPack(pack) {
  assert(pack && pack.schemaVersion === '1.0.0', 'Reading pack schemaVersion must be 1.0.0');
  assert(Array.isArray(pack.passages) && pack.passages.length, 'Reading pack needs passages');
  unique(pack.passages.map(s => s.id), 'passage'); const ids = []; let count = 0;
  for (const p of pack.passages) {
    assert(p.theme && p.difficulty && Array.isArray(p.skillFocus), 'Malformed passage: ' + p.id);
    assert(p.languages && p.languages.en && p.languages.hi, 'Missing bilingual passage: ' + p.id);
    for (const lang of ['en','hi']) {
      const v = p.languages[lang]; assert(v.title && Array.isArray(v.text) && v.text.length, 'Malformed text: ' + p.id + '/' + lang);
      assert(Array.isArray(v.vocabulary), 'Missing vocabulary: ' + p.id + '/' + lang);
    }
    assert(Array.isArray(p.questions), 'Missing questions: ' + p.id);
    for (const q of p.questions) { ids.push(q.id); assert(LANGUAGES.has(q.language), 'Unsupported question language: ' + q.id); }
    validateQuestions(p.questions, p.id); count += p.questions.length;
    for (const lang of ['en','hi']) assert(p.questions.some(q => q.language === lang), 'No ' + lang + ' questions: ' + p.id);
  }
  unique(ids, 'reading question'); return {passages:pack.passages.length,questions:count};
}
function validateActivity(a) {
  assert(a && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.id || ''), 'Activity needs a kebab-case stable ID');
  assert(a.schemaVersion === '1.0.0', 'Activity schemaVersion must be 1.0.0');
  assert(DOMAINS.has(a.domain), 'Unsupported activity domain: ' + a.domain);
  assert(Array.isArray(a.stageIds) && a.stageIds.length, 'Activity needs stageIds');
  for (const id of a.stageIds) assert(STAGE_IDS.has(id), 'Unknown stage ID: ' + id);
  assert(a.languageVariants && Object.keys(a.languageVariants).length, 'Activity needs languageVariants');
  for (const [lang,v] of Object.entries(a.languageVariants)) {
    assert(LANGUAGES.has(lang), 'Unsupported language: ' + lang);
    assert(v.title && v.instructions, 'Missing title/instructions: ' + lang);
  }
  assert(['read','listen','match','sort','sequence','multiple-choice','draw','guided-practice'].includes(a.activityType), 'Unsupported activityType');
  assert(['introductory','developing','confident'].includes(a.difficulty), 'Unsupported difficulty');
  assert(['draft','in-review','approved','retired'].includes(a.reviewStatus), 'Unsupported reviewStatus');
  assert(a.completion && a.completion.criteria, 'Missing completion criteria');
  assert(a.accessibility && typeof a.accessibility.notes === 'string', 'Missing accessibility notes');
  return true;
}
function validateActivityPack(pack) {
  assert(pack && pack.schemaVersion === '1.0.0', 'Activity pack schemaVersion must be 1.0.0');
  assert(Array.isArray(pack.activities) && pack.activities.length > 0, 'Activity pack needs activities');
  unique(pack.activities.map(a => a.id), 'activity');
  for (const activity of pack.activities) {
    validateActivity(activity);
    for (const lang of ['en','hi']) {
      const variant = activity.languageVariants[lang];
      assert(variant && variant.title && variant.instructions && variant.prompt, 'Missing bilingual activity copy: ' + activity.id + '/' + lang);
      assert(activity.feedback && activity.feedback[lang], 'Missing feedback: ' + activity.id + '/' + lang);
    }
    assert(Array.isArray(activity.options) && activity.options.length >= 2, 'Activity needs at least two options: ' + activity.id);
    unique(activity.options.map(option => option.id), 'option in ' + activity.id);
    for (const option of activity.options) assert(option.label && option.label.en && option.label.hi && option.emoji, 'Malformed bilingual option: ' + activity.id);
    assert(activity.options.some(option => option.id === activity.answerId), 'Answer ID not found in options: ' + activity.id);
  }
  return {activities:pack.activities.length, stages:[...new Set(pack.activities.flatMap(a=>a.stageIds))].length};
}
function run() {
  validateStageCatalog(stageCatalog);
  const foundation = validateFoundationPack(read('content/grade-1-content.json'));
  const reading = validateReadingPack(read('content/grade-1-reading-practice.json'));
  const activities = validateActivityPack(read('content/stage-learning-activities.json'));
  console.log('Content validation passed: ' + JSON.stringify({stages:STAGE_IDS.size,foundation,reading,activities}));
}
if (require.main === module) { try { run(); } catch (e) { console.error('Content validation failed: ' + e.message); process.exitCode = 1; } }
module.exports = {validateStageCatalog,validateFoundationPack,validateReadingPack,validateActivity,validateActivityPack,STAGE_IDS};
