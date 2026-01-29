# NEXT.md - Upcoming Gates

> Next 3 implementation priorities for Zidni

---

## Gate 1: MODE-2A REGULAR + Global Vault Continuity

**Priority:** HIGH
**Status:** PENDING

### Objective
Implement MODE-2A (Regular conversation mode) with Global Vault persistence for cross-session memory continuity.

### Requirements
- [ ] MODE-2A state machine implementation
- [ ] Global Vault storage layer (encrypted)
- [ ] Cross-session memory retrieval
- [ ] Vault sync mechanism
- [ ] Mode transition handling (preserves vault state)

### Acceptance Criteria
- User can switch to REGULAR mode seamlessly
- Global Vault persists across sessions
- Memory encryption at rest
- No data loss on mode transitions

---

## Gate 2: MT-0 Translation Provider

**Priority:** HIGH
**Status:** PENDING

### Objective
Establish MT-0 (Machine Translation baseline) with provider abstraction and HY-MT geo-guard for Hassaniya dialect support.

### Requirements
- [ ] Translation provider interface
- [ ] Provider A/B/C abstraction
- [ ] HY-MT geo-guard implementation (Hassaniya detection)
- [ ] Fallback chain (HY-MT -> standard Arabic -> English)
- [ ] Translation caching layer

### Acceptance Criteria
- Clean provider abstraction (swappable)
- Hassaniya dialect detected and routed correctly
- Graceful fallback on provider failure
- Translation quality metrics logged

---

## Gate 3: VOICE-1 Voice Loop

**Priority:** MEDIUM
**Status:** PENDING

### Objective
Implement VOICE-1 (Voice interaction loop) with TTS/STT integration for Arabic voice support.

### Requirements
- [ ] TTS provider integration (A/B/C selection)
- [ ] STT pipeline for Arabic
- [ ] Voice activity detection
- [ ] Audio streaming interface
- [ ] RTL audio cues support

### Acceptance Criteria
- TTS works for Arabic text
- STT accurately transcribes Arabic speech
- Voice loop is responsive (< 500ms latency target)
- Clean provider switching mechanism

---

## Dependency Graph

```
Gate 1 (MODE-2A + Vault)
    |
    v
Gate 2 (MT-0 Translation) -- requires vault for translation memory
    |
    v
Gate 3 (VOICE-1) -- requires translation for multilingual voice
```

---

## Notes

- Each gate should be completed and verified before proceeding
- All gates require SSOT updates upon completion
- Gatekeeper review required after each gate
