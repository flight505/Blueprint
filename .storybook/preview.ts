import type { Preview } from '@storybook/react';
import React from 'react';

// Import Blueprint's global styles (Tailwind + Glass Design System)
import '../src/renderer/index.css';

// Import Electron API mocks for isolated component testing
import './electron-mocks';

const preview: Preview = {
  parameters: {
    // Better action logging
    actions: { argTypesRegex: '^on[A-Z].*' },

    // Default controls behavior
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      expanded: true,
    },

    // Centered layout for most components
    layout: 'centered',

    // Accessibility: Configure axe-core
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'button-name', enabled: true },
        ],
      },
      test: 'todo',
    },

    // Background options - Tokyo Night Storm theme
    backgrounds: {
      default: 'tokyo-night',
      values: [
        { name: 'tokyo-night', value: 'hsl(222 15% 14%)' },
        { name: 'tokyo-night-darker', value: 'hsl(222 15% 10%)' },
        { name: 'tokyo-night-card', value: 'hsl(222 15% 17%)' },
        { name: 'light', value: '#ffffff' },
      ],
    },

    // Responsive viewports
    viewport: {
      viewports: {
        compact: {
          name: 'Compact Window',
          styles: { width: '800px', height: '600px' },
        },
        standard: {
          name: 'Standard Window',
          styles: { width: '1280px', height: '800px' },
        },
        wide: { name: 'Wide Window', styles: { width: '1920px', height: '1080px' } },
      },
    },
  },

  // Global theme control in toolbar
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'moon',
        items: [
          { value: 'dark', icon: 'moon', title: 'Dark (Tokyo Night)' },
          { value: 'light', icon: 'sun', title: 'Light' },
        ],
        dynamicTitle: true,
      },
    },
  },

  // Decorators for Tokyo Night Storm theme
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'dark';

      // Apply theme to document root
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        document.documentElement.style.setProperty('color-scheme', theme);
      }

      // Wrap story with proper theming
      return React.createElement(
        'div',
        {
          className: 'blueprint-story-wrapper',
          style: {
            // Apply Tokyo Night Storm colors directly
            color: theme === 'dark' ? 'hsl(225 40% 82%)' : 'hsl(222 15% 14%)',
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
            minHeight: '100%',
            // Ensure text rendering is smooth
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
        },
        React.createElement(Story)
      );
    },
  ],
};

export default preview;
