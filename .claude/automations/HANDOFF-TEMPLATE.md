# Automation Handoff Template

## 1. Summary

- automation:
- owner:
- purpose:
- trigger:
- success condition:

## 2. Current Reality

- current behavior:
- verified inputs:
- verified outputs:
- hard stop conditions:

## 3. Run Order

```text
before this:
this automation:
after this:
```

## 4. Selection Rule

- target rows:
- exclusion rule:
- max items per run:

Example query:

```sql
-- fill with the real selector used by the automation
```

## 5. Processing Steps

```text
[input]
  -> [step 1]
  -> [step 2]
  -> [quality gate]
  -> [write back]
  -> [report]
```

## 6. Write Behavior

- tables touched:
- fields updated:
- status transitions:
- side effects:

## 7. Quality / Safety Gates

| Gate | Pass rule | Fail behavior |
|------|-----------|---------------|
| Example | ... | ... |

## 8. Failure Semantics

- what gets retried automatically:
- what gets skipped repeatedly:
- what must be reset manually:

## 9. Manual Boundaries

| Step | Auto or manual | Notes |
|------|----------------|-------|
| ... | ... | ... |

## 10. Validation

- runtime check:
- DB check:
- UI or operator check:

## 11. Related Files

| File | Role |
|------|------|
| ... | ... |

## 12. Change Log

- YYYY-MM-DD: what changed and why
