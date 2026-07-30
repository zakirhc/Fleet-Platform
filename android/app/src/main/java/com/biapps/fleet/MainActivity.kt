package com.biapps.fleet

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewModelScope
import com.biapps.fleet.data.FleetApi
import com.biapps.fleet.data.Session
import com.biapps.fleet.data.Vehicle
import com.biapps.fleet.data.Driver
import com.biapps.fleet.data.GeofenceEvent
import com.biapps.fleet.data.LiveVehicle
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); setContent { FleetApp() } }
}

class AuthViewModel : ViewModel() {
  var session by mutableStateOf<Session?>(null); private set
  var loading by mutableStateOf(false); private set
  var error by mutableStateOf<String?>(null); private set
  fun login(username: String, password: String) { loading = true; error = null; viewModelScope.launch { runCatching { FleetApi().login(username, password) }.onSuccess { session = it }.onFailure { error = it.message ?: "Unable to sign in." }; loading = false } }
  fun logout() { session = null }
}

@Composable private fun FleetApp(auth: AuthViewModel = viewModel()) {
  MaterialTheme { if (auth.session == null) LoginScreen(auth) else DispatcherHome(auth.session!!, auth::logout) }
}

@Composable private fun LoginScreen(auth: AuthViewModel) { var username by remember { mutableStateOf("") }; var password by remember { mutableStateOf("") }
  Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { Text("Fleet Platform", style = MaterialTheme.typography.headlineMedium); Text("Dispatcher sign in"); OutlinedTextField(username, { username = it }, label = { Text("Username") }, singleLine = true); OutlinedTextField(password, { password = it }, label = { Text("Password") }, singleLine = true); auth.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }; Button(onClick = { auth.login(username, password) }, enabled = username.isNotBlank() && password.isNotBlank() && !auth.loading) { Text(if (auth.loading) "Signing in…" else "Sign in") } }
}

@Composable private fun DispatcherHome(session: Session, logout: () -> Unit) {
  MaterialTheme { var page by remember { mutableStateOf("Fleet") }
    Scaffold(bottomBar = { NavigationBar { listOf("Fleet", "Drivers", "Map", "Alerts").forEach { item -> NavigationBarItem(selected = page == item, onClick = { page = item }, icon = {}, label = { Text(item) }) } } }) { padding ->
      Column(Modifier.padding(padding).padding(24.dp)) { Text("Fleet Platform", style = MaterialTheme.typography.headlineMedium); Spacer(Modifier.height(8.dp)); Text("Signed in as ${session.username}"); Spacer(Modifier.height(12.dp)); when (page) { "Fleet" -> FleetScreen(session); "Drivers" -> DriversScreen(session); "Map" -> LiveLocationsScreen(session); "Alerts" -> AlertsScreen(session) }; Spacer(Modifier.height(16.dp)); TextButton(onClick = logout) { Text("Sign out") } }
    }
  }
}

@Composable private fun LiveLocationsScreen(session: Session) {
  var vehicles by remember(session.accessToken) { mutableStateOf<List<LiveVehicle>>(emptyList()) }
  var loading by remember(session.accessToken) { mutableStateOf(true) }
  var error by remember(session.accessToken) { mutableStateOf<String?>(null) }
  var reload by remember(session.accessToken) { mutableIntStateOf(0) }
  suspend fun load() { loading = true; error = null; runCatching { FleetApi().latestPositions(session.accessToken) }.onSuccess { vehicles = it }.onFailure { error = it.message ?: "Unable to load live locations." }; loading = false }
  LaunchedEffect(session.accessToken, reload) { load() }
  Text("Live locations", style = MaterialTheme.typography.titleLarge)
  TextButton(onClick = { reload++ }, enabled = !loading) { Text("Refresh") }
  when {
    loading -> CircularProgressIndicator()
    error != null -> Text(error!!, color = MaterialTheme.colorScheme.error)
    vehicles.isEmpty() -> Text("No vehicles with assigned tracking devices were found.")
    else -> { LiveMap(vehicles); Spacer(Modifier.height(12.dp)); LazyColumn(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) { items(vehicles, key = { it.id }) { vehicle -> Card { Column(Modifier.fillMaxWidth().padding(16.dp)) { Text(vehicle.registrationNo, style = MaterialTheme.typography.titleMedium); if (vehicle.latitude == null || vehicle.longitude == null) Text("No location received yet") else { Text("${"%.5f".format(vehicle.latitude)}, ${"%.5f".format(vehicle.longitude)}"); Text("${vehicle.speed ?: 0.0} km/h · ${vehicle.fixTime ?: "Unknown time"}", style = MaterialTheme.typography.labelLarge) } } } } }
    }
  }
}

