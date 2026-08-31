package dev.wolly.dsbmaterial.ui

import android.app.Application
import android.os.SystemClock
import android.util.Log
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.Stable
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.wolly.dsbmaterial.AutoFetchWorker
import dev.wolly.dsbmaterial.BuildConfig
import dev.wolly.dsbmaterial.DSBWidget
import dev.wolly.dsbmaterial.LocalWebServer
import dev.wolly.dsbmaterial.api.AppUpdate
import dev.wolly.dsbmaterial.api.DSBMobileAPI
import dev.wolly.dsbmaterial.api.UpdateChecker
import dev.wolly.dsbmaterial.api.VeloApi
import dev.wolly.dsbmaterial.data.ClassCodeHelper
import dev.wolly.dsbmaterial.data.DataStoreManager
import dev.wolly.dsbmaterial.data.SubstitutionEntry
import dev.wolly.dsbmaterial.data.TimetableLesson
import dev.wolly.dsbmaterial.data.UserProfile
import dev.wolly.dsbmaterial.data.UserRole
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import androidx.work.*
import java.util.Calendar
import java.util.concurrent.TimeUnit

@Stable
sealed class UiState {
    object Idle : UiState()
    object Loading : UiState()
    data class Success(val entries: List<SubstitutionEntry>) : UiState()
    data class Error(val message: String) : UiState()
    object NeedsLogin : UiState()
    data class SelectingClass(val classes: List<String>, val u: String, val p: String) : UiState()
}

enum class UpdateCheckStatus { Idle, Checking, UpToDate, Available, Error }

