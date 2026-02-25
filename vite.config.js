import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: Set base to your GitHub repo name, e.g. '/eic-terminal/'
// If you name your repo something different, update this line.
export default defineConfig({
  plugins: [react()],
  base: '/eic-terminal/',
})
