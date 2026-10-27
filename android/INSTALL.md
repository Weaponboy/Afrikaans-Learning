# Install Afrikaans Leer on your Android phone

The APK is a real installed app (own icon, own window, works offline, keeps your
progress even after reboot) — not a Chrome tab. It contains the exact same app.

## Build it (once)
1. Double-click `build_apk.bat` (needs the Android SDK already on this laptop — it's there).
2. Result: `android\AfrikaansLeer.apk`.

## Option A — straight from the laptop over USB (easiest)
1. On the phone: **Settings > About phone > Software information > tap "Build number" 7 times**
   (enables Developer options).
2. **Settings > Developer options > USB debugging > ON**.
3. Plug the phone into the laptop with a USB cable. The phone asks
   "Allow USB debugging?" — tap **Allow**.
4. Double-click `install_to_phone.bat` → installs / updates the app on the phone.

## Option B — copy the file, no USB debugging
1. Copy `AfrikaansLeer.apk` to the phone (USB cable in file-transfer mode, or email/Drive to yourself).
2. On the phone open the **Files / My Files** app and tap the APK.
3. Android will say installs from this source are not allowed → tap **Settings** and allow
   "Install unknown apps" for that app, then **Install**.

## Notes
- **Progress:** saved inside the app (same as browser localStorage). Updating by
  installing the new APK over the old one keeps your progress. **Uninstalling wipes it** —
  use Export in the app first if you're starting fresh or moving phones.
- The app has **no permissions** (no internet, no location, nothing). Fully offline.
- Rebuild after changing content: `build_apk.bat` always packages the current web app
  (index.html, app.js, data.js, audio/) into the APK.
- To update on the phone later: run `build_apk.bat` then `install_to_phone.bat` again.
