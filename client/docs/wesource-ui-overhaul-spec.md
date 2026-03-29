# WeSource UI Overhaul — Technical Spec & Action Plan

**Created:** 2026-03-29  
**Status:** Pending p2 approval  
**Author:** Architect  
**Project:** WeSource — decentralized bounty platform on Algorand  
**Repo:** `~/.openclaw/workspace/WeSourceForked/client/`  
**Stack:** React + Vite + Tailwind CSS 3.3 + TypeScript

---

## 1. Design System Spec

### 1.1 Color Palette

**Dark Theme (Primary):**
```
--bg-base:      #0d1117    /* deepest background, like GitHub dark */
--bg-surface:   #161b22    /* cards, panels */
--bg-elevated:  #1c2128    /* modals, dropdowns, popovers */
--bg-hover:     #21262d    /* interactive hover states */
--bg-active:    #282e36    /* pressed/selected states */

--border-default: #30363d  /* subtle borders */
--border-muted:   #21262d  /* even more subtle */

--text-primary:   #e6edf3  /* main text */
--text-secondary: #8b949e  /* secondary, labels */
--text-muted:     #484f58  /* disabled, placeholders */

--accent:         #e8634a  /* reddish-orange primary */
--accent-hover:   #d4502e  /* darker on hover */
--accent-muted:   rgba(232, 99, 74, 0.15) /* subtle accent bg */
--accent-glow:    rgba(232, 99, 74, 0.25) /* focus rings, highlights */
```

**Semantic Colors:**
```
--success:        #3fb950  /* green — claimed, completed */
--warning:        #d29922  /* amber — pending, in-progress */
--danger:         #f85149  /* red — errors, expired */
--info:           #58a6ff  /* blue — informational */
```

### 1.2 Typography

**Font:** `Inter` (Google Fonts) — clean, modern, great for UI  
**Fallback:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

```
--font-mono: 'JetBrains Mono', 'Fira Code', monospace  /* for addresses, hashes */
```

**Scale:**
```
text-xs:    0.75rem  / 1rem      /* labels, badges */
text-sm:    0.875rem / 1.25rem   /* secondary text */
text-base:  1rem     / 1.5rem    /* body */
text-lg:    1.125rem / 1.75rem   /* section headers */
text-xl:    1.25rem  / 1.75rem   /* page titles */
text-2xl:   1.5rem   / 2rem      /* hero, main heading */
text-3xl:   1.875rem / 2.25rem   /* landing hero */
```

**Weights:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### 1.3 Spacing System

Use Tailwind defaults (4px base). Key tokens:
```
gap-1: 4px   gap-2: 8px   gap-3: 12px   gap-4: 16px
gap-5: 20px  gap-6: 24px  gap-8: 32px   gap-10: 40px
```

### 1.4 Shadow / Depth System

Subtle layered shadows — NOT the current heavy black borders:
```
shadow-sm:   0 1px 2px rgba(0,0,0,0.3)
shadow-md:   0 4px 8px rgba(0,0,0,0.3)
shadow-lg:   0 8px 16px rgba(0,0,0,0.3)
shadow-glow: 0 0 12px rgba(232,99,74,0.15)  /* accent glow for emphasis */
```

### 1.5 Border Radius

```
rounded-sm:  4px    /* inputs, small elements */
rounded-md:  6px    /* cards, buttons */
rounded-lg:  8px    /* modals, large cards */
rounded-xl:  12px   /* hero elements */
rounded-full: 9999px /* pills, avatars */
```

### 1.6 shadcn/ui Theme (CSS Variables)

```css
@layer base {
  :root {
    --background: 13 17 23;       /* #0d1117 */
    --foreground: 230 237 243;    /* #e6edf3 */
    --card: 22 27 34;             /* #161b22 */
    --card-foreground: 230 237 243;
    --popover: 28 33 40;          /* #1c2128 */
    --popover-foreground: 230 237 243;
    --primary: 232 99 74;         /* #e8634a */
    --primary-foreground: 255 255 255;
    --secondary: 28 33 40;
    --secondary-foreground: 230 237 243;
    --muted: 33 38 45;            /* #21262d */
    --muted-foreground: 139 148 158;
    --accent: 232 99 74;
    --accent-foreground: 255 255 255;
    --destructive: 248 81 73;
    --destructive-foreground: 255 255 255;
    --border: 48 54 61;           /* #30363d */
    --input: 48 54 61;
    --ring: 232 99 74;
    --radius: 0.375rem;           /* 6px */
  }
}
```

