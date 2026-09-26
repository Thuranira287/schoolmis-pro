/**
 * School MIS Pro - Capacitor Configuration
 * 
 * This configuration sets up the project for mobile app packaging with Capacitor.
 * Supports iOS and Android platforms.
 * 
 * Installation:
 * pnpm add @capacitor/core @capacitor/cli
 * pnpm cap add ios
 * pnpm cap add android
 * 
 * Usage:
 * pnpm build                # Build web assets
 * pnpm cap sync             # Sync to native projects
 * pnpm cap open ios         # Open in Xcode
 * pnpm cap open android     # Open in Android Studio
 * pnpm cap build ios        # Build iOS app
 * pnpm cap build android    # Build Android APK/AAB
 */

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.schoolmispro.app',
  appName: 'School MIS Pro',
  webDir: 'dist/spa',
  server: {
    androidScheme: 'https',
    cleartext: true // Allow http in dev
  },
  
  // iOS specific configuration
  ios: {
    path: 'ios',
    minVersion: '13.0',
    preferredScheme: 'dark'
  },
  
  // Android specific configuration
  android: {
    path: 'android',
    minSdkVersion: 24, // Android 7.0+
    minSdkVersion: 24,
    compileSdkVersion: 34,
    targetSdkVersion: 34
  },
  
  // Plugins configuration
  plugins: {
    // Filesystem plugin for backup/restore
    Filesystem: {
      ios: {
        type: 'Library'
      },
      android: {
        androidStorageLocation: 'EXTERNAL_STORAGE'
      }
    },
    
    // Camera plugin for QR scanning (future feature)
    Camera: {
      ios: {
        useLegacyCamera: false,
        presentationStyle: 'fullScreen'
      },
      android: {
        theme: 'dark'
      }
    },
    
    // Network info plugin
    Network: {
      requestPermissions: ['android.permission.ACCESS_NETWORK_STATE']
    },
    
    // Share plugin
    Share: {
      requestPermissions: ['android.permission.WRITE_EXTERNAL_STORAGE']
    }
  }
};

export default config;
