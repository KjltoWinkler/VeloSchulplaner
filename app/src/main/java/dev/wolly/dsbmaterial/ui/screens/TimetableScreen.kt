@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class, androidx.compose.material3.ExperimentalMaterial3Api::class)
package dev.wolly.dsbmaterial.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.EventBusy
import androidx.compose.material.icons.filled.MeetingRoom
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.wolly.dsbmaterial.data.SubstitutionEntry
import dev.wolly.dsbmaterial.data.TimetableLesson
import java.util.Calendar

@Composable
fun TimetableScreen(
    timetable: Map<String, Map<String, TimetableLesson>>,
    substitutions: List<SubstitutionEntry>,
    assignedClass: String?,
    isLoading: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier
) {
    val weekDays = listOf("Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag")

    val initialDay = remember {
        val cal = Calendar.getInstance()
        when (cal.get(Calendar.DAY_OF_WEEK)) {
            Calendar.MONDAY -> "Montag"
            Calendar.TUESDAY -> "Dienstag"
            Calendar.WEDNESDAY -> "Mittwoch"
            Calendar.THURSDAY -> "Donnerstag"
            Calendar.FRIDAY -> "Freitag"
            else -> "Montag"
        }
    }

    var selectedDay by remember { mutableStateOf(initialDay) }

    PullToRefreshBox(
        isRefreshing = isLoading,
        onRefresh = onRefresh,
        modifier = modifier.fillMaxSize()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp)
        ) {
            Spacer(Modifier.height(8.dp))

            // Day Selector Chips (Horizontal Scrollable)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                weekDays.forEach { day ->
                    val isSelected = day == selectedDay
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedDay = day },
                        label = {
                            Text(
                                text = day,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        shape = RoundedCornerShape(12.dp),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                            selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Timetable Grid for Selected Day
            val daySchedule = timetable[selectedDay] ?: emptyMap()
            val daySubstitutions = remember(substitutions, selectedDay) {
                substitutions.filter { sub ->
                    sub.day.contains(selectedDay, ignoreCase = true)
                }
            }

            if (daySchedule.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.CalendarMonth,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.outlineVariant
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            text = "Kein Stundenplan für $selectedDay hinterlegt",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = "Zieh nach unten, um zu aktualisieren",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 120.dp)
                ) {
                    // Show lessons 1 through 8
                    val periods = (1..8).map { it.toString() }
                    items(periods) { period ->
                        val lesson = daySchedule[period]
                        val sub = daySubstitutions.find { it.lesson.contains(period) }

                        TimetablePeriodCard(
                            period = period,
                            lesson = lesson,
                            substitution = sub
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TimetablePeriodCard(
    period: String,
    lesson: TimetableLesson?,
    substitution: SubstitutionEntry?,
    modifier: Modifier = Modifier
) {
    val isEntfall = substitution?.art?.equals("Entfall", ignoreCase = true) == true
    val hasSub = substitution != null && !isEntfall
    val isEmpty = lesson == null || lesson.subject.isBlank() || lesson.subject == "—"

    val containerColor = when {
        isEntfall -> MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.6f)
        hasSub -> MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.7f)
        isEmpty -> MaterialTheme.colorScheme.surfaceContainerLowest
        else -> MaterialTheme.colorScheme.surfaceContainerHigh
    }

    val contentColor = when {
        isEntfall -> MaterialTheme.colorScheme.onErrorContainer
        hasSub -> MaterialTheme.colorScheme.onTertiaryContainer
        isEmpty -> MaterialTheme.colorScheme.outline
        else -> MaterialTheme.colorScheme.onSurface
    }

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = containerColor,
        tonalElevation = if (isEmpty) 0.dp else 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Period Badge
            Surface(
                modifier = Modifier.size(44.dp),
                shape = RoundedCornerShape(12.dp),
                color = when {
                    isEntfall -> MaterialTheme.colorScheme.error
                    hasSub -> MaterialTheme.colorScheme.tertiary
                    isEmpty -> MaterialTheme.colorScheme.surfaceContainer
                    else -> MaterialTheme.colorScheme.primary
                }
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "$period.",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = when {
                            isEntfall -> MaterialTheme.colorScheme.onError
                            hasSub -> MaterialTheme.colorScheme.onTertiary
                            isEmpty -> MaterialTheme.colorScheme.outline
                            else -> MaterialTheme.colorScheme.onPrimary
                        }
                    )
                }
            }

            Spacer(Modifier.width(16.dp))

            // Main Lesson Details
            Column(
                modifier = Modifier.weight(1f)
            ) {
                if (isEmpty) {
                    Text(
                        text = "Freistunde",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.outline,
                        fontWeight = FontWeight.Medium
                    )
                } else {
                    val displaySubject = lesson?.subject ?: ""
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = displaySubject,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = contentColor,
                            textDecoration = if (isEntfall) TextDecoration.LineThrough else TextDecoration.None
                        )

                        // Substitution Badge
                        if (isEntfall) {
                            Badge(containerColor = MaterialTheme.colorScheme.error) {
                                Text("Entfall", color = MaterialTheme.colorScheme.onError)
                            }
                        } else if (hasSub) {
                            Badge(containerColor = MaterialTheme.colorScheme.tertiary) {
                                Text(substitution?.art ?: "Vertretung", color = MaterialTheme.colorScheme.onTertiary)
                            }
                        }
                    }

                    Spacer(Modifier.height(4.dp))

                    // Teacher and Room Details
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        val teacherText = when {
                            hasSub && !substitution?.nach.isNullOrBlank() -> "${lesson?.teacher} → ${substitution?.nach}"
                            hasSub && !substitution?.vertrVon.isNullOrBlank() -> substitution?.vertrVon ?: ""
                            else -> lesson?.teacher ?: ""
                        }

                        val roomText = when {
                            hasSub && !substitution?.room.isNullOrBlank() -> "${lesson?.room} → ${substitution?.room}"
                            else -> lesson?.room ?: ""
                        }

                        if (teacherText.isNotBlank()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.Person,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = contentColor.copy(alpha = 0.7f)
                                )
                                Spacer(Modifier.width(3.dp))
                                Text(
                                    text = teacherText,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = contentColor.copy(alpha = 0.8f)
                                )
                            }
                        }

                        if (roomText.isNotBlank()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.MeetingRoom,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = contentColor.copy(alpha = 0.7f)
                                )
                                Spacer(Modifier.width(3.dp))
                                Text(
                                    text = roomText,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = contentColor.copy(alpha = 0.8f)
                                )
                            }
                        }
                    }

                    // Notice Text if available
                    if (substitution != null && substitution.text.isNotBlank()) {
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = substitution.text,
                            style = MaterialTheme.typography.bodySmall,
                            color = contentColor.copy(alpha = 0.9f),
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}
