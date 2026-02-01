import { addons } from 'storybook/manager-api';
import tokyoNightStorm from './theme';

addons.setConfig({
  theme: tokyoNightStorm,
  // Panel position
  panelPosition: 'bottom',
  // Show toolbar
  showToolbar: true,
  // Sidebar settings
  sidebar: {
    showRoots: true,
  },
});
