package com.biapps.fleet

import android.os.Bundle
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
import org.maplibre.android.MapLibre
import org.maplibre.android.annotations.MarkerOptions
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style

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
  var mapView by remember { mutableStateOf<MapView?>(null) }
  var map by remember { mutableStateOf<MapLibreMap?>(null) }
  var mapReady by remember { mutableStateOf(false) }
  var mapError by remember { mutableStateOf<String?>(null) }
  LaunchedEffect(map, mapReady, vehicles) {
    val activeMap = map ?: return@LaunchedEffect
    if (!mapReady) return@LaunchedEffect
    activeMap.clear()
    val points = vehicles.mapNotNull { vehicle ->
      val latitude = vehicle.latitude ?: return@mapNotNull null
      val longitude = vehicle.longitude ?: return@mapNotNull null
      LatLng(latitude, longitude).also { point ->
        activeMap.addMarker(MarkerOptions().position(point).title(vehicle.registrationNo).snippet("${vehicle.speed ?: 0.0} km/h · ${vehicle.fixTime ?: "Unknown time"}"))
      }
    }
    if (points.size == 1) activeMap.animateCamera(CameraUpdateFactory.newLatLngZoom(points.first(), 15.0))
    else if (points.isNotEmpty()) activeMap.animateCamera(CameraUpdateFactory.newLatLngBounds(org.maplibre.android.geometry.LatLngBounds.fromLatLngs(points), 48))
  }
  Column {
    AndroidView(
      modifier = Modifier.fillMaxWidth().height(280.dp),
      factory = { context -> MapLibre.getInstance(context.applicationContext); MapView(context).apply { addOnDidFailLoadingMapListener(object : MapView.OnDidFailLoadingMapListener { override fun onDidFailLoadingMap(errorMessage: String) { mapError = errorMessage } }); onCreate(null); onStart(); onResume(); getMapAsync { loadedMap -> map = loadedMap; loadedMap.setStyle(Style.Builder().fromJson(OSM_RASTER_STYLE)) { mapReady = true } }; mapView = this } },
    )
    mapError?.let { Text("Map error: $it", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall) }
  }
  DisposableEffect(mapView) { onDispose { mapView?.onPause(); mapView?.onStop(); mapView?.onDestroy() } }
}

private const val OSM_RASTER_STYLE = """
{"version":8,"sources":{"openstreetmap":{"type":"raster","tiles":["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],"tileSize":256,"attribution":"© OpenStreetMap contributors","maxzoom":19}},"layers":[{"id":"openstreetmap","type":"raster","source":"openstreetmap"}]}
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
