package com.biapps.fleet

import android.os.Bundle
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.TextStyle
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
import kotlin.math.atan
import kotlin.math.sinh

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

private val FleetColors = lightColorScheme(primary = Color(0xFF008F83), onPrimary = Color.White, primaryContainer = Color(0xFFD8F6F0), onPrimaryContainer = Color(0xFF003D38), secondary = Color(0xFF2F6477), background = Color(0xFFF4F7F9), surface = Color.White, surfaceVariant = Color(0xFFE9EFF3), onSurface = Color(0xFF132337), onSurfaceVariant = Color(0xFF66788C), outline = Color(0xFFD7E0E7), error = Color(0xFFBA1A1A))
private val FleetTypography = Typography(headlineLarge = TextStyle(fontSize = 38.sp, lineHeight = 42.sp, fontWeight = FontWeight.Bold, letterSpacing = (-1).sp), headlineMedium = TextStyle(fontSize = 28.sp, lineHeight = 34.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.6).sp), titleLarge = TextStyle(fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold), titleMedium = TextStyle(fontSize = 16.sp, lineHeight = 22.sp, fontWeight = FontWeight.SemiBold), labelLarge = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold))

@Composable private fun FleetApp(auth: AuthViewModel = viewModel()) {
  MaterialTheme(colorScheme = FleetColors, typography = FleetTypography, shapes = Shapes(small = RoundedCornerShape(10.dp), medium = RoundedCornerShape(16.dp), large = RoundedCornerShape(24.dp))) { if (auth.session == null) LoginScreen(auth) else DispatcherHome(auth.session!!, auth::logout) }
}

@Composable private fun LoginScreen(auth: AuthViewModel) { var username by remember { mutableStateOf("") }; var password by remember { mutableStateOf("") }
  Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFF061A2D), Color(0xFF0A3042))))) {
    Box(Modifier.size(260.dp).offset(x = (-100).dp, y = (-90).dp).background(Color(0x2234D6C2), CircleShape))
    Column(Modifier.fillMaxSize().padding(horizontal = 24.dp, vertical = 38.dp)) {
      Row(verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(42.dp).background(Color(0xFF34D6C2), RoundedCornerShape(13.dp)), contentAlignment = Alignment.Center) { Text("F", color = Color(0xFF052B2A), fontWeight = FontWeight.Black, fontSize = 20.sp) }; Spacer(Modifier.width(12.dp)); Text("Fleet", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp); Text("Platform", color = Color(0xFF45D8C6), fontWeight = FontWeight.Bold, fontSize = 20.sp) }
      Spacer(Modifier.height(42.dp)); Text("Your fleet.\nIn perfect motion.", color = Color.White, style = MaterialTheme.typography.headlineLarge); Spacer(Modifier.height(12.dp)); Text("Live visibility and smarter operations, wherever the road takes you.", color = Color(0xFFADC1D0), lineHeight = 22.sp)
      Spacer(Modifier.height(32.dp)); Card(colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(10.dp), shape = RoundedCornerShape(24.dp)) { Column(Modifier.fillMaxWidth().padding(24.dp)) { Text("WELCOME BACK", color = MaterialTheme.colorScheme.primary, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp); Spacer(Modifier.height(7.dp)); Text("Sign in", style = MaterialTheme.typography.headlineMedium); Text("Access your secure fleet workspace", color = MaterialTheme.colorScheme.onSurfaceVariant); Spacer(Modifier.height(20.dp)); OutlinedTextField(username, { username = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Username") }, singleLine = true, shape = RoundedCornerShape(12.dp)); Spacer(Modifier.height(12.dp)); OutlinedTextField(password, { password = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), shape = RoundedCornerShape(12.dp)); auth.error?.let { Spacer(Modifier.height(10.dp)); Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }; Spacer(Modifier.height(20.dp)); Button(onClick = { auth.login(username, password) }, modifier = Modifier.fillMaxWidth().height(50.dp), enabled = username.isNotBlank() && password.isNotBlank() && !auth.loading, shape = RoundedCornerShape(12.dp)) { Text(if (auth.loading) "Signing in…" else "Sign in  →") } } }
    }
  }
}

@Composable private fun DispatcherHome(session: Session, logout: () -> Unit) {
  var page by remember { mutableStateOf("Fleet") }
    Scaffold(containerColor = MaterialTheme.colorScheme.background, topBar = { Surface(color = Color(0xFF071A2D), shadowElevation = 8.dp) { Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 15.dp), verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(34.dp).background(Color(0xFF34D6C2), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) { Text("F", color = Color(0xFF052B2A), fontWeight = FontWeight.Black) }; Spacer(Modifier.width(10.dp)); Column(Modifier.weight(1f)) { Text("FleetPlatform", color = Color.White, fontWeight = FontWeight.Bold); Text("COMMAND CENTRE", color = Color(0xFF7FA0B7), fontSize = 9.sp, letterSpacing = 1.sp) }; TextButton(onClick = logout) { Text("Sign out", color = Color(0xFFBBD0DD)) } } } }, bottomBar = { NavigationBar(containerColor = Color.White, tonalElevation = 8.dp) { listOf("Fleet" to "●", "Drivers" to "◆", "Map" to "◎", "Alerts" to "!").forEach { (item, symbol) -> NavigationBarItem(selected = page == item, onClick = { page = item }, icon = { Text(symbol, fontWeight = FontWeight.Bold) }, label = { Text(item) }, colors = NavigationBarItemDefaults.colors(indicatorColor = MaterialTheme.colorScheme.primaryContainer)) } } }) { padding ->
      Column(Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp, vertical = 22.dp)) { Row(verticalAlignment = Alignment.Bottom) { Column(Modifier.weight(1f)) { Text("COMPANY WORKSPACE", color = MaterialTheme.colorScheme.primary, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp); Text(page, style = MaterialTheme.typography.headlineMedium) }; Column(horizontalAlignment = Alignment.End) { Text("Signed in as", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp); Text(session.username, fontWeight = FontWeight.SemiBold, fontSize = 12.sp) } }; Spacer(Modifier.height(20.dp)); when (page) { "Fleet" -> FleetScreen(session); "Drivers" -> DriversScreen(session); "Map" -> LiveLocationsScreen(session, Modifier.weight(1f)); "Alerts" -> AlertsScreen(session) } }
  }
}

