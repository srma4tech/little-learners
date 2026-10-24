# Grade 1 Reading Practice — Content Batch 2

## Purpose

Add a Read Along-inspired **content layer** for early readers without changing the current app runtime. This is a draft library for children typically aged 6–7, intended for supported reading and comprehension practice.

## Included

- **8 original story themes**, each with an English passage and a separately authored Hindi adaptation.
- **16 language passages** in total.
- **48 comprehension questions** (three per passage), with answer options and encouraging explanations.
- Vocabulary entries with child-friendly meanings.
- Early and developing difficulty labels and skill tags for sequencing, vocabulary, observation, cause/effect, and simple inference.
- Suggested read-aloud routine, accessibility notes, integration boundary and educator review checklist.

## How this builds on the first pack

The first pack established the broad Grade 1 strands and multiple-choice data pattern. This batch adds connected text so children can practise reading for meaning rather than only responding to isolated questions. The stories use everyday settings and positive, practical choices.

## Content and safety boundaries

- This is original draft content, not a claim of full alignment with any one school board.
- Hindi passages are adaptations of the same theme, not literal translations. Have a fluent Hindi educator review grammar, punctuation, vocabulary and suitability.
- A parent/teacher should be able to read with the child or choose the child's preferred language.
- No microphone, speech-recognition, account, progress, UI, network or video behaviour is introduced by this content-only change.
- YouTube remains explicitly deferred; passages should remain fully usable offline and without external media.

## Data contract

Each passage has a stable ID, theme, skill focus, difficulty, language-specific title/text/vocabulary, and question records. Question IDs are unique across the pack. For each multiple-choice question, the answer must match one of the listed options exactly.

## Validation performed for this batch

- JSON structure parsed before commit.
- Declared passage and question totals match actual records.
- Passage IDs and question IDs are unique.
- Each passage has both `en` and `hi` content.
- Each question answer matches a provided option.
- Each passage has three English and three Hindi questions.
- Educator review is still required before production publication.

## Recommended next step

Review this content pack, then implement one small reading-practice vertical slice in the app: select a passage, show one sentence at a time, allow optional replay/read-aloud, ask comprehension questions, and use the existing progress model only after its integration contract has been checked. Do not introduce voice recording or YouTube as part of that slice.
