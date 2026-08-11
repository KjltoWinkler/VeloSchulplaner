package dev.wolly.dsbmaterial.ui.theme

import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import dev.wolly.dsbmaterial.R

/**
 * M3 Expressive (§5.2): the 30-style type scale — 15 baseline + 15 emphasized.
 * Baseline styles are thin (weight 400) for default content; emphasized styles are
 * thick (weight 700) for highlighted headers, hero numerals and selected states
 * (§5.3: the variable weight axis of Google Sans Flex renders the real weights).
 * Built into a real Material3 [Typography] so `MaterialTheme.typography.*Emphasized` works
 * directly, mirroring the M3e_Sample_App showcase.
 */

@OptIn(androidx.compose.ui.text.ExperimentalTextApi::class)
private fun fontFamily(
    useCustomFont: Boolean,
    rond: Float
): FontFamily {
    if (!useCustomFont) return FontFamily.Default
    return FontFamily(
        Font(
            resId = R.font.google_sans_flex,
            weight = FontWeight.ExtraBold,
            variationSettings = FontVariation.Settings(
                FontVariation.weight(800),
                FontVariation.Setting("ROND", rond)
            )
        ),
        Font(
            resId = R.font.google_sans_flex,
            weight = FontWeight.Medium,
            variationSettings = FontVariation.Settings(
                FontVariation.weight(500),
                FontVariation.Setting("ROND", rond)
            )
        )
    )
}

private fun style(
    family: FontFamily,
    fontWeight: FontWeight,
    size: Int,
    lineHeight: Int,
    letterSpacing: Float = 0f
) = TextStyle(
    fontFamily = family,
    fontWeight = fontWeight,
    fontSize = size.sp,
    lineHeight = lineHeight.sp,
    letterSpacing = letterSpacing.sp
)

/**
 * Builds the 30-style [Typography]. When [useCustomFont] is enabled the scale uses Google
 * Sans Flex at its natural proportions — like the share card, only the [rond] axis (plus
 * weight) is varied. Subtext (baseline styles) renders at weight 500; headers (emphasized
 * styles) at weight 800, a step heavier than the share card's headers.
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class, androidx.compose.ui.text.ExperimentalTextApi::class)
fun buildTypography(
    useCustomFont: Boolean,
    rond: Float
): Typography {
    val family = fontFamily(useCustomFont = useCustomFont, rond = rond)
    return Typography(
        displayLarge = style(family, FontWeight.Medium, 57, 64, -0.25f),
        displayMedium = style(family, FontWeight.Medium, 45, 52),
        displaySmall = style(family, FontWeight.Medium, 36, 44),
        headlineLarge = style(family, FontWeight.Medium, 32, 40),
        headlineMedium = style(family, FontWeight.Medium, 28, 36),
        headlineSmall = style(family, FontWeight.Medium, 24, 32),
        titleLarge = style(family, FontWeight.Medium, 22, 28),
        titleMedium = style(family, FontWeight.Medium, 16, 24, 0.15f),
        titleSmall = style(family, FontWeight.Medium, 14, 20, 0.1f),
        bodyLarge = style(family, FontWeight.Medium, 16, 24, 0.5f),
        bodyMedium = style(family, FontWeight.Medium, 14, 20, 0.25f),
        bodySmall = style(family, FontWeight.Medium, 12, 16, 0.4f),
        labelLarge = style(family, FontWeight.Medium, 14, 20, 0.1f),
        labelMedium = style(family, FontWeight.Medium, 12, 16, 0.5f),
        labelSmall = style(family, FontWeight.Medium, 11, 16, 0.5f),
        displayLargeEmphasized = style(family, FontWeight.ExtraBold, 57, 64, -0.25f),
        displayMediumEmphasized = style(family, FontWeight.ExtraBold, 45, 52),
        displaySmallEmphasized = style(family, FontWeight.ExtraBold, 36, 44),
        headlineLargeEmphasized = style(family, FontWeight.ExtraBold, 32, 40),
        headlineMediumEmphasized = style(family, FontWeight.ExtraBold, 28, 36),
        headlineSmallEmphasized = style(family, FontWeight.ExtraBold, 24, 32),
        titleLargeEmphasized = style(family, FontWeight.ExtraBold, 22, 28),
        titleMediumEmphasized = style(family, FontWeight.ExtraBold, 16, 24, 0.15f),
        titleSmallEmphasized = style(family, FontWeight.ExtraBold, 14, 20, 0.1f),
        bodyLargeEmphasized = style(family, FontWeight.ExtraBold, 16, 24, 0.5f),
        bodyMediumEmphasized = style(family, FontWeight.ExtraBold, 14, 20, 0.25f),
        bodySmallEmphasized = style(family, FontWeight.ExtraBold, 12, 16, 0.4f),
        labelLargeEmphasized = style(family, FontWeight.ExtraBold, 14, 20, 0.1f),
        labelMediumEmphasized = style(family, FontWeight.ExtraBold, 12, 16, 0.5f),
        labelSmallEmphasized = style(family, FontWeight.ExtraBold, 11, 16, 0.5f)
    )
}
