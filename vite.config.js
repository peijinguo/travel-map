import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({mode}) => ({
  base: mode === 'production' ? '/travel-map/' : '/',
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap currently emits Sass deprecation warnings from its own
        // dependency files; keep warnings from project SCSS visible.
        quietDeps: true,
        // The app still uses Bootstrap's legacy @import entrypoint. These
        // warnings are emitted by the Sass compiler before CSS generation;
        // silence the known legacy categories until Bootstrap migrates them.
        silenceDeprecations: [
          'import',
          'if-function',
          'global-builtin',
          'slash-div',
          'color-functions',
        ],
      },
    },
  },
}))
