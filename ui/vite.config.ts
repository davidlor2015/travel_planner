import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Default to `node` because the existing render tests use
    // `renderToStaticMarkup` (server-side, no DOM). Individual files that
    // actually need a DOM (hook tests that call `renderHook` / trigger
    // `useEffect`) opt into jsdom with a `// @vitest-environment jsdom`
    // pragma at the top of the file.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  build: {
    chunkSizeWarningLimit: 350,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['framer-motion'],
          maps: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
})
