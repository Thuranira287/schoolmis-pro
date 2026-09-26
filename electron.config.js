/**
 * School MIS Pro - Electron Configuration
 * 
 * This configuration wraps the web app into a desktop application for Windows, macOS, and Linux.
 * 
 * Installation:
 * pnpm add -D electron electron-builder
 * 
 * Usage:
 * pnpm dev:electron     # Development mode
 * pnpm build:electron   # Build installers
 */

module.exports = {
  appId: 'com.schoolmispro.app',
  productName: 'School MIS Pro',
  directories: {
    output: 'dist-electron',
    buildResources: 'assets'
  },
  
  // Windows installer
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      },
      {
        target: 'portable',
        arch: ['x64']
      }
    ],
    icon: 'assets/icon.ico',
    certificateFile: null,
    certificatePassword: null,
    signingHashAlgorithms: ['sha256'],
    sign: './customSign.js',
    rfc3161TimeStampServer: 'http://timestamp.comodoca.com'
  },
  
  // NSIS installer
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'School MIS Pro'
  },
  
  // macOS build
  mac: {
    target: [
      'dmg',
      'zip',
      'mas' // Mac App Store (requires signing)
    ],
    icon: 'assets/icon.icns',
    category: 'public.app-category.education',
    notarize: {
      teamId: process.env.APPLETEAMID,
      appleId: process.env.APPLEID,
      appleIdPassword: process.env.APPLEIDPASS
    }
  },
  
  // Linux build
  linux: {
    target: [
      'AppImage',
      'deb',
      'rpm'
    ],
    icon: 'assets/icon.png',
    category: 'Education'
  },
  
  // Common settings
  files: [
    'dist/**/*',
    'node_modules/**/*',
    'package.json'
  ],
  
  extraMetadata: {
    name: 'school-mis-pro'
  },
  
  // Protocol handler (e.g., mispro://share/data)
  protocols: [
    {
      name: 'School MIS Pro',
      schemes: ['mispro']
    }
  ]
};
