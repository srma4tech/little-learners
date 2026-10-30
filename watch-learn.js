(function (root) {
  'use strict';

  const STAGE_LABELS = {
    playgroup: { en: 'Playgroup', hi: 'प्लेग्रुप' },
    nursery: { en: 'Nursery', hi: 'नर्सरी' },
    lkg: { en: 'LKG', hi: 'एलकेजी' },
    ukg: { en: 'UKG', hi: 'यूकेजी' },
    'class-1': { en: 'Class 1', hi: 'कक्षा 1' },
    'class-2': { en: 'Class 2', hi: 'कक्षा 2' },
    'class-3': { en: 'Class 3', hi: 'कक्षा 3' }
  };
  const DOMAIN_LABELS = {
    phonics: { en: 'Phonics', hi: 'ध्वनि ज्ञान' },
    'hindi-varnamala': { en: 'Hindi letters', hi: 'हिंदी वर्णमाला' },
    literacy: { en: 'Reading', hi: 'पढ़ना' },
    numeracy: { en: 'Maths', hi: 'गणित' },
    science: { en: 'Science', hi: 'विज्ञान' },
    environment: { en: 'Our world', hi: 'हमारा संसार' },
    stories: { en: 'Stories', hi: 'कहानियाँ' },
    art: { en: 'Art', hi: 'कला' },
    'music-movement': { en: 'Music & movement', hi: 'गीत और गतिविधि' },
    'life-skills': { en: 'Life skills', hi: 'जीवन कौशल' },
    reasoning: { en: 'Thinking', hi: 'सोच-विचार' }
  };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const language = () => { const lang = typeof st !== 'undefined' ? st.lang : 'both'; return ['en', 'hi', 'both'].includes(lang) ? lang : 'both'; };
  const text = (en, hi) => language() === 'hi' ? hi : language() === 'en' ? en : en + ' · ' + hi;
  const localized = value => {
    if (!value || typeof value !== 'object') return String(value || '');
    if (language() === 'both') return [value.en, value.hi].filter(Boolean).join(' · ');
    return value[language()] || value.en || value.hi || '';
  };
  const domainLabel = domain => {
    const label = DOMAIN_LABELS[domain] || { en: domain, hi: domain };
    return language() === 'both' ? label.en + ' · ' + label.hi : label[language()];
  };
  const currentStage = () => {
    const raw = root.K?.().stageId || 'class-1';
    return root.LearningStages?.normalize(raw) || (STAGE_LABELS[raw] ? raw : 'class-1');
  };
  let cataloguePromise;
  let selectedDomain = 'all';
  const demoMode = new URLSearchParams(root.location?.search || '').get('watch-learn-demo') === '1';
  let demoVideos = null;
  let activeVideoId = null;

  async function loadCatalogue() {
    if (demoMode) {
      if (!cataloguePromise) cataloguePromise = fetch('./content/watch-learn-ui-demo.json', { cache: 'no-cache' }).then(response => { if (!response.ok) throw new Error('demo fixture unavailable'); return response.json(); }).then(data => ({ catalogue: { videos: data.demoOnly === true ? data.videos : [] }, approvedChannels: new Set(['DEMO_CHANNEL']) })).catch(() => ({ catalogue: { videos: [] }, approvedChannels: new Set() }));
      return cataloguePromise;
    }
    if (!cataloguePromise) {
      cataloguePromise = Promise.all([
        fetch('./content/watch-learn-catalog.json', { cache: 'no-cache' }).then(response => {
          if (!response.ok) throw new Error('catalogue unavailable');
          return response.json();
        }),
        fetch('./content/watch-learn-approved-channels.json', { cache: 'no-cache' }).then(response => {
          if (!response.ok) throw new Error('approved channel list unavailable');
          return response.json();
        })
      ]).then(([catalogue, allowlist]) => ({
        catalogue,
        approvedChannels: new Set(Array.isArray(allowlist.channels) ? allowlist.channels.map(channel => channel.channelId).filter(Boolean) : [])
      })).catch(() => ({
        catalogue: { schemaVersion: '1.0.0', catalogId: 'little-learners-watch-learn', releaseStatus: 'draft', videos: [] },
        approvedChannels: new Set()
      }));
    }
    return cataloguePromise;
  }

  function isFreshlyVerified(video) {
    const verifiedAt = Date.parse(video?.lastVerifiedAt || '');
    const ageMs = Date.now() - verifiedAt;
    return Number.isFinite(verifiedAt) && ageMs >= 0 && ageMs <= 90 * 24 * 60 * 60 * 1000;
  }

  function eligible(videos, stage, lang, approvedChannels = new Set()) {
    return videos.filter(video =>
      video && video.reviewStatus === 'approved' &&
      video.availabilityStatus === 'available' &&
      video.ageSuitability === 'suitable' &&
      ['strong', 'partial'].includes(video.curriculumFit) &&
      isFreshlyVerified(video) &&
      approvedChannels.has(video.channelId) &&
      Array.isArray(video.stageIds) && video.stageIds.includes(stage) &&
      Array.isArray(video.languages) &&
      (lang === 'both' || video.languages.includes(lang) || video.languages.includes('both')) &&
      typeof video.youtubeVideoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(video.youtubeVideoId)
    );
  }

  function goHome() {
    activeVideoId = null;
    root.home?.();
  }

  function renderPlayer(video, stage) {
    activeVideoId = video.id;
    const app = document.getElementById('app');
    if (!app) return;
    const label = STAGE_LABELS[stage] || STAGE_LABELS['class-1'];
    const title = localized(video.title);
    const note = text(
      'Videos are hosted by YouTube. Its player controls and recommendations are provided by YouTube.',
      'वीडियो YouTube पर उपलब्ध हैं। उसके प्लेयर और सुझाव YouTube के नियंत्रण में हैं।'
    );
    app.innerHTML = `
      <div class="bar">
        <button class="btn o" type="button" onclick="window.openWatchLearn()">⬅ ${esc(text('Watch & Learn', 'देखें और सीखें'))}</button>
        <h2>${esc(label.en)} · ${esc(label.hi)}</h2>
      </div>
      <section class="reading-shell">
        <div class="reading-panel">
          <h2>${esc(title)}</h2>
          <p>${esc(video.channelTitle || '')}</p>
          <div class="watch-player-frame">
            <iframe
              title="${esc(title)}"
              src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtubeVideoId)}?playsinline=1&rel=0"
              referrerpolicy="strict-origin-when-cross-origin"
              loading="eager"
              allow="encrypted-media; picture-in-picture; fullscreen"
              allowfullscreen
            ></iframe>
          </div>
          <p class="watch-parent-note">${esc(note)}</p>
          <button class="btn o" type="button" onclick="window.openWatchLearn()">${esc(text('Choose another video', 'अन्य वीडियो चुनें'))}</button>
        </div>
      </section>`;
  }

  async function openWatchLearn() {
    activeVideoId = null;
    selectedDomain = 'all';
    const app = document.getElementById('app');
    if (!app) return;
    const lang = language();
    const stage = currentStage();
    const stageLabel = STAGE_LABELS[stage] || STAGE_LABELS['class-1'];
    app.innerHTML = `
      <div class="bar">
        <button class="btn o" type="button" onclick="home()">⬅ ${esc(text('Home', 'होम'))}</button>
        <h2>🎬 ${esc(text('Watch & Learn', 'देखें और सीखें'))}</h2>
      </div>
      ${demoMode ? `<div class="watch-stage-note" role="status"><strong>UI DEMO ONLY — synthetic test data</strong><p>These are mock records for layout and interaction testing, not real videos or child recommendations.</p></div>` : ''}
      <section class="watch-learn-shell" aria-live="polite">
        <div class="watch-stage-note">
          <strong>${esc(text('Learning stage', 'सीखने का स्तर'))}: ${esc(stageLabel.en)} · ${esc(stageLabel.hi)}</strong>
          <p>${esc(text('Videos are selected for this child’s stage and language setting.', 'वीडियो बच्चे के स्तर और चुनी गई भाषा के अनुसार चुने जाते हैं।'))}</p>
        </div>
        <div id="watch-learn-content"><p>${esc(text('Loading reviewed videos…', 'समीक्षित वीडियो लोड हो रहे हैं…'))}</p></div>
      </section>`;
    const loaded = await loadCatalogue();
    const catalogue = loaded.catalogue;
    const videos = eligible(Array.isArray(catalogue.videos) ? catalogue.videos : [], stage, lang, loaded.approvedChannels);
    const content = document.getElementById('watch-learn-content');
    if (!content || activeVideoId) return;
    if (!videos.length) {
      content.innerHTML = `
        <div class="reading-panel watch-empty-state">
          <div class="watch-empty-icon" aria-hidden="true">🌱</div>
          <h2>${esc(text('Carefully chosen videos are coming soon!', 'चुने हुए शैक्षिक वीडियो जल्द आएँगे!'))}</h2>
          <p>${esc(text('We are preparing a reviewed collection for this learning stage. Until then, all LittleLearners activities remain available.', 'हम इस स्तर के लिए जाँचे हुए वीडियो तैयार कर रहे हैं। तब तक LittleLearners की सभी गतिविधियाँ उपलब्ध हैं।'))}</p>
          <button class="btn" type="button" onclick="home()">${esc(text('Back to learning', 'सीखने के लिए वापस जाएँ'))}</button>
        </div>`;
      return;
    }
    const domains = [...new Set(videos.flatMap(video => video.domains || []))];
    const filtered = selectedDomain === 'all' ? videos : videos.filter(video => (video.domains || []).includes(selectedDomain));
    content.innerHTML = `
      <div class="watch-domain-filters" aria-label="${esc(text('Filter by topic', 'विषय चुनें'))}">
        <button class="btn ${selectedDomain === 'all' ? '' : 'o'}" type="button" onclick="window.filterWatchLearn('all')">${esc(text('All topics', 'सभी विषय'))}</button>
        ${domains.map(domain => `<button class="btn ${selectedDomain === domain ? '' : 'o'}" type="button" onclick="window.filterWatchLearn('${esc(domain)}')">${esc(domainLabel(domain))}</button>`).join('')}
      </div>
      <div class="watch-video-grid">
        ${filtered.map(video => {
          const title = localized(video.title);
          const thumb = typeof video.thumbnailUrl === 'string' && /^https:\/\/(i\.ytimg\.com|img\.youtube\.com)\//.test(video.thumbnailUrl) ? video.thumbnailUrl : '';
          return `<article class="watch-video-card">
            ${thumb ? `<img src="${esc(thumb)}" loading="lazy" alt="">` : '<div class="watch-video-placeholder" aria-hidden="true">▶️</div>'}
            <div class="watch-video-copy"><h3>${esc(title)}</h3><p>${esc(video.channelTitle || '')}</p><p>${esc((video.domains || []).map(d => domainLabel(d)).join(' · '))}</p>
            <button class="btn" type="button" onclick="window.playWatchLearnVideo('${esc(video.id)}')">${esc(text('Watch video', 'वीडियो देखें'))}</button></div>
          </article>`;
        }).join('')}
      </div>`;
  }

  async function filterWatchLearn(domain) {
    selectedDomain = domain;
    const loaded = await loadCatalogue();
    const catalogue = loaded.catalogue;
    const stage = currentStage();
    const videos = eligible(Array.isArray(catalogue.videos) ? catalogue.videos : [], stage, language(), loaded.approvedChannels);
    const content = document.getElementById('watch-learn-content');
    if (!content) return;
    const domains = [...new Set(videos.flatMap(video => video.domains || []))];
    const filtered = selectedDomain === 'all' ? videos : videos.filter(video => (video.domains || []).includes(selectedDomain));
    if (!filtered.length) return openWatchLearn();
    const buttons = [...content.querySelectorAll('.watch-domain-filters button')];
    buttons.forEach(button => {
      const active = (domain === 'all' && button.textContent === text('All topics', 'सभी विषय')) || button.getAttribute('onclick')?.includes(`'${domain}'`);
      button.classList.toggle('o', !active);
    });
    const grid = content.querySelector('.watch-video-grid');
    if (!grid) return openWatchLearn();
    grid.innerHTML = filtered.map(video => {
      const title = localized(video.title);
      const thumb = typeof video.thumbnailUrl === 'string' && /^https:\/\/(i\.ytimg\.com|img\.youtube\.com)\//.test(video.thumbnailUrl) ? video.thumbnailUrl : '';
      return `<article class="watch-video-card">${thumb ? `<img src="${esc(thumb)}" loading="lazy" alt="">` : '<div class="watch-video-placeholder" aria-hidden="true">▶️</div>'}<div class="watch-video-copy"><h3>${esc(title)}</h3><p>${esc(video.channelTitle || '')}</p><p>${esc((video.domains || []).map(d => domainLabel(d)).join(' · '))}</p><button class="btn" type="button" onclick="window.playWatchLearnVideo('${esc(video.id)}')">${esc(text('Watch video', 'वीडियो देखें'))}</button></div></article>`;
    }).join('');
  }

  async function playWatchLearnVideo(id) {
    const loaded = await loadCatalogue();
    const catalogue = loaded.catalogue;
    const stage = currentStage();
    const video = eligible(Array.isArray(catalogue.videos) ? catalogue.videos : [], stage, language(), loaded.approvedChannels).find(item => item.id === id);
    if (!video) return openWatchLearn();
    if (demoMode) {
      const app = document.getElementById('app');
      if (app) {
        const title = esc(localized(video.title));
        const backLabel = esc(text('Watch & Learn', 'देखें और सीखें'));
        const chooseLabel = esc(text('Choose another video', 'अन्य वीडियो चुनें'));
        app.innerHTML = [
          '<div class="bar"><button class="btn o" type="button" onclick="window.openWatchLearn()">⬅ ',
          backLabel,
          '</button><h2>UI demo player</h2></div>',
          '<section class="reading-shell"><div class="reading-panel"><h2>',
          title,
          '</h2><p>Mock player — no YouTube request is made.</p>',
          '<p>Demo data only. This is not an approved video.</p>',
          '<button class="btn o" type="button" onclick="window.openWatchLearn()">',
          chooseLabel,
          '</button></div></section>'
        ].join('');
      }
      return;
    }
    renderPlayer(video, stage);
  }

  root.openWatchLearn = openWatchLearn;
  root.filterWatchLearn = filterWatchLearn;
  root.playWatchLearnVideo = playWatchLearnVideo;
  root.WatchLearn = Object.freeze({ eligible, loadCatalogue });
  if (typeof module !== 'undefined' && module.exports) module.exports = root.WatchLearn;
})(typeof window !== 'undefined' ? window : globalThis);
