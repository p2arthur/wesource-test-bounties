# Resource Tracking

## Token Usage (Today - 2026-03-29)

| Model | Worker | Tasks | Tokens Used | Cost Estimate |
|-------|--------|-------|-------------|---------------|
| deepseek-v3.2 | frontend | Task 4.1-4.2 | ~3,000 | $0.06 |
| deepseek-v3.2 | backend | Phase 4 | ~2,000 | $0.04 |
| mimo | on-chain | Phase 1 | ~1,500 | $0.15 |
| claude-code | frontend | Self-review loops | ~95,000 | $0.94 |
| **Total** | | | **~101,500** | **~$1.19** |

**Claude Code usage:** 89% remaining (from p2's note)

## Daily Budget

**Budget:** $5 soft cap  
**Spent today:** ~$1.19  
**Remaining:** ~$3.81  
**Status:** ✅ Under budget

## Model Availability

| Model | Status | Best For | Notes |
|-------|--------|----------|-------|
| claude-code | ⚠️ Limited | Complex reasoning | 89% remaining, use sparingly |
| deepseek-v3.2 | ✅ Available | Coding, backend/frontend | Cheap, fast, good for execution |
| mimo | ✅ Available | Architecture, planning | Smarter but more expensive |
| gpt-4o-mini | ✅ Available | Fallback | When others limited |

## Worker Model Assignment

**Frontend:** deepseek-v3.2 (cheap, good at React)  
**Backend:** deepseek-v3.2 (cheap, good at NestJS)  
**On-Chain:** mimo (smart contracts need deeper reasoning)  
**Manager:** claude-code (orchestration needs context)

## Budget Recommendations

1. **Use deepseek-v3.2** for worker execution tasks
2. **Reserve claude-code** for Manager orchestration and complex verification
3. **Switch to gpt-4o-mini** if claude-code runs out
4. **Monitor daily spend** — we're at ~24% of $5 budget

## Cost Optimization

- **Batch verification** — run spec checks after multiple tasks, not each
- **Smaller tasks** — break into 