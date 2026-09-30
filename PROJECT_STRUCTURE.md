# Knight Pomodoro - Project Structure & Architecture

This document provides a comprehensive, file-by-file breakdown of the Knight Pomodoro Chrome Extension project structure, explaining how each component interacts and functions within the overall architecture.

## Overview

The project is built using:
- **React (v19)** for the UI
- **Vite** as the build tool/bundler
- **@crxjs/vite-plugin** for seamless Chrome Extension compilation
- **Tailwind CSS** for styling
- **TypeScript** for static typing

The extension is designed around a central Background Service Worker that manages the Pomodoro state machine, a `chrome.storage.local` database for persistence, and multiple independent React applications (Popup, Dashboard, Content Script, Blocked Page) that reactively read from storage and send commands to the background worker.

---

## 📂 Root Directory (Configuration & Entry Points)

- **`manifest.json`**
  - **Purpose:** The core Chrome Extension configuration (Manifest V3).
  - **Interaction:** Defines permissions, background scripts, content scripts, options page, actions, and keyboard shortcuts. Vite uses this file to determine the build entry points.
- **`vite.config.ts`**
  - **Purpose:** Vite configuration file.
  - **Interaction:** Uses `@crxjs/vite-plugin` to parse `manifest.json` and bundle the extension. Also explicitly declares `blocked.html` and `options.html` as additional inputs.
- **`package.json` & `package-lock.json`**
  - **Purpose:** Defines project dependencies (React, Tailwind, CRXJS) and NPM scripts (`dev`, `build`, `lint`).
- **`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`**
  - **Purpose:** TypeScript compiler configurations for different environments (browser vs. node).
- **`tailwind.config.js` & `postcss.config.js`**
  - **Purpose:** Configuration for Tailwind CSS utility classes.
- **`.oxlintrc.json`**
  - **Purpose:** Configuration for `oxlint`, a fast linter.
- **`.gitignore`**
  - **Purpose:** Specifies files to be ignored by Git (e.g., `node_modules`, `dist`).
- **`index.html`**
  - **Purpose:** HTML entry point for the **Extension Popup** (the window that opens when clicking the extension icon). It mounts `/src/popup/main.tsx`.
- **`options.html`**
  - **Purpose:** HTML entry point for the **Dashboard/Options** page (full page view for settings and stats). It mounts `/src/dashboard/main.tsx`.
- **`blocked.html`**
  - **Purpose:** HTML entry point for the **Blocked Site** page. Shown when a user tries to access a restricted site during a focus session. It mounts `/src/blocked/main.tsx`.
- **`README.md`**
  - **Purpose:** Project documentation.

---

## 📂 `public/` (Static Assets)

Files in this directory are served as-is without Vite processing.

- **`favicon.svg`, `icon.svg`, `icon-simplified.svg`, `icons.svg`**
  - **Purpose:** Source SVG icons for the extension UI and external use.
- **`icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`**
  - **Purpose:** Rasterized icons used by Chrome for the toolbar, menus, and web store. Declared in `manifest.json`.
- **`offscreen.html` & `offscreen.js`**
  - **Purpose:** Used for the Chrome Offscreen API. 
  - **Interaction:** Allows the background service worker to create a hidden document to perform tasks that service workers cannot do natively (e.g., playing audio for notifications).

---

## 📂 `scripts/` (Build Utilities)

- **`generate-icons.js`**
  - **Purpose:** A Node.js script (likely using the `sharp` library defined in `package.json`) to automatically generate the `.png` icons in `public/` from the base `.svg` icons.

---

## 📂 `src/` (Source Code)

This is where the core logic and React components live.

### `src/background/` (The "Backend")
The background service worker acts as the central brain of the extension. It runs persistently/periodically in the background.

- **`service-worker.ts`**
  - **Purpose:** Main entry point for the background worker.
  - **Interaction:** Listens to `chrome.alarms`, keyboard shortcuts, and messages from the UI (Popup/Content Script). It coordinates the state machine, tracking, and blocking logic.
- **`state-machine.ts`**
  - **Purpose:** Handles the core Pomodoro logic (focus, short break, long break).
  - **Interaction:** Contains functions like `startFocus()`, `pauseSession()`, `advanceState()`. It updates the storage and schedules `chrome.alarms` to trigger phase transitions.
- **`blocker.ts`**
  - **Purpose:** Manages declarative web blocking.
  - **Interaction:** Uses `chrome.declarativeNetRequest` to dynamically generate and apply blocking rules based on whether the timer is in a "focus" phase and what the user's `blocklist` or `strictMode` settings are.

