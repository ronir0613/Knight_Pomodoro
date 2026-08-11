# ⚔️ Knight Pomodoro

> A Chrome extension to track your focused Pomodoro time versus unfocused browser time.

Knight Pomodoro helps you stay accountable by tracking not just your focused Pomodoro sessions, but also the time you spend browsing without a focused goal. It includes a dashboard, a floating timer for all web pages, and background tracking to keep your productivity in check.

## ✨ Features

- **🍅 Pomodoro Tracking**: Classic Pomodoro timer to manage your focus sessions.
- **⏱️ Floating Timer**: A floating timer injected into web pages so you always know how much time is left in your session.
- **📊 Activity Tracking**: Monitors your active tabs and idle time to calculate focused vs. unfocused browser usage.
- **⚙️ Customizable Settings**: Options page to configure your Pomodoro durations, short breaks, and long breaks.
- **🎨 Modern UI**: Built with React, Tailwind CSS, and Lucide Icons for a clean, modern aesthetic.

## 🛠️ Tech Stack

- **Framework**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/) with [@crxjs/vite-plugin](https://crxjs.dev/) for seamless Chrome Extension development.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd Knight_pomodoro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server (watches for changes):
   ```bash
   npm run dev
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** in the top right corner.
   - Click **Load unpacked** and select the `dist` folder generated in the project root.

*(Note: Vite with CRXJS provides Hot Module Replacement (HMR) during development, so your changes should reflect automatically without needing to manually reload the extension in most cases.)*

### Building for Production

To create a production-ready build:

```bash
npm run build
```

This will generate the optimized extension files in the `dist` folder, ready to be zipped and published to the Chrome Web Store.

## 📂 Project Structure

- `src/background/` - Service worker for background tasks and activity tracking.
- `src/content/` - Content scripts, including the floating timer injected into web pages.
- `src/dashboard/` - The main popup UI when clicking the extension icon.
- `src/storage/` - Storage utility wrappers for Chrome's storage API.
- `src/tracking/` - Logic for tracking user activity and focus state.
- `public/` - Static assets like extension icons.

## 📄 License

This project is licensed under the MIT License.
