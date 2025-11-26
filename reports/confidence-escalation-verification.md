# Confidence Escalation & Human Handoff Verification

## Scope
User request: verify whether confidence escalation and human handoff are implemented, how confidence is calculated, what triggers handoff, and whether a human-agent UI exists.

## Findings
- **Confidence calculation**: The orchestrator's `ConfidenceAnalyzer` combines weighted signals — self-assessment (0.5 weight), hedging detection (0.25), response quality (0.15), and optional consistency checks (0.1) — against domain-aware thresholds (0.8 high-stakes, 0.6 standard, 0.4 low-stakes). Scores below the tenant's threshold mark `shouldEscalate` and record rationale.【F:packages/orchestrator/src/confidence-analyzer.ts†L9-L98】【F:packages/orchestrator/src/confidence-analyzer.ts†L200-L285】
- **Escalation triggers & actions**: `EscalationEngine` maps confidence scores/levels to actions: immediate escalation for configured levels or <0.3, review notification for <0.6 (or disclaimers if urgent), disclaimers on medium confidence, and normal send for high confidence. It determines whether to send the AI response, updates messaging with disclaimers, and emits `human_handoff.requested` events via the shared `EventManager` when a human should be notified.【F:packages/orchestrator/src/escalation-engine.ts†L20-L205】【F:packages/orchestrator/src/escalation-engine.ts†L225-L304】【F:packages/orchestrator/src/escalation-engine.ts†L325-L359】
- **Handoff workflow integration**: The escalation-aware message pipeline loads tenant config, runs confidence prompting/analysis, and applies the decision: immediate escalations call `handleHumanHandoff`, review cases mark the conversation `assigned_human`, and outbound messages include disclaimers when applicable before being sent/recorded. This confirms the feature is wired into runtime message handling beyond docs alone.【F:packages/orchestrator/src/message-pipeline-with-escalation.ts†L85-L214】【F:packages/orchestrator/src/message-pipeline-with-escalation.ts†L200-L276】【F:packages/orchestrator/src/message-pipeline-with-escalation.ts†L278-L336】
- **Human-agent UI**: The dashboard Conversations page surfaces handoff status: it shows a "Needs Human Attention" count, highlights `assigned_human` conversations, flags handoff-triggered messages, and provides a banner plus a “Mark as Resolved & Close” action when a thread requires human attention.【F:apps/dashboard/src/pages/ConversationsPage.tsx†L81-L137】【F:apps/dashboard/src/pages/ConversationsPage.tsx†L360-L407】
- **Missing API service file**: No `apps/api/src/services/handoff.ts` exists; handoff flows are implemented in the orchestrator and surfaced via conversation status/events.

## Answers to user questions
- **Implemented or just documented?** Implemented across orchestrator pipeline and dashboard UI (see findings above).
- **How is confidence calculated?** Weighted multi-signal scoring with domain thresholds (see first bullet).
- **What triggers handoff?** Immediate for very low/always-escalate levels, review/notify for low scores, disclaimers for medium, plus keyword fallback in pipeline.
- **UI for human agents?** Yes—dashboard conversation list, handoff badges, and resolve controls indicate and manage `assigned_human` threads.
