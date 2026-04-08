# Android Release Preparation Guide

This guide outlines the process to generate a production-ready Signed APK or Android App Bundle (AAB) for StrukCuan.

---

## 🔐 1. Generate Release Keystore

Run the following command in **Windows PowerShell** to create your release keystore. 

> [!WARNING]
> This command is **interactive**. You will be asked to enter a password and your organizational details. 
> **Important:** Keep the Keystore password and Key password the same for simplicity in Android Studio.

```powershell
keytool -genkeypair -v -keystore C:\Users\Mustafa\Desktop\StrukCuan\keystore\strukcuan-release.jks -alias strukcuan -keyalg RSA -keysize 2048 -validity 9125
```

---

## 📋 2. Get SHA Fingerprints

After generating the keystore, run this command to get your **SHA-1** and **SHA-256** fingerprints (required for Firebase, Google Play Console, etc.):

```powershell
keytool -list -v -keystore C:\Users\Mustafa\Desktop\StrukCuan\keystore\strukcuan-release.jks -alias strukcuan
```

---

## 🛠️ 3. Generate Signed Bundle / APK

To ensure your app contains fresh production code and real AdMob ads, use the provided build script:

### Recommended: Using the Build Script
Run this in PowerShell from the project root. This script automatically builds the web assets, syncs them to Android, and generates the APK:
```powershell
./build_release.bat
```

### Manual Method (Android Studio)
If you prefer using Android Studio, you **MUST** run the web build first:
1. Run `npm run build`
2. Run `npx cap sync android`
3. In Android Studio: **Build > Generate Signed Bundle / APK...**
4. Follow the wizard selecting the `release` build variant.

---

## 📂 4. Output Locations

Once the build is complete, you can find the generated files here:

- **APK**: `android/app/release/app-release.apk`
- **AAB**: `android/app/release/app-release.aab`

---

## 🚨 IMPORTANT SECURITY WARNING

> [!CAUTION]
> **DO NOT LOSE YOUR KEYSTORE FILE OR PASSWORD!**
> 
> 1.  **Backup**: Store `strukcuan-release.jks` in a safe, private location (e.g., 1Password, Google Drive, or a physical backup).
> 2.  **Consistency**: Google Play requires every update to be signed with the **exact same key**. If you lose this file or the password, you will **NOT** be able to update your app on the Play Store.
> 3.  **Privacy**: Never commit your `.jks` file to a public GitHub repository.

---

*Last Updated: 2026-04-07*
