plugins { id("com.android.application"); id("org.jetbrains.kotlin.plugin.compose") }

val mapTilerApiKey = providers.gradleProperty("MAPTILER_API_KEY").orElse("")

android { namespace = "com.biapps.fleet"; compileSdk = 37
  defaultConfig { applicationId = "com.biapps.fleet"; minSdk = 26; targetSdk = 37; versionCode = 1; versionName = "0.1.0"; buildConfigField("String", "API_BASE_URL", "\"${providers.gradleProperty("FLEET_API_BASE_URL").get()}\""); buildConfigField("String", "MAPTILER_API_KEY", "\"${mapTilerApiKey.get()}\"") }
  buildFeatures { compose = true; buildConfig = true }
}

dependencies {
  val composeBom = platform("androidx.compose:compose-bom:2026.06.00")
  implementation(composeBom); implementation("androidx.activity:activity-compose:1.13.0")
  implementation("androidx.compose.material3:material3"); implementation("androidx.compose.ui:ui-tooling-preview")
  implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
  implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.10.0")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
  debugImplementation("androidx.compose.ui:ui-tooling")
}
