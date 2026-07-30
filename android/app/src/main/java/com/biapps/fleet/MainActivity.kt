package com.biapps.fleet

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewModelScope
import com.biapps.fleet.data.FleetApi
import com.biapps.fleet.data.Session
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

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
    Scaffold(bottomBar = { NavigationBar { listOf("Fleet", "Map", "Alerts").forEach { item -> NavigationBarItem(selected = page == item, onClick = { page = item }, icon = {}, label = { Text(item) }) } } }) { padding ->
      Column(Modifier.padding(padding).padding(24.dp)) { Text("Fleet Platform", style = MaterialTheme.typography.headlineMedium); Spacer(Modifier.height(12.dp)); Text("Signed in as ${session.username}"); Text(if (page == "Fleet") "Fleet status is the next screen." else "$page will use the Fleet v1 API."); TextButton(onClick = logout) { Text("Sign out") } }
    }
  }
}
