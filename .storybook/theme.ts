import { create } from 'storybook/theming';

/**
 * Tokyo Night Storm theme for Storybook UI
 * Official colors from: https://github.com/folke/tokyonight.nvim
 */
export const tokyoNightStorm = create({
  base: 'dark',

  // Brand
  brandTitle: 'Blueprint',
  brandUrl: 'https://github.com/flight505/Blueprint',
  brandTarget: '_self',

  // Colors - Tokyo Night Storm palette
  colorPrimary: '#7aa2f7',      // blue
  colorSecondary: '#9d7cd8',    // purple/violet

  // UI backgrounds
  appBg: '#1f2335',             // bg_dark - sidebar
  appContentBg: '#24283b',      // bg - main content
  appPreviewBg: '#24283b',      // preview background
  appBorderColor: '#292e42',    // bg_highlight
  appBorderRadius: 6,

  // Text colors
  textColor: '#c0caf5',         // fg - primary text (9.02:1 contrast)
  textInverseColor: '#24283b',  // bg
  textMutedColor: '#565f89',    // comment color

  // Toolbar & tabs
  barTextColor: '#a9b1d6',      // fg_dark
  barSelectedColor: '#7aa2f7',  // blue
  barHoverColor: '#7aa2f7',
  barBg: '#1f2335',             // bg_dark

  // Form colors
  inputBg: '#1f2335',
  inputBorder: '#292e42',
  inputTextColor: '#c0caf5',
  inputBorderRadius: 4,

  // Button colors
  buttonBg: '#292e42',
  buttonBorder: '#3d59a1',      // bg_search - slightly brighter blue border

  // Boolean (toggle) colors
  booleanBg: '#292e42',
  booleanSelectedBg: '#3d59a1',
});

export default tokyoNightStorm;