### `src/storage/` (Database & Schema)
A wrapper around `chrome.storage.local` to provide a single source of truth for all UI components and the background worker.

- **`models.ts`**
  - **Purpose:** TypeScript interfaces defining the entire data schema (`AppData`, `TimerState`, `UserSettings`, `TrackingState`, `DailyStats`). Also contains default fallback values.
- **`storage.ts`**
  - **Purpose:** Provides async CRUD functions (e.g., `getAppData()`, `updateTimerState()`, `incrementDailyTime()`). 
  - **Interaction:** Ensures atomic updates and manages migrations (handling old storage shapes). 

### `src/tracking/` (Activity Tracking)
- **`activity-tracker.ts`**
  - **Purpose:** Tracks how much time the user spends focused versus browsing.
  - **Interaction:** Listens to `chrome.idle` and `chrome.windows.onFocusChanged` events. It calculates whether current time should be logged as `focusedTime` or `unfocusedTime` in the daily stats, writing periodically to storage via alarms.

### `src/content/` (Injected UI)
- **`floating-timer.tsx`**
  - **Purpose:** A React component injected directly into web pages (as defined by `content_scripts` in the manifest).
  - **Interaction:** Displays a draggable, floating mini-timer. It reads from `chrome.storage` to show real-time progress and sends messages (e.g., `{ type: 'PAUSE' }`) to `service-worker.ts`.

### `src/notifications/`
- **`notifications.ts`**
  - **Purpose:** Handles alerting the user when phases change.
  - **Interaction:** Uses `chrome.notifications` for desktop popups and interacts with the Offscreen API to play sounds.

### `src/popup/` (Extension Dropdown UI)
- **`main.tsx` & `App.tsx`**
  - **Purpose:** The React application for the small window that opens when clicking the extension icon.
  - **Interaction:** Renders the main timer circle, play/pause controls, and phase indicators. It is a lightweight client that reads state from `storage.ts` and dispatches commands to the background worker.

### `src/dashboard/` (Settings & Stats UI)
- **`main.tsx` & `App.tsx`**
  - **Purpose:** The React application for the full-page dashboard (opened via the "Options" menu).
  - **Interaction:** Contains detailed configurations.
- **`components/SettingsTab.tsx`**
  - **Purpose:** Form to update `UserSettings` (durations, auto-start, strict mode, blocklist).
- **`components/StatsTab.tsx`**
  - **Purpose:** Visualizes `DailyStats` (focused vs. unfocused time, completed sessions) using charts or metric cards.

### `src/blocked/` (Intervention UI)
- **`main.tsx` & `App.tsx`**
  - **Purpose:** The React application that renders when a user hits a blocked domain.
  - **Interaction:** Explains why the site is blocked and provides an option to force-skip (which logs an unfocused lapse in stats).
- **`components/KnightLogo.tsx`**
  - **Purpose:** Renders the application logo for the blocked page.

### `src/utils/`
- **`formatTime.ts`**
  - **Purpose:** Helper to format milliseconds into `MM:SS` strings.
- **`useAppData.ts`**
  - **Purpose:** A custom React Hook.
  - **Interaction:** Connects React components directly to `chrome.storage.onChanged`. Any UI component using this hook will instantly re-render when the background worker updates the timer state.

### Root `src` files
- **`src/index.css`**
  - **Purpose:** Contains the base Tailwind directives (`@tailwind base;` etc.) and is imported by the respective `main.tsx` files.

---

## 🔄 Interaction Flow (How it all works together)

1. **User Clicks Start:** The user opens the Popup (`src/popup/App.tsx`) and clicks the Play button.
2. **Message Sent:** The Popup sends a `START_FOCUS` message to the background via `chrome.runtime.sendMessage`.
3. **Background Reacts:** `service-worker.ts` receives the message and calls `startFocus()` in `state-machine.ts`.
4. **State Updated:** The State Machine calculates the `endsAt` timestamp, schedules a `chrome.alarm`, and writes the new state to `storage.ts`.
5. **Rules Applied:** `blocker.ts` detects the "focus" state and dynamically applies Chrome network blocking rules.
6. **UI Reacts:** The `chrome.storage.onChanged` event fires. All active UIs (Popup, Content Script Floating Timer, Dashboard) that use the `useAppData` hook automatically re-render to reflect the running timer.
7. **Time Up:** The `chrome.alarm` triggers in the background worker, advancing the state to "break", triggering a desktop notification via `notifications.ts`, and removing network blockers via `blocker.ts`.
