const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {validateStageCatalog,validateFoundationPack,validateReadingPack,validateActivity,validateActivityPack,STAGE_IDS} = require('../.github/scripts/validate-content.cjs');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));

test('stage catalog has seven stable bilingual stages', () => {
  const catalog = read('content/learning-stages.json');
  assert.equal(validateStageCatalog(catalog),true);
  assert.deepEqual(catalog.stages.map(s=>s.id),['playgroup','nursery','lkg','ukg','class-1','class-2','class-3']);
  assert.ok(catalog.stages.every(s=>s.label.en && s.label.hi));
});
test('existing Grade 1 foundation content remains structurally valid', () => {
  assert.deepEqual(validateFoundationPack(read('content/grade-1-content.json')),{strands:7,lessons:25,questions:75});
});
test('existing Grade 1 reading content remains bilingual and valid', () => {
  assert.deepEqual(validateReadingPack(read('content/grade-1-reading-practice.json')),{passages:8,questions:48});
});
test('invalid stage IDs and duplicate stage IDs are rejected', () => {
  const c=read('content/learning-stages.json');
  assert.throws(()=>validateStageCatalog({...c,stages:c.stages.map((s,i)=>i? s:{...s,id:'Unknown Stage'})}),/Invalid stage ID/);
  assert.throws(()=>validateStageCatalog({...c,stages:[...c.stages,c.stages[0]]}),/seven learning stages|Duplicate stage/);
});
test('multiple-choice answer must be present among options', () => {
  const p=structuredClone(read('content/grade-1-content.json'));
  p.strands[0].lessons[0].questions[0].answer='not an option';
  assert.throws(()=>validateFoundationPack(p),/Answer not present in options/);
});
test('new activity contract accepts valid metadata and rejects unknown stages', () => {
  const a={id:'english-letter-sounds-01',schemaVersion:'1.0.0',domain:'english',stageIds:['lkg','ukg'],languageVariants:{en:{title:'Letter sounds',instructions:'Listen and choose.'},hi:{title:'अक्षर की ध्वनि',instructions:'सुनें और चुनें।'}},activityType:'multiple-choice',difficulty:'introductory',reviewStatus:'draft',completion:{criteria:'Answer one question and review feedback.'},accessibility:{notes:'Text alternatives are available for audio.'}};
  assert.equal(validateActivity(a),true);
  assert.throws(()=>validateActivity({...a,stageIds:['class-9']}),/Unknown stage ID/);
  assert.equal(STAGE_IDS.size,7);
});

test('runtime stage model matches the canonical catalog and is wired into parent settings', () => {
  const model = fs.readFileSync(path.join(__dirname,'..','learning-stage-model.js'),'utf8');
  const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const sw = fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
  assert.match(model,/playgroup/);
  assert.match(model,/class-3/);
  assert.match(html,/learning-stage-model\.js/);
  assert.match(html,/parent-stage-grid/);
  assert.match(html,/setLearningStage\(this\.dataset\.stage\)/);
  assert.match(html,/K\(\)\.stageId=id/);
  assert.match(sw,/little-learners-v51/);
  assert.match(sw,/learning-stage-model\.js/);
  assert.match(sw,/content\/learning-stages\.json/);
});

test('guided home explains the selected stage in English and Hindi', () => {
  const guide=fs.readFileSync(path.join(__dirname,'..','home-guide.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
  assert.match(html,/home-guide\.js/);
  assert.match(guide,/home-learning-guide/);
  assert.match(guide,/hiMessages/);
  assert.match(guide,/window\.openParentSettings/);
  assert.match(sw,/little-learners-v51/);
  assert.match(sw,/home-guide\.js/);
});

test('stage activity pack covers all seven stages with bilingual prompts and valid answers', () => {
  const pack=read('content/stage-learning-activities.json');
  const result=validateActivityPack(pack);
  assert.equal(result.activities,7);
  assert.equal(result.stages,7);
  assert.ok(pack.activities.every(a=>a.languageVariants.en && a.languageVariants.hi));
  const broken=structuredClone(pack);
  broken.activities[0].answerId='missing-option';
  assert.throws(()=>validateActivityPack(broken),/Answer ID not found/);
});
