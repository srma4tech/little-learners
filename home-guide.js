(() => {
  'use strict';
  const originalHome = window.home;
  if (typeof originalHome !== 'function' || window.homeGuideInstalled) return;
  window.homeGuideInstalled = true;
  const messages = {
    playgroup: 'Stage-specific Playgroup activities are being prepared. Explore available games with a parent.',
    nursery: 'Nursery activities are being prepared. A parent can help choose suitable general practice.',
    lkg: 'LKG activities are being expanded. Try available games with an adult and follow the child’s pace.',
    ukg: 'UKG activities are being expanded. Available games are general practice for now.',
    'class-1': 'Choose a short reading practice or a learning game below. Practice at your own pace.',
    'class-2': 'Class 2 lessons are being added. Available games are general practice and may be easier than schoolwork.',
    'class-3': 'Class 3 lessons are being added. Available games are general practice and may be easier than schoolwork.'
  };
  function renderGuide() {
    const model = window.LearningStages;
    if (!model || typeof window.K !== 'function') return;
    const stage = model.get(model.normalize(window.K().stageId));
    if (!stage) return;
    const currentState = window.kl && typeof window.kl.st === 'function' ? window.kl.st() : null;
    const lang = currentState && currentState.lang === 'hi' ? 'hi' : 'en';
    const hiMessages = {playgroup:'प्लेग्रुप की गतिविधियाँ तैयार की जा रही हैं। अभी माता-पिता के साथ उपलब्ध खेल खेलें।',nursery:'नर्सरी की गतिविधियाँ तैयार की जा रही हैं। माता-पिता उपयुक्त सामान्य अभ्यास चुनने में मदद कर सकते हैं।',lkg:'एलकेजी की गतिविधियाँ बढ़ाई जा रही हैं। किसी बड़े के साथ बच्चे की गति से अभ्यास करें।',ukg:'यूकेजी की गतिविधियाँ बढ़ाई जा रही हैं। अभी उपलब्ध खेल सामान्य अभ्यास हैं।','class-1':'नीचे कहानी पढ़ने का अभ्यास या कोई सीखने वाला खेल चुनें। अपनी गति से अभ्यास करें।','class-2':'कक्षा 2 के पाठ जोड़े जा रहे हैं। उपलब्ध खेल सामान्य अभ्यास हैं और स्कूल के काम से आसान हो सकते हैं।','class-3':'कक्षा 3 के पाठ जोड़े जा रहे हैं। उपलब्ध खेल सामान्य अभ्यास हैं और स्कूल के काम से आसान हो सकते हैं।'};\n    const section = document.createElement('section');
    section.className = 'home-learning-guide';
    section.setAttribute('aria-label', lang === 'hi' ? 'सीखने का स्तर' : 'Learning stage');
    const copy = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'home-guide-eyebrow';
    eyebrow.textContent = lang === 'hi' ? 'आपका सीखने का स्तर' : 'Learning stage';
    const title = document.createElement('h2');
    title.textContent = stage.label[lang];
    const description = document.createElement('p');
    description.textContent = lang === 'hi' ? (hiMessages[stage.id] || hiMessages['class-1']) : (messages[stage.id] || messages['class-1']);
    copy.append(eyebrow, title, description);
    const change = document.createElement('button');
    change.className = 'btn o';
    change.type = 'button';
    change.textContent = lang === 'hi' ? 'बदलें' : 'Change stage';
    change.addEventListener('click', () => window.openParentSettings?.());
    section.append(copy, change);
    const grid = document.querySelector('#app .home-grid');
    const heading = document.querySelector('#app h1');
    if (grid && heading && !document.querySelector('#app .home-learning-guide')) grid.parentNode.insertBefore(section, grid);
  }
  function styles() {
    if (document.getElementById('home-guide-styles')) return;
    const style = document.createElement('style');
    style.id = 'home-guide-styles';
    style.textContent = '.home-learning-guide{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;background:var(--card);border:2px solid #7c4dff66;border-radius:20px;padding:14px 16px;margin:0 0 18px;box-shadow:0 4px 0 var(--sh)}.home-learning-guide>div{flex:1 1 220px;min-width:0}.home-learning-guide p{margin:4px 0;line-height:1.45;overflow-wrap:anywhere}.home-learning-guide h2{margin:0;font-size:clamp(20px,4vw,26px)}.home-guide-eyebrow{font-size:13px;font-weight:800;opacity:.7}.home-learning-guide .btn{font-size:15px;padding:9px 14px;white-space:normal}@media(max-width:380px){.home-learning-guide{padding:12px;gap:8px}.home-learning-guide .btn{width:100%}}';
    document.head.append(style);
  }
  window.home = function() { originalHome(); styles(); renderGuide(); };
  if (document.querySelector('#app .home-grid')) { styles(); renderGuide(); }
})();