---

## 2. Component Architecture

### 2.1 shadcn/ui Components to Adopt

| shadcn Component | Replaces | Notes |
|-----------------|----------|-------|
| `Button` | `.btn-primary`, `.btn-secondary`, `.tab-button` | Variants: default, secondary, ghost, destructive, outline |
| `Card` | `.card` | Card, CardHeader, CardContent, CardFooter |
| `Dialog` | Custom `Modal.tsx` | For ConnectWallet, WalletLink, CreateBounty modals |
| `Input` | `.input-field` | Text inputs with label + error state |
| `Badge` | `.badge` | Status badges (OPEN, CLAIMED, etc.) |
| `Tooltip` | Custom `Tooltip.tsx` | Shadcn tooltip is Radix-based, more reliable |
| `Tabs` | Manual tab state in Home | Tabs, TabsList, TabsTrigger, TabsContent |
| `Avatar` | None currently | For user profiles |
| `Skeleton` | None currently | For loading states (R2) |
| `Select` | Native selects | Category filter dropdown |
| `DropdownMenu` | Custom wallet menu | For wallet actions |
| `Separator` | `<hr>` or borders | Visual dividers |
| `ScrollArea` | Native overflow | Custom scrollbars in dark theme |

### 2.2 Custom Components (Keep & Restyle)

| Component | Current Style | New Style |
|-----------|--------------|-----------|
| `BountyCard` | White bg, black borders, pixel font | Dark surface bg, subtle border, accent highlights on bounty amount |
| `ProjectCard` | Same brutal style | Dark card with colored category badge, accent on project name hover |
| `VoteWidget` | Black/white vote buttons | Accent-colored upvote, subtle downvote, count in secondary text |
| `LiveFeedWedge` | Retro sidebar | Dark elevated panel, accent dots for live items, smooth scroll |
| `AnimatedNumber` | Plain number | Keep the animation, add accent color for positive changes |
| `HeaderBar` | White bg, black text | Dark surface bg, accent logo, ghost buttons for nav |
| `WalletInterface` | Brutalist wallet display | shadcn Card + Badge for balance, Button for actions |
| `WonBountiesSidebar` | White sidebar | Dark elevated panel, success-colored amounts |
| `Footer` | Simple footer | Dark bg, muted text, accent links on hover |

### 2.3 Icon Pack Recommendation

**Primary: `react-icons/fi` (Feather Icons)**  
- Clean 24px stroke-based icons
- Minimal, consistent weight
- Perfect for modern dark UIs
- Key icons: `FiGithub`, `FiWallet`, `FiPlus`, `FiSearch`, `FiExternalLink`, `FiCheck`, `FiClock`, `FiAlertCircle`, `FiChevronDown`, `FiArrowRight`

**Secondary: `react-icons/vsc` (VSCode Icons)** for GitHub/dev-specific  
- `VscGithub`, `VscRepo`, `VscIssues`, `VscGitPullRequest`

---

## 3. Page-by-Page Breakdown

### Home Page (`Home.tsx`)
- Replace pixel font with Inter
- Dark bg (`--bg-base`), cards on `--bg-surface`
- Tabs use shadcn `Tabs` component
- Category filter: shadcn `Select` or pill buttons with accent active state
- Bounty/Project cards: dark surface, accent amount/name
- WonBountiesSidebar: dark elevated panel
- Remove heavy borders → subtle `border-default` + shadow-sm
- Submit project button: accent `Button` variant

### Project Page (`pages/ProjectPage.tsx`, `ProjectDetail.tsx`)
- Dark surface card for project details
- Accent-colored project name/links
- Category badge: accent-muted bg with accent text
- Bounty list: dark cards with status badges (semantic colors)
- Vote widget: accent upvote styling

### Bounty Page (`pages/BountyPage.tsx`)
- Dark card layout
- Bounty amount: large accent text, monospace for ALGO amount
- Status badge: semantic colors (success/warning/danger)
- Claim action: accent primary button
- GitHub link: ghost button with FiExternalLink icon

### Profile Page (`pages/ProfilePage.tsx`)
- Dark surface, avatar placeholder
- Stats in card grid with accent highlights
- Won bounties list: success-colored amounts

### Header (`HeaderBar.tsx`)
- Dark surface bg, subtle bottom border (`border-default`)
- Logo: accent color
- Nav links: ghost buttons, accent on active
- Wallet button: shadcn `Button` with `FiWallet` icon, shows truncated address when connected

