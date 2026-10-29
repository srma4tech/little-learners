# LittleLearners Product Roadmap

**Status:** Proposed product baseline  
**Version:** 1.0  
**Scope:** Playgroup through Class 3  
**Languages:** English and Hindi first; architecture prepared for additional Indian languages  
**Delivery model:** Incremental, tested pull requests

## Product vision

LittleLearners is a mobile-first, play-based early-learning platform that helps children build foundational skills from Playgroup through Class 3. It combines academics, playful practice, a guided learning journey, positive rewards, progress visibility, and parent support.

The app supports parent-selected school stage while allowing practice recommendations to adapt to demonstrated learning. Children may revisit earlier skills without stigma. The app supports practice; it does not claim to guarantee school readiness.

## Product principles

- Learning and play reinforce each other; games must have a clear learning purpose.
- Feedback is kind, specific, and retry-friendly. No shame, public leaderboards, or speed pressure.
- Progress distinguishes exposure, practice, and demonstrated mastery.
- A parent can change a child's stage without deleting progress.
- Guest use remains possible; account creation is not a prerequisite for learning.
- Collect the minimum child data necessary and keep parent controls separate from child activity.
- Content is versioned, age-appropriate, reviewed, and separately checked for each language.
- Mobile usability, accessibility, offline resilience, and regression testing are release requirements.

## Users

- **Child:** finds an appropriate activity, practises, receives supportive feedback, and celebrates progress.
- **Parent/caregiver:** selects the stage, configures language and goals, manages child profiles, and reviews progress.
- **Content reviewer:** verifies learning accuracy, age suitability, language quality, accessibility, and curriculum alignment.

## Learning stages

Use stable stage IDs independent of localized display names:

| Stage ID | Display label | Broad focus |
|---|---|---|
| playgroup | Playgroup | Sensory exploration, listening, matching, movement and familiar objects |
| nursery | Nursery | Language exposure, sorting, counting, patterns and everyday concepts |
| lkg | LKG | Letter/sound awareness, number sense, early writing readiness and sequencing |
| ukg | UKG | Early decoding, short words, number operations readiness and school routines |
| class-1 | Class 1 | Foundational reading, writing, numeracy, environmental awareness and reasoning |
| class-2 | Class 2 | Fluency, comprehension, number operations, measurement and explanations |
| class-3 | Class 3 | Independent reading, written expression, multi-step maths, inquiry and problem-solving |

Stage is a recommendation context, not a hard content lock. Parent-selected stage and activity-level evidence can both influence recommendations.

## Learning-domain map

| Domain | Playgroup–Nursery | LKG–UKG | Classes 1–3 |
|---|---|---|---|
| English | Listening, sounds, familiar words, rhymes | Letter recognition, phonological awareness, phonics, early reading | Fluency, vocabulary, comprehension, grammar foundations and writing |
| Hindi | Listening, rhymes, familiar words | स्वर/व्यंजन, अक्षर पहचान, शुरुआती पठन | पठन प्रवाह, शब्दावली, बोध, व्याकरण की बुनियाद और लेखन |
| Mathematics | Matching, sorting, shapes, counting | Number recognition, quantity, comparison, patterns | Place value, operations, multiplication foundations, measurement, time and data |
| Environmental learning | Family, body, animals, nature | Plants, food, community, weather and safety | Living things, surroundings, resources, health and observation |
| Reasoning | Matching, grouping and simple patterns | Sequencing, classification and similarities | Logic puzzles, ordering, multi-step patterns and problem-solving |
| Creative learning | Colors, rhythm, drawing and pretend play | Art, music, storytelling and construction | Creative projects, expression and guided making |
| Life skills | Feelings, routines, sharing and self-care | Hygiene, safety, cooperation and communication | Responsibility, decision-making, collaboration and age-appropriate digital safety |
| Reading/listening | Picture-led stories and read-aloud | Sound-letter practice and short sentences | Independent reading, inference, sequencing and comprehension |

Attention, memory, communication and fine-motor practice are supported across activities rather than treated as high-stakes tests.

## Navigation proposal

Keep the current four-item bottom navigation where possible: **Home, Profile, Stickers, Parents**. Avoid crowding small screens with a tab for every feature.

- **Home:** Continue Learning, a recommended next activity, daily goal, Play & Explore, Reading, Explore Subjects.
- **Profile:** child profile, stage selection, language and accessibility preferences.
- **Stickers:** earned rewards and learning milestones.
- **Parents:** child management, progress summary, goals, settings, privacy and reset controls.
- **Reading:** story library, vocabulary, read-aloud and comprehension.
- **Explore Subjects:** domain and stage browsing.
- **Learning Path:** sequenced activities, revision and status.

Reading, Explore Subjects and Learning Path can initially be nested screens reachable from Home.

## Content model requirements

Each lesson/activity should eventually have:
- Stable ID and content schema version.
- Domain, skill, prerequisites and recommended stage(s).
- Difficulty and activity type.
- Supported language variants with independent review status.
- Instructions, feedback/hints, completion criteria and answer data where relevant.
- Accessibility notes and offline asset requirements.
- Review state such as draft, in-review, approved, or retired.
- Curriculum/source references when claims depend on a formal curriculum.

