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
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },

    // Background options - Glass Design System colors
    backgrounds: {
      default: 'tokyo-night',
      values: [
        { name: 'tokyo-night', value: 'hsl(222 15% 14%)' }, // --background
        { name: 'glass-dark', value: 'hsl(222 15% 10%)' },
        { name: 'glass-surface', value: 'hsl(222 15% 17%)' }, // --card
        { name: 'light', value: '#ffffff' },
        { name: 'transparent', value: 'transparent' },
      ],
    },

    // Responsive viewports matching Blueprint's typical use cases
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
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },

  // Decorators for theme switching and glass styling
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'dark';

      // Apply theme class to document
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        // Set CSS variables for glass theme
        document.documentElement.style.setProperty('color-scheme', theme);
      }

      // Wrap in a container with glass background for dark mode
      return React.createElement(
        'div',
        {
          className: theme === 'dark' ? 'text-gray-100' : 'text-gray-900',
          style: {
            minHeight: '100%',
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
          },
        },
        React.createElement(Story)
      );
    },
  ],
};

export default preview;
