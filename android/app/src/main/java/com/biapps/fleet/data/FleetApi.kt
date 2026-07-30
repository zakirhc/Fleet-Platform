package com.biapps.fleet.data

import com.biapps.fleet.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class Session(val accessToken: String, val refreshToken: String, val username: String)
data class Vehicle(val id: String, val registrationNo: String, val fleetNo: String?, val make: String?, val model: String?, val status: String)

class FleetApi(private val baseUrl: String = BuildConfig.API_BASE_URL.trimEnd('/')) {
  suspend fun login(username: String, password: String): Session = request("/auth/login", JSONObject().put("username", username).put("password", password)).let { data ->
    // Older deployed Fleet backends issued access tokens only. Accept that response
    // during the upgrade; newer servers also provide a refresh token.
    Session(data.getString("accessToken"), data.optString("refreshToken", ""), username)
  }

  suspend fun vehicles(accessToken: String): List<Vehicle> = get("/vehicles", accessToken).let { vehicles ->
    (0 until vehicles.length()).map { index ->
      vehicles.getJSONObject(index).let { vehicle ->
        Vehicle(
          id = vehicle.getString("id"),
          registrationNo = vehicle.getString("registrationNo"),
          fleetNo = vehicle.optString("fleetNo").takeIf { it.isNotBlank() },
          make = vehicle.optString("make").takeIf { it.isNotBlank() },
          model = vehicle.optString("model").takeIf { it.isNotBlank() },
          status = vehicle.optString("status", "UNKNOWN"),
        )
      }
    }
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

  private suspend fun get(path: String, accessToken: String): JSONArray = withContext(Dispatchers.IO) {
    val connection = (URL(baseUrl + path).openConnection() as HttpURLConnection).apply {
      requestMethod = "GET"; connectTimeout = 15_000; readTimeout = 15_000
      setRequestProperty("Accept", "application/json")
      setRequestProperty("Authorization", "Bearer $accessToken")
    }
    val status = connection.responseCode
    val text = (if (status in 200..299) connection.inputStream else connection.errorStream)
      .bufferedReader().use { it.readText() }
    if (text.trimStart().startsWith("<")) {
      throw IllegalStateException("$path returned an HTML page instead of the Fleet API. Check FLEET_API_BASE_URL: $baseUrl")
    }
    val envelope = JSONObject(text)
    if (status !in 200..299 || !envelope.optBoolean("success")) {
      throw IllegalStateException(envelope.optString("message", "Request failed."))
    }
    envelope.getJSONArray("data")
  }
}