Existing Grade 1 content packs should be retained and extended, not discarded. Existing draft labels remain until educator and language review is complete. Content validation should check IDs, required fields, translations, answer correctness and links before release.

## Progress and personalization

Use the existing child/profile model as the compatibility anchor. Do not introduce a parallel account or progress store.

Before implementing activity history:
1. Document current guest, profile, stars, reset, sign-in and cloud-merge flows.
2. Propose the smallest event/summary representation compatible with existing Firestore rules.
3. Define duplicate-completion and reward idempotency.
4. Test two-child isolation, guest-to-account merge, offline changes, stale cloud writes, sign-out and resets.
5. Only then connect the UI.

Progress should distinguish:
- **Started:** activity opened or meaningfully begun.
- **Practised:** at least one valid attempt or activity interaction.
- **Completed:** explicit completion condition met.
- **Mastery evidence:** a defined skill criterion met over sufficient attempts; do not infer mastery from opening an activity or a single lucky answer.

Keep raw child data minimal. Avoid storing full answer histories unless a clear learning or parent-reporting need justifies them.

## Prioritized backlog

### P0 — Release and UX baseline
- Confirm the latest Reading UI commit has green CI and Pages deployment.
- Verify Reading library at 320, 360 and 390 CSS px; confirm no horizontal overflow, language switching, story opening, quiz completion and back navigation.
- Maintain shared visual language and regression smoke coverage.

**Acceptance:** CI and deployment green; mobile browser checks pass; no existing reading or navigation regression.

### P1 — Stage and content foundations
- Add versioned stage/domain metadata and a documented content schema.
- Add parent-selectable stage preference with legacy-profile compatibility.
- Changing stage must not erase stars or progress; content remains revisitable.
- Prepare a content review workflow for English and Hindi independently.

**Acceptance:** all seven stage IDs validate; old profiles load unchanged; stage changes persist correctly for guest and signed-in users; no Firestore rule expansion without an explicit schema/rules review.

### P1 — Progress pilot in Reading
- Record reading started/completed status and quiz outcome using stable story IDs.
- Make completion/reward updates idempotent.
- Show a simple child-friendly summary after data behavior is verified.

**Acceptance:** reopen does not duplicate rewards; reset is respected; two children's records remain separate; guest merge, offline edits and cloud synchronization tests pass; current Reading experience remains usable.

### P1 — Guided Home
- Add Continue Learning, Play & Explore, Reading and Explore Subjects.
- Recommendations use selected stage and available content; empty states explain what to do next.

**Acceptance:** all cards navigate correctly; no dead ends; home works on narrow mobile viewports and with larger text.

### P2 — Content and activity expansion
- Expand foundational English, Hindi, mathematics, environmental learning and reasoning.
- Introduce reusable matching, sequencing and other activity patterns.
- Batch content with automated checks and human review.

**Acceptance:** each activity has a learning objective, stage, instructions, feedback and finish state; questions and answer keys validate; language variants receive separate review.

### P2 — Parent summary
- Show recent activity, completion and practice needs.
- Clearly separate practice from mastery.
- Support multiple children, language/settings and intentional reset.

**Acceptance:** no cross-child data leakage; summaries agree with source progress; controls require appropriate parent interaction; privacy copy is clear.

### P3 — Rich media and expansion
- Curated videos, additional Indian languages, richer audio and improved offline packs.
- Media is added only with suitable parent controls, controlled navigation, accessibility and performance checks.

**Acceptance:** video links do not create uncontrolled child navigation; language fonts render correctly; offline states are clear; performance and privacy are checked.

## Incremental implementation sequence

1. Verify latest merge, CI, Pages deployment and mobile Reading UI.
2. Merge this roadmap/documentation baseline.
3. Add stage/domain/content schema documentation and validation tests.
4. Implement parent-selected stage preference in isolation.
5. Design and test the progress representation against current profile/Firestore rules.
6. Implement Reading progress as a pilot.
7. Add Guided Home using existing content.
8. Add parent summary.
9. Expand reviewed content and reusable activities.
10. Add rich media and additional languages after the core flows are stable.

Every step is a separate branch and PR. Require automated checks, appropriate browser smoke tests, service-worker cache updates when assets change, and post-deployment verification. Do not combine profile, progress-schema and major UI changes in one PR.

## Definition of success

- Parents can select and safely change a stage.
- Children can find an appropriate activity and resume it easily.
- Progress is accurate, idempotent and isolated per child.
- Parents can distinguish practice from mastery.
- English and Hindi content is reviewed independently, with architecture ready for more languages.
- Guest mode, account merge, resets, offline support and existing rewards continue working.
- Each release passes automated checks and mobile verification.

## Explicit non-goals for the first releases

- Rewriting the app into a new framework.
- AI-driven opaque scoring or high-stakes assessment.
- Public leaderboards or speed-based pressure.
- Uncontrolled external browsing from child screens.
- Claiming the app alone guarantees school readiness.
- Publishing draft content as reviewed curriculum.
