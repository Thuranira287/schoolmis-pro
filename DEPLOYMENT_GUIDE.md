# School MIS Pro - Multi-Platform Deployment Guide

This guide covers deploying School MIS Pro as a **PWA (Web)**, **Desktop App (Electron)**, and **Mobile App (Android/iOS via Capacitor)**.

---

## 1. PWA Deployment (Web)

### What is PWA?
Progressive Web App - web app that works offline, installable, and app-like experience.

### Quick Start

```bash
# Build the web app
pnpm build

# Deploy to Netlify (recommended)
pnpm build && netlify deploy --prod --dir dist

# Or Vercel
pnpm build && vercel --prod
```

### Installation Requirements
- ✅ HTTPS (required for PWA)
- ✅ Service Worker (`public/sw.js`)
- ✅ Web Manifest (`public/manifest.json`)
- ✅ Valid icons (192x192, 512x512)

### How Users Install

**Desktop (Chrome/Edge/Firefox):**
1. Visit https://your-school-mis.com
2. Click "Install" button in address bar
3. Or click menu → "Install app"
4. App appears on desktop/start menu

**Mobile (iOS/Android):**
1. Visit https://your-school-mis.com
2. Tap share → "Add to Home Screen" (iOS)
3. Or tap menu → "Install app" (Android)
4. App appears on home screen

### Features
- ✅ Works offline completely
- ✅ Fast loading with caching
- ✅ No app store needed
- ✅ Updates automatically
- ✅ Access home screen like native app

### PWA Checklist
- [x] HTTPS enabled
- [x] Service Worker registered
- [x] Manifest.json with icons
- [x] Meta tags for mobile
- [x] Responsive design
- [x] Fast load time (<3s)
- [x] Offline capability

---

## 2. Desktop App Deployment (Electron)

### What is Electron?
Framework to build native desktop apps with web technologies. Creates .exe (Windows), .dmg (macOS), AppImage (Linux).

### Setup

```bash
# Install dependencies
pnpm add -D electron electron-builder electron-is-dev

# Update package.json scripts:
# "dev:electron": "concurrently \"pnpm dev\" \"wait-on http://localhost:5173 && electron .\"",
# "build:electron": "pnpm build && electron-builder",
# "dist:win": "electron-builder --win --publish never",
# "dist:mac": "electron-builder --mac --publish never",
# "dist:linux": "electron-builder --linux --publish never"
```

### Build for Each Platform

**Windows (.exe installer + portable):**
```bash
# Requires Windows or Docker
pnpm dist:win
# Output: dist-electron/School MIS Pro Setup 1.0.0.exe
```

**macOS (.dmg):**
```bash
# Requires macOS
pnpm dist:mac
# Output: dist-electron/School MIS Pro 1.0.0.dmg
```

**Linux (AppImage, .deb, .rpm):**
```bash
# Works on any Linux
pnpm dist:linux
# Output: dist-electron/*.AppImage, *.deb, *.rpm
```

### Features
- ✅ Standalone executable
- ✅ File system access (backup/restore)
- ✅ Auto-updates
- ✅ Works offline
- ✅ Native look and feel
- ✅ Can run without internet

### Desktop App Improvements

**Add to package.json:**
```json
{
  "homepage": "./",
  "main": "electron-main.js",
  "homepage": "./",
  "build": {
    "appId": "com.schoolmispro.app",
    "productName": "School MIS Pro",
    "files": ["dist/**/*", "electron-main.js", "electron-preload.js"],
    "win": {
      "target": ["nsis", "portable"]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    },
    "mac": {
      "target": ["dmg", "zip"]
    },
    "linux": {
      "target": ["AppImage", "deb"]
    }
  }
}
```

---

## 3. Mobile App Deployment (Capacitor)

### What is Capacitor?
Build native iOS and Android apps from web code. Creates APK (Android) or IPA (iOS).

### Setup Android

```bash
# Install Capacitor
pnpm add @capacitor/core @capacitor/cli
pnpm add -D @capacitor/android @capacitor/ios

# Add Android platform
pnpm cap add android

# Build and sync
pnpm build
pnpm cap sync android

# Open in Android Studio
pnpm cap open android
```

### Build Android APK

**Option 1: Android Studio (Recommended for beginners)**
1. Open `android/` folder in Android Studio
2. Build → Build Bundle(s) / APK(s)
3. Follow prompts
4. Output: `android/app/release/app-release.apk`

**Option 2: Command line**
```bash
cd android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk

# For signed APK (for Play Store)
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

### Deploy to Google Play Store

1. **Create Google Play Developer Account** ($25 one-time)
2. **Sign APK:**
   ```bash
   # Generate key
   keytool -genkey -v -keystore school-mis-pro.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   
   # Sign APK
   jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
     -keystore school-mis-pro.keystore \
     app/build/outputs/apk/release/app-release.apk upload
   ```

3. **Upload to Play Store:**
   - Create app listing
   - Add screenshots
   - Write description
   - Set pricing
   - Upload signed APK/AAB
   - Request review

### iOS Setup (macOS only)

```bash
# Add iOS platform
pnpm cap add ios

