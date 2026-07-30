package com.biapps.fleet

import android.os.Bundle
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.PI
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.tan
import kotlin.math.cos

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
    else -> LiveMap(vehicles)
    }
  }
}

@Composable private fun LiveMap(vehicles: List<LiveVehicle>) {
  val locatedVehicles = vehicles.filter { it.latitude != null && it.longitude != null }
  val locationSignature = locatedVehicles.joinToString { "${it.id}:${it.latitude}:${it.longitude}" }
  val mapCenter = locatedVehicles.takeIf { it.isNotEmpty() }?.let { items -> MapLocation(items.map { it.latitude!! }.average(), items.map { it.longitude!! }.average()) }
  var zoom by remember { mutableIntStateOf(DEFAULT_MAP_ZOOM) }
  var selectedVehicleId by remember { mutableStateOf<String?>(null) }
  var canvasSize by remember { mutableStateOf(IntSize.Zero) }
  var tiles by remember(locationSignature, zoom) { mutableStateOf<List<RasterTile>>(emptyList()) }
  var mapError by remember { mutableStateOf<String?>(null) }
  val markerTargets = remember(locationSignature, zoom, canvasSize) { mapCenter?.let { markerTargets(locatedVehicles, it, zoom, canvasSize) }.orEmpty() }
  val selectedVehicle = locatedVehicles.firstOrNull { it.id == selectedVehicleId } ?: locatedVehicles.firstOrNull()
  LaunchedEffect(locationSignature, zoom) {
    tiles = emptyList(); mapError = null
    if (mapCenter == null) { mapError = "No live vehicle position is available."; return@LaunchedEffect }
    val center = webMercatorTile(mapCenter.latitude, mapCenter.longitude, zoom)
    val originX = floor(center.x).toInt() - 1
    val originY = floor(center.y).toInt() - 1
    runCatching { (0..2).flatMap { row -> (0..2).map { column -> downloadTile(originX + column, originY + row, zoom) } } }
      .onSuccess { tiles = it }
      .onFailure { mapError = it.message ?: "Unable to load map tiles." }
  }
  Box(Modifier.fillMaxWidth().height(280.dp)) {
    Canvas(Modifier.fillMaxWidth().height(280.dp).onSizeChanged { canvasSize = it }.pointerInput(markerTargets) { detectTapGestures { tap -> markerTargets.minByOrNull { (it.offset - tap).getDistance() }?.takeIf { (it.offset - tap).getDistance() <= 28f }?.let { selectedVehicleId = it.vehicle.id } } }.pointerInput(Unit) { var scaleAccumulator = 1f; detectTransformGestures { _, _, scale, _ -> scaleAccumulator *= scale; if (scaleAccumulator > 1.15f && zoom < 19) { zoom++; scaleAccumulator = 1f } else if (scaleAccumulator < 0.87f && zoom > 3) { zoom--; scaleAccumulator = 1f } } }) {
      drawRect(Color(0xFFE8EDF2))
      if (mapCenter == null || tiles.isEmpty()) return@Canvas
      val center = webMercatorTile(mapCenter.latitude, mapCenter.longitude, zoom)
      val originX = floor(center.x).toInt() - 1
      val originY = floor(center.y).toInt() - 1
      val tileSize = minOf(size.width / 3f, size.height / 3f)
      val left = (size.width - tileSize * 3) / 2f
      val top = (size.height - tileSize * 3) / 2f
      val tileByCoordinate = tiles.associateBy { "${it.x}:${it.y}" }
      for (row in 0..2) for (column in 0..2) {
        tileByCoordinate["${wrapTileX(originX + column, zoom)}:${originY + row}"]?.let { tile -> drawImage(tile.bitmap.asImageBitmap(), dstOffset = IntOffset((left + column * tileSize).toInt(), (top + row * tileSize).toInt()), dstSize = IntSize(tileSize.toInt(), tileSize.toInt())) }
      }
      markerTargets(locatedVehicles, mapCenter, zoom, IntSize(size.width.toInt(), size.height.toInt())).forEach { marker -> drawCircle(if (marker.vehicle.id == selectedVehicle?.id) Color(0xFFD32F2F) else Color(0xFF1565C0), radius = if (marker.vehicle.id == selectedVehicle?.id) 11f else 8f, center = marker.offset) }
    }
    selectedVehicle?.let { Surface(Modifier.align(Alignment.TopStart).padding(8.dp), color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f), shadowElevation = 2.dp) { Text("${it.registrationNo} · ${it.speed ?: 0.0} km/h\n${it.fixTime ?: "Unknown time"}\nPinch with two fingers to zoom · Tap a marker", modifier = Modifier.padding(8.dp), style = MaterialTheme.typography.labelSmall) } }
  }
  Text(mapError ?: if (tiles.isEmpty()) "Loading live map…" else "Live map · © MapTiler / OpenStreetMap", color = if (mapError == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall)
}

private const val DEFAULT_MAP_ZOOM = 15
private data class TileCoordinate(val x: Double, val y: Double)
private data class MapLocation(val latitude: Double, val longitude: Double)
private data class RasterTile(val x: Int, val y: Int, val bitmap: Bitmap)
private data class MarkerTarget(val vehicle: LiveVehicle, val offset: Offset)
private fun markerTargets(vehicles: List<LiveVehicle>, center: MapLocation, zoom: Int, size: IntSize): List<MarkerTarget> { if (size == IntSize.Zero) return emptyList(); val centerTile = webMercatorTile(center.latitude, center.longitude, zoom); val originX = floor(centerTile.x).toInt() - 1; val originY = floor(centerTile.y).toInt() - 1; val tileSize = minOf(size.width / 3f, size.height / 3f); val left = (size.width - tileSize * 3) / 2f; val top = (size.height - tileSize * 3) / 2f; return vehicles.mapNotNull { vehicle -> val point = webMercatorTile(vehicle.latitude ?: return@mapNotNull null, vehicle.longitude ?: return@mapNotNull null, zoom); val offset = Offset((left + (point.x - originX) * tileSize).toFloat(), (top + (point.y - originY) * tileSize).toFloat()); if (offset.x in 0f..size.width.toFloat() && offset.y in 0f..size.height.toFloat()) MarkerTarget(vehicle, offset) else null } }
private fun webMercatorTile(latitude: Double, longitude: Double, zoom: Int): TileCoordinate { val tiles = 1 shl zoom; val latitudeRadians = latitude * PI / 180.0; return TileCoordinate((longitude + 180.0) / 360.0 * tiles, (1.0 - ln(tan(latitudeRadians) + 1.0 / cos(latitudeRadians)) / PI) / 2.0 * tiles) }
private fun wrapTileX(x: Int, zoom: Int): Int { val tiles = 1 shl zoom; return ((x % tiles) + tiles) % tiles }
private suspend fun downloadTile(x: Int, y: Int, zoom: Int): RasterTile = withContext(Dispatchers.IO) { val tileX = wrapTileX(x, zoom); val connection = (URL("https://tile.openstreetmap.org/$zoom/$tileX/$y.png").openConnection() as HttpURLConnection).apply { connectTimeout = 15_000; readTimeout = 15_000; setRequestProperty("User-Agent", "FleetPlatform-Android/1.0") }; if (connection.responseCode !in 200..299) throw IllegalStateException("Map tiles returned HTTP ${connection.responseCode}."); val bitmap = connection.inputStream.use { BitmapFactory.decodeStream(it) } ?: throw IllegalStateException("Map tile could not be decoded."); RasterTile(tileX, y, bitmap) }

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
