# StrukCuan Android Setup Guide 📱

This guide covers how to set up, run, and build the StrukCuan Android application using Capacitor.

## 1. Prerequisites
- **Android Studio**: [Download & Install](https://developer.android.com/studio)
- **Java JDK 17**: Ensure `JAVA_HOME` is set correctly.
- **Android SDK**: Install API Level 34 (Android 14) via SDK Manager.

---

## 2. Opening the Project
To open the native Android project in Android Studio:
```bash
npx cap open android
```
*Alternatively, open the `android/` folder directly from the Android Studio splash screen.*

---

## 3. Running the App
### Local Development (Live Reload)
1. Find your local IP (e.g., `192.168.1.50`).
2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.1.50:5173',
     cleartext: true
   }
   ```
3. Run Vite: `npm run dev`
4. Run in Android Studio: Click the **Run** button (Green Play icon).

### Standard Build
```bash
npm run build
npx cap sync android
```
Then run from Android Studio.

---

## 4. Building for Production

### Generate Debug APK (For Testing)
1. In Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. The APK will be located at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Generate Release AAB (For Google Play Store)
1. In Android Studio: **Build > Generate Signed Bundle / APK...**
2. Select **Android App Bundle**
3. Create/Select your **Key Store**
4. Set build variant to **release**
5. The AAB will be located at: `android/app/release/app-release.aab`

---

## 5. Configuration Details

### AdMob Integration
The app is pre-configured with:
- **App ID**: `ca-app-pub-1526437909347510~8582512886`
- **Rewarded Unit ID**: `ca-app-pub-1526437909347510/8390941190`
- **Testing**: Using AdMob test units and devices for development.

### Deep Links / Auth Callback
The app handles `com.strukcuan.app://` deep links. 
In your Supabase Dashboard, add this to **Auth > Redirect URLs**:
- `com.strukcuan.app://home`

---

## 6. Tips & Troubleshooting
- **Syncing Changes**: Whenever you change web code, run `npm run build` and `npx cap sync android`.
- **Permissions**: Internet permission is already added to `AndroidManifest.xml`.
- **Icons/Splash**: Use `@capacitor/assets` to generate icons:
  ```bash
  npx @capacitor/assets generate --android
  ```
  *(Requires `assets/` folder with `icon-only.png` and `splash.png`)*
