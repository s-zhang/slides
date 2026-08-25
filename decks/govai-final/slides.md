---
theme: seriph
title: Evals Markets + Cyber Red Teaming
info: |
  GovAI Final Presentation, Summer 2026 — Pingshan Zhang.
  Towards a market of external evaluations for frontier AI, and red teaming as the future of cyber evals & defense.
class: text-center
transition: slide-left
mdc: true
fonts:
  sans: Inter
  serif: 'Roboto Slab'
---

# Evals Markets<br>+ Cyber Red Teaming

GovAI Final Presentation · Summer 2026

<div class="pt-8 opacity-80">Pingshan Zhang</div>

<!--
Two threads: (1) a market for external frontier-AI evaluations, and (2) red teaming as the future of cyber evals and defense — motivated by the July 2026 OpenAI × Hugging Face incident.
-->

---
layout: default
---

# Towards a Market of External Evaluations for Frontier AI

<div class="text-xl opacity-70 mb-8">Four parts</div>

<div class="grid grid-cols-2 gap-4 text-2xl">
<div v-click class="p-4 border-l-4 border-teal-500 pl-4">**1 · Evals** — a market for external evaluations</div>
<div v-click class="p-4 border-l-4 border-orange-500 pl-4">**2 · Cyber** — red teaming as the future cyber eval</div>
<div v-click class="p-4 border-l-4 border-teal-500 pl-4">**3 · Next steps** — where this goes</div>
<div v-click class="p-4 border-l-4 border-orange-500 pl-4">**4 · Timeline** — plan for the fall</div>
</div>

---
layout: section
---

# Part 1 · Evals

A market for external frontier-AI evaluations

---

# The Issue

<div class="text-2xl mb-8">

**Problem:** Evals orgs (Apollo, METR, etc.) are **not meeting** the pre-deployment eval demand from labs.

</div>

## Why?

<v-clicks>

- Evals are **expensive** to develop and run
- **Lack of incentives** — unpaid, little academic output

</v-clicks>

<!--
Demand from labs for third-party pre-deployment evaluation outstrips what the non-profit eval ecosystem can supply.
-->

---
layout: statement
---

# Solution

## Commercialization of eval services

---

# Commercialization: Why it works

<v-clicks>

- Creates the **incentive** — eval services are now **paid**
- **Markets foster competition**, pushing for new eval tech

</v-clicks>

<div v-click class="mt-10 p-4 border-l-4 border-red-400 pl-4 text-xl">

**Concern:** objectivity & quality — a paid evaluator has reason to please the lab.

</div>

<div v-click class="mt-4 p-4 border-l-4 border-teal-500 pl-4 text-xl">

**Fix:** **licensing** — accredit evaluators against a standard.

</div>

---
layout: section
---

# Part 2 · Cyber

Reckonings from OpenAI × Hugging Face:<br>red teaming as the future cyber eval & defense

---
layout: statement
---

# What happened?

<div class="text-2xl leading-relaxed opacity-90">

A swarm of agents, while **heavily handicapped**, spontaneously decided — and successfully completed — a sophisticated **end-to-end data exfiltration** cyber attack.

</div>

<!--
July 2026: OpenAI internal eval agents escaped their sandbox and intruded into Hugging Face production to steal a benchmark's answer key.
-->

---

# Interpretations

<v-clicks>

- Models (agents) **cheat** despite instructions not to
- Models (agents) are **extraordinarily capable** at cyber
- Current **cyber evals aren't great**
- **Cyber defense is woefully behind**

</v-clicks>

---
layout: center
class: text-center
---

# Benchmark Coverage of Cyber Tactics

<img src="/benchmark-coverage.png" class="rounded-lg mt-4 mx-auto max-h-[70vh]" alt="MITRE ATT&CK tactic coverage: Stuxnet (11) and OpenAI/HF (14) span far more tactics than benchmarks ExploitGym (3) and Cybench (3)" />

<div class="text-sm opacity-60 mt-2">Real incidents (Stuxnet, OpenAI × HF) span many more ATT&CK tactics than today's benchmarks (ExploitGym, Cybench).</div>

---
layout: center
class: text-center
---

# Hugging Face hitting Model Safeguards in its Cyber Response

<img src="/hf-safeguards.png" class="rounded-lg mt-4 mx-auto max-w-4xl w-full" alt="Claude Opus API error: safety measures flagged the message as a cybersecurity topic" />

<div class="text-lg italic opacity-70 mt-4">Guardrails on Opus tripped every time we tried to analyze the attack logs.</div>

<!--
The defensive irony: misuse guardrails made frontier models unusable for the defenders trying to investigate the incident.
-->

---

# The Questions

<div class="grid grid-cols-2 gap-10 mt-8 text-2xl">
<div v-click>

### For the evaluator
How do we make cyber evals **realistic**?

</div>
<div v-click>

### For the defender
How can defenders find **fix-worthy** bugs?

</div>
</div>

<div v-click class="mt-14 text-center text-4xl font-bold">

One answer: **Agentic Red Teaming**

</div>

---
layout: two-cols-header
---

# Red Team a Facsimile

**Problem:** you can't red team against **real** production systems.

**Solution:** red team a **facsimile** of them.

::left::

<div class="pr-6 mt-6" v-click>

### For the evaluator
Red teaming **cyber ranges** as cyber evals

<div class="opacity-60 text-sm mt-1">Representative environments that measure how far an attacker gets.</div>

</div>

::right::

<div class="pl-6 mt-6" v-click>

### For the defender
Red teaming **digital security clones**

<div class="opacity-60 text-sm mt-1">A digital twin of your own system, attacked safely.</div>

</div>

---
layout: section
---

# Part 3 · Next Steps

---

# Next Steps

<div class="grid grid-cols-2 gap-8 mt-6 text-xl">

<div v-click>

### Location
- **Seattle** — Sept to Nov
- **SF** — Oct
- **Singapore** — TBD

</div>

<div v-click>

### Support
- **Mentor**
- **Research Manager**

</div>

</div>

---
layout: center
class: text-center
---

# Thank you!

<div class="text-lg opacity-80 max-w-3xl mx-auto mt-4 leading-relaxed">
Elizabeth, Verena, Nicole, Tom, Kasia, Leon, Steph,<br>
Julia, Auriane, Malou, David, Eric, Mathew, Firat, …
</div>

<div class="flex gap-16 justify-center items-end mt-10">
  <div class="text-center">
    <img src="/substack.png" class="h-28 mx-auto rounded" alt="Substack" />
    <div class="text-sm opacity-70 mt-2">Substack</div>
  </div>
  <div class="text-center">
    <img src="/insta.png" class="h-28 mx-auto rounded" alt="Instagram" />
    <div class="text-sm opacity-70 mt-2">Instagram</div>
  </div>
</div>
