@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)
package dev.wolly.dsbmaterial.ui.screens

import dev.wolly.dsbmaterial.R
import android.Manifest
import android.content.Intent
import android.os.Build
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.lerp
import androidx.compose.ui.unit.sp
import dev.wolly.dsbmaterial.BuildConfig
import dev.wolly.dsbmaterial.data.SubstitutionEntry
import dev.wolly.dsbmaterial.ui.MainViewModel
import dev.wolly.dsbmaterial.ui.UiState
import dev.wolly.dsbmaterial.ui.components.*
import java.util.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DebugModeScreen(onBack: () -> Unit) {
    var showLoading by remember { mutableStateOf(false) }
    var showError by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface)) {
        Column(modifier = Modifier.fillMaxSize()) {
            TopAppBar(
                title = { Text("Debug Mode", style = MaterialTheme.typography.titleLargeEmphasized) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.action_back), tint = MaterialTheme.colorScheme.primary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
            )
            HorizontalDivider(thickness = 0.5.dp)
            LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
                item {
                    Text("Animations", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 24.dp, bottom = 8.dp))
                }
                item {
                    SettingCard {
                        SettingsRow(
                            title = "Loading Animation",
                            description = if (showLoading) "Tap to hide" else "Tap to preview the loading screen",
                            icon = Icons.Default.Info,
                            onClick = { showLoading = !showLoading }
                        )
                    }
                }
                item {
                    SettingCard {
                        SettingsRow(
                            title = "Error Screen",
                            description = if (showError) "Tap to hide" else "Tap to preview the error screen",
                            icon = Icons.Default.Warning,
                            onClick = { showError = !showError }
                        )
                    }
                }
                item {
                    Text("Components", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 24.dp, bottom = 8.dp))
                }
                item {
                    var switchState by remember { mutableStateOf(true) }
                    SettingCard {
                        SettingsRow(
                            title = "Expressive Switch",
                            description = "Interactive toggle preview",
                            icon = Icons.Default.Settings,
                            trailing = { ExpressiveSwitch(checked = switchState, onCheckedChange = { switchState = !switchState }) }
                        )
                    }
                }
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        shape = MaterialTheme.shapes.large,
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Type Badges", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                listOf("Entfall" to Color(0xFFD32F2F), "Vertretung" to Color(0xFFFFA000), "Verlegung" to Color(0xFF1976D2), "Eigenvertretung" to Color(0xFF7B1FA2)).forEach { (label, color) ->
                                    Surface(shape = RoundedCornerShape(6.dp), color = color.copy(alpha = 0.15f)) {
                                        Text(label, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), color = color, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                listOf("Betreuung" to Color(0xFF388E3C), "Raumänderung" to Color(0xFF00796B)).forEach { (label, color) ->
                                    Surface(shape = RoundedCornerShape(6.dp), color = color.copy(alpha = 0.15f)) {
                                        Text(label, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), color = color, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                        }
                    }
                }
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        shape = MaterialTheme.shapes.large,
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Typography Scale", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Text("Headline Large", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
                            Text("Title Medium", style = MaterialTheme.typography.titleMedium)
                            Text("Body Large", style = MaterialTheme.typography.bodyLarge)
                            Text("Body Medium", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("Label Small", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                item { Spacer(Modifier.height(32.dp)) }
            }
        }
        if (showLoading) {
            Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.5f)).clickable { showLoading = false }) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Surface(modifier = Modifier.size(200.dp), shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surface, shadowElevation = 8.dp) {
                        LoadingScreen()
                    }
                }
            }
        }
        if (showError) {
            Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.5f)).clickable { showError = false }) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Surface(modifier = Modifier.size(300.dp, 200.dp), shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surface, shadowElevation = 8.dp) {
                        ErrorScreen(message = "This is a debug error message for testing.", onRetry = { showError = false })
                    }
                }
            }
        }
    }
}

