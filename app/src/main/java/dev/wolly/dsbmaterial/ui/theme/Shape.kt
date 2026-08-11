package dev.wolly.dsbmaterial.ui.theme

import androidx.compose.foundation.shape.CornerBasedShape
import androidx.compose.foundation.shape.CornerSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/**
 * M3 Expressive (§4.1) corner-radius scale. Fully rounded corners use a `full` token
 * instead of "50% of component size".
 */
private val CornerExtraSmall = RoundedCornerShape(4.dp)
private val CornerSmall = RoundedCornerShape(8.dp)
private val CornerMedium = RoundedCornerShape(12.dp)
private val CornerLarge = RoundedCornerShape(16.dp)
private val CornerExtraLarge = RoundedCornerShape(28.dp)
private val CornerExtraLargeIncreased = RoundedCornerShape(32.dp)
private val CornerExtraExtraLarge = RoundedCornerShape(48.dp)

/**
 * M3E component → shape mapping (§4.2): snackbars/text fields [extraSmall], chips [small],
 * cards [medium], FAB/nav drawer [large], dialogs/bottom sheets [extraLarge].
 */
val Shapes = Shapes(
    extraSmall = CornerExtraSmall,
    small = CornerSmall,
    medium = CornerMedium,
    large = CornerLarge,
    extraLarge = CornerExtraLarge
)

/**
 * Additional emphasized container shapes for hero moments (§4.3): larger radii reserved for
 * primary/hero elements while background containers keep the subtle [Shapes] scale.
 */
object ExpressiveShapes {
    val extraLargeIncreased: CornerBasedShape = CornerExtraLargeIncreased
    val extraExtraLarge: CornerBasedShape = CornerExtraExtraLarge
}

/**
 * M3 Expressive defines fully-rounded (pill) corners with a `full` token rather than
 * "50% of the component" — this keeps pill shapes consistent at any size.
 */
const val FullCornerPercent: Int = 50

/** A fully-rounded, pill-like shape defined by the `full` corner token. */
fun fullRoundedShape(): CornerBasedShape =
    RoundedCornerShape(
        topStart = CornerSize(FullCornerPercent),
        topEnd = CornerSize(FullCornerPercent),
        bottomStart = CornerSize(FullCornerPercent),
        bottomEnd = CornerSize(FullCornerPercent),
    )
