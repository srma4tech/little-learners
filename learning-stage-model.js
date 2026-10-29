(function(root){
  'use strict';
  const stages=[
    {id:'playgroup',label:{en:'Playgroup',hi:'प्लेग्रुप'},focus:'Sensory play, listening and matching'},
    {id:'nursery',label:{en:'Nursery',hi:'नर्सरी'},focus:'Language exposure, sorting and counting'},
    {id:'lkg',label:{en:'LKG',hi:'एलकेजी'},focus:'Letter sounds, number sense and sequencing'},
    {id:'ukg',label:{en:'UKG',hi:'यूकेजी'},focus:'Early words, number readiness and routines'},
    {id:'class-1',label:{en:'Class 1',hi:'कक्षा 1'},focus:'Foundational reading, writing and numeracy'},
    {id:'class-2',label:{en:'Class 2',hi:'कक्षा 2'},focus:'Reading fluency, operations and measurement'},
    {id:'class-3',label:{en:'Class 3',hi:'कक्षा 3'},focus:'Independent reading and multi-step problem-solving'}
  ];
  const byId=new Map(stages.map(stage=>[stage.id,stage]));
  root.LearningStages=Object.freeze({
    all:()=>stages.map(stage=>({...stage,label:{...stage.label}})),
    get:id=>byId.has(id)?{...byId.get(id),label:{...byId.get(id).label}}:null,
    normalize:id=>byId.has(id)?id:'class-1'
  });
})(typeof window!=='undefined'?window:globalThis);
