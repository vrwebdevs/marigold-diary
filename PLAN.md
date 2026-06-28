# PLAN.md — Marigold Diary: Phased Execution Plan (Cursor prompts)

Workflow: Claude generates one prompt at a time → user runs it in Cursor → Claude verifies the
codebase → checkbox ticked → next prompt. Never skip the verification gate.

Status legend: [ ] not started · [~] prompt generated, awaiting run · [x] verified working

---

## Phase 0 — Project Bootstrap & Config
Goal: an Expo SDK 52 project that installs cleanly and boots to a placeholder screen.

- [x] **P0.1 — Init project + dependencies.** (verified 18/18 expo-doctor; expo-asset added as core dep) Create Expo SDK 52 app (JS template), full `package.json`
      with every pinned dependency (navigation, zustand, react-query, nativewind v4, reanimated v3,
      expo-sqlite, expo-secure-store, expo-auth-session, expo-local-authentication, expo-notifications,
      expo-crypto, expo-font, expo-file-system, gifted-charts, tentap-editor, etc.). `npm install` succeeds.
- [x] **P0.2 — Config files.** (verified: full Android bundle succeeds; nativewind pinned 4.1.23 exact — 4.2.x breaks with Reanimated 3) `app.json` (name, scheme, plugins: sqlite, secure-store, local-auth,
      notifications), `babel.config.js` + `tailwind.config.js` + `metro.config.js` for NativeWind v4
      with Marigold tokens, `.env.example`, `.gitignore`.
- [x] **P0.3 — Fonts + App shell.** (verified: bundle OK, user confirmed fonts render on device via Expo Go SDK 52 APK) Download/place Newsreader, Caveat, Hanken Grotesk TTFs in
      `assets/fonts/`; `App.js` loads fonts via expo-font, shows a Marigold-styled "Hello Marigold"
      placeholder on `backdrop` background. **Checkpoint: app boots on device/emulator.**

## Phase 1 — Foundation: Theme, Utils, Database
Goal: design tokens and data layer exist and are queryable; no UI yet.

- [x] **P1.1 — Theme.** (verified: 4 files exact-match spec, all exports import cleanly, no other files touched) `src/theme/colors.js`, `fonts.js`, `spacing.js`, `index.js` — every Marigold token
      written out exactly as specced.
- [x] **P1.2 — Utils + constants.** (verified: 4 files match spec; dateUtils/textUtils edge-cases pass in Node) `src/utils/` — `dateUtils.js`, `textUtils.js`, `idUtils.js`,
      `constants.js` (moods array with colors/labels, defaults).
- [x] **P1.3 — SQLite.** (verified: 35/35 SQL-layer tests vs node:sqlite; on-device [DB CHECK] shows 6 seeded entries, idempotent reseed, correct tag counts. Note: @expo/ngrok added as devDependency for tunnel mode) `src/db/client.js` (openDatabaseAsync singleton + migration runner),
      `src/db/migrations/v1_initial.js` (full schema: entries, tags, entry_tags, settings, sync_queue),
      `src/db/queries/entries.js`, `tags.js`, `settings.js` (full CRUD + search + filters), `src/db/seed.js`.
      **Checkpoint: app boots, DB initializes, seed entries readable (verified via temporary debug log).**

## Phase 2 — State, Navigation & Screen Skeleton
Goal: full navigation shell with all 19 screens as Marigold-styled stubs.

- [x] **P2.1 — Zustand stores.** (verified: 20/20 store tests in Node incl. settings write-through + hydrate vs real SQLite) `useEntryStore`, `useSettingsStore`, `useSyncStore`, `useAuthStore` —
      initial state + actions, persisted where appropriate.
- [x] **P2.2 — Navigation + all screen stubs.** (verified: 23 files, route/link names cross-checked, bundle OK, user tap-tested all 4 tabs + 15 stack screens on device, no crashes) RootNavigator (auth gate placeholder — PIN bypassed for now),
      MainTabNavigator with Marigold bottom nav (Hanken uppercase labels, clay dot, no icons), stacks,
      and ALL screens as stubs with correct file locations and headers.
      **Checkpoint: can tab/navigate to every screen without crash.**

## Phase 3 — Core CRUD (the heart of the app)
Goal: create, list, read, edit, delete entries end-to-end.

- [x] **P3.1 — React Query hooks.** (verified: 13 hooks exported, v5 object syntax, 7 invalidation rules, provider wired in App.js, boots on device) QueryClient setup in App.js; `useEntries.js`, `useTags.js`
      wrapping the db queries (treat SQLite as local API; invalidation rules specified).
- [x] **P3.2 — Core UI components.** (verified: 7 files, Babel-parse clean, imports resolve; visual check lands with P3.3/P3.4 screens) `EntryCard` (pixel-perfect Marigold), `TagChip`, `FAB`,
      `SectionHeader`, `SearchBar`, `MoodSelector`.
- [x] **P3.3 — WriteScreen.** (verified: on-device save logged entry id; editor/mood/tags/word-count working. Known polish: editor inner font is WebView default, custom CSS later) tentap rich editor, title input, MoodSelector, tag input, live word count,
      auto-save draft, save flow. (Weather stamp stubbed until Phase 7.)
