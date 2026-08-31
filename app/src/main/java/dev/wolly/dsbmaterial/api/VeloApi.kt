package dev.wolly.dsbmaterial.api

import android.util.Log
import com.google.gson.Gson
import dev.wolly.dsbmaterial.data.AuthResponse
import dev.wolly.dsbmaterial.data.ClassCodeHelper
import dev.wolly.dsbmaterial.data.SubstitutionEntry
import dev.wolly.dsbmaterial.data.SubstitutionsApiResponse
import dev.wolly.dsbmaterial.data.UserProfile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class VeloApi(
    private val baseUrl: String = "",
    private val authToken: String? = null
) {
    private val TAG = "VeloApi"
    private val gson = Gson()

    private val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
    }

    private fun resolveUrl(path: String): String {
        val base = if (baseUrl.isNotBlank()) baseUrl.trimEnd('/') else "http://localhost:3000"
        val cleanPath = if (path.startsWith("/")) path else "/$path"
        return "$base$cleanPath"
    }

    suspend fun login(username: String, password: String): AuthResponse = withContext(Dispatchers.IO) {
        try {
            val url = resolveUrl("/api/auth/login")
            val json = JSONObject().apply {
                put("username", username.trim())
                put("password", password.trim())
            }

            val request = Request.Builder()
                .url(url)
                .post(json.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: ""

            if (!response.isSuccessful) {
                val errorMsg = try {
                    JSONObject(body).optString("error", "Anmeldung fehlgeschlagen (${response.code})")
                } catch (_: Exception) {
                    "Anmeldung fehlgeschlagen (${response.code})"
                }
                return@withContext AuthResponse(success = false, error = errorMsg)
            }

            val authResponse = gson.fromJson(body, AuthResponse::class.java)
            if (authResponse.user != null) {
                // Ensure assignedClass is normalized
                val normalizedClass = ClassCodeHelper.normalize(authResponse.user.assignedClass)
                val user = authResponse.user.copy(assignedClass = normalizedClass)
                return@withContext authResponse.copy(user = user)
            }
            return@withContext authResponse
        } catch (e: Exception) {
            Log.e(TAG, "Login error connecting to $baseUrl", e)
            return@withContext AuthResponse(
                success = false,
                error = e.localizedMessage ?: "Verbindung zum Server fehlgeschlagen."
            )
        }
    }

    suspend fun getSubstitutions(classFilter: String = "", teacherFilter: String = ""): List<SubstitutionEntry> = withContext(Dispatchers.IO) {
        try {
            val normalizedClass = ClassCodeHelper.normalize(classFilter)
            val queryParams = mutableListOf<String>()
            if (normalizedClass.isNotEmpty()) {
                queryParams.add("class=${java.net.URLEncoder.encode(normalizedClass, "UTF-8")}")
            }
            if (teacherFilter.isNotEmpty()) {
                queryParams.add("teacher=${java.net.URLEncoder.encode(teacherFilter, "UTF-8")}")
            }

            val queryString = if (queryParams.isNotEmpty()) "?" + queryParams.joinToString("&") else ""
            val url = resolveUrl("/api/substitutions$queryString")

            val requestBuilder = Request.Builder()
                .url(url)
                .get()

            if (!authToken.isNullOrBlank()) {
                requestBuilder.header("Authorization", "Bearer $authToken")
            }

            val request = requestBuilder.build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext emptyList()

            val body = response.body?.string() ?: return@withContext emptyList()
            val parsed = gson.fromJson(body, SubstitutionsApiResponse::class.java)
            
            return@withContext parsed.entries.map { entry ->
                entry.copy(className = ClassCodeHelper.normalize(entry.className))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get substitutions", e)
            return@withContext emptyList()
        }
    }

    suspend fun getAvailableClasses(): List<String> = withContext(Dispatchers.IO) {
        try {
            val url = resolveUrl("/api/classes")
            val request = Request.Builder().url(url).get().build()
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext emptyList()

            val body = response.body?.string() ?: return@withContext emptyList()
            val type = object : com.google.gson.reflect.TypeToken<List<String>>() {}.type
            val classes: List<String> = gson.fromJson(body, type) ?: emptyList()
            return@withContext classes.map { ClassCodeHelper.normalize(it) }.distinct().sorted()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get classes", e)
            return@withContext emptyList()
        }
    }

    suspend fun getTimetable(classCode: String): Map<String, Map<String, dev.wolly.dsbmaterial.data.TimetableLesson>> = withContext(Dispatchers.IO) {
        try {
            val normalized = ClassCodeHelper.normalize(classCode)
            if (normalized.isEmpty()) return@withContext emptyMap()
            val url = resolveUrl("/api/timetables/${java.net.URLEncoder.encode(normalized, "UTF-8")}")
            val request = Request.Builder().url(url).get().build()
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext emptyMap()

            val body = response.body?.string() ?: return@withContext emptyMap()
            val type = object : com.google.gson.reflect.TypeToken<Map<String, Map<String, dev.wolly.dsbmaterial.data.TimetableLesson>>>() {}.type
            val schedule: Map<String, Map<String, dev.wolly.dsbmaterial.data.TimetableLesson>>? = gson.fromJson(body, type)
            return@withContext schedule ?: emptyMap()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get timetable for $classCode", e)
            return@withContext emptyMap()
        }
    }

    suspend fun getStudentDashboard(): dev.wolly.dsbmaterial.data.StudentDashboardResponse? = withContext(Dispatchers.IO) {
        if (authToken.isNullOrBlank()) return@withContext null
        try {
            val url = resolveUrl("/api/student/dashboard")
            val request = Request.Builder()
                .url(url)
                .header("Authorization", "Bearer $authToken")
                .get()
                .build()
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext null

            val body = response.body?.string() ?: return@withContext null
            return@withContext gson.fromJson(body, dev.wolly.dsbmaterial.data.StudentDashboardResponse::class.java)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get student dashboard", e)
            return@withContext null
        }
    }
}
