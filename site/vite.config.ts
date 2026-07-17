import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A GitHub Pages project site is served from /<repo>/, not from /. The base path is
// derived from GITHUB_REPOSITORY rather than hard-coded so that a rename or a fork
// publishes working asset URLs with no edit here; outside Actions (dev, preview) it stays
// '/'. Everything the app fetches at runtime goes through import.meta.env.BASE_URL.
const base = process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/'

export default defineConfig({
  base,
  plugins: [react()],
  build: { outDir: 'dist' },
})
