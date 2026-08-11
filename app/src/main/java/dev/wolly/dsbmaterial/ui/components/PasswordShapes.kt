@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)
package dev.wolly.dsbmaterial.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.animateTo
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.LoadingIndicatorDefaults
import androidx.compose.material3.MaterialShapes
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.toPath
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.center
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Matrix
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.wolly.dsbmaterial.ui.theme.springDefaultSpatial
import androidx.graphics.shapes.Morph
import androidx.graphics.shapes.RoundedPolygon
import kotlin.random.Random

/** The M3 loading-indicator polygon sequence used as password-hint shapes. */
internal val passwordHintShapes: List<RoundedPolygon> by lazy {
    LoadingIndicatorDefaults.IndeterminateIndicatorPolygons
}

/** A morph from the plain circle (revealed) to a seeded hint shape (hidden). */
internal fun passwordHintMorph(seed: Int): Morph {
    val shape = passwordHintShapes[Random(seed).nextInt(passwordHintShapes.size)]
    return Morph(MaterialShapes.Circle, shape)
}

/** A [Shape] that samples a [Morph] at [factor]: 0 → start shape, 1 → end shape. */
class PasswordMorphShape(
    private val morph: Morph,
    private val factor: Float
) : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline {
        val path = morph.toPath(progress = factor)
        val scaleMatrix = Matrix().apply { scale(size.width, size.height) }
        path.transform(scaleMatrix)
        path.translate(size.center - path.getBounds().center)
        return Outline.Generic(path)
    }
}

@Composable
internal fun PasswordChar(
    char: Char,
    index: Int,
    revealed: Boolean,
    modifier: Modifier = Modifier
) {
    val blobColor = MaterialTheme.colorScheme.onSurface
    val digitColor = MaterialTheme.colorScheme.onSurface
    val blobFactor by animateFloatAsState(
        targetValue = if (revealed) 0f else 1f,
        animationSpec = springDefaultSpatial(),
        label = "password_blob_factor"
    )
    val blobAlpha by animateFloatAsState(
        targetValue = if (revealed) 0f else 1f,
        animationSpec = tween(280),
        label = "password_blob_alpha"
    )
    val blobScale = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        blobScale.animateTo(
            targetValue = 1f,
            animationSpec = spring(dampingRatio = 0.5f, stiffness = 350f)
        )
    }
    val seed = remember(char, index) { (index + 1) * 131 + char.code }
    val morph = remember(seed) { passwordHintMorph(seed) }
    Box(
        modifier = modifier.size(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .size(16.dp)
                .graphicsLayer {
                    scaleX = blobScale.value
                    scaleY = blobScale.value
                }
                .clip(PasswordMorphShape(morph, blobFactor))
                .background(blobColor.copy(alpha = blobAlpha))
        )
        AnimatedVisibility(
            visible = revealed,
            enter = fadeIn(tween(200)) +
                scaleIn(initialScale = 0.4f, animationSpec = spring(dampingRatio = 0.6f, stiffness = 700f)),
            exit = fadeOut(tween(120))
        ) {
            Text(
                text = char.toString(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = digitColor
            )
        }
    }
}

@Composable
internal fun PasswordDisplays(
    password: String?,
    revealed: Boolean,
    modifier: Modifier = Modifier
) {
    val chars = remember(password) { password.orEmpty().toList() }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(40.dp)
            .horizontalScroll(rememberScrollState()),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        if (chars.isEmpty()) {
            Text(
                text = "—",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        } else {
            chars.forEachIndexed { index, char ->
                PasswordChar(char, index, revealed)
            }
        }
    }
}
