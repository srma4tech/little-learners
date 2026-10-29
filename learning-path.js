(() => {
  'use strict';
  let pack;
  const app = () => document.querySelector('#app');
  const state = () => window.kl && window.kl.st ? window.kl.st() : null;
  const kid = () => { const s=state(); return s && s.kids && s.kids[s.kid]; };
  const lang = () => { const s=state(); return s && s.lang === 'hi' ? 'hi' : 'en'; };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const el = (tag, text, cls) => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; };
  const button = (text, cls, action) => { const b=el('button',text,'btn '+(cls||'')); b.type='button'; b.addEventListener('click',action); return b; };
  const stage = () => window.LearningStages.get(window.LearningStages.normalize(kid()?.stageId));
  const top = title => { const row=el('div',undefined,'bar'); row.append(button('⬅ Home','o',window.home),el('h2',title)); return row; };
  function showMessage(message) {
    const box=el('p',message,'learning-path-message');
    box.setAttribute('role','status');
    return box;
  }
  async function loadPack() {
    if(pack)return pack;
    const response=await fetch('./content/stage-learning-activities.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('Activity pack is unavailable.');
    const data=await response.json();
    if(!Array.isArray(data.activities))throw new Error('Activity pack has an invalid format.');
    pack=data;
    return pack;
  }
  window.openLearningPath = async function() {
    const root=app();
    if(!root)return;
    root.replaceChildren(top('🧭 Learning path'),showMessage('Loading activities…'));
    try {
      await loadPack();
      renderList();
    } catch (_) {
      root.replaceChildren(top('🧭 Learning path'),showMessage('Activities could not be loaded. Please check your connection and try again.'),button('Try again','',window.openLearningPath));
    }
  };
  function renderList() {
    const root=app(), currentStage=stage(), language=lang(), currentKid=kid();
    root.replaceChildren(top('🧭 Learning path'));
    const intro=el('section',undefined,'learning-path-panel');
    const title=el('h3',currentStage.label[language]);
    const note=el('p',language==='hi'?'छोटे अभ्यास चुनें। गलत उत्तर भी सीखने का हिस्सा है।':'Choose a short activity. Mistakes are part of learning.');
    intro.append(title,note);
    const list=el('div',undefined,'learning-path-list');
    const activities=pack.activities.filter(a=>a.stageIds.includes(currentStage.id));
    if(!activities.length) {
      intro.append(showMessage(language==='hi'?'इस स्तर के लिए गतिविधियाँ तैयार की जा रही हैं।':'Activities for this stage are being prepared.'));
    }
    for(const activity of activities) {
      const completed=!!(currentKid.activityCompletions&&currentKid.activityCompletions[activity.id]);
      const card=el('section',undefined,'learning-path-card');
      const b=button('', '',()=>renderActivity(activity));
      b.className='learning-path-choice';
      const title=el('strong',activity.languageVariants[language].title);
      const description=el('span',activity.languageVariants[language].instructions);
      const status=el('small',completed?(language==='hi'?'अभ्यास पूरा ✓':'Practised ✓'):(language==='hi'?'छोटा अभ्यास':'Short activity'));
      b.append(title,description,status);
      card.append(b);
      list.append(card);
    }
    root.append(intro,list);
  }
  function renderActivity(activity) {
    const root=app(), language=lang(), variant=activity.languageVariants[language], currentKid=kid();
    root.replaceChildren(top('🧩 '+variant.title));
    const panel=el('section',undefined,'learning-path-panel');
    panel.append(el('p',variant.instructions,'learning-path-instructions'));
    panel.append(el('h3',variant.prompt,'learning-path-prompt'));
    const choices=el('div',undefined,'learning-path-options');
    const feedback=el('div',undefined,'learning-path-feedback');
    const alreadyDone=!!(currentKid.activityCompletions&&currentKid.activityCompletions[activity.id]);
    activity.options.forEach(option=>{
      const b=button(option.emoji+' '+option.label[language],'o',()=>{
        if(b.disabled)return;
        const correct=option.id===activity.answerId;
        if(!correct) {
          b.classList.add('learning-path-wrong');
          feedback.replaceChildren(showMessage(language==='hi'?'कोई बात नहीं—फिर कोशिश करें। संकेत के लिए प्रश्न दोबारा पढ़ें।':'Not quite—try again. Read the question once more for a hint.'));
          return;
        }
        [...choices.querySelectorAll('button')].forEach(x=>x.disabled=true);
        const earned=window.kl.completeActivity(activity.id);
        b.classList.remove('o'); b.classList.add('learning-path-correct');
        const text=activity.feedback[language]+(earned?(language==='hi'?' ⭐ एक सितारा मिला!':' ⭐ You earned one star!'):(language==='hi'?' आपने यह अभ्यास पहले ही पूरा किया है।':' You already completed this activity.'));
        feedback.replaceChildren(showMessage(text),button(language==='hi'?'वापस गतिविधियों पर':'Back to activities','',renderList));
      });
      b.setAttribute('aria-label',option.label[language]);
      choices.append(b);
    });
    panel.append(choices,feedback);
    if(alreadyDone)panel.append(showMessage(language==='hi'?'आप यह अभ्यास पहले कर चुके हैं। दोबारा अभ्यास करने पर नया सितारा नहीं मिलेगा।':'You have practised this activity already. Repeating it will not award another star.'));
    root.append(panel);
  }
  function styles() {
    if(document.getElementById('learning-path-styles'))return;
    const s=document.createElement('style');s.id='learning-path-styles';
    s.textContent='.learning-path-panel{background:var(--card);border:2px solid #7c4dff66;border-radius:20px;padding:16px;margin:10px 0;min-width:0}.learning-path-panel h3{margin:4px 0 10px;overflow-wrap:anywhere}.learning-path-panel p{line-height:1.5}.learning-path-list{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}.learning-path-card{min-width:0;background:var(--card);border:1px solid #8d7aa533;border-radius:18px;padding:8px}.learning-path-choice{display:flex;flex-direction:column;align-items:flex-start;gap:7px;text-align:left;width:100%;min-width:0;padding:12px;background:transparent;color:var(--ink);border:0;box-shadow:none;border-radius:12px;white-space:normal}.learning-path-choice strong,.learning-path-choice span{overflow-wrap:anywhere}.learning-path-choice span{line-height:1.4}.learning-path-choice small{opacity:.7}.learning-path-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,130px),1fr));gap:10px}.learning-path-options .btn{min-height:76px;white-space:normal;overflow-wrap:anywhere}.learning-path-options .btn:disabled{opacity:.7}.learning-path-wrong{border:2px solid #e53935!important}.learning-path-correct{border:2px solid #43a047!important}.learning-path-message{background:#7c4dff12;border-radius:14px;padding:12px;line-height:1.5}.learning-path-feedback{margin-top:12px}@media(min-width:720px){.learning-path-list{grid-template-columns:repeat(2,minmax(0,1fr))}}';
    document.head.append(s);
  }
  styles();
})();
