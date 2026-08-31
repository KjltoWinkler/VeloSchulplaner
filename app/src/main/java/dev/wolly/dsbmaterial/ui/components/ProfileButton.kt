@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)
package dev.wolly.dsbmaterial.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.wolly.dsbmaterial.R

@Composable
fun ProfileButton(
    username: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val primary = MaterialTheme.colorScheme.primary
    val secondary = MaterialTheme.colorScheme.secondary
    val gradient = remember(primary, secondary) { listOf(primary, secondary) }
    val iconColor = MaterialTheme.colorScheme.onPrimary
    Box(
        modifier = modifier
            .size(38.dp)
            .clip(CircleShape)
            .background(Brush.linearGradient(gradient))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            Icons.Filled.Person,
            contentDescription = stringResource(R.string.label_profile),
            tint = iconColor,
            modifier = Modifier.size(22.dp)
        )
    }
}

@Composable
fun ProfilePopover(
    username: String?,
    password: String?,
    userRole: String? = null,
    assignedClass: String? = null,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    var passwordRevealed by remember { mutableStateOf(false) }
    val roleLabel = when (userRole?.lowercase()?.trim()) {
        "lehrer", "teacher" -> stringResource(R.string.label_role_teacher)
        "admin" -> stringResource(R.string.label_role_admin)
        else -> stringResource(R.string.label_role_student)
    }

    Surface(
        modifier = modifier.shadow(12.dp, RoundedCornerShape(24.dp)),
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        contentColor = MaterialTheme.colorScheme.onSurface
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .widthIn(min = 220.dp, max = 340.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                val primary = MaterialTheme.colorScheme.primary
                val secondary = MaterialTheme.colorScheme.secondary
                val gradient = remember(primary, secondary) { listOf(primary, secondary) }
                val iconColor = MaterialTheme.colorScheme.onPrimary
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(Brush.linearGradient(gradient)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Filled.Person,
                        contentDescription = null,
                        tint = iconColor,
                        modifier = Modifier.size(26.dp)
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = username.orEmpty().ifEmpty { "—" },
                        style = MaterialTheme.typography.titleMediumEmphasized,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    val detail = if (!assignedClass.isNullOrBlank()) {
                        "$roleLabel • Klasse $assignedClass"
                    } else {
                        roleLabel
                    }
                    Text(
                        text = detail,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(Modifier.height(14.dp))
            HorizontalDivider()
            Spacer(Modifier.height(12.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = stringResource(R.string.label_password),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.weight(1f))
                IconButton(
                    onClick = { passwordRevealed = !passwordRevealed },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = if (passwordRevealed) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                        contentDescription = stringResource(
                            if (passwordRevealed) R.string.action_hide_password else R.string.action_show_password
                        ),
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
            Spacer(Modifier.height(6.dp))

            PasswordDisplays(password, passwordRevealed)
        }
    }
}
