# Mat-Side Read View

**YogaKit surface:** `/read/[id]` — `src/app/read/[id]/ReadView.tsx`
**Status:** built (the north-star feature — "the 6am test")

## The interaction problem
Some screens exist to be *consulted*, not operated: glanced at from a distance, in bad light, with hands busy or wet, attention on the activity rather than the device. The design job inverts normal mobile UX — every touch is a failure to design around, not a success metric. The screen must stay lit without being asked twice, present exactly one next fact at a time, and survive being read at arm's length by a tired or distracted person mid-task.

## Best in class

### 1. The Kitchn's Cook Mode+ — recipe app, iOS/web, launched June 2026
- **What they do:** A dedicated "Cook Mode" state holds the Screen Wake Lock for as long as the page is open, renders one instruction at a time in large type, shows a "Step 3 of 8" counter, and lets you collapse completed steps so the current one is always the thing your eye lands on; touch targets are built oversized (56px+) for flour-covered or wet fingers.
- **Why it works:** it treats the wake lock and the step-isolation as the same feature — staying on screen only matters if there's one unambiguous thing to look at when you glance up.
- **Source:** https://www.thekitchn.com/cook-mode-plus-23751114

### 2. Teleprompter.com / PromptSmart Pro — teleprompter apps, iOS/Android, 2026
- **What they do:** Keep only 2-3 lines of script visible near the camera lens rather than a full page; voice-paced auto-scroll ("VoiceGlide") advances text as the reader speaks and pauses when they pause, so there is no touch interaction at all during use; font size, scroll speed, and script position are all pre-set before the session starts, never mid-read.
- **Why it works:** every configuration decision is front-loaded before the activity begins, leaving the in-use screen with zero controls to find or miss — the interface disappears into the content.
- **Source:** https://www.teleprompter.com/blog/best-teleprompter-apps-for-android and https://bigvu.tv/blog/best-teleprompter-apps-481af/

### 3. Waking Up — meditation app, iOS/Android, 2026
- **What they do:** Dark, minimalist, near-chrome-free session screen; timer/session controls are set once before starting, then the app leans on ambient/audio and haptic cues (bells, interval chimes) rather than visual UI to mark progress through the session, so the eyes have nothing they're required to track.
- **Why it works:** shifts the "glance" off the screen entirely for pacing information, which is the strongest form of low-touch design — the best mid-activity UI is sometimes the one you don't need to look at.
- **Source:** https://screensdesign.com/showcase/waking-up-meditation-wisdom

### 4. Waze — driving navigation, iOS/Android, "Less Chatty" mode shipped July 2026
- **What they do:** A driving-specific display mode strips the interface to essential turn instructions only, paired with a night mode using near-black backgrounds (not light grey) to avoid glare, and large high-contrast glanceable text tuned for a driver's peripheral, half-second look rather than a sustained read.
- **Why it works:** designs explicitly for degraded attention and degraded viewing conditions (low light, brief glances, divided focus) as the primary use case, not an edge case.
- **Source:** https://www.autoevolution.com/news/waze-update-includes-the-navigation-feature-every-app-including-google-maps-needs-273007.html

## Cross-cutting patterns
- Wake-lock-and-forget: the screen-stay-on mechanism is invisible infrastructure, never a toggle the user must remember to hit.
- One current thing, always in the same visual slot — a step counter, a bolded current line, or a phase heading — so a half-second glance always lands correctly.
- Pre-session configuration, not in-session controls: anything adjustable (font size, pace, duration) is set before the activity starts and frozen during it.
- Oversized, forgiving touch targets for the rare touch that does happen (wet hands, gloves, distracted swipe).
- Dark/high-contrast-by-default for low-light conditions, not merely dark-mode-as-preference.
- Progress and pacing shifted to non-visual channels (audio, haptics, voice-pacing) where possible, reducing required screen attention to near zero.

## Anti-patterns observed
- Screens that rely on the OS's default auto-lock timeout and simply hope the user doesn't look away too long — the sleep-mid-use failure the wake lock APIs exist to fix (per the Cook Mode+ coverage).
- Full-recipe/full-script walls of text that force scrolling to find "where was I," reintroducing a touch the format was supposed to eliminate.
- Chatty audio/voice defaults (Waze's pre-"Less Chatty" mode) that substitute one kind of interruption (sound) for another (touch) rather than actually reducing attentional load.
- Small tap targets sized for careful, seated use, not for the sweaty, gloved, or distracted hand that will actually be reaching for the phone.

## Fold into YogaKit
- Breath marks are currently rendered as text strings ("3 breaths", "~1.5 min") in `breathMark()` (ReadView.tsx lines 17-30), not the glyph notation (↑ ↓ ~) the historical spec calls for (§10.3/§10, tenet 3). Rendering true glyphs instead of numeric strings would read faster at arm's length and match the constitution's typography-first mandate. `quick win`
- Take a page from Cook Mode+'s "current thing always in the same slot": consider a lightweight current-item highlight or subtle progress indicator (e.g. dimming completed items) so a glance mid-flow lands on the right pose without hunting through the phase list. `needs decision` — must stay purely visual/CSS, no state/animation that risks the ≤200ms no-bounce or Lighthouse budget.
- Borrow Waze's degraded-conditions-first night mode: verify the read view's dark-mode contrast and text weight hold up specifically at low brightness with sleepy eyes, not just "dark mode exists" — this is the literal 6am-test failure mode if type is too thin or too small to be legible with eyes half-open in a dim room. `quick win` (audit only, likely no code change)
- The wake lock re-acquisition on `visibilitychange` (lines 50-53) already matches the Cook Mode+ pattern of invisible, no-toggle screen-stay-on — no change needed here, just confirm it's covered by manual QA on iOS Safari where visibility-change timing is flakiest. `quick win`
- No in-session controls exist beyond exit/print (lines 104-115), which already matches the teleprompter pattern of front-loading configuration — good, leave as is.

## Constitution check
- **6am test:** the biggest live risk is legibility at low brightness with sleepy eyes, not touch count — the current single touch (open the link) already clears the ≤1-touch bar, and the app is a static server-rendered page so it works offline once cached, satisfying RULE-L3/L4. What would actually fail the test: pose-name type (`text-2xl`/`text-xl` for stillness, line 141) or muted breath-mark text (`text-lg`, `var(--muted)`, line 144) rendering too low-contrast or too small in a genuinely dark room — this needs a real device check at low brightness, not just a code review.
- **Typography-first, one accent:** the breath-mark-as-text vs. glyph gap above is the one real tension — moving to glyphs is squarely in the tenet's spirit and adds no new color or accent.
- **≤200ms no-bounce motion:** any current-item highlight idea must be static or CSS-only; the file has no animation today, so this is a constraint to hold, not a violation to fix.
- **Stillness nodes visually quieter:** already honored — `kk-stillness` and the smaller `text-xl` for stillness items (line 141) versus `text-2xl font-medium` for regular poses.
- **Lighthouse mobile ≥90:** the file is already minimal (no extra libraries, no client fetch, wake lock API is native and lazy); any glyph or highlight change should stay inline CSS/Unicode, adding no render-blocking script.
- **No telemetry of read content:** confirmed clean — the file has no analytics calls; any future progress-tracking feature must not report which poses/phases were viewed.

*Flag: the Waze, Kitchn, and Teleprompter.com/PromptSmart specifics above come from verified 2026 web search; the general "6am test failure mode" and constitution-mapping analysis in the last two sections are my own assessment of the codebase, not sourced externally.*
