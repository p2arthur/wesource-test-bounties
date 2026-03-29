# Frontend Dev — UI Overhaul Plan

**Last Updated:** 2026-03-29
**Scope:** R1 "Night & Day" — Design System + Full Visual Restyle
**Source:** `docs/wesource-ui-overhaul-spec.md` (full spec)

---

## Execution Order

### Stage 1: Foundation ✅
- [x] `npx shadcn-ui@latest init` (dark base, CSS variables, default style)
- [x] Add Inter font to `index.html`
- [x] Update `tailwind.config.cjs` with dark theme extend colors
- [x] Create `src/styles/globals.css` with CSS variables from spec
- [x] `npm install react-icons`
- [x] Test: `npm run build` passes
- [x] Commit

### Stage 2: shadcn Components ✅
- [x] Initialize: Button, Card, Dialog, Input, Badge, Tabs, Select, Tooltip, DropdownMenu, Avatar
- [x] All go in `src/components/ui/`
- [x] Test: `npm run build` passes
- [x] Commit

### Stage 3: Layout & Shell ✅
- [x] Restyle HeaderBar — dark bg, accent logo, shadcn buttons, FiCreditCard icon
- [x] Restyle Layout — dark bg base, min-h-screen
- [x] Restyle Footer — dark bg, muted text, accent links
- [x] Test: `npm run build` passes
- [x] Commit

### Stage 4: Pages ✅
- [x] Restyle Home — shadcn Tabs, dark cards, category filter
- [x] Restyle ProjectPage + ProjectDetail
- [x] Restyle BountyPage
- [x] Restyle ProfilePage
- [x] Test: `npm run build` passes
- [x] Commit

### Stage 5: Custom Components ✅
- [x] Restyle BountyCard — dark surface, accent amount, shadcn Badge
- [x] Restyle ProjectCard — dark card, colored category
- [x] Restyle VoteWidget — accent upvote
- [x] Restyle LiveFeedWedge — dark elevated panel
- [x] Restyle WonBountiesSidebar — dark panel, success colors
- [x] Restyle WalletInterface — shadcn Card + Badge
- [x] Restyle WalletMenu — shadcn Button + dark dropdown
- [x] Restyle AnimatedNumber — keep animation, add accent
- [x] Replace Tooltip with shadcn Tooltip
- [x] Test: `npm run build` passes
- [x] Commit

### Stage 6: Modals ✅
- [x] Restyle ConnectWalletModal — shadcn Dialog + Card items
- [x] Restyle WalletLinkModal — shadcn Dialog + Input
- [x] Restyle CreateBountyModal — shadcn Dialog + form
- [x] Restyle SubmitProjectForm — shadcn form components
- [x] Restyle or remove Modal base component
- [x] Test: `npm run build` passes
- [x] Commit

### Stage 7: Cleanup ✅
- [x] Remove Pixelify Sans import from globals.css
- [x] Delete unused CSS (main.css deleted)
- [x] Clean up imports, remove dead code
- [x] Test: `npm run build` passes
- [x] Final commit

---

## Design Tokens (Quick Reference)

**Accent:** `#e8634a` (reddish-orange)
**Dark bg:** `#0d1117` → `#161b22` → `#1c2128` → `#21262d`
**Border:** `#30363d`
**Text primary:** `#e6edf3`
**Text secondary:** `#8b949e`
**Text muted:** `#484f58`
**Success:** `#3fb950` | **Warning:** `#d29922` | **Danger:** `#f85149` | **Info:** `#58a6ff`
**Font:** Inter + JetBrains Mono (for addresses)
**Icons:** `react-icons/fi` (Feather)
**Radius:** sm 4px, md 6px, lg 8px, xl 12px

---

## Completion Criteria

- [x] All 7 stages done
- [x] `npm run build` passes
- [x] Dark theme applied everywhere
- [x] Pixelify Sans completely removed
- [x] No broken functionality (wallet, bounties, projects all work)
- [x] MEMORY.md updated with all decisions
