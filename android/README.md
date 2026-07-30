# Fleet Android

Open this `android/` directory in Android Studio with JDK 17 and Android SDK API 37.

Set the production API URL through `BuildConfig` in the next implementation step. The Android client will use `POST /auth/login`, `/auth/refresh`, `/mobile-devices`, REST tracking endpoints, and Socket.IO `/tracking`.

Before enabling Firebase Cloud Messaging, register Android app ID `com.biapps.fleet` in Firebase and place `google-services.json` in `app/` (it must not be committed).
