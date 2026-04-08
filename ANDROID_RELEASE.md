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

## 🛠️ 3. Generate Signed Bundle / APK (Android Studio)

Open the `android/` folder of your project in **Android Studio** and follow these steps:

1.  **Build** > **Generate Signed Bundle / APK...**
2.  Choose **Android App Bundle** (recommended for Play Store) or **APK**.
3.  Click **Next**.
4.  **Key store path**: Click "Choose existing..." and select:
    `C:\Users\Mustafa\Desktop\StrukCuan\keystore\strukcuan-release.jks`
5.  **Key alias**: `strukcuan`
6.  **Key store password** & **Key password**: (Enter the passwords you set in Step 1).
7.  Click **Next**.
8.  Select **release** build variant.
9.  Click **Finish**.

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
