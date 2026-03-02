import { defineConfig } from 'vite';
import fullReload from 'vite-plugin-full-reload';

export default defineConfig({
  plugins: [
    fullReload(['src/**/*.js', 'src/**/*.css', 'index.html']),
  ],
  base: './',
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    fileParallelism: false,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html'],
      // Note: frontend files (src/) are loaded via vm.runInContext so coverage
      // cannot be instrumented by standard tools. Server tests use createRequire
      // (CJS-in-ESM) which also escapes istanbul. Coverage is tracked manually
      // by test count and description in TESTING.md.
    },
  },
});