- [x] **P3.4 — JournalScreen + EntryDetailScreen.** (verified: full CRUD loop + search/filters/sort/star on device, screenshots confirm Marigold fidelity; P3.4b fixed chip-row flexShrink collapse) List with search bar + mood/tag filter chips + sort;
      detail view with edit/delete/star actions (lock action stubbed until Phase 6).
      **Checkpoint: full write → list → read → edit → delete loop works on device. ✅**

## Phase 4 — Home & Reading Views
- [x] **P4.1 — HomeScreen.** (verified: streak util 6/6 edge cases in Node; greeting/prompt/stats/heatmap/recent confirmed on device; StreakBadge realized as generic StatCard) Caveat greeting, date, recent entries, StreakBadge, mini CalendarHeatmap;
      HeroPromptCard rendered with static placeholder prompt (Claude wiring in Phase 8).
- [x] **P4.2 — BookScreen.** (verified: gesture flip + rubber-band + inner scroll + tap-to-detail working on device; GestureHandlerRootView added to App.js) BookPage + PageFlipAnimator (Reanimated v3 gesture-driven flip), entry navigator.
- [x] **P4.3 — Explore screens.** (verified: month-matrix util incl. leap year in Node; calendar/search-highlight/tags/random all confirmed on device; search is LIKE + client highlight, FTS5 deferred) CalendarScreen (full heatmap, tap-day), OnThisDayScreen, TagFilterScreen,
      SearchScreen (FTS with highlighted results), random entry button.
      **Checkpoint: all reading/browsing paths work with seeded + real entries. ✅**

## Phase 5 — Insights & Stats
- [x] **P5.1 — useInsights + InsightsScreen.** (verified: longest-streak 6/6 edge cases in Node; stats/chart/mood-mix/tags confirmed on device) Streak calc, mood-over-time line chart (gifted-charts),
      tag pill cloud, totals/averages. (Monthly AI summary slot rendered with placeholder.)
      **Checkpoint: stats match seeded data. ✅**

## Phase 6 — Privacy & Security
- [x] **P6.1 — pinAuth service + PIN screens.** (verified: set/cold-start-lock/wrong-PIN/change/biometric all confirmed on device; P6.1b/c enlarged pad after UI feedback) SHA-256 via expo-crypto, hash in expo-secure-store,
      PINSetupScreen, PINLockScreen, biometric unlock, RootNavigator auth gate activated.
- [x] **P6.2 — Entry locking.** (verified: lock/gate/unlock-modal/mask-in-list-book-search/remove-lock confirmed on device) isLocked flag flow + EntryLockModal (unlock via app PIN/biometrics).
      **Checkpoint: cold start requires PIN/biometric; locked entries gated. ✅**

## Phase 7 — Weather & Notifications
- [x] **P7.1 — Weather.** (verified: createEntry weather columns 4/4 SQL tests; live stamp on Write/card/detail confirmed on device; silent fallback when unavailable) `services/weather.js` + `useWeather` (open-meteo, location permission),
      weather stamp wired into WriteScreen/EntryCard/detail.
- [x] **P7.2 — Notifications (local).** (verified: test notification fired on device; daily/on-this-day/streak schedules sync at startup; reminder UI in minimal SettingsScreen) `services/notifications.js` — daily reminder (configurable time),
      streak alert, "on this day" morning notification. (FCM only if remote push later justified.)
      **Checkpoint: scheduled notifications fire; new entries carry weather. ✅**

## Phase 8 — AI Features (Gemini API + consent ladder)
REPLANNED 2026-06-12: Claude API has no free tier → switched to Gemini (`gemini-2.5-flash`,
free AI Studio keys). Dev key (EXPO_PUBLIC_GEMINI_API_KEY in .env) powers the daily prompt
only; the user's own key (secure-store) powers everything else. 429 → "AI limit exhausted".
47 static prompts as final fallback.

**PRIVACY MODEL (must-have, non-negotiable). Consent ladder (tightened 2026-06-12):**
1. AI off (default) → nothing sent anywhere except the zero-personal-data daily prompt (date only).
2. `aiSharingMode`: 'none' (default — AI gets NOTHING, not even aggregates) | 'aggregates'
   (mood-mix counts + tag names/counts only) | 'selective' (aggregates + entries the user marked)
   | 'all' (aggregates + all unlocked entries).
3. Settings UI: three full-width toggle cards (mutually exclusive, all OFF by default). Turning
   one ON shows a ConsentModal with mode-specific "will be shared / will NEVER be shared"
   disclosure + "I accept" checkbox gating the OK button — EVERY time, no remember-me.
   Turning OFF is instant (reducing sharing never has friction).
4. Per-entry `aiConsent` flag (DB column, migration v2, default 0) — checkbox on WriteScreen,
   ALWAYS visible; ✦ marker on cards/detail. Existing entries default isolated; opt-in by editing.
   Effective rule: sendable = !isLocked && (mode='all' || (mode='selective' && aiConsent)).
   LOCKED ENTRIES ARE NEVER SENT, in any mode.