# Open in Xcode
pnpm cap open ios
```

**Build and deploy:**
1. Open `ios/App/App.xcworkspace` in Xcode
2. Select Team (Apple Developer Account)
3. Product → Build/Archive
4. Validate and upload to App Store

### Feature Integration for Mobile

Add to `client/lib/mobile/`:

**File Storage:**
```typescript
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export async function saveBackupToFile(data: any) {
  const fileName = `mis-backup-${Date.now()}.json`;
  await Filesystem.writeFile({
    path: fileName,
    data: JSON.stringify(data),
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  });
  return fileName;
}
```

**Camera/QR Scanner (future):**
```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

export async function scanQRCode() {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
  });
  // Process QR code image
}
```

---

## Platform Comparison

| Feature | PWA | Desktop | Mobile |
|---------|-----|---------|--------|
| Installation | No install needed | Installer file | App store |
| Offline | ✅ | ✅ | ✅ |
| File Access | Limited | ✅ | Limited |
| Push Notifications | ⚠️ | ✅ | ✅ |
| Camera | ⚠️ | ✅ | ✅ |
| Home Screen | ✅ | ✅ | ✅ |
| Size | ~5MB | ~200MB | ~50-100MB |
| Updates | Automatic | Manual or auto | App store |
| Cost | Free | Free | $99/year (Apple) |
| Development Time | Lowest | Medium | Highest |

---

## Deployment Checklist

### Before Any Deployment

- [ ] All features tested
- [ ] Offline functionality verified
- [ ] Performance tested on slow networks
- [ ] Database backup/restore working
- [ ] Icons created (192x192, 512x512)
- [ ] App name and description finalized
- [ ] Privacy policy written
- [ ] Terms of service ready

### PWA Deployment

- [ ] Build passes: `pnpm build`
- [ ] Service worker registered
- [ ] HTTPS enabled
- [ ] Manifest.json valid
- [ ] Icons accessible
- [ ] Mobile viewport configured

### Desktop Deployment

- [ ] Windows .exe created and tested
- [ ] macOS .dmg created (if on Mac)
- [ ] Linux AppImage created
- [ ] Installer tested on clean systems
- [ ] Uninstall tested
- [ ] File backup/restore works

### Mobile Deployment

- [ ] APK built and tested on Android device
- [ ] Crashes tested and fixed
- [ ] Permissions requested properly
- [ ] Offline mode works
- [ ] Database syncs correctly
- [ ] Icons meet Play Store requirements

---

## Deployment Commands Reference

```bash
# Web/PWA
pnpm build                          # Build web app
netlify deploy --prod --dir dist    # Deploy to Netlify
vercel --prod                       # Deploy to Vercel

# Desktop
pnpm dev:electron                   # Dev with Electron
pnpm build:electron                 # Build all platforms
pnpm dist:win                       # Windows only
pnpm dist:mac                       # macOS only
pnpm dist:linux                     # Linux only

# Mobile
pnpm build                          # Build web assets
pnpm cap sync                       # Sync to native
pnpm cap open android               # Open Android Studio
pnpm cap open ios                   # Open Xcode
# Then build in Android Studio / Xcode

# Testing
pnpm dev                            # Local development
pnpm test                           # Run tests
pnpm typecheck                      # Type checking
```

---

## Troubleshooting

### PWA Issues

**"Install button not showing"**
- Check HTTPS is enabled
- Verify service worker registered: `chrome://serviceworker-internals/`
- Check manifest.json syntax
- Ensure icons exist and are accessible

**"App not working offline"**
- Check service worker: DevTools → Application → Service Workers
- Verify cache: DevTools → Application → Cache Storage
- Check console for errors

### Desktop Issues

**"App won't start"**
- Check logs: `~/Library/Application\ Support/School\ MIS\ Pro/`
- Run with: `electron . --inspect`
- Check port 5173 is available

**"File access denied"**
- Check app has file permissions
- Use `app.getPath('documents')` for safe locations

### Mobile Issues

**"APK won't install"**
- Enable "Unknown Sources" in Android settings
- Check Android version >= 7.0
- Verify APK is signed correctly

**"App crashes on launch"**
- Check Android logcat: `adb logcat`
- Verify web app loads without errors
- Check all plugins are properly initialized

---

## Support & Resources

- **PWA**: https://web.dev/progressive-web-apps/
- **Electron**: https://www.electronjs.org/docs
- **Capacitor**: https://capacitorjs.com/docs
- **Android**: https://developer.android.com
- **iOS**: https://developer.apple.com

---

## Next Steps

1. ✅ **PWA**: Deploy to Netlify/Vercel (recommended for fastest time to market)
2. ✅ **Desktop**: Build and test Electron apps
3. ✅ **Mobile**: Create Android APK for Play Store

Each platform brings the same School MIS Pro experience to different user groups!

---

**Version**: 1.0.0
**Last Updated**: 2024
**Status**: Production Ready
