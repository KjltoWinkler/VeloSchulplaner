package dev.wolly.dsbmaterial.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.Dp

@Composable
internal fun isExpandedScreen(): Boolean {
    val configuration = LocalConfiguration.current
    return remember(configuration) { configuration.screenWidthDp >= 600 }
}

@Composable
internal fun dpv(compact: Dp, expanded: Dp): Dp {
    val isExpanded = isExpandedScreen()
    return remember(isExpanded, compact, expanded) { if (isExpanded) expanded else compact }
}

