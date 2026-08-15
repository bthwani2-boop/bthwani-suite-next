# 03 — Decisions, Coverage & Anti-Drift

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: accounting, decisions, causal clustering, priority, invalidation and frontier accounting.

## 1) Constitutional accounting

```text
EVERY MATERIAL OPERATIONAL NODE → OPERATIONAL REGISTRY + GRAPH
EVERY LOWER-LAYER EARLY OBSERVATION → HOLD/PROMOTED/DISPOSITIONED
EVERY DEFECT/GAP/CONTRADICTION → FINDING ID
EVERY MATERIAL FINDING → RC-NNN OR PROVEN DISPOSITION
EVERY MATERIAL RC → COMPARATIVE PRIORITY POSITION
EVERY DEPENDENCY/CONSUMER/SURFACE → SCOPE DELTA / GRAPH RELATION
EVERY TRUE DECISION → DECISION ID + FULL IMPACT PROPAGATION
EVERY REQUIRED PROOF → EVIDENCE ID
NO SILENT MATERIAL ELEMENT
```

## 2) Coverage order

Coverage يبدأ من أعلى معنى تشغيلي، لا من repository structure:

```text
Product Outcomes
→ Actors / Authorities / Responsibilities
→ Journeys
→ States / Transitions / Preconditions / Invariants
→ Handoffs / Cross-Surface Meaning
→ Canonical Owners / Writers / Readers / Consumers
→ Data/Contract/API/Persistence/Event/Readback Flows
→ Implementation/Runtime Boundaries
→ Findings / RCs / Priority / Frontier
```

Machine `operational-root.json` يحكم اكتمال الطبقات التشغيلية؛ `00-OVERVIEW.md` ملخص فقط.

## 3) Finding / lower-layer disposition

Finding مادية:

```text
SAME_ROOT_CAUSE
UPSTREAM_OR_BLOCKER
INDEPENDENT_IN_SCOPE
SUPPORTED_EXCLUSION_WITH_PROOF
REQUIRES_MORE_DIAGNOSIS
```

Lower-layer observation:

```text
HOLD → لا تنفيذ
PROMOTED → parent + RC + evidence + current priority
DISPOSITIONED → resolved/excluded with proof
```

وجود technical failure واضح لا يمنحه الأولوية.

## 4) Root-cause clustering

اربط الأعراض عبر operational parent/canonical owner/state model/contract/data writer/dependency/migration/runtime boundary. لا split/merge بالحدس. كل RC مادي يملك Operational Parents، competing hypotheses، evidence، blast radius، dependencies، consumers، upstream disposition.

```text
UNCLUSTERED_MATERIAL_FINDINGS=0
```

قبل ranking/frontier.

## 5) Competitive priority

```text
UPSTREAM / ROOT-CAUSE DEPTH
> BLOCKING POWER
> CANONICAL / FOUNDATION IMPORTANCE
> BLAST RADIUS
> SECURITY / DATA / FINANCE / OPERATIONAL RISK
> UNLOCK VALUE
> CROSS-JOURNEY / CROSS-SURFACE EFFECT
> FINDING DENSITY / RECURRENCE
> STRUCTURAL-DEBT MULTIPLIER
> LOCAL LEAF / COSMETIC
```

`>` causal default precedence لا score ميكانيكي. Evidence قد يثبت dominance مختلفًا ويجب توثيقه.

Forbidden shortcuts:

```text
RECENCY
MOST_FINDINGS_ALONE
MOST_CHANGED_FILES
EASIEST_FIX
LAST_SESSION
SEQUENCE_NUMBER
FIRST_CI_FAILURE
```

## 6) Competitive deepening status

كل RC مفتوح قبل ranking النهائي يكون:

```text
DEEPENED_ENOUGH_TO_RANK
or
PROVEN_CANNOT_OUTRANK
```

Winner نفسه يجب `DEEPENED_ENOUGH_TO_RANK`. لا تسمح candidate غير مفهومة يمكنها قلب الترتيب.

## 7) Decision boundary

```text
derive from evidence if possible
→ ask only true non-derivable decision
→ options + recommendation + reason + impact
→ record DECISION ID
→ propagate through full operational/technical graph
→ invalidate affected assumptions/evidence
→ re-diagnose
→ re-cluster/re-rank when causal placement/leverage changes
```

لا سؤال للمستخدم عن شيء قابل للاشتقاق.

## 8) Frontier derivation

Frontier صالح فقط إذا Machine Gates تثبت:

```text
operational coverage current
root-cause landscape current
all material findings dispositioned
all material RCs ranked
winner operationalGraphPositionProven=true
blastRadiusComplete=true
dependenciesComplete=true
consumersComplete=true
unresolvedUpstream=[]
competitiveDeepening=DEEPENED_ENOUGH_TO_RANK
parallel RCs have explicit semantic independence evidence
```

Sequence number = creation history فقط.

## 9) Priority invalidation

أي discovery/decision/foreign delta/fix يغير:

```text
actor/authority/responsibility
journey/state/handoff
canonical owner/writer/reader/consumer
dependency/upstream position
blocking power/blast radius/risk/unlock value
cluster merge/split
operational coverage evidence
```

يبطل affected cone فقط:

```text
operational registry affected nodes → OPEN/STALE when applicable
priority model affected RCs → STALE
selected frontier → INVALID if winner can change
→ reconcile minimum sufficient cone
→ re-rank
```

لا full rescan بلا سبب، ولا استمرار بسبب sunk cost.

## 10) Foreign delta

Classify: `UNRELATED / RELATED_NON_BLOCKING / UPSTREAM_OR_ROOT_CHANGING / BLOCKING / SEMANTIC_OVERLAP / DIRECT_CONFLICT / AUTHORITY_OR_TRUTH_CHANGE`.

UNRELATED يُحفظ ولا يُتبع. Related يربط بعقدته ويعيد فقط affected evidence/priority. Recency never promotes.

## 11) Accounting gate

قبل handoff/closure:

```text
OPERATIONAL_MACHINE_ACCOUNTING=PASS
FINDINGS_ACCOUNTED=YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED=YES
UNCLUSTERED_MATERIAL_FINDINGS=0
UNRANKED_MATERIAL_CLUSTERS=0
SCOPE_DELTAS_ACCOUNTED=YES
DECISIONS_ACCOUNTED=YES
CONSUMERS_ACCOUNTED=YES
EVIDENCE_ACCOUNTED=YES
CLEANUP_ACCOUNTED=YES
ACCOUNTING_COMPLETE=YES
```

Adversarial challenge يحاول إيجاد operational nodes/hidden writers/consumers/roots غير محاسبة.
