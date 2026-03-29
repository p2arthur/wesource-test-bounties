# Frontend Dev — MEMORY.md

**Last Updated:** 2026-03-29
**Project:** WeSource UI Overhaul — R1 "Night & Day"

---

## Stage Log

### Stage 1 — Foundation ✅ (2026-03-29)
- Created `feat/ui-overhaul` branch from `main`
- Added Inter + JetBrains Mono fonts to `index.html` via Google Fonts
- Created `src/styles/globals.css` with shadcn CSS vars + WeSource dark design tokens; kept old CSS classes for transition period
- Updated `tailwind.config.cjs`: dark theme colors, shadcn token wiring, removed daisyui plugin (no DaisyUI classes found in components)
- Installed: `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot`
- Created `src/lib/utils.ts` with `cn()` helper (forced git add — root .gitignore has `lib/`)
- Added `@` path alias in `vite.config.ts` + `tsconfig.json`
- Created `components.json` for shadcn
- Switched `main.tsx` to import `globals.css`
- `react-icons` was already installed (v5.5.0)
- Build status: `vite build` ✅ | `tsc` ❌ (pre-existing errors, not introduced by Stage 1)

### Stage 2 — shadcn Components ✅ (2026-03-29)
- Manually created all shadcn components (no interactive CLI available)
- Created in `src/components/ui/`: `button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx`, `dialog.tsx`, `tabs.tsx`, `select.tsx`, `tooltip.tsx`, `dropdown-menu.tsx`, `avatar.tsx`, `separator.tsx`
- Button variants: default (accent), secondary (bg-elevated), ghost, outline, destructive, link
- Badge variants: default, secondary, success, warning, danger, info, outline — all semantic colors
- Installed: `@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `@radix-ui/react-select`, `@radix-ui/react-tooltip`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-avatar`, `@radix-ui/react-separator`, `lucide-react`, `tailwindcss-animate`
- Build: `vite build` ✅

