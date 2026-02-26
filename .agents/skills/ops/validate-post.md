---
name: validate-post
type: ops
level: L2
description: Validate a draft post against hard rules (script) and soft rules (LLM)
refs:
  - .agents/rules/quality-gate.md
scripts:
  - scripts/validate.mjs
input: Draft file path
output: Validation verdict (pass/fail) with details
---

# Validate Post

## Steps

### Step 1: Hard Rules (Script)

Run the validation script:

```bash
node scripts/validate.mjs {draft_path}
```

Parse the JSON output: `{ valid, hardRules, softRuleHints }`

If `valid` is `false`:
- Attempt to fix the issues (1 attempt only)
- Re-run validation after fix
- If still failing → report failure, do NOT proceed

### Step 2: Soft Rules (LLM)

Read the quality gate rules: `.agents/rules/quality-gate.md`

Evaluate the draft against each soft rule:
1. **Voice Consistency** — Does it match the soul.md tone?
2. **Narrative Coherence** — Does it flow logically?
3. **Opinion Attribution** — Are opinions vs facts clear?
4. **Source Diversity** — Multiple sources referenced?
5. **Tag Quality** — Specific and useful tags?
6. **Description Quality** — Meaningful one-sentence summary?
7. **Heading Structure** — Section headings for long posts?

### Step 3: Verdict

Report:
```
Hard rules: PASS/FAIL (list any failures)
Soft rules: PASS/CONCERNS (list any concerns)
Script hints: (list from validate.mjs softRuleHints)

Overall: PASS / NEEDS_REVIEW / FAIL
```

- **PASS**: All hard rules pass + no soft rule concerns
- **NEEDS_REVIEW**: All hard rules pass + some soft rule concerns
- **FAIL**: Hard rule failure (even after 1 fix attempt)
