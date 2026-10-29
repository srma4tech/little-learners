const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {validateStageCatalog,validateFoundationPack,validateReadingPack,validateActivity,STAGE_IDS} = require('../.github/scripts/validate-content.cjs');
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