- [x] ~~P8.1 — claudeAI service~~ (built, verified clean, then replaced by P8.1b per replan)
- [x] **P8.1b–f — geminiAI service + consent layer + writing prompts.** (verified: 13/13 consent-gate
      SQL tests incl. locked+consented exclusion and fail-closed modes; live Gemini call OK — new
      'AQ.'-format keys valid, thinkingBudget:0 required or short responses come back empty;
      consent toggles + modal + ✦ markers + key how-to guide all confirmed on device)
      `services/geminiAI.js`, migration v2 (aiConsent), WriteScreen consent checkbox, Settings:
      AI toggle + user key + 3 toggle cards + ConsentModal + AIKeyHelpModal,
      `listShareableEntries` (single gate for all AI reads), 47 static prompts, claudeAI deleted.
- [x] **P8.2 — Reflection, summary, Ask-Diary (Gemini).** (verified: code audit shows zero ungated
      entry reads — all content flows through listShareableEntries; gates/aggregates/selective modes
      + Ask Diary retrieval confirmed on device) Weekly mood reflection + monthly summary,
      AskDiaryScreen chat over sendable entries only. User key required.
      **Checkpoint: AI features respect the consent ladder end-to-end; graceful no-key state. ✅**

## Calendar polish (done 2026-06-16)
- [x] **P-CAL-1 — Calendar swipe + bounds.** Month swipe (left=next/right=prev) + ← → buttons,
      both bounded: no future months, future days greyed/unselectable. Lower bound = earliest-entry
      month — FINAL design (see P9.5; the "Google join date" idea was dropped 2026-06-20).

## Tag system overhaul (done 2026-06-16)
- [x] **P-TAG-A — Home explore + Tag Manager.** Home explore = 3 Feather icon buttons
      (search/on-this-day/ask-diary); Tags removed from Home, moved to a Tag Manager in You.
- [x] **P-TAG-B — Write-screen tag picker.** Existing tags as toggle chips + add-new input
      (new tags persist globally via `useCreateTag`/`getOrCreateTag`).
- [x] **P-TAG-PRIORITY-1 — Tag priority data + draggable Manager.** Migration **v3** adds
      `tags.sortOrder` (backfilled by createdAt); `listTagsWithCounts` ORDER BY sortOrder;
      `getOrCreateTag` appends at max+1; new `reorderTags(ids)`; `useReorderTags` hook.
      Tag Manager rewritten with `react-native-draggable-flatlist` (Expo-Go-safe; long-press +
      drag). One canonical tag order drives Manager + Write picker + Journal filter.
- [x] **P-TAG-PRIORITY-2 — Write tags horizontal scroll.** Write tag chips = single horizontal
      ScrollView in priority order; Journal tag dropdown follows the same order (free from P1).

## Functional font sweep (done 2026-06-17)
- [x] **P-FONT-1…6 — handwriting → sans across the app.** Converted all functional Caveat text to
      clean Hanken sans (sizes tuned down ~4px since Caveat reads larger), in 6 phased prompts:
      Settings/You, EntryDetail+Journal empty, Write consent + 3 modals + MoodSelector, PIN
      screens + onboarding "skip" + ScreenStub, Insights+OnThisDay+AskDiary+Export, and PinPad
      (error text + backspace glyph). **Handwriting (Caveat) now ONLY on:** Home greeting,
      daily-prompt card (HeroPromptCard), 'Marigold' wordmark (Splash + Onboarding slide titles),
      and Book's 'My diary' heading. Verified by full-project audit. `textStyles.handAccent` is now
      unused (harmless; left in fonts.js).

## UI refinements round 2 (done 2026-06-17)
- [x] **P-REFINE-1 — PIN warmth.** Lock-screen diary name → handwritten (handBold 40); PinPad
      keypad digits → Caveat (backspace ⌫ stays serif).
- [x] **P-REFINE-2 — Home card.** Title "my diary" → "My Diary" (serif); subtext "flip through
      your entries →" → handwritten. (Book heading stays "My diary".)
- [x] **P-REFINE-3 — Insights stats.** 3×2 stack → 2×3 grid of square StatCards (aspectRatio 1,
      value adjustsFontSizeToFit); CTAs → "Reflect on my week" / "Sum up my month".
- [x] **P-REFINE-4 — Insights drill-down.** Tap a mood → Journal filtered by mood; tap a tag →
      Journal filtered by tag (sets one filter, clears others, switches to Journal tab via
      useEntryStore.setFilters + navigation.navigate('Journal')).
- [x] **P-REFINE-5 — "You" reorder.** Sections now: account/profile → tags → ai → reminders →
      appearance → privacy → data.

## Sync UX + themed dialogs (done 2026-06-20)
- [x] **Sync row redesign.** My Account cloud-sync card: a row mirroring auto-sync — title
      "Sync Now"/"Sync Done"/"Sync failed" + last-synced sub-line, spinning ↻ icon (Animated) on the
      right; no success popup. `dirty` flag in useSyncStore set true by each entry/tag mutation hook's
      onSuccess (the global MutationCache callback was unreliable), cleared on successful sync.
