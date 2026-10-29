# LittleLearners — Watch & Learn (YouTube) Architecture

**Status:** Design proposal — no production feature enabled yet  
**Owner:** LittleLearners engineering  
**Target:** Mobile-first PWA for Playgroup, Nursery, LKG, UKG and Classes 1–3  
**Languages:** English, Hindi and bilingual presentation

## 1. Product intent

Add a dedicated **Watch & Learn** area that supports purposeful, age-appropriate learning through selected YouTube videos. The feature supplements—not replaces—LittleLearners activities, reading practice, and parent-guided learning.

The child experience must be a finite, curated catalogue. It must not offer unrestricted YouTube search, infinite browsing, autoplay chains, or rewards for watch time.

## 2. Decisions already agreed

- Support the seven existing learning stages: `playgroup`, `nursery`, `lkg`, `ukg`, `class-1`, `class-2`, and `class-3`.
- Support `en`, `hi`, and `both` language preferences.
- Present videos by stage, learning domain, topic and language.
- Discover a broad candidate set centrally, using pagination where appropriate, then review and publish only approved records.
- Use an approved channel/source allowlist and explicit review status. Unknown or unreviewed sources must never appear in the child catalogue.
- Keep YouTube API credentials out of browser code, static files and the PWA.
- Do not promise integration with a child's private YouTube Kids account or its watch history/preferences. An embedded YouTube player is not the YouTube Kids app and does not guarantee complete control over provider UI or recommendations.
- Do not award stars or streak credit for time watched. Rewards may be tied to a related LittleLearners quiz or activity instead.
- Cache catalogue metadata and app UI only; never download/cache YouTube media for offline playback.

## 3. Proposed architecture

### Runtime (child-facing PWA)

1. Load a versioned, static catalogue such as `content/watch-learn-catalog.json`.
2. Filter published entries locally by the active stage, language, topic and availability flags.
3. Show concise cards with title, topic, language, duration (when verified), thumbnail, channel/source and parent-facing details.
4. Open a video only after a deliberate tap, with clear back/close behaviour and no automatic next video.
5. Provide a parent-accessible report/hide action that records a local moderation signal without collecting unnecessary child data.
6. Preserve current app navigation, stage/language settings, accessibility behaviour and offline fallback.

### Catalogue authoring and refresh

**Initial release:** manually curated JSON records reviewed before merge.

**Later automation:** a scheduled server-side GitHub Actions job may use the YouTube Data API to collect candidates into a review-only artifact or pull request. It must:
- use a GitHub Actions secret for the API key;
- keep credentials out of logs, client bundles, committed files and artifacts;
- paginate and respect quota limits;
- mark every discovered record as `pending-review`;
- never publish candidates directly to the production catalogue;
- produce a diff for human review, deduplication and validation;
- use an explicit approval step before the published catalogue changes.

A static GitHub Pages app cannot securely hold a YouTube API key. Do not call YouTube Data API search directly from each child's device.

## 4. Catalogue contract (proposal)

Each published video record should have stable IDs and fields equivalent to:

- `id`: LittleLearners-owned stable ID
- `youtubeVideoId`: provider video ID
- `title`: reviewed display title; localized title variants where appropriate
- `stageIds`: one or more of the seven supported stage IDs
- `domains`: e.g. phonics, Hindi varnamala, numeracy, science, stories, art, music/movement
- `topicIds`: stable topic identifiers
- `languages`: `en`, `hi`, or `both`
- `channelId` and `channelTitle`: verified source identity
- `reviewStatus`: `pending-review`, `approved`, `rejected`, or `needs-recheck`
- `reviewedAt`, `reviewedByRole`, `reviewNotes`
- `ageSuitability`, `curriculumFit`, `accessibilityNotes`
- `thumbnailUrl`, `durationSeconds`, `lastVerifiedAt` (only if verified)
- `availabilityStatus`: `available`, `unavailable`, or `restricted`
- `madeForKidsStatus`: `verified`, `unknown`, or `not-applicable` (never infer it from appearance alone)