### Modals
- All modals → shadcn `Dialog` (dark popover bg)
- `ConnectWalletModal`: wallet options as shadcn `Card` items with icons
- `CreateBountyModal`: shadcn `Input`, `Select`, `Button`
- `SubmitProjectForm`: shadcn form components

---

## 4. Task Breakdown (Action Plan)

### Phase R1: "Night & Day" — Design System + Full Restyle

#### Stage 1: Foundation (do first, everything depends on this)

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 1.1 | Install shadcn/ui + dependencies | `package.json`, `components.json` | None |
| 1.2 | Add Inter font (replace Pixelify Sans) | `index.html`, `main.css` | None |
| 1.3 | Set up Tailwind dark theme config | `tailwind.config.cjs` | None |
| 1.4 | Create shadcn CSS variables (dark theme) | `src/styles/globals.css` | 1.1 |
| 1.5 | Migrate `main.css` custom classes to Tailwind utilities | `src/styles/main.css` → delete or minimal | 1.3, 1.4 |
| 1.6 | Install react-icons + import Feather pack | `package.json` | None |

#### Stage 2: shadcn Components

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 2.1 | Initialize shadcn Button (all variants) | `components/ui/button.tsx` | 1.1, 1.4 |
| 2.2 | Initialize shadcn Card | `components/ui/card.tsx` | 1.1, 1.4 |
| 2.3 | Initialize shadcn Dialog | `components/ui/dialog.tsx` | 1.1, 1.4 |
| 2.4 | Initialize shadcn Input | `components/ui/input.tsx` | 1.1, 1.4 |
| 2.5 | Initialize shadcn Badge | `components/ui/badge.tsx` | 1.1, 1.4 |
| 2.6 | Initialize shadcn Tabs | `components/ui/tabs.tsx` | 1.1, 1.4 |
| 2.7 | Initialize shadcn Select | `components/ui/select.tsx` | 1.1, 1.4 |
| 2.8 | Initialize shadcn Tooltip | `components/ui/tooltip.tsx` | 1.1, 1.4 |
| 2.9 | Initialize shadcn DropdownMenu | `components/ui/dropdown-menu.tsx` | 1.1, 1.4 |
| 2.10 | Initialize shadcn Avatar | `components/ui/avatar.tsx` | 1.1, 1.4 |

#### Stage 3: Restyle Layout & Shell

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 3.1 | Restyle HeaderBar — dark bg, accent logo, shadcn buttons, wallet icon | `HeaderBar.tsx` | 2.1, 2.9, 1.6 |
| 3.2 | Restyle Layout — dark bg base, min-h-screen | `Layout.tsx` | 1.4 |
| 3.3 | Restyle Footer — dark bg, muted text, accent links | `Footer.tsx` | 1.4, 1.6 |

#### Stage 4: Restyle Pages

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 4.1 | Restyle Home — shadcn Tabs, dark cards, category filter | `Home.tsx` | 2.1–2.7 |
| 4.2 | Restyle ProjectPage + ProjectDetail | `pages/ProjectPage.tsx`, `ProjectDetail.tsx` | 2.1–2.5 |
| 4.3 | Restyle BountyPage | `pages/BountyPage.tsx` | 2.1–2.5 |
| 4.4 | Restyle ProfilePage | `pages/ProfilePage.tsx` | 2.1–2.5, 2.10 |

#### Stage 5: Restyle Components

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 5.1 | Restyle BountyCard — dark surface, accent amount, shadcn Badge | `BountyCard.tsx` | 2.2, 2.5 |
| 5.2 | Restyle ProjectCard — dark card, colored category | `ProjectCard.tsx` | 2.2, 2.5 |
| 5.3 | Restyle VoteWidget — accent upvote | `VoteWidget.tsx` | 2.1 |
| 5.4 | Restyle LiveFeedWedge — dark elevated panel | `LiveFeedWedge.tsx` | 2.2 |
| 5.5 | Restyle WonBountiesSidebar — dark panel, success colors | `WonBountiesSidebar.tsx` | 2.2 |
| 5.6 | Restyle WalletInterface — shadcn Card + Badge | `WalletInterface.tsx` | 2.2, 2.5 |
| 5.7 | Restyle WalletMenu — shadcn DropdownMenu | `WalletMenu.tsx` | 2.9 |
| 5.8 | Restyle AnimatedNumber — keep animation, add accent | `AnimatedNumber.tsx` | 1.4 |
| 5.9 | Replace Tooltip with shadcn Tooltip | `Tooltip.tsx` → `components/ui/tooltip.tsx` | 2.8 |

