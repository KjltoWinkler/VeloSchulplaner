package dev.wolly.dsbmaterial.data

import androidx.compose.runtime.Immutable
import com.google.gson.annotations.SerializedName

@Immutable
data class SubstitutionEntry(
    val day: String,
    val art: String,
    val className: String,
    val lesson: String,
    val subject: String,
    val room: String,
    val vertrVon: String = "",
    val nach: String = "",
    val text: String = "",
    val rawText: String = ""
)

data class PlanInfo(
    val title: String,
    val date: String,
    val url: String,
    val isHtml: Boolean = false
)

enum class UserRole {
    SCHUELER,
    LEHRER,
    ADMIN;

    companion object {
        fun fromString(value: String?): UserRole {
            return when (value?.lowercase()?.trim()) {
                "lehrer", "teacher" -> LEHRER
                "admin", "administrator" -> ADMIN
                else -> SCHUELER
            }
        }
    }
}

@Immutable
data class UserProfile(
    val username: String,
    val name: String = "",
    val role: String = "schueler",
    val assignedClass: String = ""
) {
    val userRole: UserRole get() = UserRole.fromString(role)
    val isStudent: Boolean get() = userRole == UserRole.SCHUELER
    val isTeacher: Boolean get() = userRole == UserRole.LEHRER
    val isAdmin: Boolean get() = userRole == UserRole.ADMIN
}

data class AuthResponse(
    val success: Boolean = false,
    val user: UserProfile? = null,
    val token: String? = null,
    val error: String? = null
)

data class SubstitutionsApiResponse(
    val updatedAt: Long = 0L,
    val entries: List<SubstitutionEntry> = emptyList()
)

object ClassCodeHelper {
    /**
     * Normalizes class abbreviations to format: [Number][a-z][H/R]
     * e.g., "9ar" -> "9aR", "8bh" -> "8bH", "10CR" -> "10cR"
     */
    fun normalize(input: String?): String {
        if (input.isNullOrBlank()) return ""
        val trimmed = input.trim()
        val regex = Regex("""^(\d+)([a-zA-Z])([a-zA-Z])$""")
        val match = regex.find(trimmed)
        if (match != null) {
            val (grade, section, type) = match.destructured
            val upperType = type.uppercase()
            if (upperType == "H" || upperType == "R") {
                return "$grade${section.lowercase()}$upperType"
            }
        }
        return trimmed
    }

    fun isValid(input: String?): Boolean {
        if (input.isNullOrBlank()) return false
        return Regex("""^\d+[a-z][HR]$""").matches(normalize(input))
    }
}
