package com.biapps.fleet.data

import com.biapps.fleet.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class Session(val accessToken: String, val refreshToken: String, val username: String)

class FleetApi(private val baseUrl: String = BuildConfig.API_BASE_URL.trimEnd('/')) {
  suspend fun login(username: String, password: String): Session = request("/auth/login", JSONObject().put("username", username).put("password", password)).let { data ->
    Session(data.getString("accessToken"), data.getString("refreshToken"), username)
  }

  private suspend fun request(path: String, body: JSONObject): JSONObject = withContext(Dispatchers.IO) {
    val connection = (URL(baseUrl + path).openConnection() as HttpURLConnection).apply {
      requestMethod = "POST"; connectTimeout = 15_000; readTimeout = 15_000
      setRequestProperty("Content-Type", "application/json"); doOutput = true
      outputStream.use { it.write(body.toString().toByteArray()) }
    }
    val status = connection.responseCode
    val text = (if (status in 200..299) connection.inputStream else connection.errorStream)
      .bufferedReader().use { it.readText() }
    if (text.trimStart().startsWith("<")) {
      throw IllegalStateException("$path returned an HTML page instead of the Fleet API. Check FLEET_API_BASE_URL: $baseUrl")
    }
    val envelope = JSONObject(text)
    if (status !in 200..299 || !envelope.optBoolean("success")) throw IllegalStateException(envelope.optString("message", "Request failed."))
    envelope.getJSONObject("data")
  }
}
