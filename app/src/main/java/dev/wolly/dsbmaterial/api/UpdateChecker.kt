package dev.wolly.dsbmaterial.api

import android.util.Log
import dev.wolly.dsbmaterial.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject

data class AppUpdate(
    val version: String,
    val name: String,
    val publishedAt: String,
    val downloadUrl: String
)

object UpdateChecker {
    private const val TAG = "UpdateChecker"
    private const val RELEASES_LATEST_URL = "https://api.github.com/repos/wollydev24/astra/releases/latest"

    fun isUpdateAvailable(latest: String): Boolean {
        val current = parseVersion(BuildConfig.VERSION_NAME)
        val candidate = parseVersion(latest)
        val length = maxOf(current.size, candidate.size)
        for (i in 0 until length) {
            val c = current.getOrNull(i) ?: 0
            val l = candidate.getOrNull(i) ?: 0
            if (l > c) return true
            if (l < c) return false
        }
        return false
    }

    private fun parseVersion(version: String): List<Int> =
        version.trim()
            .removePrefix("v")
            .removePrefix("V")
            .split(".", "-", "+")
            .mapNotNull { it.toIntOrNull() }

    suspend fun checkLatest(): AppUpdate? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(RELEASES_LATEST_URL)
                .header("Accept", "application/vnd.github+json")
                .header("User-Agent", "Velo.Schulplaner")
                .build()
            val response = DSBNetwork.client.newCall(request).execute()
            if (!response.isSuccessful) {
                Log.w(TAG, "GitHub API responded ${response.code}")
                return@withContext null
            }
            val body = response.body?.string() ?: return@withContext null
            val json = JSONObject(body)
            val version = json.optString("tag_name", "").removePrefix("v")
            val assets = json.optJSONArray("assets") ?: JSONArray()
            var downloadUrl = ""
            for (i in 0 until assets.length()) {
                val asset = assets.getJSONObject(i)
                if (asset.optString("name", "").endsWith(".apk", ignoreCase = true)) {
                    downloadUrl = asset.optString("browser_download_url", "")
                    break
                }
            }
            if (downloadUrl.isEmpty()) downloadUrl = json.optString("html_url", "")
            AppUpdate(
                version = version,
                name = json.optString("name", version),
                publishedAt = json.optString("published_at", ""),
                downloadUrl = downloadUrl
            )
        } catch (e: Exception) {
            Log.e(TAG, "Update check failed", e)
            null
        }
    }
}
