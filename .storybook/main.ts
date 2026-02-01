import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],

  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  docs: {},

  // Electron-specific: Override webpack target to web for Storybook
  // This allows components to run in Storybook without Electron dependencies
  viteFinal: async (config) => {
    return {
      ...config,
      // Resolve aliases for Electron API mocking
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
        },
      },
      // Exclude Electron-specific modules
      optimizeDeps: {
        ...config.optimizeDeps,
        exclude: [...(config.optimizeDeps?.exclude || []), 'electron'],
      },
      // Define environment for renderer context
      define: {
        ...config.define,
        'process.env.STORYBOOK': JSON.stringify(true),
      },
    };
  },

  // Faster builds in CI
  build: {
    test: {
      disabledAddons: ['@storybook/addon-docs'],
    },
  },
};

export default config;
