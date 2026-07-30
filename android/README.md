# Fleet Android

Open this `android/` directory in Android Studio with JDK 17 and Android SDK API 37.

Set `FLEET_API_BASE_URL` in `gradle.properties` to the public HTTPS API proxy URL, including `/api`, for example `https://fleet.example.com/api`. The current app implements `POST /auth/login`; `/auth/refresh`, `/mobile-devices`, REST tracking endpoints, and Socket.IO `/tracking` are the next slices.

Debug builds may also use a temporary `http://` development URL. Release builds retain Android's HTTPS-only default and must use HTTPS.

For the native map, add your MapTiler key to your uncommitted `gradle.properties`:

`MAPTILER_API_KEY=your_key`

The Docker `.env.docker` file is for server containers and is not available to Android builds.

Before enabling Firebase Cloud Messaging, register Android app ID `com.biapps.fleet` in Firebase and place `google-services.json` in `app/` (it must not be committed).