- [x] **Themed dialog.** `components/ThemedDialog` (zustand-driven) + `showAlert(title,message,buttons)`
      drop-in; replaced all 11 native `Alert.alert` calls. **GOTCHA:** RN `<Modal>` renders in a
      separate native window outside the root GestureHandlerRootView → on New Arch its touches route
      wrong (buttons dead, taps inverted). Fix: render the dialog as an in-tree absolute-fill overlay
      (no Modal) using gesture-handler `Pressable`. Also: buttons inside a draggable-flatlist row need
      gesture-handler touchables (Tag ✕ → `TouchableOpacity` from RNGH).

## Hidden vault / private space (done 2026-06-20)
A second PIN opens a completely separate diary; opening is invisible (same lock screen, the typed PIN
decides which world). Isolation is physical — a separate SQLite file per vault.
- [x] **P-VAULT-1 — Vault-aware DB.** `db/client.js`: per-vault files (`marigold.db` / `marigold_secret.db`),
      `setActiveVault`/`getActiveVault`; getDatabase returns the active vault's handle (migrations run
      per file). main keeps the existing file (no data migration).
- [x] **P-VAULT-2 — Dual-PIN auth.** `pinAuth`: `secretPinHash` (secure-store) + `resolvePin` →
      'main'|'secret'|null; `setSecretPin` (must differ from main) / `hasSecretPin` / `clearSecretPin`.