@Composable private fun LiveMap(vehicles: List<LiveVehicle>) {
  var webView by remember { mutableStateOf<WebView?>(null) }
  var mapReady by remember { mutableStateOf(false) }
  val payload = remember(vehicles) { mapPayload(vehicles) }
  LaunchedEffect(webView, mapReady, payload) { if (mapReady) webView?.evaluateJavascript("window.setVehicles($payload);", null) }
  AndroidView(
    modifier = Modifier.fillMaxWidth().height(280.dp),
    factory = { context -> WebView(context).apply { settings.javaScriptEnabled = true; settings.domStorageEnabled = true; webViewClient = object : WebViewClient() { override fun onPageFinished(view: WebView?, url: String?) { mapReady = true } }; loadDataWithBaseURL("https://fleet-map.local/", LEAFLET_MAP_HTML, "text/html", "UTF-8", null); webView = this } },
  )
}

private fun mapPayload(vehicles: List<LiveVehicle>): String = JSONArray().apply {
  vehicles.filter { it.latitude != null && it.longitude != null }.forEach { vehicle ->
    put(JSONObject().put("id", vehicle.id).put("name", vehicle.registrationNo).put("latitude", vehicle.latitude).put("longitude", vehicle.longitude).put("speed", vehicle.speed ?: 0.0).put("fixTime", vehicle.fixTime ?: "Unknown time"))
  }
}.toString()

private const val LEAFLET_MAP_HTML = """
<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0} .leaflet-popup-content{font:14px sans-serif}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map=L.map('map').setView([23.8103,90.4125],7);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);const markers={};window.setVehicles=function(items){const ids=new Set(items.map(x=>x.id));Object.keys(markers).forEach(id=>{if(!ids.has(id)){map.removeLayer(markers[id]);delete markers[id]}});const points=[];items.forEach(x=>{const popup='<b>'+x.name+'</b><br>'+x.speed.toFixed(1)+' km/h<br>'+x.fixTime;if(markers[x.id]){markers[x.id].setLatLng([x.latitude,x.longitude]).setPopupContent(popup)}else{markers[x.id]=L.marker([x.latitude,x.longitude]).addTo(map).bindPopup(popup)}points.push([x.latitude,x.longitude])});if(points.length===1)map.setView(points[0],15);else if(points.length>1)map.fitBounds(points,{padding:[24,24],maxZoom:15})};</script></body></html>
"""