Only `reviewStatus=approved`, valid records with a verified source and eligible playback should be eligible for display. Keep moderation and verification states separate from publication state.

## 5. Safety, privacy and policy gates

- Use the YouTube Data API and IFrame Player API only in accordance with their current official terms, developer policies and documentation.
- Review YouTube's Made for Kids designation and relevant feature restrictions; do not treat the label as a guarantee that a video is suitable for every age or learning goal.
- Do not collect a child's YouTube credentials, private watch history or unrelated personal information.
- Do not create a custom child-facing search box or expose unfiltered external results.
- Do not use autoplay, autoplay-next, watch-time incentives or infinite scrolling.
- Display a clear parent-facing note that videos are hosted by YouTube and its player/interface is subject to YouTube's controls and policies.
- Keep external navigation deliberate and parent-aware; test what the embedded player exposes on mobile.
- Minimize analytics. Do not send child names, exact ages, profile identifiers or learning history to YouTube.
- Before public release, review applicable child-privacy, consent, data-retention and advertising requirements for the markets served. Obtain legal/privacy review where needed.

Official references:
- YouTube Data API overview: https://developers.google.com/youtube/data/getting-started
- Search API: https://developers.google.com/youtube/v3/docs/search/list
- Video resource: https://developers.google.com/youtube/v3/docs/videos
- IFrame Player API: https://developers.google.com/youtube/iframe_api_reference
- YouTube API Services Developer Policies: https://developers.google.com/youtube/terms/developer-policies
- YouTube Kids parental controls (product distinction): https://support.google.com/youtubekids/answer/6172308?hl=en

Re-check current official documentation during implementation; this design is not a substitute for policy or legal review.

## 6. Phased delivery

### Phase 0 — Design and guardrails (this change)
- Document product boundaries, catalogue contract, safety gates and staged rollout.
- No player UI, API key, data fetch or child-visible feature is introduced.

### Phase 1 — Catalogue foundation
- Add a JSON schema and validator aligned to existing content-pack conventions.
- Add a small manually reviewed pilot set only after the schema and approval workflow are agreed.
- Add automated checks for stage IDs, language values, duplicate video IDs, source allowlist, review state, required metadata and unsafe publication states.

### Phase 2 — Read-only Watch & Learn UI
- Add a separate, feature-flagged section with stage/language/topic filtering.
- Use the official embedded player, deliberate play action, explicit exit/back handling and reduced-motion/accessibility support.
- Keep the catalogue empty-safe and offline-safe.
- Do not enable automated candidate ingestion yet.

### Phase 3 — Reviewed discovery pipeline
- Add scheduled candidate discovery using a secret-held API key, pagination and quota-aware limits.
- Publish candidates to a review artifact or pull request only.
- Add human approval, stale-video checks and periodic re-verification.

### Phase 4 — Pilot and release
- Test Android hardware Back and edge-swipe navigation, player close/return, scrolling, orientation, network failure, offline state, screen-reader labels and stage/language changes.
- Validate video eligibility and content quality with an adult reviewer for every published item.
- Release behind a feature flag, monitor errors without collecting sensitive child data, and provide a rollback switch.

## 7. Acceptance criteria

- No child-visible video can appear without explicit approval and a verified allowlisted source.
- Stage and language filters use the same canonical IDs/settings as the rest of LittleLearners.
- The feature does not interfere with learning progress, rewards, Parent Corner or whole-app back navigation.
- The child must intentionally start each video; playback does not chain to another video.
- No API secret is present in frontend files, static assets, committed JSON, browser requests or logs.
- A failed/empty catalogue leaves the rest of the app usable.
- Automated tests validate catalogue shape and block unapproved or duplicate records.
- Manual Android checks pass before the feature is enabled for all users.

## 8. Explicit non-goals for the first release

- Logging into, reading or syncing a private YouTube Kids profile.
- Unrestricted YouTube browsing/search.
- Guaranteed control of every YouTube player recommendation or external link.
- Offline video downloads.
- Personalized child profiling or watch-time analytics.
- Automatic video publishing based only on search ranking or AI classification.
