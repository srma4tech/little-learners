# Grade 1 Content Foundation

## Purpose

Build a rich, reusable learning-content foundation for children typically aged 6–7 (Grade 1). This is a **content-first change**: it adds a structured content pack and does not change the live app's interface, learning engine, Firebase data model, or deployed behaviour.

## Included in the first content pack

- **English language:** alphabet sounds, short-vowel words, naming/action words, and simple sentences.
- **Hindi:** स्वर, व्यंजन, मात्राएँ, and simple sentences.
- **Mathematics:** numbers to 100, addition and subtraction within 20, shapes, and patterns.
- **Environmental Studies:** plants, animals and habitats, body/health habits, weather and seasons.
- **Thinking skills:** classification, patterns, comparison and observation.
- **Good habits and life skills:** manners, safety, and personal responsibility.
- **General awareness:** family/school/community, community helpers, and India/nature.
- Short explanations, vocabulary, multiple-choice practice, answer keys, and supportive explanations for answers.

The pack currently contains **7 strands, 25 lessons, and 75 practice questions**. Treat this as a starter curriculum library that can be expanded in reviewed batches, not as a claim that it covers every board's full syllabus.

## Content contract

- Stable IDs are used for strands and lessons so content can later be connected to the activity engine without relying on display titles.
- Each lesson has a single concept, vocabulary list and question records.
- Each question has a type, prompt, options, answer and explanatory feedback.
- Keep answer text exactly aligned with one of the provided options for multiple-choice questions.
- Use respectful, inclusive examples; do not assume every child has the same family structure, resources or abilities.
- Health and safety topics teach general, age-appropriate habits and direct children to trusted adults; they do not replace adult supervision or professional advice.
- Content is in English and Hindi where currently authored. Do not mark a strand fully bilingual until its lessons and feedback have been reviewed in both languages.
- Have a teacher/parent review local syllabus fit, Hindi spelling/matras, question ambiguity, accessibility and cultural context before broad publication.

## Recommended next content batches

1. **Expand English and Hindi literacy:** picture-word vocabulary, rhyming, phonics, reading comprehension, sentence order, मात्रा practice, and short passages.
2. **Expand mathematics:** place value, number comparison, skip counting, word problems, calendar/time, money awareness and measurement.
3. **Add more EVS and life practice:** food groups, water conservation, clean surroundings, transport, day/night, senses, and safe routines.
4. **Add differentiated practice:** warm-up, core and challenge questions; hint-first feedback; mixed review rounds.
5. **Review and validate:** content QA for age appropriateness, answer uniqueness, translations and stable IDs before integrating with UI.

## Future YouTube phase — deliberately deferred

No YouTube search, embeds, links or playback are implemented by this PR. Before that phase, agree on:
- parent-controlled topic and grade filters;
- a clear allowlist of search topics and provider metadata;
- age-appropriate review and reporting of unsuitable results;
- no autoplay, no unbounded recommendations, and a clear way to exit;
- privacy-conscious search and playback behaviour;
- graceful handling of unavailable videos and restricted embeds.

Content lessons should remain usable even when video search is unavailable. Video is supplementary, not a prerequisite for learning.

## Integration boundary

Do not wire this pack into the current production app until the data contract and content have been reviewed. The next implementation step should be a small vertical slice: load one strand, render a lesson, check an answer, and verify that completion uses the existing progress/reward model without changing existing saved data. Update the service-worker cache version only when application runtime assets change, not for a content/documentation-only change.
