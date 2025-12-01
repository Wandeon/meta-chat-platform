# Dashboard UI/UX Review

## Metadata
- **Repo**: https://github.com/Wandeon/meta-chat-platform
- **Branch**: `master`
- **Commit**: `3e7fa8e`
- **Scope**: Tenant-facing dashboard (all routes/components listed in request)

## Summary
- The router still drops authenticated users directly into the Tenants CRUD experience, and the sidebar only renders a flat list of admin tools. As a result, tenants never see the expected dashboard/home overview, onboarding tour, breadcrumbs, or grouped navigation structure (Dashboard → Home, Conversations, Knowledge Base, etc.).
- The authentication flow is limited to an admin API-key login plus a minimal email/password signup and verification experience; there are no password reset links, remember-me toggles, password-strength meters, ToS links, or support fallbacks to match the requirements for production tenant onboarding.
- Core tenant surfaces (Documents, Conversations, Billing, Widget, Testing) cover only the simplest CRUD paths—there’s no search, bulk handling, analytics drill-downs, cancellation UX, platform-specific instructions, or testing controls—so power users quickly run out of tooling compared to the expected product spec.

## Ratings & Scores
| Area | Score | Notes |
| --- | --- | --- |
| Overall UX | 5 / 10 | Navigation and flows remain admin-centric and omit the guided tenant experience outlined in the spec. |
| Visual Design | 6 / 10 | Base styles are consistent, but most pages rely on inline styling with limited hierarchy, no illustrations, and no state-driven feedback animations. |
| Accessibility (axe) | ⚠️ Not measured – browser automation unavailable in this environment. |
| Lighthouse Performance | ⚠️ Not measured – the hosted dashboard isn’t runnable inside this container. |

## Key UX Issues
1. **Major – Information architecture mismatch.** Navigation lacks the required Dashboard/Home entry, grouping, icons, or collapsible mobile behavior; authenticated users land on `/tenants` instead of an overview.
2. **Major – Login form is API-key only.** No email/password option, remember-me checkbox, forgot-password link, or loading feedback beyond inline error text.
3. **Major – Signup form lacks key affordances.** Only company/email/password fields are collected; there’s no password-strength indicator, no name/contact fields, no terms/privacy links, and validation happens only on submit despite the spec requesting real-time feedback.
4. **Major – Verify-email screen missing manual fallback.** The error/success states only link back to login/signup; there’s no support CTA or manual redirect guidance if auto-redirect fails.
5. **Major – Conversations page scales poorly.** Only simple status filters exist; there’s no search, sorting, pagination, or performance guardrails for thousands of rows, and the filter buttons operate entirely client-side on a full dataset load.
6. **Major – Documents page lacks uploader essentials.** Uploading is a single `<input type="file">` with no drag/drop, progress bars, bulk upload queue, or preview/processing status, and there’s no search/filtering for large knowledge bases.
7. **Major – Billing page cannot downgrade/cancel.** Although a `cancelSubscription` mutation exists, there is no UI control wired to it; users only see a “Manage Billing” button and static usage bars, so they can’t cancel in-app or receive 80% usage warnings.
8. **Major – Widget configurator is incomplete.** Config only covers colors/text; there’s no position selector, trigger/button editor, state previews, platform-specific instructions, or mobile mock, so it doesn’t meet the expected configurator spec.
9. **Major – Testing page lacks configuration controls.** There’s no way to toggle RAG, choose models, inject sample prompts, or inspect source citations—only a bare textarea chat driven by the admin key.
10. **Critical – Missing product areas.** App routes never mount a Dashboard home, Knowledge Base overview, Team page, or breadcrumb component, so major parts of the requested experience are absent altogether.

## Recommended Improvements
- Introduce a proper dashboard landing route with KPI cards, quick actions, and onboarding, then reorganize `NAV_LINKS` into grouped sections with icons and badges to match the spec (e.g., Dashboard, Conversations, Knowledge Base, Analytics, Widget, Team, Billing, Settings).
- Expand the auth flow: replace the admin-key login with email/password (plus “remember me” and forgot-password), surface password-strength feedback, and link to Terms/Privacy in the signup checkbox copy.
- Upgrade data-heavy pages with search inputs, filters, pagination/infinite scroll, and skeleton loaders rather than `<p>Loading...` placeholders to keep perceived performance acceptable when datasets exceed thousands of rows.
- Finish the billing experience by wiring a visible “Cancel subscription” / “Downgrade plan” CTA to the existing mutation and add proactive usage alerts when progress bars exceed thresholds.
- Flesh out Widget and Testing tools with the missing controls (position selector, code tabs per CMS, quick test buttons, RAG toggles, latency stats) and add mobile previews to reinforce confidence before publishing.

## Missing Features
- Dashboard Home/Overview, Team management, breadcrumb navigation, onboarding tour, toast notifications, and dark-mode toggle are all absent from the router and component tree.
- Signup lacks the “Terms of Service” link and password-strength meter despite referencing terms in copy.
- Widget configurator lacks platform tabs or install snippets per CMS.

## Estimated Effort
| Task | Estimate |
| --- | --- |
| Redesign navigation + add dashboard home/breadcrumbs | 12–16 hours |
| Expand auth/signup/verification flows (UX + API wiring) | 10–14 hours |
| Enhance Conversations/Documents with search, pagination, skeletons | 16–24 hours |
| Complete Billing cancellation/usage warnings | 6–8 hours |
| Extend Widget & Testing tools with missing controls/previews | 14–18 hours |

## Testing
- ⚠️ `n/a – UI review only (not executed in this environment)`
