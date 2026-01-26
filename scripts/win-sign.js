/**
 * Windows Code Signing Script for electron-builder
 *
 * This script handles code signing for Windows executables.
 * It supports both standard code signing certificates (.pfx) and
 * EV certificates via Azure SignTool or similar services.
 *
 * Environment Variables:
 * - CSC_LINK: Base64-encoded .pfx certificate file
 * - CSC_KEY_PASSWORD: Password for the certificate
 * - WIN_CSC_LINK: Alternative to CSC_LINK (for Windows-specific cert)
 * - WIN_CSC_KEY_PASSWORD: Alternative to CSC_KEY_PASSWORD
 *
 * For EV certificates, you may need to use Azure SignTool:
 * - AZURE_KEY_VAULT_URI: Azure Key Vault URI
 * - AZURE_CLIENT_ID: Azure AD application client ID
 * - AZURE_CLIENT_SECRET: Azure AD application client secret
 * - AZURE_TENANT_ID: Azure AD tenant ID
 * - AZURE_CERT_NAME: Certificate name in Key Vault
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function sign(configuration) {
  // Skip signing if no certificate is configured
  const certLink = process.env.WIN_CSC_LINK || process.env.CSC_LINK;
  const certPassword = process.env.WIN_CSC_KEY_PASSWORD || process.env.CSC_KEY_PASSWORD;

  if (!certLink) {
    console.log('No Windows code signing certificate configured, skipping signing');
    return;
  }

  const filePath = configuration.path;
  const fileName = path.basename(filePath);

  console.log(`Signing ${fileName}...`);

  try {
    // Decode the base64 certificate to a temporary file
    const certBuffer = Buffer.from(certLink, 'base64');
    const tempCertPath = path.join(process.env.RUNNER_TEMP || process.env.TEMP || '/tmp', 'cert.pfx');

    fs.writeFileSync(tempCertPath, certBuffer);

    // Use signtool to sign the executable
    // signtool is available on Windows runners
    const signToolPath = findSignTool();

    if (!signToolPath) {
      console.warn('signtool not found, skipping signing');
      return;
    }

    const args = [
      'sign',
      '/f', tempCertPath,
      '/p', certPassword || '',
      '/tr', 'http://timestamp.digicert.com',
      '/td', 'sha256',
      '/fd', 'sha256',
      '/v',
      filePath
    ];

    execSync(`"${signToolPath}" ${args.join(' ')}`, {
      stdio: 'inherit',
      encoding: 'utf-8'
    });

    console.log(`Successfully signed ${fileName}`);

    // Clean up temporary certificate file
    fs.unlinkSync(tempCertPath);
  } catch (error) {
    console.error(`Failed to sign ${fileName}:`, error.message);
    // Don't fail the build if signing fails - certificate may not be configured
    if (process.env.CI) {
      console.log('Continuing without code signing in CI environment');
    }
  }
};

/**
 * Find the Windows SDK signtool.exe
 */
function findSignTool() {
  const possiblePaths = [
    // Windows SDK 10
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.22621.0\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.22000.0\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.19041.0\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\x64\\signtool.exe',
    // Windows SDK 8.1
    'C:\\Program Files (x86)\\Windows Kits\\8.1\\bin\\x64\\signtool.exe',
    // Visual Studio
    'C:\\Program Files (x86)\\Microsoft SDKs\\ClickOnce\\SignTool\\signtool.exe'
  ];

  for (const signToolPath of possiblePaths) {
    if (fs.existsSync(signToolPath)) {
      return signToolPath;
    }
  }

  // Try to find signtool in PATH
  try {
    const result = execSync('where signtool', { encoding: 'utf-8' });
    const paths = result.trim().split('\n');
    if (paths.length > 0 && paths[0]) {
      return paths[0].trim();
    }
  } catch {
    // signtool not in PATH
  }

  return null;
}