@Composable private fun AlertsScreen(session: Session) {
  var events by remember(session.accessToken) { mutableStateOf<List<GeofenceEvent>>(emptyList()) }
  var loading by remember(session.accessToken) { mutableStateOf(true) }
  var error by remember(session.accessToken) { mutableStateOf<String?>(null) }
  var reload by remember(session.accessToken) { mutableIntStateOf(0) }
  suspend fun load() { loading = true; error = null; runCatching { FleetApi().geofenceEvents(session.accessToken) }.onSuccess { events = it }.onFailure { error = it.message ?: "Unable to load alerts." }; loading = false }
  LaunchedEffect(session.accessToken, reload) { load() }
  Text("Geofence alerts", style = MaterialTheme.typography.titleLarge)
  Spacer(Modifier.height(8.dp))
  when {
    loading -> CircularProgressIndicator()
    error != null -> { Text(error!!, color = MaterialTheme.colorScheme.error); TextButton(onClick = { reload++ }) { Text("Retry") } }
    events.isEmpty() -> Text("No entry or exit events were recorded in the last 24 hours.")
    else -> LazyColumn(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) { items(events, key = { it.id }) { event -> Card { Column(Modifier.fillMaxWidth().padding(16.dp)) { Text("${event.eventType}: ${event.registrationNo ?: "Vehicle"}", style = MaterialTheme.typography.titleMedium); Text(event.geofenceName ?: "Unknown geofence"); Text(event.eventTime, style = MaterialTheme.typography.labelLarge) } } } }
  }
}

@Composable private fun DriversScreen(session: Session) {
  var drivers by remember(session.accessToken) { mutableStateOf<List<Driver>>(emptyList()) }
  var loading by remember(session.accessToken) { mutableStateOf(true) }
  var error by remember(session.accessToken) { mutableStateOf<String?>(null) }
  var reload by remember(session.accessToken) { mutableIntStateOf(0) }
  suspend fun load() { loading = true; error = null; runCatching { FleetApi().drivers(session.accessToken) }.onSuccess { drivers = it }.onFailure { error = it.message ?: "Unable to load drivers." }; loading = false }
  LaunchedEffect(session.accessToken, reload) { load() }
  Text("Drivers", style = MaterialTheme.typography.titleLarge)
  Spacer(Modifier.height(8.dp))
  when {
    loading -> CircularProgressIndicator()
    error != null -> { Text(error!!, color = MaterialTheme.colorScheme.error); TextButton(onClick = { reload++ }) { Text("Retry") } }
    drivers.isEmpty() -> Text("No drivers are assigned to this company.")
    else -> LazyColumn(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) { items(drivers, key = { it.id }) { driver -> Card { Column(Modifier.fillMaxWidth().padding(16.dp)) { Text(driver.fullName, style = MaterialTheme.typography.titleMedium); Text(listOfNotNull(driver.employeeNo, driver.designation, driver.mobile).joinToString(" · ")); Text(driver.status, style = MaterialTheme.typography.labelLarge) } } } }
  }
}

@Composable private fun FleetScreen(session: Session) {
  var vehicles by remember(session.accessToken) { mutableStateOf<List<Vehicle>>(emptyList()) }
  var loading by remember(session.accessToken) { mutableStateOf(true) }
  var error by remember(session.accessToken) { mutableStateOf<String?>(null) }
  var reload by remember(session.accessToken) { mutableIntStateOf(0) }
  suspend fun load() { loading = true; error = null; runCatching { FleetApi().vehicles(session.accessToken) }.onSuccess { vehicles = it }.onFailure { error = it.message ?: "Unable to load vehicles." }; loading = false }
  LaunchedEffect(session.accessToken, reload) { load() }
  Text("Vehicles", style = MaterialTheme.typography.titleLarge)
  Spacer(Modifier.height(8.dp))
  when {
    loading -> CircularProgressIndicator()
    error != null -> { Text(error!!, color = MaterialTheme.colorScheme.error); TextButton(onClick = { reload++ }) { Text("Retry") } }
    vehicles.isEmpty() -> Text("No vehicles are assigned to this company.")
    else -> LazyColumn(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) { items(vehicles, key = { it.id }) { vehicle -> Card { Column(Modifier.fillMaxWidth().padding(16.dp)) { Text(vehicle.registrationNo, style = MaterialTheme.typography.titleMedium); Text(listOfNotNull(vehicle.fleetNo, listOfNotNull(vehicle.make, vehicle.model).joinToString(" ").takeIf { it.isNotBlank() }).joinToString(" · ")); Text(vehicle.status, style = MaterialTheme.typography.labelLarge) } } } }
  }
}
