package com.biapps.fleet

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); setContent { FleetApp() } }
}

@Composable private fun FleetApp() {
  MaterialTheme { var page by remember { mutableStateOf("Fleet") }
    Scaffold(bottomBar = { NavigationBar { listOf("Fleet", "Map", "Alerts").forEach { item -> NavigationBarItem(selected = page == item, onClick = { page = item }, icon = {}, label = { Text(item) }) } } }) { padding ->
      Column(Modifier.padding(padding).padding(24.dp)) { Text("Fleet Platform", style = MaterialTheme.typography.headlineMedium); Spacer(Modifier.height(12.dp)); Text(if (page == "Fleet") "Android dispatcher app setup is ready." else "$page will use the Fleet v1 API.") }
    }
  }
}
