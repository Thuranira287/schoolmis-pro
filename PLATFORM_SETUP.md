# School MIS Pro - Platform Setup Instructions

Complete setup guides for deploying to Web, Desktop, and Mobile.

---

## PWA (Web) - EASIEST & FASTEST ⭐

### Prerequisites
- Domain name (e.g., schoolmis.yourschool.com)
- HTTPS certificate (Let's Encrypt is free)
- Netlify or Vercel account (free tier available)

### Step 1: Build for Web
```bash
cd school-mis-pro
pnpm install
pnpm build
```

### Step 2: Deploy to Netlify (Recommended)

**Option A: Via CLI**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir dist

# Follow prompts and you're done!
```

**Option B: Via GitHub (Automatic)**
1. Push code to GitHub
2. Go to https://app.netlify.com
3. Click "New site from Git"
4. Select your repository
5. Set build command: `pnpm build`
6. Set publish directory: `dist`
7. Deploy! (Netlify handles HTTPS automatically)

### Step 3: Verify Installation

1. Visit https://your-school-mis.com
2. Click install button in address bar
3. Or use browser menu → "Install app"
4. App appears on desktop/home screen
5. Works offline!

### Configuration
- Manifest: ✅ `public/manifest.json`
- Service Worker: ✅ `public/sw.js`
- Icons: ✅ Add to `public/icon-*.png`

### Testing
```bash
# Local testing
pnpm dev

# Simulate production
pnpm build
pnpm start
```

---

## DESKTOP (Electron) - MOST CONTROL

### Prerequisites
- Node.js 18+ installed
- For Windows: Windows 10+ (build on Windows or use Docker)
- For macOS: macOS 10.13+ (build on Mac)
- For Linux: Ubuntu 18.04+ or equivalent

### Step 1: Install Electron

```bash
cd school-mis-pro
pnpm add -D electron electron-builder electron-is-dev concurrently wait-on
```

### Step 2: Build Desktop App

**Windows (.exe installer)**
```bash
pnpm dist:win
# Output: dist-electron/School\ MIS\ Pro\ Setup\ 1.0.0.exe
```

**macOS (.dmg)**
```bash
# Only works on macOS
pnpm dist:mac
# Output: dist-electron/School\ MIS\ Pro\ 1.0.0.dmg
```

**Linux (AppImage, .deb, .rpm)**
```bash
pnpm dist:linux
# Output: dist-electron/*.AppImage, *.deb, *.rpm
```

### Step 3: Test the Application

1. Download the installer from `dist-electron/`
2. Run the installer
3. Launch the app
4. Test offline mode
5. Test file backup: Ctrl+E (Windows/Linux) or Cmd+E (Mac)

### Development Mode

```bash
# Run in dev mode with hot reload
pnpm dev:electron

# Open in DevTools: F12
# Reload: Ctrl+R (or Cmd+R on Mac)
```

### Create Installer Images

```bash
# Create custom icons for your school
# Windows: 256x256 .ico file → assets/icon.ico
# macOS: 512x512 .icns file → assets/icon.icns
# Linux: 256x256 .png file → assets/icon.png

# Update electron.config.js with paths if needed
```

### Distribution

```bash
# Create GitHub Release with installers
git tag v1.0.0
git push origin v1.0.0

# Upload to:
# - GitHub Releases
# - Your school website
# - Google Drive / OneDrive
# - Email to staff
```

---

## MOBILE (Android via Capacitor) - MOST REACH

### Prerequisites
- Node.js 18+ installed
- Java 11+ (`java -version`)
- Android SDK (via Android Studio) - 4-5 GB
- Android NDK (optional but recommended)

### Step 1: Install Capacitor

```bash
cd school-mis-pro
pnpm add @capacitor/core @capacitor/cli
pnpm add -D @capacitor/android @capacitor/ios

# Initialize Capacitor
pnpm cap init
# Choose app name: School MIS Pro
# Choose app ID: com.schoolmispro.app
# Choose platform directory: Leave default (capacitor/)
```

### Step 2: Add Android Platform

```bash
pnpm cap add android
# This creates android/ folder
```

### Step 3: Build Android App (APK)

**Option A: Android Studio (Recommended for first time)**

```bash
# Open in Android Studio
pnpm cap open android

# In Android Studio:
# 1. Wait for Gradle sync to complete
# 2. Click "Build" menu
# 3. Click "Build Bundle(s) / APK(s)"
# 4. Select "Build APK"
# 5. Wait for build to complete
# 6. See message with output path

# APK location: android/app/release/app-release.apk
```

**Option B: Command Line**

```bash
# Build unsigned APK (for testing)
cd android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk

# Build signed APK (for Google Play)
# First create keystore:
keytool -genkey -v -keystore school-mis-pro.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload

# Sign the APK:
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA256 \
  -keystore school-mis-pro.jks \
  app/build/outputs/apk/release/app-release.apk upload

# Align APK:
zipalign -v 4 app/build/outputs/apk/release/app-release.apk \
  app/build/outputs/apk/release/app-release-aligned.apk
```

### Step 4: Test APK

**On Android Phone/Tablet:**
```bash
# Enable "Unknown Sources" in Settings
# Then install via file manager

# Or use adb:
adb install app/build/outputs/apk/release/app-release.apk
```

**On Android Emulator:**
```bash
# Open Android Studio
# Tools → Device Manager
# Create virtual device (Pixel 4, Android 12+)
# Start emulator
adb install app/build/outputs/apk/release/app-release.apk
```

### Step 5: Deploy to Google Play Store

**Create Developer Account:**
1. Go to https://play.google.com/console
2. Sign in with Google account
3. Pay $25 one-time registration fee
4. Complete profile

**Create App Listing:**
1. Click "Create app"
2. Fill in app name: "School MIS Pro"
3. Select category: "Education"
4. Select app type: "App"
5. Complete questionnaire

**Prepare Store Listing:**
1. Fill in app description (500 chars)
2. Add screenshots (at least 2, max 8)
   - Show dashboard
   - Show marks entry
   - Show reports
3. Add app icon (512x512 PNG)
4. Add feature image (1024x500 PNG)
5. Set pricing: "Free"

**Upload APK:**
1. Go to "Release" section
2. Click "Create release" in "Production"
3. Upload signed APK (app-release-aligned.apk)
4. Add release notes
5. Review and publish
6. Wait 24-48 hours for review

---

## iOS (Optional - Requires macOS)

### Prerequisites
- macOS 10.15+
- Xcode 12+ (from App Store)
- Apple Developer Account ($99/year)
- iPhone/iPad for testing (or simulator)

### Step 1: Add iOS

```bash
pnpm cap add ios
# Creates ios/ folder
```

### Step 2: Build in Xcode

```bash
pnpm cap open ios
# Opens in Xcode

# In Xcode:
# 1. Select Team (your Apple Developer account)
# 2. Change bundle ID if needed: com.yourschool.mispro
# 3. Product → Build
# 4. Wait for completion
# 5. Test on device or simulator (Cmd+R)
```

### Step 3: Deploy to App Store

```bash
# In Xcode:
# 1. Product → Scheme → Edit Scheme
# 2. Select "Release" configuration
# 3. Product → Archive
# 4. Click "Distribute App"
# 5. Select "App Store Connect"
# 6. Follow prompts
# 7. Wait for App Store review (24-48 hours)
```

---

## Quick Reference

### Build Commands
```bash
# Web
pnpm build                  # Build web app

# Desktop
pnpm dev:electron           # Dev with Electron
pnpm dist:win               # Build Windows installer
pnpm dist:mac               # Build macOS DMG
pnpm dist:linux             # Build Linux packages

# Mobile
pnpm cap:sync               # Sync web to native
pnpm cap:build              # Build web for mobile
pnpm cap:open:android       # Open Android Studio
pnpm cap:open:ios           # Open Xcode
```

### File Locations
```
Web:     dist/
Desktop: dist-electron/ (installers)
Android: android/app/release/app-release.apk
iOS:     Use Xcode → Product → Archive
```

### Testing Devices
```bash
# Web: Any modern browser
# Desktop: Windows, macOS, Linux
# Android: Emulator or real device
# iOS: Simulator or real device
```

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist dist-electron android ios
pnpm install
pnpm build
```

### Port Already in Use (Electron)
```bash
# Find process on port 5173
lsof -i :5173
# Kill it
kill -9 <PID>
# Then retry
```

### Android Build Error
```bash
# Update Gradle
cd android && ./gradlew wrapper --gradle-version=latest

# Clear build cache
./gradlew clean

# Rebuild
./gradlew assembleRelease
```

### Can't Install APK
```bash
# Check Android version >= 7.0
# Enable Unknown Sources in Settings
# Try: adb install -r app-release.apk (reinstall)
```

---

## Next Steps After Deployment

1. **Create Download Page**
   - Link to PWA
   - Link to Desktop installers (Windows, Mac, Linux)
   - Link to Google Play Store (Android)

2. **Create User Guide**
   - How to install on each platform
   - How to use offline mode
   - How to backup data

3. **Setup Support**
   - Email for support: support@yourschool.com
   - FAQ page on website
   - Video tutorials on YouTube

4. **Monitor Usage**
   - Track installations
   - Collect feedback
   - Fix bugs and add features

---

## Support Resources

- **Capacitor**: https://capacitorjs.com/docs
- **Electron**: https://www.electronjs.org/docs
- **Android**: https://developer.android.com
- **Google Play**: https://support.google.com/googleplay
- **Web.dev PWA**: https://web.dev/progressive-web-apps/

---

**Happy Deploying! 🚀**

---

**Version**: 1.0.0
**Last Updated**: 2024
**Status**: Production Ready
