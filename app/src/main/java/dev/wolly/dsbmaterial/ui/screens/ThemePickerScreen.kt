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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
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
import dev.wolly.dsbmaterial.ui.theme.SeedPalettes
import dev.wolly.dsbmaterial.ui.theme.fullRoundedShape
import dev.wolly.dsbmaterial.ui.theme.springDefaultEffects
import java.util.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun ThemePickerScreen(
    currentIndex: Int,
    dynamicColor: Boolean,
    onSelect: (Int) -> Unit,
    onBack: () -> Unit
) {
    val selectedScheme = SeedPalettes[currentIndex.coerceIn(SeedPalettes.indices)].scheme(dark = false)

    val animatedPrimary by animateColorAsState(
        targetValue = selectedScheme.primary,
        animationSpec = springDefaultEffects(),
        label = "preview_primary"
    )
    val animatedSecondary by animateColorAsState(
        targetValue = selectedScheme.secondary,
        animationSpec = springDefaultEffects(),
        label = "preview_secondary"
    )
    val animatedPrimaryContainer by animateColorAsState(
        targetValue = selectedScheme.primaryContainer,
        animationSpec = springDefaultEffects(),
        label = "preview_primary_container"
    )
    val animatedBg by animateColorAsState(
        targetValue = selectedScheme.primaryContainer,
        animationSpec = springDefaultEffects(),
        label = "preview_bg"
    )
    val animatedTextColor by animateColorAsState(
        targetValue = selectedScheme.onPrimaryContainer,
        animationSpec = springDefaultEffects(),
        label = "preview_text_color"
    )

    var screenEntered by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { screenEntered = true }

    val springBounce = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessLow
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
            .statusBarsPadding()
    ) {
        AnimatedVisibility(
            visible = screenEntered,
            enter = slideInHorizontally(animationSpec = tween(400)) { -it } + fadeIn(tween(300)),
            label = "header_enter"
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.action_back), tint = MaterialTheme.colorScheme.primary)
                }
                Text(
                    text = stringResource(R.string.label_theme_picker),
                    style = MaterialTheme.typography.titleLargeEmphasized,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp)
        ) {
            AnimatedVisibility(
                visible = screenEntered,
                enter = fadeIn(tween(300, delayMillis = 120)) +
                    slideInVertically(animationSpec = tween(400, delayMillis = 120)) { -it / 2 },
                label = "preview_enter"
            ) {
                if (currentIndex in SeedPalettes.indices) {
                    Surface(
                        shape = RoundedCornerShape(28.dp),
                        color = animatedBg,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(dpv(20.dp, 28.dp)),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                AnimatedContent(
                                    targetState = currentIndex,
                                    transitionSpec = {
                                        val dir = if (targetState > initialState) 1 else -1
                                        (slideInVertically { it * dir } + fadeIn(tween(300)))
                                            .togetherWith(slideOutVertically { -it * dir } + fadeOut(tween(200)))
                                    },
                                    label = "theme_name_transition"
                                ) { idx ->
                                    Text(
                                        text = SeedPalettes[idx].name,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = animatedTextColor
                                    )
                                }
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    text = stringResource(R.string.label_accent_color),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = animatedTextColor.copy(alpha = 0.7f)
                                )
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Box(
                                    Modifier
                                        .size(dpv(32.dp, 44.dp))
                                        .clip(CircleShape)
                                        .background(animatedPrimary)
                                )
                                Box(
                                    Modifier
                                        .size(dpv(32.dp, 44.dp))
                                        .clip(CircleShape)
                                        .background(animatedPrimaryContainer)
                                )
                                Box(
                                    Modifier
                                        .size(dpv(32.dp, 44.dp))
                                        .clip(CircleShape)
                                        .background(animatedSecondary)
                                )
                            }
                        }
                    }
                }
            }

            if (!dynamicColor) {
                Spacer(Modifier.height(28.dp))

                AnimatedVisibility(
                    visible = screenEntered,
                    enter = fadeIn(tween(300, delayMillis = 200)) +
                        slideInVertically(animationSpec = tween(300, delayMillis = 200)) { it / 4 },
                    label = "grid_label_enter"
                ) {
                    Text(
                        text = stringResource(R.string.label_theme_picker),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(Modifier.height(16.dp))

                LazyVerticalGrid(
                    columns = GridCells.Adaptive(dpv(72.dp, 100.dp)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = dpv(320.dp, 500.dp)),
                    horizontalArrangement = Arrangement.spacedBy(dpv(12.dp, 24.dp)),
                    verticalArrangement = Arrangement.spacedBy(dpv(12.dp, 24.dp)),
                    userScrollEnabled = false
                ) {
                    items(count = SeedPalettes.size, key = { it }) { index ->
                        ThemeSwatchItem(
                            index = index,
                            currentIndex = currentIndex,
                            springBounce = springBounce,
                            onSelect = onSelect
                        )
                    }
                }

                Spacer(Modifier.height(28.dp))
            }

            Spacer(Modifier.height(28.dp))
        }

        AnimatedVisibility(
            visible = screenEntered,
            enter = slideInVertically(animationSpec = tween(400, delayMillis = 350)) { it } +
                fadeIn(tween(300, delayMillis = 350)),
            label = "apply_button_enter"
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp)
            ) {
                Button(
                    onClick = onBack,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(dpv(56.dp, 64.dp)),
                    shape = fullRoundedShape()
                ) {
                    Text(
                        text = stringResource(R.string.action_apply),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}



@Composable
private fun ThemeSwatchItem(
    index: Int,
    currentIndex: Int,
    springBounce: SpringSpec<Float>,
    onSelect: (Int) -> Unit
) {
    val theme = SeedPalettes[index].scheme(dark = false)
    val isSelected = currentIndex == index

    val selectPulse = remember { Animatable(1f) }
    LaunchedEffect(isSelected) {
        if (isSelected) {
            selectPulse.snapTo(1f)
            selectPulse.animateTo(
                0.85f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium)
            )
            selectPulse.animateTo(
                1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium)
            )
        }
    }

    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val pressScale by animateFloatAsState(
        targetValue = if (isPressed) 0.85f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "press_scale"
    )

    var itemVisible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(250 + index * 60L)
        itemVisible = true
    }

    val entranceAlpha by animateFloatAsState(
        targetValue = if (itemVisible) 1f else 0f,
        animationSpec = springDefaultEffects(),
        label = "entrance_alpha"
    )
    val entranceScale by animateFloatAsState(
        targetValue = if (itemVisible) 1f else 0f,
        animationSpec = spring(
            dampingRatio = 1f,
            stiffness = Spring.StiffnessLow
        ),
        label = "entrance_scale"
    )
    val displayScale = entranceScale * pressScale * selectPulse.value
    val indicatorScale by animateFloatAsState(
        targetValue = if (isSelected) 1f else 0f,
        animationSpec = spring(
            dampingRatio = 0.8f,
            stiffness = Spring.StiffnessMedium
        ),
        label = "indicator_scale"
    )

    Box(
        modifier = Modifier
            .aspectRatio(1f)
            .graphicsLayer {
                alpha = entranceAlpha
                scaleX = displayScale
                scaleY = displayScale
            }
            .semantics {
                contentDescription = SeedPalettes[index].name
                role = Role.RadioButton
                selected = isSelected
            }
            .clickable(
                indication = null,
                interactionSource = interactionSource
            ) { onSelect(index) },
        contentAlignment = Alignment.Center
    ) {
        Box(modifier = Modifier.fillMaxSize().drawBehind {
            val s = size
            clipPath(Path().apply { addOval(Rect(Offset.Zero, s)) }) {
                clipRect(right = s.width / 2f) {
                    drawRect(color = theme.primary, size = s)
                }
                clipRect(left = s.width / 2f, bottom = s.height / 2f) {
                    drawRect(color = theme.secondary, size = s)
                }
                clipRect(left = s.width / 2f, top = s.height / 2f) {
                    drawRect(color = theme.primaryContainer, size = s)
                }
                if (indicatorScale > 0f) {
                    drawCircle(
                        color = Color.Black.copy(alpha = 0.4f * indicatorScale),
                        radius = s.minDimension / 2f * indicatorScale
                    )
                    val r = s.minDimension / 2f * 0.3f * indicatorScale
                    drawCircle(
                        color = Color.White,
                        radius = r
                    )
                }
            }
        })
    }
}
