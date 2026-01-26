import { defineConfig } from 'vite';
import path from 'path';
import { builtinModules } from 'module';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    outDir: '.vite/build',
    emptyOutDir: false, // Don't clear main.js when building preload
    lib: {
      entry: path.resolve(__dirname, 'src/preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    rollupOptions: {
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
      output: {
        entryFileNames: '[name].js',
      },
    },
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'node18',
    ssr: true,
  },
  resolve: {
    conditions: ['node', 'import', 'module', 'default'],
  },
  ssr: {
    noExternal: true,
    target: 'node',
  },
});