@Composable private fun LiveLocationsScreen(session: Session, modifier: Modifier = Modifier) {
  var vehicles by remember(session.accessToken) { mutableStateOf<List<LiveVehicle>>(emptyList()) }
  var loading by remember(session.accessToken) { mutableStateOf(true) }
  var error by remember(session.accessToken) { mutableStateOf<String?>(null) }
  var reload by remember(session.accessToken) { mutableIntStateOf(0) }
  suspend fun load() { loading = true; error = null; runCatching { FleetApi().latestPositions(session.accessToken) }.onSuccess { vehicles = it }.onFailure { error = it.message ?: "Unable to load live locations." }; loading = false }
  LaunchedEffect(session.accessToken, reload) { load() }
  Column(modifier) { Text("Live locations", style = MaterialTheme.typography.titleLarge); TextButton(onClick = { reload++ }, enabled = !loading) { Text("Refresh") }; when { loading -> CircularProgressIndicator(); error != null -> Text(error!!, color = MaterialTheme.colorScheme.error); vehicles.isEmpty() -> Text("No vehicles with assigned tracking devices were found."); else -> LiveMap(vehicles, Modifier.weight(1f)) } }
  }


@Composable private fun LiveMap(vehicles: List<LiveVehicle>, modifier: Modifier = Modifier) {
  val locatedVehicles = vehicles.filter { it.latitude != null && it.longitude != null }
  val locationSignature = locatedVehicles.joinToString { "${it.id}:${it.latitude}:${it.longitude}" }
  val initialCenter = locatedVehicles.takeIf { it.isNotEmpty() }?.let { items -> MapLocation(items.map { it.latitude!! }.average(), items.map { it.longitude!! }.average()) }
  var mapCenter by remember(locationSignature) { mutableStateOf(initialCenter) }
  var zoom by remember { mutableIntStateOf(DEFAULT_MAP_ZOOM) }
  var selectedVehicleId by remember { mutableStateOf<String?>(null) }
  var canvasSize by remember { mutableStateOf(IntSize.Zero) }
  var tiles by remember(locationSignature, zoom, mapCenter) { mutableStateOf<List<RasterTile>>(emptyList()) }
  var mapError by remember { mutableStateOf<String?>(null) }
  val markerTargets = remember(locationSignature, zoom, canvasSize, mapCenter) { mapCenter?.let { markerTargets(locatedVehicles, it, zoom, canvasSize) }.orEmpty() }
  val selectedVehicle = locatedVehicles.firstOrNull { it.id == selectedVehicleId } ?: locatedVehicles.firstOrNull()
  LaunchedEffect(locationSignature, zoom, mapCenter) {
    tiles = emptyList(); mapError = null
    if (mapCenter == null) { mapError = "No live vehicle position is available."; return@LaunchedEffect }
    val centerLocation = mapCenter ?: return@LaunchedEffect
    val center = webMercatorTile(centerLocation.latitude, centerLocation.longitude, zoom)
    val originX = floor(center.x).toInt() - 1
    val originY = floor(center.y).toInt() - 1
    runCatching { (0..2).flatMap { row -> (0..2).map { column -> downloadTile(originX + column, originY + row, zoom) } } }
      .onSuccess { tiles = it }
      .onFailure { mapError = it.message ?: "Unable to load map tiles." }
  }
  Column(modifier) { Box(Modifier.fillMaxWidth().weight(1f)) {
    Canvas(Modifier.fillMaxSize().onSizeChanged { canvasSize = it }.pointerInput(Unit) { var scaleAccumulator = 1f; detectTransformGestures { _, pan, scale, _ -> val currentCenter = mapCenter; if (currentCenter != null && canvasSize.width > 0) { val tileSize = minOf(canvasSize.width / 3f, canvasSize.height / 3f); val currentTile = webMercatorTile(currentCenter.latitude, currentCenter.longitude, zoom); mapCenter = mapLocationFromTile(TileCoordinate(currentTile.x - pan.x.toDouble() / tileSize, currentTile.y - pan.y.toDouble() / tileSize), zoom) }; scaleAccumulator *= scale; if (scaleAccumulator > 1.15f && zoom < 19) { zoom++; scaleAccumulator = 1f } else if (scaleAccumulator < 0.87f && zoom > 3) { zoom--; scaleAccumulator = 1f } } }.pointerInput(markerTargets) { detectTapGestures { tap -> markerTargets.minByOrNull { (it.offset - tap).getDistance() }?.takeIf { (it.offset - tap).getDistance() <= 32f }?.let { selectedVehicleId = it.vehicle.id } } }) {
      drawRect(Color(0xFFE8EDF2))
      if (mapCenter == null || tiles.isEmpty()) return@Canvas
      val centerLocation = mapCenter ?: return@Canvas
      val center = webMercatorTile(centerLocation.latitude, centerLocation.longitude, zoom)
      val originX = floor(center.x).toInt() - 1
      val originY = floor(center.y).toInt() - 1
      val tileSize = minOf(size.width / 3f, size.height / 3f)
      val left = (size.width - tileSize * 3) / 2f
      val top = (size.height - tileSize * 3) / 2f
      val tileByCoordinate = tiles.associateBy { "${it.x}:${it.y}" }
      for (row in 0..2) for (column in 0..2) {
        tileByCoordinate["${wrapTileX(originX + column, zoom)}:${originY + row}"]?.let { tile -> drawImage(tile.bitmap.asImageBitmap(), dstOffset = IntOffset((left + column * tileSize).toInt(), (top + row * tileSize).toInt()), dstSize = IntSize(tileSize.toInt(), tileSize.toInt())) }
      }
      markerTargets(locatedVehicles, centerLocation, zoom, IntSize(size.width.toInt(), size.height.toInt())).forEach { marker -> drawCircle(Color.White, radius = if (marker.vehicle.id == selectedVehicle?.id) 14f else 11f, center = marker.offset); drawCircle(if (marker.vehicle.id == selectedVehicle?.id) Color(0xFFFF6B4A) else Color(0xFF008F83), radius = if (marker.vehicle.id == selectedVehicle?.id) 10f else 7f, center = marker.offset) }
    }
    selectedVehicle?.let { Surface(Modifier.align(Alignment.TopStart).padding(8.dp), color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f), shadowElevation = 2.dp) { Text("${it.registrationNo} · ${it.speed ?: 0.0} km/h\n${it.fixTime ?: "Unknown time"}\nDrag to pan · Pinch to zoom · Tap a marker", modifier = Modifier.padding(8.dp), style = MaterialTheme.typography.labelSmall) } }
  }
  Text(mapError ?: if (tiles.isEmpty()) "Loading live map…" else "Live map · © OpenStreetMap", color = if (mapError == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall) }
}

private const val DEFAULT_MAP_ZOOM = 15
private data class TileCoordinate(val x: Double, val y: Double)
private data class MapLocation(val latitude: Double, val longitude: Double)
private data class RasterTile(val x: Int, val y: Int, val bitmap: Bitmap)
private data class MarkerTarget(val vehicle: LiveVehicle, val offset: Offset)
private fun mapLocationFromTile(tile: TileCoordinate, zoom: Int): MapLocation { val tiles = 1 shl zoom; val longitude = tile.x / tiles * 360.0 - 180.0; val latitude = atan(sinh(PI * (1.0 - 2.0 * tile.y / tiles))) * 180.0 / PI; return MapLocation(latitude, longitude) }
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