- [x] **P-VAULT-3 — Unlock resolves vault.** PINLock uses resolvePin → setActiveVault → re-hydrate that
      vault's settings + applyTheme + queryClient.clear() → unlock; biometric → main only. useAuthStore.vault
      added; RootNavigator remounts on `${theme}-${fontScale}-${vault}`. hydrate() now resets to DEFAULTS
      first (so an empty vault never inherits the other's settings).
- [x] **P-VAULT-4 — Hidden setup.** Long-press the "My account" header (main vault + app PIN required) →
      `PrivateVaultSetupScreen` (PIN entered twice) → setSecretPin creates the vault. No visible UI.
- [x] **P-VAULT-5 — Per-vault sync.** driveSync filename is vault-aware (`marigold-secret-backup.json`),
      so each vault backs up to its own hidden Drive file.
- Switching vaults currently needs an app restart ("Lock now" button declined for now). Biometric
      always opens main (good for deniability).

## Cleanup (done 2026-06-20)
- [x] Deleted dead files: `db/devSeed.js`, `screens/sync/GoogleSyncScreen.js`,
      `screens/sync/BackupRestoreScreen.js` (+ empty `screens/sync/`). 0 remaining refs; bundle clean.

## Security & polish round (done 2026-06-20)
- [x] **Auto-lock** — App.js AppState: lock on real background (≥1s grace to ignore WebView/editor
      blips — the Write/EntryDetail loop fix), reset to main vault. Toggle in You→Privacy (default on),
      forced on for the private vault. Biometric robustness: error-safe, guarded against the
      stale-prompt-after-PIN race (aliveRef + cancelBiometrics + check-before-prompt).
- [x] **AI config global** — Gemini key was already device-global; moved `aiEnabled` + `aiSharingMode`
      to secure-store too, so AI works across both vaults once set. AI toggle reverts to off if no key.
- [x] **Insights correlations** — `patterns` in useInsights (brightest weekday, most-active weekday,
      time-of-day, mood-by-tag via getTagMoodRows); "patterns" card in Insights.
- [x] **Richer empty states** — `components/EmptyState` (clay icon circle + serif title + subtitle) on
      Journal, OnThisDay, Calendar, Search.
- [x] **Diary name per-vault** defaults to Google first name on vault entry if still the default.

## Encryption at rest (done 2026-06-20)
Envelope encryption, **tweetnacl secretbox**, randomness from expo-crypto. Pure JS (no rebuild).
- [x] **P-ENC-1 crypto core** — `services/crypto.js`: per-vault random DEK in secure-store
      (`marigold.dek.<vault>`), encryptString/decryptString (marker `enc1:`, legacy plaintext
      passthrough), isEncrypted. 8 round-trip tests pass.
- [x] **P-ENC-2 entries** — encrypt title/content on write, decrypt on read (decryptEntry); search
      moved in-app (can't SQL-LIKE ciphertext); one-time idempotent migration of existing entries
      (`ensureEntriesEncrypted`, flag `encMigrated`), run on startup + vault entry.
- [x] **P-ENC-3 tags** — deterministic encryption of tag names (keyed-hash nonce → same name = same
      ciphertext) so UNIQUE/lookup/dedup still work; decrypt on read; tag migration (`tagEncMigrated`).
- [x] **P-ENC-4 restorable backup** — PIN-stretched KEK (20k SHA-512 rounds) wraps the DEK; session
      PIN held in memory (cleared on lock); backup snapshot carries `vaultKey`; sync auto-installs the
      backup's DEK when unwrappable. **Caveats:** vault needs a PIN to be restorable; on a new device,
      restore before writing. wrap/unwrap unit-tested.

## AI config backup + haptics (done 2026-06-20)
- [x] **AI config in backup** — `geminiAI.exportAiConfig/importAiConfig`: the Gemini key (encrypted
      with the vault key), the AI on/off flag, AND the sharing-mode/privacy filter ride in the snapshot;
      restored on a fresh device only (no-op if a key already exists). Per-entry ✦ consent flags ride
      along in the encrypted entries backup (aiConsent column).
- [x] **Haptics** — `utils/haptics.js` safe wrapper (swallows errors → no-ops until expo-haptics is in
      a build) wired to PIN taps (selection), entry save (success), sync (success/error). Installed
      expo-haptics ~14.0.1; **activates in the next native build** (prod). Silent + error-free on the
      current dev APK.
- [ ] **Screenshot block** (expo-screen-capture) — DEFERRED with the prod build (native module).

## Custom emotions (done 2026-06-20)
User-manageable moods (like tags), each with a chosen color.
- [x] **M1 — dynamic moods.** `moods` table (migration v4, seeded with the 5 built-ins, color NULL →
      theme fallback), `db/queries/moods.js`, mutable `theme/moods.js` singleton backing
      `moodByKey`/`moodColor` (same pattern as the theme/colors singleton). Loaded at startup + vault
      entry (per-vault). MoodSelector renders the dynamic list as a fixed-height (56) horizontal scroll.
- [x] **M2 — Emotions manager.** `MoodManagerScreen` (You → Emotions): add (label + curated color
      swatch), recolor, drag-reorder, remove (in-use warning). Curated 16-color palette; a color in
      use is disabled in the picker (colors stay unique).
- [x] **M3 — order-based scoring.** Insights mood-line / brightest-day / mood-by-tag use scores
      derived from the emotion order (top = highest); chart scales to the emotion count. (Order
      emotions most-positive → heaviest in the manager.)
- Note: custom emotion colors are fixed across themes (built-ins still adapt per theme via fallback).
  Already-mounted screens reflect mood edits on next navigation (no global remount bump).
- Fixes: MoodSelector bounded by a fixed-height wrapper View (ScrollView height must be parent-set);
  mood-row padding moved to contentContainerStyle so it scrolls edge-to-edge like tags; PIN digits
  (Caveat) given `width: KEY_SIZE` + center to stop Android right-edge glyph clipping.

## About Marigold (done 2026-06-20)
- [x] `AboutScreen` (You → About Marigold): header card (handwritten wordmark + version 0.1.0 +
      "crafted by VR Web Devs" with the real logo `assets/vrwdLogo.png` at 48×48 via Image),
      accordion guide cards for each area (Home/Journal/Insights/You/Writing/Book/AI&privacy/
      Privacy/Sync), and an openly-documented private-vault how-to card at the end. Marigold
      wordmark is stretched + centered to avoid the Caveat right-edge clip.

## Launch splash — animated marigold (done 2026-06-21)
- [x] `src/components/MarigoldSplash.js`: ports the design's CSS-keyframe launch animation to
      Reanimated + react-native-svg (no native rebuild). Marigold grows — pot rises → stem grows
      from base → 2 leaves pop → flower blooms (springy overshoot) → gentle sway + pulsing dots →
      handwritten "Marigold" + Caveat "a place to bloom". Rendered as a full-screen overlay in
      `App.js` above the navigator (covers lock screen/app). Full grow on first launch, quick fade
      after, gated by AsyncStorage `marigoldSplashSeen`.
- KEY GOTCHA: react-native-svg ignores `originX/originY` and mangles `transform`-array animated
      props (scale flew in from 0,0 / parts vanished). FIX: decomposed animated props
      (scale/scaleY/rotation/opacity) wrapped in static `translate()` G groups (translate→animate→
      translate-back) to pivot about the correct point.
- Old text `SplashScreen.js` superseded; RootNavigator first-run route now `Onboarding` (was Splash).

## First-run setup flow (done 2026-06-21)
- [x] `src/screens/onboarding/SetupScreen.js`: phased setup after the 3 intro slides —
      account → name → pin. Account: "Continue with Google" (reuses `signIn()`, adopts first name,
      skips straight to PIN) or "Skip for now". Name: TextInput → `diaryName` (or DEFAULT). PIN:
      4-digit create+confirm via PinPad (reuses `setPin`/`setSessionPin`), with "Maybe later".
      `onboarded` is set only at the end of Setup.
- OnboardingScreen `finish()` now `navigation.replace('Setup')` (was set onboarded + MainTabs); last
      button relabeled "get started". RootNavigator registers `Setup`.
- Handwritten PIN title needs `alignSelf:'stretch'` + center to avoid the Caveat right-edge clip.
- [x] Icon/splash refreshed to the marigold brand (shows after next `eas build`):
      - `assets/icon-1024.png` (full-bleed terracotta gradient + flower, OS rounds corners) and
        `assets/marigold-flower-1024.png` (transparent flower) generated from vectors via a one-off
        `@resvg/resvg-js` script in the scratchpad (no project dep added).
      - app.json `icon` → icon-1024; Android `adaptiveIcon.foregroundImage` → flower (transparent)
        on `#A8532C`; native `splash.image` → flower on cream `#EFE5D3`.
- [x] My Account "Sync" control now shows the spinning `MarigoldLoader` while syncing (idle still
      shows the Feather refresh-cw; old `spin`/`spinDeg` values left in place, unused/harmless).

## Spinning-marigold loader (done 2026-06-21)
- [x] `src/components/MarigoldLoader.js`: the design's "Loader" flower (same geometry) spinning via
      Reanimated View-level rotation (~2.8s linear) — `size`/`duration`/`style` props. Reusable.
- [x] `src/components/ScreenLoader.js`: full-screen centered MarigoldLoader on the backdrop.
- [x] Boot gate: App.js renders the loader (hides native splash on layout) while fonts/DB hydrate,
      so there's no blank gap before the splash.
- [x] Every data screen shows the loader while its primary query is first-loading (react-query
      caches after → loader shows once, instant thereafter, no empty-UI flash): Home, Journal,
      Insights (added `isLoading` to `useInsights`), Book, Calendar, OnThisDay, TagFilter; Entry
      detail & Write swapped their blank placeholders for it; Search uses an inline spinner (keeps
      its search bar visible).

## Pre-ship hardening (done 2026-06-21)
- [x] Removed bundled Gemini key: `EXPO_PUBLIC_GEMINI_API_KEY`/`DEV_API_KEY` no longer referenced
      (was inlined into the JS bundle = extractable). `generateWritingPrompt` now uses the user's
      own key only; no key → NO_API_KEY → `useWritingPrompt` returns source:'static' →
      `HeroPromptCard` shows `STATIC_PROMPTS` (the ~40 built-ins). AI prompts require a user key.
- [~] R8/ProGuard: installed `expo-build-properties` (~0.13.3). ENABLED then DISABLED — minify
      broke the preview build, and for an RN/Hermes app R8 only touches the native glue (JS is
      already Hermes bytecode), so the anti-theft benefit was marginal. Both flags now `false`
      (must be false together — shrink requires proguard or `expo config` errors). Re-enable later
      only with proper keep-rule diagnosis via `adb logcat`.
      VERSION GOTCHA: 0.13.3 (SDK 52) uses `enableProguardInReleaseBuilds`; the `enableMinifyIn...`
      rename is only in newer versions (the "latest" docs show the new name — don't use it on SDK 52).
      `enableShrinkResources...` requires proguard enabled or `expo config` errors out.
- TODO: build `preview` profile first and smoke-test all native features (Google sign-in, SQLite,
      secure-store, notifications, tentap, svg, reanimated, drive sync) before production — add
      ProGuard keep rules if minification strips anything.

## Device-migration redesign — safe sync + restore (done 2026-06-21)
- **Bug fixed (data loss):** a wrong-PIN sync used to (a) import remote ciphertext under a
  non-matching key → blank entries, AND (b) clobber the backup's good wrapped key via
  `vaultKey: local || remote` → original data permanently unrecoverable.
- [x] Foundation (P-SYNC-1): backups carry a `keyId` (fingerprint of the data key). `syncNow` is now
  key-aware — same keyId → sync freely (biometric ok); different keyId → it's a restore and REQUIRES
  the matching PIN; can't unwrap → throws `PIN_MISMATCH` and ABORTS (no import, no upload, nothing
  touched). crypto.js split into `unwrapVaultKey`/`installVaultKey`/`getVaultKeyId`. Added
  `restoreFromBackup(pin)` → 'ok'|'mismatch'|'none' and `removeBackup()` (hard-delete Drive file).
  Verified by Node test (correct unwraps+matches, wrong→null/abort, fresh key differs).
- [x] RestoreScreen (P-SYNC-2A): "serious" screen shown post-Google when a backup exists for the
  account — Restore my diary (enter previous PIN → unwrap+import) or Remove backup & start fresh
  (confirm → delete Drive file → fresh PIN setup). Wrong PIN = "nothing changed".
- [x] Onboarding rework (P-SYNC-2B): Google sign-in COMPULSORY (no skip), first-run only; name from
  Google (name step dropped); after sign-in → backup found ⇒ Restore, else ⇒ MANDATORY PIN (no
  "Maybe later") with an importance message ("only key that can restore your backup; can't reset").
  Supports `route.params.startPhase='pin'` for the post-remove path.
- KNOWN GAPS (follow-ups): (1) biometric unlock still doesn't set `sessionPin` — fine now (same-key
  sync needs no PIN; restore demands typed PIN by design), but a biometric-only user's daily backups
  rely on the merge preserving the existing wrapped key. (2) Backup does NOT include custom moods
  table (only entries/tags/settings) — restored device keeps default moods. (3) Secret vault restore
  is separate (its own hidden PIN flow), not handled by RestoreScreen.

## Release-build auth bugs + sync hardening (2026-06-21/22)
- **Re-onboarding / private-vault onboarding:** `onboarded` was a per-vault setting. Reading it on
  vault switch/unlock (navigator `key` includes vault → remounts → `initialRouteName`) routed to
  Onboarding when the active vault lacked it (secret vault never had it). FIX: `onboarded` is now a
  DEVICE-GLOBAL AsyncStorage flag (`marigold.onboarded`), removed from per-vault DEFAULTS. (An
  interim "add to DEFAULTS" attempt was reverted — it broke private-vault entry.)
- **Frozen PIN transition:** `ScreenLoader` (marigold) during the async enter on PINLock
  (enterVault), Setup (confirm), Restore — via a `busy` guard.
- **Auto-lock tuning:** grace = 1000ms (locks on real background/phone-lock; ignores sub-second
  editor/WebView blips). Suppressed right after Google sign-in via `googleAuthRecently()` (8s
  window) so the OAuth native flow doesn't trigger a lock on return.
- **PIN change → backup:** changing the PIN now fires `syncNow()` immediately (if signed in) so the
  Drive backup's wrapped data key matches the new PIN (DEK unchanged; only the wrapping/keyId-safe).
- **Private-space restore:** `restoreIfFreshDevice(pin)` + `crypto.hasVaultKey()`; on first entry to
  the secret vault on a device with no local key, it adopts the private backup via the secret PIN
  (no-op if a key exists / no backup / wrong PIN). Hooked in `enterVault('secret')`.

## Onboarding-loop structural fix (2026-06-22)
- Symptom persisted (dev options confirmed OFF, so not "Don't keep activities"). Root design flaw:
  Onboarding/Setup/Restore were routes INSIDE RootNavigator, which the lock screen toggles and whose
  NavigationContainer `key` (theme-fontScale-vault) remounts → on remount it re-evaluated
  `initialRouteName={onboarded?...}` and could resurface Onboarding.
- FIX: onboarding is now a SEPARATE top-level `OnboardingNavigator`, rendered in App.js only while
  `!onboarded` (`{onboarded ? <RootNavigator/> : <OnboardingNavigator/>}`). Once onboarded=true the
  onboarding screens aren't mounted at all → loop impossible by construction. RootNavigator no longer
  imports/registers them; `initialRouteName="MainTabs"`. Setup.finish / Restore.finalize just flip
  `onboarded` (App swaps navigators) instead of `navigation.replace('MainTabs')`.
- [x] Permission-lock fixed: `src/utils/autoLockGuard.js` (`suppressAutoLock`/`autoLockSuppressed`,
  60s window). Called before native dialogs that background the app — location permission
  (weather.js), notification permission (notifications.js), share sheets (pdfExport.js); runAutoLock
  skips while suppressed (alongside `googleAuthRecently`). So permission prompts / share no longer
  kick to the lock screen.

## Phase 9 — Google Drive Sync
**DEFERRED 2026-06-12 (runs AFTER Phase 10 + Phase 10.5):** Google OAuth cannot run in Expo Go
(native sign-in needs custom code; the AuthSession proxy is gone). Phase 9 executes inside the
EAS development build produced at the end of Phase 10, alongside Google Cloud Console setup
(OAuth consent screen, Drive API, client IDs).
**DONE 2026-06-20 (built inside the EAS dev build, not Expo Go).** Approach revised from the
original spec: **@react-native-google-signin/google-signin** (native, auto token refresh) instead
of expo-auth-session; **backup & restore** (full snapshot) instead of record-level merge.
- [x] **P9.0 — EAS dev build.** Installed expo-dev-client + google-signin (config plugin auto-added
      to app.json). Android dev APK via `eas build --profile development`. Keystore SHA-1 wired into
      a Google Cloud Android OAuth client; separate Web client → `webClientId`. Consent screen in
      Testing mode with vrwebdevs@gmail.com as test user (no Google verification needed).
- [x] **P9.2a — Auth.** `services/googleAuth.js` (configure/signIn/restoreSession/signOut/
      getAccessToken; scope drive.appdata). `useSyncStore.account` + setAccount. App.js restores the
      session silently on launch.
- [x] **P9.2b — Account row.** "You" profile card → real Google account (photo/name/email) with
      connect/disconnect.
- [x] **P9.3a — Backup/restore engine.** `db/queries/backup.js` (exportSnapshot/importSnapshot,
      faithful all-table dump, transactional destructive restore — Node round-trip verified).
      `services/driveSync.js` (appDataFolder; one `marigold-backup.json`; multipart create / media
      PATCH update; download+replace on restore).
- [x] **P9.3c — Backup UI.** "You" card under the account: last-backed-up, Back up now, Restore
      (destructive confirm; re-hydrates settings + reapplies theme + invalidates queries).
      **Checkpoint PASSED on device: back up → change → restore round-trip works.**
- [x] **P9.4 — Sync redesign (2026-06-20).** Replaced one-way backup/restore with **two-way sync**:
      `mergeSnapshots` (newest-wins per entry by updatedAt, union tags/settings local-wins, tag-links
      follow winner — 10 Node cases pass) + `driveSync.syncNow` (download → merge → write both sides).
      **Sync everything incl. preferences.** New **My Account screen** (`screens/settings/MyAccountScreen`,
      route 'MyAccount') gathers: Google account, diary name (defaults to Google first name on login if
      still `DEFAULTS.diaryName`), Sync now + **Auto-sync** toggle + last-synced, download book. "You"
      first item is now a **My account** row → that screen; account/backup/diary-name/data sections
      removed from You; dev sample-loader removed. **Auto-sync** (App.js) on cold open + foreground +
      background when signed in & toggle on. Obsolete GoogleSync/BackupRestore stub screens unregistered
      (files still on disk — delete in cleanup).
- [x] **P9.5 — Calendar lower bound — RESOLVED (2026-06-20).** Decision: keep **earliest-entry** as the
      permanent lower bound. Google doesn't expose an account-creation date, and earliest-entry is the
      more useful bound (no point scrolling before the first entry). No code change — CalendarScreen
      already uses it; the original "switch to Google join date" TODO is dropped.

## Phase 10 — Export, Settings, Themes, Polish
- [x] **P10.1 — Export.** (verified: full-diary PDF with cover, JSON backup, single-entry PDF all
      share correctly on device; ExportModal simplified away — detail action goes straight to share)
      `services/pdfExport.js` (expo-print HTML template), JSON export, ExportScreen,
      single-entry and full-diary.
- [x] **P10.2 — Settings & themes.** (verified: 10/10 theme/scale mutation tests in Node; all four
      themes + text sizes + rename confirmed on device. Mechanism: mutable theme singletons + nav
      remount. coverColor UI deferred to P10.5) SettingsScreen (theme Light/Dark/Vintage/Notebook,
      diary name, font size, notification prefs), theme switching plumbed through src/theme.
- [x] **P10.3 — Onboarding + splash + seed/debug removal.** (verified: seed.js deleted, no
      seedIfEmpty/sendTestNotification leftovers; Splash→Onboarding→Home first-launch flow + skip +
      onboarded-persistence confirmed on device. NOTE: seeded demo rows remain in existing DBs —
      delete by hand. EAS dev build deferred to bundle with Phase 9, see below.)
      SplashScreen animation, 3-slide OnboardingScreen, removed seed + test-notification code.

## Phase 10.5 — UI polish / minimalist + readability pass (scoped 2026-06-13)
Direction: keep palette + 4 themes + color-coding (loved); fix readability. Caveat handwriting
ONLY on Home greeting + daily prompt (everything else clean SANS; mood labels clean). Darken
faint tokens for contrast across all themes; raise size floors. Presentation-only — existing
logic/props/handlers/navigation must be preserved. Phased verbatim prompts (anti-hallucination).
- [~] **P10.5-1 — Theme foundation.** themes.js (darker softInk/mutedLabel/midInk, all 4 themes) +
      fonts.js (micro 11→12, caption 12→13). Token-only, improves whole app instantly.
### ⚠️ PROJECT-WIDE GOTCHA (found 2026-06-16, P10.5-2)
NativeWind's css-interop (jsxImportSource: nativewind) **silently drops `style` props written
as a FUNCTION** — `style={({ pressed }) => [...]}` on Pressable renders with NO style at all
(layout collapses to default column, no bg/border/shadow). FIX: use a STATIC `style={[...]}`
array; for press feedback use `android_ripple`. Audit every Pressable for function-form style.

- [x] **P10.5-2 — Entry card redesign.** (verified on device after fixing the css-interop function-style
      bug — cards now render left rail + hovering border correctly; cardBorder token + visible shadow) EntryCard: left date rail (3-letter weekday / day number /
      3-letter month only when not current month), hovering card, clean mood badge + #tag badges,
      DROP word count. Auto-updates Journal/Home-recent/Calendar/OnThisDay; restyle Search card to match.
- [ ] **P10.5-3 — Home header.** "Good evening, {name}" greeting (Caveat), today's DATE as serif hero,
      THURSDAY label, clay streak pill top-right; keep entries+words cards (drop streak card);
      explore grid = content tools only (Search/Tags/OnThisDay/AskDiary).
- [ ] **P10.5-4 — YOU tab + hub.** 5th bottom tab YOU = Settings/Profile hub (Profile placeholder ·
      Appearance · Reminders · AI · Privacy · Data). Move Privacy + Settings entries out of Home.
- [x] **P10.5-5a — Book → full-screen "my diary".** (verified on device) Book off the bottom bar
      (→ 4 tabs Home/Journal/Insights/You); "my diary" card on Home below heatmap → full-screen Book
      route with back button. No tab/page-flip gesture conflict.
- [x] **P10.5-5b — Swipe between tabs.** (verified on device) material-top-tabs v6 (6.6.14) +
      react-native-pager-view 6.5.1; tabBarPosition bottom; MarigoldTabBar reused unchanged;
      content-swipe slides between the 4 tabs. pager-view works in Expo Go.
- [ ] **P10.5-7 — PIN/lock redesign.** Full-screen distributed pad in theme (4 digits), per screenshot 2.
- [ ] **P10.5-6 — Functional-font sweep.** Remaining screens/components: inline Caveat → sans on all
      links/labels/captions/empty-states (Calendar, OnThisDay, TagFilter, Export, AskDiary, ScreenStub,
      SectionHeader, modals). Then Phase 9 (Drive sync in dev build), then final export/APK.

---
~26 prompts across 11 phases. Each prompt Claude generates will embed exact specs so Cursor needs zero guesswork.
