# Password Forge — Markov Model Integration Guide

## Overview

The file `src/data/markovData.ts` ships with a **sample** bigram model built
from documented common-password patterns. After you train your Python model on
the wordlists, replace that file's data to get real predictability scores.

---

## Expected Output Format from Your Python Script

```python
import json, math

# After training, export like this:
output = {
    "version": "trained-1.0",
    # Probability that a password starts with each lowercase char
    "startProbs": {
        "a": 0.062,
        "b": 0.021,
        # ... all chars you observed
    },
    # Bigram transition probabilities — P(next_char | current_char)
    # Keys are lowercase. Rows should sum to ≤ 1; unlisted chars default
    # to uniform (1/96) in the analyzer.
    "transitions": {
        "a": {"b": 0.03, "c": 0.07, "s": 0.19, ...},
        "1": {"2": 0.42, "1": 0.08, ...},
        # ...
    }
}
with open("markovData.json", "w") as f:
    json.dump(output, f, indent=2)
```

---

## Integrating into the Frontend

1. Run your Python training script and generate `markovData.json`.
2. Open `src/data/markovData.ts`.
3. Replace the values of `startProbs` and `transitions` with the JSON output.
4. Update `MARKOV_VERSION` to `"trained-1.0"` (or your own label).
5. Rebuild the app — the analyzer immediately uses your trained model.

---

## Minimal Python Training Template

```python
from collections import defaultdict
import json, math

# ── 1. Load wordlists ──────────────────────────────────────────────────────
passwords = []
for path in ["wordlists/rockyou.txt", "wordlists/passwords.txt"]:
    try:
        with open(path, encoding="utf-8", errors="ignore") as f:
            passwords.extend(line.strip() for line in f if line.strip())
    except FileNotFoundError:
        pass

# ── 2. Count bigrams ───────────────────────────────────────────────────────
start_counts   = defaultdict(int)
bigram_counts  = defaultdict(lambda: defaultdict(int))
total_start    = 0
total_bigrams  = defaultdict(int)

for pwd in passwords:
    lower = pwd.lower()
    if not lower:
        continue
    start_counts[lower[0]] += 1
    total_start             += 1
    for i in range(len(lower) - 1):
        bigram_counts[lower[i]][lower[i+1]] += 1
        total_bigrams[lower[i]]             += 1

# ── 3. Convert to probabilities ────────────────────────────────────────────
start_probs = {
    ch: cnt / total_start
    for ch, cnt in start_counts.items()
    if cnt / total_start > 0.001  # prune very rare starters
}

transitions = {}
for ch, nexts in bigram_counts.items():
    total = total_bigrams[ch]
    row   = {nxt: cnt / total for nxt, cnt in nexts.items() if cnt / total > 0.001}
    if row:
        transitions[ch] = row

# ── 4. Export ──────────────────────────────────────────────────────────────
output = {
    "version":    "trained-1.0",
    "startProbs": start_probs,
    "transitions": transitions,
}
with open("markovData.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"Done! {len(passwords):,} passwords processed.")
print(f"  Start chars:   {len(start_probs)}")
print(f"  Transition chars: {len(transitions)}")
```

---

## Notes

- The model uses **order-1** bigrams (current char → next char).
- Characters not found in the table default to uniform probability `(1/96)`.
- You can extend `markovModel.ts` to support **order-2 trigrams** by changing
  the key from `ch` to `ch + ch2` and updating `calculatePredictability`.
- Never include raw leaked passwords in the model export — only probability
  distributions are needed.