data class UpdateState(
    val status: UpdateCheckStatus = UpdateCheckStatus.Idle,
    val update: AppUpdate? = null
)

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val dataStoreManager = DataStoreManager(application)
    private val gson = Gson()
    
    private val _uiState = MutableStateFlow<UiState>(UiState.Idle)
    val uiState: StateFlow<UiState> = _uiState

    private val _selectedTab = MutableStateFlow(0)
    val selectedTab: StateFlow<Int> = _selectedTab

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing

    private val _lastUpdated = MutableStateFlow<Long?>(null)
    val lastUpdated: StateFlow<Long?> = _lastUpdated

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline

    val isRoomFirst: StateFlow<Boolean> = dataStoreManager.swapDataFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    val dynamicColor: StateFlow<Boolean> = dataStoreManager.dynamicColorFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    val sortByPeriod: StateFlow<Boolean> = dataStoreManager.sortPeriodFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    val themeIndex: StateFlow<Int> = dataStoreManager.themeIndexFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val navHidden: StateFlow<Boolean> = dataStoreManager.navHiddenFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    val useCustomFont: StateFlow<Boolean> = dataStoreManager.useCustomFontFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    val fontWeight: StateFlow<Float> = dataStoreManager.fontWeightFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 400f)

    val fontWidth: StateFlow<Float> = dataStoreManager.fontWidthFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 100f)

    val fontOpsz: StateFlow<Float> = dataStoreManager.fontOpszFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 14f)

    val fontSlnt: StateFlow<Float> = dataStoreManager.fontSlntFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0f)

    val fontGrad: StateFlow<Float> = dataStoreManager.fontGradFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0f)

    val fontRond: StateFlow<Float> = dataStoreManager.fontRondFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 100f)

    val username: StateFlow<String?> = dataStoreManager.usernameFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val password: StateFlow<String?> = dataStoreManager.passwordFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val userRole: StateFlow<String?> = dataStoreManager.userRoleFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "schueler")

    val userDisplayName: StateFlow<String?> = dataStoreManager.userDisplayNameFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val assignedClass: StateFlow<String?> = dataStoreManager.classNameFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    private val _archive = MutableStateFlow<List<SubstitutionEntry>>(emptyList())
    val archive: StateFlow<List<SubstitutionEntry>> = _archive

    private val _selectedClasses = MutableStateFlow<List<String>>(emptyList())
    val selectedClasses: StateFlow<List<String>> = _selectedClasses

    private val _timetable = MutableStateFlow<Map<String, Map<String, TimetableLesson>>>(emptyMap())
    val timetable: StateFlow<Map<String, Map<String, TimetableLesson>>> = _timetable

    private val _isTimetableLoading = MutableStateFlow(false)
    val isTimetableLoading: StateFlow<Boolean> = _isTimetableLoading

    val autoFetchEnabled: StateFlow<Boolean> = dataStoreManager.autoFetchEnabledFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val autoFetchInterval: StateFlow<Int> = dataStoreManager.autoFetchIntervalFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 30)

    val notificationsEnabled: StateFlow<Boolean> = dataStoreManager.notificationsEnabledFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    private val _customServerUrl = MutableStateFlow<String?>(null)
    val customServerUrl: StateFlow<String?> = _customServerUrl

    private val _webServerEnabled = MutableStateFlow(false)
    val webServerEnabled: StateFlow<Boolean> = _webServerEnabled

    private val _webServerUrls = MutableStateFlow<List<String>>(emptyList())
    val webServerUrls: StateFlow<List<String>> = _webServerUrls

    private val _selectedCalendarDay = MutableStateFlow<String?>(null)
    val selectedCalendarDay: StateFlow<String?> = _selectedCalendarDay

    private val _updateState = MutableStateFlow(UpdateState())
    val updateState: StateFlow<UpdateState> = _updateState

    private var lastSuccessEntries: List<SubstitutionEntry> = emptyList()
    private var isDemoMode = false
    private var appOpenTime = 0L
    private val minLoadingDurationMs = 1800L

    private suspend fun ensureLoadingFeel() {
        val elapsed = SystemClock.elapsedRealtime() - appOpenTime
        val remaining = minLoadingDurationMs - elapsed
        if (remaining > 0) delay(remaining)
    }

    init {
        appOpenTime = SystemClock.elapsedRealtime()
        viewModelScope.launch {
            _customServerUrl.value = dataStoreManager.customServerUrlFlow.first()
        }
        viewModelScope.launch {
            val enabled = dataStoreManager.webServerEnabledFlow.first()
            _webServerEnabled.value = enabled
            if (enabled && LocalWebServer.start(getApplication())) {
                _webServerUrls.value = LocalWebServer.urls.value
            }
        }
        viewModelScope.launch {
            LocalWebServer.urls.collect { _webServerUrls.value = it }
        }
        checkCredentialsAndFetch()
        loadArchive()
        loadSelectedClasses()
        loadCachedSnapshot()
        scheduleAutoFetchOnStartup()
        checkForUpdates()
    }

    fun checkForUpdates() {
        if (_updateState.value.status == UpdateCheckStatus.Checking) return
        viewModelScope.launch {
            _updateState.value = UpdateState(status = UpdateCheckStatus.Checking)
            val latest = UpdateChecker.checkLatest()
            _updateState.value = if (latest == null) {
                UpdateState(status = UpdateCheckStatus.Error)
            } else if (UpdateChecker.isUpdateAvailable(latest.version)) {
                UpdateState(status = UpdateCheckStatus.Available, update = latest)
            } else {
                UpdateState(status = UpdateCheckStatus.UpToDate, update = latest)
            }
        }
    }

    private fun loadCachedSnapshot() {
        viewModelScope.launch {
            val timestamp = dataStoreManager.lastUpdatedFlow.first()
            if (timestamp > 0L) {
                _lastUpdated.value = timestamp
            }
            val cached = loadCachedEntries()
            if (cached != null && (_uiState.value == UiState.Idle || _uiState.value is UiState.Loading)) {
                ensureLoadingFeel()
                if (_uiState.value is UiState.Loading) {
                    lastSuccessEntries = cached
                    _uiState.value = UiState.Success(sortEntries(cached))
                }
            }
            val cachedTimetable = loadCachedTimetable()
            if (cachedTimetable != null && cachedTimetable.isNotEmpty()) {
                _timetable.value = cachedTimetable
            }
        }
    }

    private suspend fun loadCachedEntries(): List<SubstitutionEntry>? {
        val json = dataStoreManager.cachedEntriesFlow.first() ?: return null
        if (json.isNullOrEmpty()) return null
        val type = object : TypeToken<List<SubstitutionEntry>>() {}.type
        val entries: List<SubstitutionEntry> = gson.fromJson(json, type)
        return entries.takeIf { it.isNotEmpty() }
    }

    private suspend fun loadCachedTimetable(): Map<String, Map<String, TimetableLesson>>? {
        val json = dataStoreManager.cachedTimetableFlow.first() ?: return null
        if (json.isNullOrEmpty()) return null
        return try {
            val type = object : TypeToken<Map<String, Map<String, TimetableLesson>>>() {}.type
            gson.fromJson(json, type)
        } catch (_: Exception) {
            null
        }
    }

    private suspend fun saveCache(entries: List<SubstitutionEntry>) {
        if (entries.isEmpty()) return
        dataStoreManager.saveCachedEntries(gson.toJson(entries))
        val now = System.currentTimeMillis()
        dataStoreManager.saveLastUpdated(now)
        _lastUpdated.value = now
        _isOffline.value = false
    }

    private suspend fun saveTimetableCache(schedule: Map<String, Map<String, TimetableLesson>>) {
        if (schedule.isEmpty()) return
        dataStoreManager.saveCachedTimetable(gson.toJson(schedule))
    }

    private fun loadArchive() {
        viewModelScope.launch {
            dataStoreManager.archiveFlow.collect { json ->
                if (!json.isNullOrEmpty()) {
                    val type = object : TypeToken<List<SubstitutionEntry>>() {}.type
                    val entries: List<SubstitutionEntry> = gson.fromJson(json, type)
                    val sorted = sortArchive(entries)
                    _archive.value = sorted
                    LocalWebServer.setEntries(sorted, _lastUpdated.value ?: 0L)
                }
            }
        }
    }

    private fun loadSelectedClasses() {
        viewModelScope.launch {
            dataStoreManager.selectedClassesFlow.collect { json ->
                if (!json.isNullOrEmpty()) {
                    _selectedClasses.value = json.split(",").map { ClassCodeHelper.normalize(it) }.filter { it.isNotEmpty() }
                }
            }
        }
    }

    private fun scheduleAutoFetchOnStartup() {
        viewModelScope.launch {
            val enabled = dataStoreManager.autoFetchEnabledFlow.first()
            val interval = dataStoreManager.autoFetchIntervalFlow.first()
            scheduleAutoFetch(enabled, interval)
        }
    }

    private fun parseDaySortKey(day: String): Long {
        val dateRegex = Regex("""(\d{2})\.(\d{2})\.(\d{4})""")
        val match = dateRegex.find(day)
        if (match != null) {
            val (d, m, y) = match.destructured
            return y.toLong() * 10000 + m.toLong() * 100 + d.toLong()
        }
        val dayNames = listOf(
            "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
            "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag"
        )
        val index = dayNames.indexOfFirst { day.lowercase().startsWith(it) }
        if (index >= 0) return (index % 7).toLong() + 1
        return Long.MAX_VALUE
    }

    private fun sortArchive(entries: List<SubstitutionEntry>): List<SubstitutionEntry> {
        return entries.sortedWith(
            compareBy<SubstitutionEntry> { parseDaySortKey(it.day) }
                .thenBy { it.lesson.filter { c -> c.isDigit() }.toIntOrNull() ?: 999 }
        )
    }

    fun archiveSubstitutions(entries: List<SubstitutionEntry>? = null) {
        val toArchive = entries ?: lastSuccessEntries
        if (toArchive.isNotEmpty()) {
            viewModelScope.launch {
                val newArchive = (toArchive + _archive.value).distinctBy { 
                    it.day + it.lesson + it.subject + it.room + it.art + it.text 
                }
                val sortedArchive = sortArchive(newArchive)
                _archive.value = sortedArchive
                dataStoreManager.saveArchive(gson.toJson(sortedArchive))
                updateWidget()
            }
        }
    }

    fun removeFromArchive(entry: SubstitutionEntry) {
        viewModelScope.launch {
            val newArchive = _archive.value.filter { it != entry }
            _archive.value = newArchive
            dataStoreManager.saveArchive(gson.toJson(newArchive))
            updateWidget()
        }
    }

    fun removeFromArchive(entries: List<SubstitutionEntry>) {
        viewModelScope.launch {
            val newArchive = _archive.value.filter { it !in entries }
            _archive.value = newArchive
            dataStoreManager.saveArchive(gson.toJson(newArchive))
            updateWidget()
        }
    }

    fun clearArchive() {
        viewModelScope.launch {
            _archive.value = emptyList()
            dataStoreManager.saveArchive("")
            updateWidget()
        }
    }

    fun setTab(index: Int) {
        _selectedTab.value = index
    }

    private fun updateWidget() {
        viewModelScope.launch {
            try {
                val manager = androidx.glance.appwidget.GlanceAppWidgetManager(getApplication())
                val glanceIds = manager.getGlanceIds(DSBWidget::class.java)
                glanceIds.forEach { glanceId ->
                    DSBWidget().update(getApplication(), glanceId)
                }
            } catch (_: Exception) {}
        }
    }

    fun setThemeIndex(index: Int) {
        viewModelScope.launch {
            dataStoreManager.saveThemeIndex(index)
            LocalWebServer.setSettings(isRoomFirst.value, sortByPeriod.value, index, dynamicColor.value)
            updateWidget()
        }
    }

    fun toggleColumnOrder() {
        viewModelScope.launch {
            dataStoreManager.saveSwapPreference(!isRoomFirst.value)
            LocalWebServer.setSettings(!isRoomFirst.value, sortByPeriod.value, themeIndex.value, dynamicColor.value)
            updateWidget()
        }
    }

    fun toggleDynamicColor() {
        viewModelScope.launch {
            dataStoreManager.saveDynamicColorPreference(!dynamicColor.value)
            LocalWebServer.setSettings(isRoomFirst.value, sortByPeriod.value, themeIndex.value, !dynamicColor.value)
            updateWidget()
        }
    }

    fun toggleNavHidden() {
        viewModelScope.launch {
            dataStoreManager.saveNavHiddenPreference(!navHidden.value)
        }
    }

    fun toggleCustomFont() {
        viewModelScope.launch {
            dataStoreManager.saveCustomFont(!useCustomFont.value)
        }
    }

    fun setFontWeight(value: Float) {
        viewModelScope.launch { dataStoreManager.saveFontWeight(value) }
    }

    fun setFontWidth(value: Float) {
        viewModelScope.launch { dataStoreManager.saveFontWidth(value) }
    }

    fun setFontOpsz(value: Float) {
        viewModelScope.launch { dataStoreManager.saveFontOpsz(value) }
    }

    fun setFontSlnt(value: Float) {
        viewModelScope.launch { dataStoreManager.saveFontSlnt(value) }
    }

    fun setFontGrad(value: Float) {
        viewModelScope.launch { dataStoreManager.saveFontGrad(value) }
    }

    fun setFontRond(value: Float) {
        viewModelScope.launch { dataStoreManager.saveFontRond(value) }
    }

    fun toggleAutoFetch() {
        viewModelScope.launch {
            val newValue = !autoFetchEnabled.value
            dataStoreManager.saveAutoFetchEnabled(newValue)
            scheduleAutoFetch(newValue, autoFetchInterval.value)
        }
    }

    fun setAutoFetchInterval(minutes: Int) {
        viewModelScope.launch {
            dataStoreManager.saveAutoFetchInterval(minutes)
            if (autoFetchEnabled.value) {
                scheduleAutoFetch(true, minutes)
            }
        }
    }

    fun toggleNotifications() {
        viewModelScope.launch {
            dataStoreManager.saveNotificationsEnabled(!notificationsEnabled.value)
        }
    }

    fun setNotificationsEnabled(enabled: Boolean) {
        viewModelScope.launch {
            dataStoreManager.saveNotificationsEnabled(enabled)
        }
    }

    private fun scheduleAutoFetch(enabled: Boolean, intervalMinutes: Int) {
        val workManager = WorkManager.getInstance(getApplication())
        workManager.cancelUniqueWork(AutoFetchWorker.WORK_NAME)
        if (enabled) {
            val request = PeriodicWorkRequestBuilder<AutoFetchWorker>(
                intervalMinutes.toLong(), TimeUnit.MINUTES
            )
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 5, TimeUnit.MINUTES)
                .build()
            workManager.enqueueUniquePeriodicWork(
                AutoFetchWorker.WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request
            )
        }
    }

    fun selectCalendarDay(day: String?) {
        _selectedCalendarDay.value = day
    }

    fun getArchiveDays(): List<String> {
        return _archive.value.groupBy { it.day }.keys.sortedBy { parseDaySortKey(it) }
    }

    fun getArchiveEntriesForDay(day: String): List<SubstitutionEntry> {
        return _archive.value.filter { it.day == day }
    }

    fun getArchiveDates(): List<Pair<String, Int>> {
        return _archive.value
            .groupBy { it.day }
            .map { (day, entries) -> day to entries.size }
            .sortedBy { parseDaySortKey(it.first) }
    }

    fun toggleSortByPeriod() {
        viewModelScope.launch {
            dataStoreManager.saveSortPreference(!sortByPeriod.value)
            LocalWebServer.setSettings(isRoomFirst.value, !sortByPeriod.value, themeIndex.value, dynamicColor.value)
            if (_uiState.value is UiState.Success) {
                _uiState.value = UiState.Success(sortEntries(lastSuccessEntries))
            }
        }
    }

    fun toggleWebServer() {
        viewModelScope.launch {
            val newValue = !_webServerEnabled.value
            val started = if (newValue) LocalWebServer.start(getApplication()) else {
                LocalWebServer.stop()
                true
            }
            _webServerEnabled.value = newValue && started
            _webServerUrls.value = LocalWebServer.urls.value
            dataStoreManager.saveWebServerEnabled(_webServerEnabled.value)
        }
    }

    fun addSelectedClass(className: String) {
        if (className.isBlank()) return
        val normalized = ClassCodeHelper.normalize(className)
        if (_selectedClasses.value.contains(normalized)) return
        viewModelScope.launch {
            val updated = _selectedClasses.value + normalized
            _selectedClasses.value = updated
            dataStoreManager.saveSelectedClasses(updated)
            fetchData()
        }
    }

    fun removeSelectedClass(className: String) {
        val normalized = ClassCodeHelper.normalize(className)
        viewModelScope.launch {
            val updated = _selectedClasses.value.filter { it != normalized && it != className }
            _selectedClasses.value = updated
            dataStoreManager.saveSelectedClasses(updated)
            fetchData()
        }
    }

    fun openSettings() {
        _selectedTab.value = 3
    }

    fun closeSettings() {
        _selectedTab.value = 0
        if (lastSuccessEntries.isNotEmpty()) {
            _uiState.value = UiState.Success(sortEntries(lastSuccessEntries))
        } else {
            checkCredentialsAndFetch()
        }
    }

    fun changeClass() {
        viewModelScope.launch {
            val u = dataStoreManager.usernameFlow.first() ?: ""
            val p = dataStoreManager.passwordFlow.first() ?: ""
            if (u.isNotEmpty() && p.isNotEmpty()) {
                fetchClasses(u, p)
            } else {
                _uiState.value = UiState.NeedsLogin
            }
        }
    }

    fun cancelClassSelection() {
        viewModelScope.launch {
            val className = dataStoreManager.classNameFlow.first() ?: ""
            if (className.isEmpty()) {
                _uiState.value = UiState.NeedsLogin
            } else {
                openSettings()
            }
        }
    }

    fun checkCredentialsAndFetch() {
        if (isDemoMode) {
            loginDemo()
            return
        }
        viewModelScope.launch {
            val username = dataStoreManager.usernameFlow.first()
            val password = dataStoreManager.passwordFlow.first()
            val className = dataStoreManager.classNameFlow.first() ?: ""

            if (username.isNullOrEmpty() || password.isNullOrEmpty()) {
                _uiState.value = UiState.NeedsLogin
            } else {
                fetchData(username, password, className)
            }
        }
    }

    fun login(username: String, password: String) {
        isDemoMode = false
        _uiState.value = UiState.Loading
        viewModelScope.launch {
            val base = resolveBaseUrl()
            val veloApi = VeloApi(base)
            val auth = veloApi.login(username, password)
            
            if (auth.success && auth.user != null) {
                val user = auth.user
                if (user.isAdmin) {
                    ensureLoadingFeel()
                    _uiState.value = UiState.Error("Administrator-Accounts melden sich bitte über das Web-Portal an.")
                    return@launch
                }
                // Successful login via Velo.Schulplaner API
                dataStoreManager.saveUserSession(user, password, auth.token)
                ensureLoadingFeel()
                fetchData(username, password, user.assignedClass)
            } else {
                // If not a Velo server or error, attempt DSB fallback or show error
                if (base.contains("dsbmobile") || base.isEmpty()) {
                    fetchClasses(username, password)
                } else {
                    ensureLoadingFeel()
                    _uiState.value = UiState.Error(auth.error ?: "Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.")
                }
            }
        }
    }

    fun loginDemo() {
        isDemoMode = true
        _uiState.value = UiState.Loading
        viewModelScope.launch {
            delay(1000)
            val demoEntries = listOf(
                SubstitutionEntry("Montag", "Vertretung", "9aR", "1 - 2", "Mathematik", "R102", "MÜL", "SCH", "Aufgaben Buch S. 42", ""),
                SubstitutionEntry("Montag", "Entfall", "9aR", "5", "Physik", "---", "BEC", "", "Hitzefrei", ""),
                SubstitutionEntry("Dienstag", "Raumänderung", "9aR", "3 - 4", "Englisch", "Turnhalle", "", "", "Wasserschaden in R105", ""),
                SubstitutionEntry("Mittwoch", "Vertretung", "9aR", "4 - 5", "Geschichte", "R203", "KLE", "BAU", "", "")
            )
            lastSuccessEntries = demoEntries
            _uiState.value = UiState.Success(sortEntries(demoEntries))
            archiveSubstitutions(demoEntries)
        }
    }

    private suspend fun fetchClasses(u: String, p: String) {
        _uiState.value = UiState.Loading
        try {
            val base = resolveBaseUrl()
            val veloApi = VeloApi(base)
            var classes = veloApi.getAvailableClasses()
            if (classes.isEmpty()) {
                val dsbApi = DSBMobileAPI(u, p, base)
                classes = dsbApi.getAvailableClasses()
            }
            ensureLoadingFeel()
            if (classes.isEmpty()) {
                _uiState.value = UiState.Error("Keine Klassen gefunden. Bitte Zugangsdaten prüfen.")
            } else {
                _uiState.value = UiState.SelectingClass(classes, u, p)
            }
        } catch (e: Exception) {
            ensureLoadingFeel()
            _uiState.value = UiState.Error(e.message ?: "Anmeldung fehlgeschlagen")
        }
    }

    fun selectClass(username: String, password: String, className: String) {
        val normalized = ClassCodeHelper.normalize(className)
        viewModelScope.launch {
            dataStoreManager.saveCredentials(username, password, normalized)
            fetchData(username, password, normalized)
        }
    }

    fun selectAllClasses(username: String, password: String) {
        viewModelScope.launch {
            dataStoreManager.saveCredentials(username, password, "")
            fetchData(username, password, "")
        }
    }
    
    fun setCustomServerUrl(url: String) {
        _customServerUrl.value = url.ifBlank { null }
        viewModelScope.launch {
            dataStoreManager.saveCustomServerUrl(url)
        }
    }

    private suspend fun resolveBaseUrl(): String {
        var url = _customServerUrl.value
        if (url == null) {
            url = dataStoreManager.customServerUrlFlow.first()
            _customServerUrl.value = url
        }
        return if (url.isNullOrBlank()) "" else url.trimEnd('/')
    }

    fun logout() {
        viewModelScope.launch {
            dataStoreManager.clearCredentials()
            dataStoreManager.saveCachedEntries("")
            dataStoreManager.saveCachedTimetable("")
            dataStoreManager.saveLastUpdated(0L)
            _lastUpdated.value = null
            _isOffline.value = false
            _timetable.value = emptyMap()
            lastSuccessEntries = emptyList()
            _uiState.value = UiState.NeedsLogin
            _selectedTab.value = 0
            _selectedClasses.value = emptyList()
        }
    }

    fun fetchData() {
        viewModelScope.launch {
            val username = dataStoreManager.usernameFlow.first() ?: return@launch
            val password = dataStoreManager.passwordFlow.first() ?: return@launch
            val className = dataStoreManager.classNameFlow.first() ?: ""
            if (username.isEmpty() || password.isEmpty()) return@launch

            _isRefreshing.value = true
            try {
                val base = resolveBaseUrl()
                val token = dataStoreManager.authTokenFlow.first()
                val veloApi = VeloApi(base, token)
                var rawEntries = veloApi.getSubstitutions(classFilter = className)

                if (rawEntries.isEmpty() && (base.contains("dsbmobile") || base.isEmpty())) {
                    val dsbApi = DSBMobileAPI(username, password, base)
                    rawEntries = dsbApi.getSubstitutions("")
                }

                val allClassNames = mutableSetOf<String>()
                if (className.isNotEmpty()) allClassNames.add(ClassCodeHelper.normalize(className))
                allClassNames.addAll(_selectedClasses.value.map { ClassCodeHelper.normalize(it) })

                val filtered = if (allClassNames.isEmpty()) {
                    rawEntries
                } else {
                    rawEntries.filter { entry ->
                        val entryNorm = ClassCodeHelper.normalize(entry.className)
                        allClassNames.any { cls -> 
                            entryNorm.equals(cls, ignoreCase = true) || entry.className.equals(cls, ignoreCase = true)
                        }
                    }
                }

                val deduped = filtered.distinctBy { it.day + it.lesson + it.subject + it.room + it.art + it.text }
                lastSuccessEntries = deduped
                _uiState.value = UiState.Success(sortEntries(deduped))
                saveCache(deduped)
                archiveSubstitutions(deduped)

                // Sync timetable for current student class
                if (className.isNotEmpty()) {
                    try {
                        val schedule = veloApi.getTimetable(className)
                        if (schedule.isNotEmpty()) {
                            _timetable.value = schedule
                            saveTimetableCache(schedule)
                        }
                    } catch (e: Exception) {
                        Log.e("MainViewModel", "Failed to sync timetable in fetchData", e)
                    }
                }
            } catch (e: Exception) {
                fallBackToCache(e.message ?: "Unbekannter Fehler")
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    private suspend fun fetchData(u: String, p: String, c: String) {
        if (_uiState.value !is UiState.Success) _uiState.value = UiState.Loading
        _isRefreshing.value = true
        try {
            val base = resolveBaseUrl()
            val token = dataStoreManager.authTokenFlow.first()
            val veloApi = VeloApi(base, token)
            val normalizedClass = ClassCodeHelper.normalize(c)
            var rawEntries = veloApi.getSubstitutions(classFilter = normalizedClass)

            if (rawEntries.isEmpty() && (base.contains("dsbmobile") || base.isEmpty())) {
                val dsbApi = DSBMobileAPI(u, p, base)
                rawEntries = dsbApi.getSubstitutions("")
            }

            val allClassNames = mutableSetOf<String>()
            if (normalizedClass.isNotEmpty()) allClassNames.add(normalizedClass)
            allClassNames.addAll(_selectedClasses.value.map { ClassCodeHelper.normalize(it) })

            val filtered = if (allClassNames.isEmpty()) {
                rawEntries
            } else {
                rawEntries.filter { entry ->
                    val entryNorm = ClassCodeHelper.normalize(entry.className)
                    allClassNames.any { cls -> 
                        entryNorm.equals(cls, ignoreCase = true) || entry.className.equals(cls, ignoreCase = true)
                    }
                }
            }

            val deduped = filtered.distinctBy { it.day + it.lesson + it.subject + it.room + it.art + it.text }
            saveCache(deduped)
            archiveSubstitutions(deduped)

            // Sync timetable for current student class
            if (normalizedClass.isNotEmpty()) {
                try {
                    val schedule = veloApi.getTimetable(normalizedClass)
                    if (schedule.isNotEmpty()) {
                        _timetable.value = schedule
                        saveTimetableCache(schedule)
                    }
                } catch (e: Exception) {
                    Log.e("MainViewModel", "Failed to sync timetable in private fetchData", e)
                }
            }

            ensureLoadingFeel()
            lastSuccessEntries = deduped
            _uiState.value = UiState.Success(sortEntries(deduped))
        } catch (e: Exception) {
            ensureLoadingFeel()
            fallBackToCache(e.message ?: "Unbekannter Fehler")
        } finally {
            _isRefreshing.value = false
        }
    }

    fun loadTimetableForClass(classCode: String) {
        viewModelScope.launch {
            _isTimetableLoading.value = true
            try {
                val base = resolveBaseUrl()
                val token = dataStoreManager.authTokenFlow.first()
                val veloApi = VeloApi(base, token)
                val schedule = veloApi.getTimetable(classCode)
                if (schedule.isNotEmpty()) {
                    _timetable.value = schedule
                    saveTimetableCache(schedule)
                }
            } catch (e: Exception) {
                Log.e("MainViewModel", "Failed to load timetable for $classCode", e)
            } finally {
                _isTimetableLoading.value = false
            }
        }
    }

    private suspend fun fallBackToCache(message: String) {
        val cached = loadCachedEntries()
        if (cached != null) {
            _isOffline.value = true
            lastSuccessEntries = cached
            _uiState.value = UiState.Success(sortEntries(cached))
        } else {
            _isOffline.value = false
            _uiState.value = UiState.Error(message)
        }
    }

    private fun sortEntries(entries: List<SubstitutionEntry>): List<SubstitutionEntry> {
        val byDay = compareBy<SubstitutionEntry> { parseDaySortKey(it.day) }
        if (!sortByPeriod.value) return entries.sortedWith(byDay)
        return entries.sortedWith(
            byDay.thenBy { it.lesson.filter { c -> c.isDigit() }.toIntOrNull() ?: 999 }
        )
    }

    override fun onCleared() {
        LocalWebServer.stop()
        super.onCleared()
    }
}