#### Stage 6: Restyle Modals

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 6.1 | Restyle ConnectWalletModal — shadcn Dialog + Card items | `ConnectWalletModal.tsx` | 2.3, 2.2, 1.6 |
| 6.2 | Restyle WalletLinkModal — shadcn Dialog + Input | `WalletLinkModal.tsx` | 2.3, 2.4 |
| 6.3 | Restyle CreateBountyModal — shadcn Dialog + form | `CreateBountyModal.tsx` | 2.3, 2.4, 2.7 |
| 6.4 | Restyle SubmitProjectForm — shadcn form components | `SubmitProjectForm.tsx` | 2.3, 2.4, 2.7 |
| 6.5 | Restyle Modal base component (or remove if all use shadcn Dialog) | `Modal.tsx` | 2.3 |

#### Stage 7: Cleanup

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 7.1 | Remove Pixelify Sans import | `index.html`, `main.css` | All above |
| 7.2 | Delete unused CSS classes from `main.css` | `main.css` | All above |
| 7.3 | Remove `LoadingPair` if replaced by skeleton (R2) or simplify | `LoadingPair.tsx` | Optional |
| 7.4 | Clean up imports, remove dead code | All files | All above |

---

### Phase R2: "Smooth Operator" — Polish & Interactions

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 8.1 | Add shadcn Skeleton component | `components/ui/skeleton.tsx` | R1 |
| 8.2 | Replace LoadingPair with skeletons on Home | `Home.tsx`, `BountyCard.tsx`, `ProjectCard.tsx` | 8.1 |
| 8.3 | Add skeleton loading to Project, Bounty, Profile pages | Page components | 8.1 |
| 8.4 | Smooth CSS transitions on all interactive elements | Global CSS, component classes | R1 |
| 8.5 | Hover effects: cards lift with shadow-md, accent border glow | Card components | R1 |
| 8.6 | Mobile responsive audit — test all breakpoints | All pages | R1 |
| 8.7 | Fix any mobile overflow/spacing issues | Various | 8.6 |
| 8.8 | Live feed: smooth slide-in animation (CSS only) | `LiveFeedWedge.tsx` | R1 |
| 8.9 | Vote widget: subtle scale animation on vote (CSS) | `VoteWidget.tsx` | R1 |

---

### Phase R3: "Extra Mile" — Accessibility & Extras

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 9.1 | Add `prefers-reduced-motion` media query | Global CSS | R2 |
| 9.2 | ARIA labels audit — all interactive elements | All components | R1 |
| 9.3 | Focus-visible outlines (accent color) | Global CSS | R1 |
| 9.4 | Keyboard navigation for modals and tabs | Modal/Tab components | R1 |
| 9.5 | (Optional) Light theme toggle | New context + toggle | All |

---

## 5. Migration Strategy

### Incremental Adoption (No Big Bang)

1. **Install shadcn/ui alongside existing styles** — both systems coexist
2. **Create `src/styles/globals.css`** with new dark theme variables
3. **Migrate components one at a time** — each PR swaps one component to shadcn
4. **Delete old CSS classes** only after all consumers are migrated
5. **Remove Pixelify Sans** last (after all components migrated)

### shadcn/ui Init Steps

```bash
cd WeSourceForked/client
npx shadcn-ui@latest init
# Choose: Dark base color, CSS variables, default style
# This creates components.json + src/lib/utils.ts + src/styles/globals.css
```

### Branch Strategy

- Branch: `feat/ui-overhaul` off `main` (or current working branch)
- Each stage = 1 commit (squash per stage)
- Merge when R1 is complete and tested

### Testing

- Manual visual testing (no Chromatic/Percy per p2)
- Test each page after its stage is complete
- Wallet connection flow must still work after modal restyle
- Check mobile viewport at 375px, 768px, 1024px

---

## Summary

**~60 implementation tasks** across 3 releases. R1 is the big one — once design tokens + shadcn components are in, the rest is mechanical restyling. Estimated R1: 2-3 focused sessions. The key insight is foundation-first: get the dark theme tokens and shadcn components right, then every page/component swap is straightforward.

**Next step:** p2 approves this spec → Kanta spawns Frontend Dev with this spec as context → Frontend Dev implements R1 stage by stage.
