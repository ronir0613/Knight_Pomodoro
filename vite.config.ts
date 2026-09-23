import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'

// @ts-ignore
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    modulePreload: false,
    rollupOptions: {
      input: {
        // blocked.html is declared in web_accessible_resources — include it as an entry
        blocked: 'blocked.html',
        // options.html is the dashboard (opened via options_ui)
        options: 'options.html',
      },
    },
  },
})
