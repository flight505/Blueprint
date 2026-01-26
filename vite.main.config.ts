import { defineConfig } from 'vite';
import path from 'path';
import { builtinModules } from 'module';

const isDev = process.env.NODE_ENV !== 'production';

// https://vitejs.dev/config
export default defineConfig({
  define: {
    // Replace Electron Forge magic variables with actual values
    MAIN_WINDOW_VITE_DEV_SERVER_URL: isDev ? '"http://localhost:5173"' : 'undefined',
    MAIN_WINDOW_VITE_NAME: '"main_window"',
  },
  build: {
    outDir: '.vite/build',
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: [
        'electron',
        'better-sqlite3',
        // Externalize all Node.js built-in modules
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
      output: {
        // Preserve module structure for better debugging
        entryFileNames: '[name].js',
      },
    },
    // Emit as CommonJS for Electron main process
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
    // Target Node.js environment
    target: 'node18',
    // Don't externalize for browser - we're building for Node
    ssr: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Prefer Node.js conditions
    conditions: ['node', 'import', 'module', 'default'],
  },
  // SSR settings to ensure Node.js target
  ssr: {
    noExternal: true,
    target: 'node',
  },
});