### Stage 3 — Layout & Shell ✅ (2026-03-29)
- `HeaderBar.tsx`: dark `bg-bg-surface` with subtle bottom border, accent "WeSource" title, FiCreditCard icon (FiWallet doesn't exist in react-icons/fi v5), shadcn Buttons
- `Layout.tsx`: `min-h-screen flex flex-col bg-bg-base text-text-primary`, now includes Footer
- `Footer.tsx`: `bg-bg-surface border-t border-border-default`, muted text, accent `@iam_p2` credit
- Build: `vite build` ✅

### Stage 4 — Pages ✅ (2026-03-29)
- `Home.tsx`: dark surface cards, accent filter pills (rounded-full), shadcn Button with FiPlus, removed all `.card`/`.glass`/`.btn-*` legacy classes
- `BountyPage.tsx`: complete rewrite — shadcn Card/Badge/Button, `AnimatedNumber` with `formatAlgoAmount`, semantic status badges via `getBountyStatusVariant()`, FiArrowLeft/FiCheckCircle/FiZap/FiExternalLink icons
- `ProfilePage.tsx`: shadcn Card/Avatar, FiArrowLeft, accent stat numbers, `font-mono` address display
- `ProjectPage.tsx`: shadcn Card/Badge/Avatar/Button, dark surface for repos/issues list, FiGitBranch/FiStar/FiUsers/FiPlus/FiExternalLink
- Build: `vite build` ✅

### Stage 5 — Custom Components ✅ (2026-03-29)
- `BountyCard.tsx`: dark `rounded-lg border border-border-default bg-bg-surface`, accent mono amount, semantic Badge, `hover:border-accent/40 hover:shadow-glow`
- `ProjectCard.tsx`: dark surface, Badge for category, FiStar/FiGitBranch/FiUsers, repo tags as `border-border-default bg-bg-elevated`
- `VoteWidget.tsx`: accent upvote (success hover), danger downvote, `e.preventDefault()` to prevent link navigation
- `LiveFeedWedge.tsx`: dark `bg-bg-elevated`, accent project items, success/warning live dot
- `WonBountiesSidebar.tsx`: dark surface, FiAward, success/warning semantic colors, mono amounts
- `AnimatedNumber.tsx`: added `formatValue?: (v: number) => string` prop, `tabular-nums` class
- `Tooltip.tsx`: replaced custom with shadcn Tooltip wrapper + FiHelpCircle icon
- `Modal.tsx`: dark `bg-bg-elevated`, `bg-black/60 backdrop-blur-sm` overlay, FiX close button, accepts `icon` prop
- `WalletMenu.tsx` (Stage 5b): shadcn Button trigger, dark dropdown div, FiCreditCard/FiLogOut/FiUser/FiCopy/FiCheck/FiGlobe
- `WalletInterface.tsx` (Stage 5b): shadcn Card/Button/Badge/Input throughout, dark asset cards, FiRefreshCw/FiSend/FiPlus
- Build: `vite build` ✅

### Stage 6 — Modals ✅ (2026-03-29)
- `ConnectWalletModal.tsx`: uses Modal + shadcn Button, grouped "For bounty hunters" / "For supporters" sections
- `WalletLinkModal.tsx`: replaced inline div modal with shadcn Dialog + Input + Button
- `CreateBountyModal.tsx`: uses Modal + shadcn Input/Button, dark info/danger/warning panels for x402 flow, step indicator
- `SubmitProjectForm.tsx`: uses Modal + shadcn Input/Button, dark native select/textarea styled with Tailwind
- Build: `vite build` ✅

### Stage 7 — Cleanup ✅ (2026-03-29)
- Removed Pixelify Sans `@import` from `globals.css`
- Deleted `src/styles/main.css` (fully replaced by `globals.css`)
- Kept legacy CSS classes (`.btn-primary`, `.card`, etc.) in `globals.css` — still referenced by AppCalls/Transact demo components, safe to leave
- Build: `vite build` ✅ (3088 modules, 4.89s)
- Final commit: `6dec07c feat(ui): Stage 7 — Cleanup (remove Pixelify Sans, delete main.css)`

---

## Decisions Log

### D1 — DaisyUI removed from tailwind plugins
Removed `require('daisyui')` from tailwind.config.cjs. Verified no components use DaisyUI-specific classes (`btn`, `modal`, `drawer`, etc.) — safe to remove.

### D2 — Pre-existing TypeScript errors
`tsc` fails on `src/Home.tsx`, `src/hooks/useAuth.ts`, `src/interfaces/network.ts`, `src/utils/web3auth/*` due to algosdk/web3auth API incompatibilities. These errors predate this branch and are unrelated to UI changes. Vite build passes cleanly. Using `vite build` as build verification throughout this overhaul.

### D3 — src/lib/utils.ts gitignore
Root `.gitignore` has `lib/` pattern. Used `git add -f src/lib/utils.ts` to force-track this source file.

### D4 — FiWallet unavailable in react-icons/fi v5
`FiWallet` does not exist in react-icons/fi v5. Replaced all usages with `FiCreditCard` throughout `HeaderBar.tsx` and `WalletMenu.tsx`.

### D5 — Legacy CSS classes kept in Stage 7
`.btn-primary`, `.card`, `.glass`, `.badge-*`, etc. remain in `globals.css` after Stage 7 because `AppCalls.tsx` and `Transact.tsx` (demo components, out of scope for UI overhaul) still reference them. Removing them would break those pages.

### D6 — shadcn CLI not used; manual component creation
`npx shadcn-ui@latest init` requires interactive TTY input unavailable in this environment. All shadcn components were manually written following the shadcn source patterns. Functionally identical output.

### D7 — WalletMenu/WalletInterface in Stage 5b commit
These components were spec'd for Stage 5 but initially missed. Caught during Stage 7 cleanup check (legacy class grep). Fixed in a dedicated `feat(ui): Stage 5b` commit before final cleanup.

---

## Issues & Blockers

_No blockers. All 7 stages complete. Branch `feat/ui-overhaul` ready for PR._

---

## Reference

- **Spec:** `docs/wesource-ui-overhaul-spec.md`
- **Tailwind config:** `tailwind.config.cjs`
- **Current styles:** `src/styles/globals.css` (replaced main.css)
- **Old AGENTS backup:** `.opencode/AGENTS.md.bak`
