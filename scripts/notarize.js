/**
 * macOS Notarization Script
 *
 * This script is called by electron-builder after code signing (afterSign hook).
 * It notarizes the app with Apple's notarization service for Gatekeeper.
 *
 * Required environment variables:
 * - APPLE_ID: Apple Developer account email
 * - APPLE_APP_SPECIFIC_PASSWORD: App-specific password from appleid.apple.com
 * - APPLE_TEAM_ID: Developer Team ID (found in Apple Developer portal)
 *
 * For CI/CD, set these as secrets in your GitHub Actions workflow.
 */

const { notarize } = require('@electron/notarize');
const path = require('path');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize on macOS
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization: not macOS');
    return;
  }

  // Skip if not in CI or not configured for signing
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID) {
    console.log('Skipping notarization: Apple credentials not configured');
    console.log('To enable notarization, set APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`Notarizing ${appPath}...`);
  console.log('This may take several minutes...');

  try {
    await notarize({
      tool: 'notarytool',
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });

    console.log('Notarization complete!');
  } catch (error) {
    console.error('Notarization failed:', error.message);

    // In CI, fail the build if notarization fails
    if (process.env.CI) {
      throw error;
    }

    // In local development, just warn but continue
    console.warn('Continuing without notarization (development build)');
  }
};
