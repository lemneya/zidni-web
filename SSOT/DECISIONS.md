# DECISIONS.md - Architectural Decisions

> Key architectural and design decisions for Zidni

---

## Decision 1: One Shell Architecture

**Date:** 2026-01-28
**Status:** ADOPTED

### Context
Multiple approaches existed for handling shell/terminal execution across modes.

### Decision
**One shell instance shared across all modes.** Mode changes affect content/behavior only, not the underlying shell infrastructure.

### Rationale
- Reduces complexity
- Consistent security boundary
- Easier to audit and monitor
- Single allowlist management

### Implications
- All modes share the same command allowlist
- Shell state persists across mode transitions
- Security rules apply uniformly

---

## Decision 2: Global Vault Shared

**Date:** 2026-01-28
**Status:** ADOPTED

### Context
Memory systems could be mode-specific or globally shared.

### Decision
**Global Vault is shared across all modes and sessions.** Each mode can read/write to the vault.

### Rationale
- Cross-session continuity
- No data silos
- Unified user context
- Simpler backup/restore

### Implications
- Encryption required at rest
- Access control via vault keys
- Mode-specific namespacing within vault

---

## Decision 3: Tool Schema Validation

**Date:** 2026-01-28
**Status:** ADOPTED

### Context
Tool inputs could be validated loosely or strictly.

### Decision
**All tool inputs validated against JSON schemas before execution.**

### Rationale
- Prevents injection attacks
- Clear error messages
- API documentation auto-generation
- Type safety at boundaries

### Implications
- Schema definitions required for all tools
- Validation overhead (acceptable)
- Breaking changes require schema updates

---

## Decision 4: TTS Provider A/B/C

**Date:** 2026-01-28
**Status:** PROPOSED

### Context
Multiple TTS providers available with different quality/cost tradeoffs.

### Decision
**Abstract TTS behind provider interface with A/B/C slots:**
- **Provider A:** Primary (quality focus)
- **Provider B:** Fallback (availability focus)
- **Provider C:** Budget (cost focus)

### Rationale
- No vendor lock-in
- Graceful degradation
- Cost optimization
- A/B testing capability

### Implications
- Provider interface must be stable
- Caching reduces provider calls
- Quality metrics needed for provider selection

---

## Decision 5: Translation Provider Policy + HY-MT Geo-Guard

**Date:** 2026-01-28
**Status:** PROPOSED

### Context
Hassaniya (Mauritanian Arabic dialect) requires special handling that standard Arabic MT doesn't support well.

### Decision
**Implement HY-MT geo-guard:**
1. Detect Hassaniya dialect via linguistic markers
2. Route to specialized HY-MT when detected
3. Fallback chain: HY-MT -> Standard Arabic MT -> English MT

### Policy
- Hassaniya text: HY-MT required
- Standard Arabic: Any Arabic MT
- Mixed: Split and route appropriately

### Rationale
- Hassaniya speakers underserved by standard MT
- Cultural/linguistic preservation
- Better user experience for target audience

### Implications
- HY-MT training/fine-tuning required
- Dialect detection model needed
- Additional latency for detection step
- Translation memory must track dialect

---

## Decision Log

| ID | Decision | Date | Status |
|----|----------|------|--------|
| D1 | One Shell Architecture | 2026-01-28 | Adopted |
| D2 | Global Vault Shared | 2026-01-28 | Adopted |
| D3 | Tool Schema Validation | 2026-01-28 | Adopted |
| D4 | TTS Provider A/B/C | 2026-01-28 | Proposed |
| D5 | HY-MT Geo-Guard | 2026-01-28 | Proposed |
