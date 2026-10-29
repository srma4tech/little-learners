# Stage-aware content contract (v1)

## Goals and compatibility

This contract introduces stable stage and activity metadata without changing child profile schema, Firestore rules, or saved progress. Existing Grade 1 packs remain valid legacy content and are not silently rewritten. Stage IDs are stable machine identifiers; translated labels are presentation only.

## Stage catalog

The canonical catalog is `content/learning-stages.json`: Playgroup, Nursery, LKG, UKG and Classes 1–3, with English/Hindi labels, approximate age guidance and focus tags. Ages are guidance, not an eligibility gate.

## Metadata required for new activities

- `id`: stable, unique lowercase kebab-case identifier.
- `schemaVersion`: `1.0.0`.
- `domain`: `english`, `hindi`, `mathematics`, `environmental-learning`, `reasoning`, `creative-learning`, `life-skills`, or `reading-listening`.
- `stageIds`: one or more IDs from the canonical catalog.
- `languageVariants`: map keyed by `en` and/or `hi`; each variant has a title and instructions.
- `activityType`: `read`, `listen`, `match`, `sort`, `sequence`, `multiple-choice`, `draw`, or `guided-practice`.
- `difficulty`: `introductory`, `developing`, or `confident`.
- `reviewStatus`: `draft`, `in-review`, `approved`, or `retired`.
- `completion.criteria`: explicit completion criteria; opening an activity is not mastery.
- `accessibility.notes`: alternatives for audio, readable text, touch targets and reduced motion where relevant.

Use original or appropriately licensed material. Review each language independently. Never label draft content as teacher-approved. Formal curriculum claims need source references and local review.

## Legacy compatibility and validation

The validator deliberately supports current formats: Grade 1 foundation `strands[].lessons[].questions[]`, and Grade 1 reading `passages[].languages` with language-tagged questions. Run `node .github/scripts/validate-content.cjs`. CI runs this validator and its unit tests.

Structural checks cannot replace teacher review, Hindi spelling/matra review, accessibility checks or curriculum alignment. Existing content remains draft until reviewed.

## Integration sequence

1. Persist a parent-selected stage on an individual child only after profile-merge and cloud compatibility tests are added.
2. Keep stage changes separate from progress reset logic; changing stage must not remove stars or activity history.
3. Connect a small set of reviewed activities to existing navigation and rewards.
4. Add recommendations only after legacy profiles, guest mode, sign-in merge, offline writes, multiple-child isolation and reset races pass regression tests.
