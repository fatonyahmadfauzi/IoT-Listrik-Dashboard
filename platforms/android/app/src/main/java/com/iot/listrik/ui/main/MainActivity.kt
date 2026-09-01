package com.iot.listrik.ui.main

import android.animation.ArgbEvaluator
import android.animation.ValueAnimator
import android.app.DatePickerDialog
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.text.TextUtils
import android.util.Log
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.GravityCompat
import androidx.recyclerview.widget.LinearLayoutManager
import android.widget.Toast
import com.github.mikephil.charting.charts.BarChart
import com.github.mikephil.charting.charts.LineChart
import com.github.mikephil.charting.charts.PieChart
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.components.YAxis
import com.github.mikephil.charting.components.Legend
import com.github.mikephil.charting.components.MarkerView
import com.github.mikephil.charting.data.BarData
import com.github.mikephil.charting.data.BarDataSet
import com.github.mikephil.charting.data.BarEntry
import com.github.mikephil.charting.data.Entry
import com.github.mikephil.charting.data.LineData
import com.github.mikephil.charting.data.LineDataSet
import com.github.mikephil.charting.data.PieData
import com.github.mikephil.charting.data.PieDataSet
import com.github.mikephil.charting.data.PieEntry
import com.github.mikephil.charting.formatter.ValueFormatter
import com.github.mikephil.charting.highlight.Highlight
import com.github.mikephil.charting.utils.MPPointF
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.*
import com.google.firebase.messaging.FirebaseMessaging
import com.iot.listrik.R
import com.iot.listrik.data.model.HistoryLog
import com.iot.listrik.databinding.ActivityMainBinding
import com.iot.listrik.databinding.PageAnalyticsBinding
import com.iot.listrik.databinding.PageHistoryBinding
import com.iot.listrik.databinding.ViewSidebarDrawerBinding
import com.iot.listrik.ui.auth.LoginActivity
import com.iot.listrik.service.AlarmForegroundService
import java.io.OutputStreamWriter
import java.text.SimpleDateFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseDatabase.getInstance()

    private var chartTimeIndex = 0f
    private val maxDataPoints = 30
    private val chartLabels = mutableMapOf<Float, String>()

    private lateinit var historyAdapter: HistoryAdapter
    private lateinit var historyPageAdapter: HistoryAdapter
    private lateinit var historyPageBinding: PageHistoryBinding
    private lateinit var analyticsPageBinding: PageAnalyticsBinding
    private lateinit var drawerBinding: ViewSidebarDrawerBinding
    private val historyList = mutableListOf<HistoryLog>()
    private val allLogsList = mutableListOf<HistoryLog>()
    private var historyVisibleLogs: List<HistoryLog> = emptyList()
    private var analyticsVisibleLogs: List<HistoryLog> = emptyList()
    private val historyChartLabels = mutableMapOf<Float, String>()
    private val analyticsChartLabels = mutableMapOf<Float, String>()
    private val analyticsSnapshotLabels = mutableListOf<String>()
    private val analyticsSnapshotRawValues = mutableListOf<String>()

    private enum class AppPage { DASHBOARD, HISTORY, ANALYTICS }
    private enum class LogRange { ALL, TODAY, LAST_7_DAYS, LAST_30_DAYS, CUSTOM_DATE }
    private var currentPage = AppPage.DASHBOARD
    private var historyRange = LogRange.ALL
    private var analyticsRange = LogRange.ALL
    private var historySelectedDate: LocalDate? = null
    private var analyticsSelectedDate: LocalDate? = null
    private var historyStatusFilter = "ALL"
    private var latestRealtimeLog: HistoryLog? = null
    private var pendingCsvLogs: List<HistoryLog> = emptyList()

    private val dashboardLogLimit = 15
    private val historyLogLimit = 100
    private val historyChartLimit = 50
    private val analyticsTrendLimit = 60

    private var currentStatusColor = Color.parseColor("#2eea72")
    private var lastStatus = ""
    private var lastDeviceStatus = "NORMAL"
    private var lastRelayState: Int? = null
    private var pendingRelayValue: Int? = null
    private var dangerPulseAnimator: ValueAnimator? = null

    // Keep listener references so we can detach them and avoid duplicate callbacks.
    private var connectedRef: DatabaseReference? = null
    private var connectedListener: ValueEventListener? = null
    private var dashboardRef: DatabaseReference? = null
    private var dashboardListener: ValueEventListener? = null

    private var historyQuery: Query? = null
    private var historyChildListener: ChildEventListener? = null
    private val historyByKey = mutableMapOf<String, HistoryLog>()
    private var listenersAttached = false

    private var isAdmin = false
    private var isTempAccount = false
    private var pathPrefix = ""
    private var sessionTimer: android.os.CountDownTimer? = null
    // Selaras dengan indikator dashboard web: heartbeat dianggap stale setelah 30 detik.
    private val deviceStaleMs = 30000L
    private val uiHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val presenceCheckRunnable = object : Runnable {
        override fun run() {
            refreshPresenceUi()
            uiHandler.postDelayed(this, 3000)
        }
    }
    // Debounce renderHistory so rapid onChildAdded bursts (initial load) collapse into one render.
    private val renderHistoryRunnable = Runnable { doRenderHistory() }
    private var firebaseConnected = true
    private var lastDeviceHeartbeatAt = 0L
    private var lastDeviceUpdatedAt = 0L
    private var lastUpdatedMarker: Long? = null
    private var lastSensorSignature = ""
    private var lastResetMarker: String? = null
    private var watchStartedAt = System.currentTimeMillis()
    private val sessionPrefs by lazy { getSharedPreferences("iot_listrik_session", MODE_PRIVATE) }
    private val notificationPrefs by lazy { getSharedPreferences("iot_listrik_notifications", MODE_PRIVATE) }
    private val exportCsvLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument("text/csv")
    ) { uri ->
        if (uri != null) writeHistoryCsv(uri, pendingCsvLogs)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            binding = ActivityMainBinding.inflate(layoutInflater)
            setContentView(binding.root)
            historyPageBinding = PageHistoryBinding.bind(findViewById(R.id.historyPage))
            analyticsPageBinding = PageAnalyticsBinding.bind(findViewById(R.id.analyticsPage))
            drawerBinding = ViewSidebarDrawerBinding.bind(findViewById(R.id.sidebarDrawer))

            // Request POST_NOTIFICATIONS for Android 13+
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) !=
                    android.content.pm.PackageManager.PERMISSION_GRANTED
                ) {
                    requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 101)
                }
            }

            setupSidebar()

            binding.btnRelayOn.setOnClickListener { setRelay(1) }
            binding.btnRelayOff.setOnClickListener { setRelay(0) }
            binding.btnTestNotification.setOnClickListener { sendTestNotification() }
            binding.btnResetChartZoom.setOnClickListener { resetChartZoom() }
            binding.btnLogSummary.setOnClickListener {
                selectLogMode(HistoryAdapter.DisplayMode.SUMMARY)
            }
            binding.btnLogDetail.setOnClickListener {
                selectLogMode(HistoryAdapter.DisplayMode.DETAIL)
            }

            setupChart()
            setupRecyclerView()
            setupHistoryPage()
            setupAnalyticsPage()
            selectLogMode(HistoryAdapter.DisplayMode.SUMMARY)
            showPage(AppPage.DASHBOARD, closeDrawer = false)

            // Default: sembunyikan kontrol write sampai role diketahui.
            binding.relaySection.visibility = View.GONE
        } catch (e: Exception) {
            Log.e("MainActivity", "onCreate failed", e)
            Toast.makeText(this, "Initialization error: ${e.message}", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    private fun setupSidebar() {
        binding.btnMenu.setOnClickListener {
            binding.drawerLayout.openDrawer(GravityCompat.START)
        }
        drawerBinding.btnDrawerDashboard.setOnClickListener { showPage(AppPage.DASHBOARD) }
        drawerBinding.btnDrawerHistory.setOnClickListener { showPage(AppPage.HISTORY) }
        drawerBinding.btnDrawerAnalytics.setOnClickListener { showPage(AppPage.ANALYTICS) }
        drawerBinding.btnDrawerLogout.setOnClickListener { performLogout() }
    }

    private fun showPage(page: AppPage, closeDrawer: Boolean = true) {
        currentPage = page
        binding.dashboardPage.visibility = if (page == AppPage.DASHBOARD) View.VISIBLE else View.GONE
        historyPageBinding.root.visibility = if (page == AppPage.HISTORY) View.VISIBLE else View.GONE
        analyticsPageBinding.root.visibility = if (page == AppPage.ANALYTICS) View.VISIBLE else View.GONE

        binding.tvPageTitle.text = when (page) {
            AppPage.DASHBOARD -> "Dashboard Monitoring"
            AppPage.HISTORY -> "Riwayat Log"
            AppPage.ANALYTICS -> "Analytics Overview"
        }
        drawerBinding.btnDrawerDashboard.isSelected = page == AppPage.DASHBOARD
        drawerBinding.btnDrawerHistory.isSelected = page == AppPage.HISTORY
        drawerBinding.btnDrawerAnalytics.isSelected = page == AppPage.ANALYTICS

        when (page) {
            AppPage.HISTORY -> applyHistoryFilters()
            AppPage.ANALYTICS -> applyAnalyticsFilters()
            AppPage.DASHBOARD -> Unit
        }
        if (closeDrawer) binding.drawerLayout.closeDrawer(GravityCompat.START)
    }

    private fun performLogout() {
        // Stop alarm supaya tidak lanjut bunyi setelah logout.
        AlarmForegroundService.stop(this)
        clearNotificationTopics()
        auth.signOut()
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }

    private fun updateDrawerAccount() {
        val email = auth.currentUser?.email?.trim().orEmpty().ifBlank {
            if (isTempAccount) "Akun demo" else "Pengguna IoT"
        }
        drawerBinding.tvDrawerEmail.text = email
        drawerBinding.tvDrawerAvatar.text = email.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
        drawerBinding.tvDrawerRole.text = when {
            isTempAccount -> "Demo"
            isAdmin -> "Admin"
            else -> "User"
        }
    }

    @Deprecated("Use OnBackPressedDispatcher in a future migration")
    override fun onBackPressed() {
        if (binding.drawerLayout.isDrawerOpen(GravityCompat.START)) {
            binding.drawerLayout.closeDrawer(GravityCompat.START)
        } else if (currentPage != AppPage.DASHBOARD) {
            showPage(AppPage.DASHBOARD, closeDrawer = false)
        } else {
            super.onBackPressed()
        }
    }

    override fun onStart() {
        super.onStart()
        initializeSession()
        uiHandler.removeCallbacks(presenceCheckRunnable)
        uiHandler.post(presenceCheckRunnable)
    }

    override fun onStop() {
        super.onStop()
        if (listenersAttached) {
            detachListeners()
            listenersAttached = false
        }
        sessionTimer?.cancel()
        uiHandler.removeCallbacks(presenceCheckRunnable)
        uiHandler.removeCallbacks(renderHistoryRunnable)
    }

    private fun detachListeners() {
        connectedListener?.let { connectedRef?.removeEventListener(it) }
        connectedRef = null
        connectedListener = null

        dashboardListener?.let { dashboardRef?.removeEventListener(it) }
        dashboardRef = null
        dashboardListener = null

        historyChildListener?.let { historyQuery?.removeEventListener(it) }
        historyQuery = null
        historyChildListener = null
        historyByKey.clear()
    }

    private fun handleSessionExpired() {
        Toast.makeText(this, "Sesi demo berakhir (15 menit).", Toast.LENGTH_LONG).show()
        // Stop alarm supaya tidak lanjut bunyi setelah logout
        AlarmForegroundService.stop(this)
        clearNotificationTopics()
        auth.signOut()
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }

    private fun startSessionTimer(timeRemaining: Long) {
        sessionTimer?.cancel()
        sessionTimer = object : android.os.CountDownTimer(timeRemaining, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                val seconds = (millisUntilFinished / 1000) % 60
                val minutes = (millisUntilFinished / (1000 * 60)) % 60
                binding.tvTempTimer.text = String.format("%02d:%02d", minutes, seconds)
            }
            override fun onFinish() {
                binding.tvTempTimer.text = "00:00"
                handleSessionExpired()
            }
        }.start()
    }

    private fun initializeSession() {
        val user = auth.currentUser
        if (user == null) {
            handleSessionExpired()
            return
        }

        user.getIdToken(true).addOnSuccessListener { result ->
            val isTemp = (result.claims["isTempAccount"] as? Boolean == true) ||
                user.email?.trim()?.startsWith("sim_", ignoreCase = true) == true
            val expiresAt = (result.claims["expiresAt"] as? Number)?.toLong()

            isTempAccount = isTemp
            pathPrefix = if (isTemp) "sim/${user.uid}/" else ""
            historyAdapter.setDefaultSource(if (isTemp) "SIM" else "CLOUD")
            historyPageAdapter.setDefaultSource(if (isTemp) "SIM" else "CLOUD")
            syncNotificationTopics(user.uid, isTemp)

            if (isTemp && expiresAt != null) {
                val timeRemaining = expiresAt - System.currentTimeMillis()
                if (timeRemaining <= 0) {
                    handleSessionExpired()
                    return@addOnSuccessListener
                } else {
                    startSessionTimer(timeRemaining)
                }
            }

            fetchRoleAndApplyUi(user.uid)
            attachListeners()
        }.addOnFailureListener {
            pathPrefix = ""
            historyAdapter.setDefaultSource("CLOUD")
            historyPageAdapter.setDefaultSource("CLOUD")
            syncNotificationTopics(user.uid, false)
            fetchRoleAndApplyUi(user.uid)
            attachListeners()
        }
    }

    private fun syncNotificationTopics(uid: String, isTemp: Boolean) {
        try {
            val messaging = FirebaseMessaging.getInstance()
            val previousTopic = sessionPrefs.getString("fcm_topic", null)
            val nextTopic = if (isTemp) "iot_sim_$uid" else "iot_alarms"

            if (!previousTopic.isNullOrBlank() && previousTopic != nextTopic) {
                messaging.unsubscribeFromTopic(previousTopic)
            }

            if (previousTopic != nextTopic) {
                messaging.subscribeToTopic(nextTopic)
            }

            if (!isTemp) {
                sessionPrefs.edit()
                    .putBoolean("session_is_temp", false)
                    .putString("session_uid", uid)
                    .putString("fcm_topic", nextTopic)
                    .apply()
            } else {
                sessionPrefs.edit()
                    .putBoolean("session_is_temp", true)
                    .putString("session_uid", uid)
                    .putString("fcm_topic", nextTopic)
                    .apply()
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "FCM topic sync failed", e)
        }
    }

    private fun clearNotificationTopics() {
        try {
            val previousTopic = sessionPrefs.getString("fcm_topic", null)
            if (!previousTopic.isNullOrBlank()) {
                FirebaseMessaging.getInstance().unsubscribeFromTopic(previousTopic)
            }
        } catch (e: Exception) {
            Log.w("MainActivity", "FCM topic unsubscribe failed", e)
        } finally {
            sessionPrefs.edit()
                .remove("session_is_temp")
                .remove("session_uid")
                .remove("fcm_topic")
                .apply()
        }
    }

    private fun attachListeners() {
        if (!listenersAttached) {
            startConnectionListener()
            startDashboardListener()
            startHistoryListener()
            listenersAttached = true
        }
    }

    private fun fetchRoleAndApplyUi(uid: String) {
        if (isTempAccount) {
            isAdmin = false
            applyRoleUi()
            return
        }

        val roleRef = db.getReference("users").child(uid).child("role")
        roleRef.addListenerForSingleValueEvent(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val role = snapshot.getValue(String::class.java) ?: "user"
                isAdmin = role == "admin"
                applyRoleUi()
            }

            override fun onCancelled(error: DatabaseError) {
                isAdmin = false
                applyRoleUi()
            }
        })
    }

    private fun applyRoleUi() {
        if (isTempAccount) {
            binding.tempBadgeContainer.visibility = View.VISIBLE
        } else {
            binding.tempBadgeContainer.visibility = View.GONE
        }

        binding.relaySection.visibility = if (isAdmin) View.VISIBLE else View.GONE

        updateDrawerAccount()
        updateRelayControls()
    }

    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    private fun buildAdminInfoEventId(resetAt: String, resetNote: String): String {
        val isMonitoringWipe = resetNote.contains("Semua data monitoring", ignoreCase = true) ||
            resetNote.contains("histori log", ignoreCase = true)
        val prefix = if (isMonitoringWipe) "monitoring-wipe" else "admin-reset"
        return "$prefix:$resetAt"
    }

    private fun hasHandledInfoEvent(eventId: String): Boolean {
        if (eventId.isBlank()) return false
        return notificationPrefs.getString("last_info_event_id", "") == eventId
    }

    private fun rememberHandledInfoEvent(eventId: String) {
        if (eventId.isBlank()) return
        notificationPrefs.edit().putString("last_info_event_id", eventId).apply()
    }

    private fun notifyAdminReset(resetAt: String, resetNote: String) {
        if (lastResetMarker == null) {
            lastResetMarker = resetAt
            return
        }
        if (lastResetMarker == resetAt) return

        lastResetMarker = resetAt
        val message = resetNote.ifBlank {
            "Admin mengosongkan data realtime sensor perangkat IoT."
        }
        val eventId = buildAdminInfoEventId(resetAt, resetNote)
        showToast(message)
        if (!hasHandledInfoEvent(eventId)) {
            val title = if (eventId.startsWith("monitoring-wipe:")) {
                "Semua data monitoring dikosongkan"
            } else {
                "Data realtime dikosongkan"
            }
            triggerInfoNotification(title, message)
            rememberHandledInfoEvent(eventId)
        }
    }

    private fun isLikelyEpochMs(value: Long): Boolean = value > 1_000_000_000_000L

    private fun buildSensorSignature(
        status: String,
        arus: Double,
        tegangan: Double,
        apparent: Double,
        energi: Double,
        frekuensi: Double,
        pf: Double
    ): String {
        return listOf(
            String.format("%.3f", arus),
            String.format("%.1f", tegangan),
            String.format("%.1f", apparent),
            String.format("%.4f", energi),
            String.format("%.2f", frekuensi),
            String.format("%.3f", pf),
            status
        ).joinToString("|")
    }

    private fun registerDeviceHeartbeat(
        updatedAt: Long,
        status: String,
        arus: Double,
        tegangan: Double,
        apparent: Double,
        energi: Double,
        frekuensi: Double,
        pf: Double
    ) {
        val sensorSignature = buildSensorSignature(status, arus, tegangan, apparent, energi, frekuensi, pf)
        var heartbeatDetected = false

        if (updatedAt > 0L) {
            if (lastUpdatedMarker == null) {
                if (isLikelyEpochMs(updatedAt) && System.currentTimeMillis() - updatedAt <= deviceStaleMs) {
                    heartbeatDetected = true
                }
            } else if (updatedAt != lastUpdatedMarker) {
                heartbeatDetected = true
            }
            lastUpdatedMarker = updatedAt
        } else if (lastSensorSignature.isNotEmpty() && lastSensorSignature != sensorSignature) {
            heartbeatDetected = true
        }

        lastSensorSignature = sensorSignature

        if (heartbeatDetected) {
            lastDeviceHeartbeatAt = System.currentTimeMillis()
        }
    }

    private fun currentConnectionLabel(now: Long = System.currentTimeMillis()): String {
        if (!firebaseConnected) return "Memulihkan..."
        if (lastDeviceHeartbeatAt == 0L) {
            return if (now - watchStartedAt > deviceStaleMs) "Device Offline" else "Memeriksa perangkat..."
        }
        return if (now - lastDeviceHeartbeatAt > deviceStaleMs) "Device Offline" else "Connected"
    }

    private fun relayBlockedReason(): String {
        return when (currentConnectionLabel()) {
            "Device Offline" -> "Perangkat offline. Relay fisik tidak menerima perintah."
            "Memeriksa perangkat..." -> "Sistem masih menunggu heartbeat perangkat."
            "Memulihkan..." -> "Koneksi cloud sedang dipulihkan."
            else -> "Perangkat belum siap menerima perintah."
        }
    }

    private fun updateRelayControls() {
        val canControl = isAdmin && !isTempAccount && currentConnectionLabel() == "Connected"
        val relayIsOn = lastRelayState == 1
        val relayIsOff = lastRelayState == 0
        val commandPending = pendingRelayValue != null

        // Sama seperti dashboard web: tombol untuk state yang sudah aktif dinonaktifkan,
        // sementara kedua tombol terkunci saat koneksi belum siap atau perintah sedang dikirim.
        val canTurnOn = canControl && !commandPending && !relayIsOn
        val canTurnOff = canControl && !commandPending && !relayIsOff
        binding.btnRelayOn.isEnabled = canTurnOn
        binding.btnRelayOff.isEnabled = canTurnOff
        binding.btnRelayOn.alpha = if (canTurnOn) 1f else 0.55f
        binding.btnRelayOff.alpha = if (canTurnOff) 1f else 0.55f

        binding.tvRelayControlHint.text = when {
            commandPending -> "Mengirim perintah relay dan menunggu konfirmasi perangkat."
            !canControl -> relayBlockedReason()
            lastDeviceStatus == "WARNING" || lastDeviceStatus == "DANGER" ->
                "Kondisi $lastDeviceStatus — relay dikunci OFF. Perbaiki kondisi lebih dulu, lalu nyalakan kembali."
            relayIsOff -> "Relay dimatikan. Tekan Nyalakan Relay untuk mengaktifkan kembali beban."
            relayIsOn -> "Perangkat terhubung. Auto-cutoff aktif saat kondisi listrik tidak aman."
            else -> "Menunggu status relay dari perangkat."
        }
    }

    private fun renderRelayState(state: Int?) {
        lastRelayState = state
        if (state != null && state == pendingRelayValue) pendingRelayValue = null

        val color = when (state) {
            1 -> Color.parseColor("#2eea72")
            0 -> Color.parseColor("#ef4444")
            else -> Color.parseColor("#94a3b8")
        }
        binding.tvRelayState.text = when (state) {
            1 -> "ON"
            0 -> "OFF"
            else -> "—"
        }
        binding.relayIndicator.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(color)
        }
        updateRelayControls()
    }

    private fun parseRelayState(value: Any?): Int? {
        val raw = value?.toString()?.trim()?.uppercase(Locale.ROOT).orEmpty()
        return when {
            value == true || raw == "1" || raw == "ON" -> 1
            value == false || raw == "0" || raw == "OFF" -> 0
            else -> null
        }
    }

    private fun refreshPresenceUi() {
        val label = currentConnectionLabel()
        val color = when (label) {
            "Connected" -> Color.parseColor("#2eea72")
            "Memeriksa perangkat..." -> Color.parseColor("#fee58a")
            "Memulihkan..." -> Color.parseColor("#fee58a")
            else -> Color.parseColor("#ef4444")
        }

        val isOnline = label == "Connected"
        if (!isOnline) {
            // Snapshot DANGER lama tidak boleh membuat sirene terus berbunyi
            // setelah perangkat offline atau koneksi cloud terputus.
            AlarmForegroundService.stop(this)
        }
        binding.tvEndpointBadge.text = if (isTempAccount) "SIM" else "CLOUD"
        binding.tvConnectionState.text = if (isOnline) "Device Online" else label
        binding.tvConnectionState.setTextColor(color)
        binding.tvHeartbeatText.text = if (isOnline) "Heartbeat aktif" else "Tanpa heartbeat"
        binding.tvHeartbeatText.setTextColor(
            if (isOnline) Color.parseColor("#2eea72") else Color.parseColor("#a8b3c7")
        )
        val updatedTime = lastDeviceUpdatedAt.takeIf(::isLikelyEpochMs)?.let {
            SimpleDateFormat("HH:mm:ss", Locale("id", "ID")).format(Date(it))
        }
        binding.tvLastUpdated.text = updatedTime?.let { "Update terakhir: $it" } ?: "Update terakhir: -"
        updateRelayControls()
    }

    private fun setupChart() {
        configureChart(binding.lineChart, "Belum ada data realtime.")
        configureChart(binding.detailLineChart, "Belum ada metrik pendukung.")
        configureChart(binding.electricalLineChart, "Belum ada metrik pendukung.")
    }

    private fun configureChart(
        chart: LineChart,
        noDataText: String,
        labels: Map<Float, String> = chartLabels,
        showBuiltInLegend: Boolean = true
    ) {
        chart.description.isEnabled = false
        chart.setDrawGridBackground(false)
        chart.setDrawBorders(false)
        chart.setTouchEnabled(true)
        chart.isDragEnabled = true
        chart.setScaleEnabled(true)
        chart.setPinchZoom(true)
        chart.isHighlightPerTapEnabled = true
        chart.isHighlightPerDragEnabled = true
        chart.setDrawMarkers(true)
        chart.legend.apply {
            isEnabled = showBuiltInLegend
            textColor = Color.parseColor("#cbd5e1")
            textSize = 10f
            form = Legend.LegendForm.CIRCLE
            formSize = 7f
            xEntrySpace = 12f
            yEntrySpace = 4f
            verticalAlignment = Legend.LegendVerticalAlignment.TOP
            horizontalAlignment = Legend.LegendHorizontalAlignment.CENTER
            orientation = Legend.LegendOrientation.HORIZONTAL
            setDrawInside(false)
        }
        chart.marker = DashboardChartMarkerView(chart.context, labels, chart)

        chart.setNoDataText(noDataText)
        chart.setNoDataTextColor(Color.parseColor("#9ca3af"))

        val xAxis = chart.xAxis
        xAxis.position = XAxis.XAxisPosition.BOTTOM
        xAxis.textColor = Color.parseColor("#94a3b8")
        xAxis.setDrawGridLines(true)
        xAxis.gridColor = Color.parseColor("#12FFFFFF")
        xAxis.setAvoidFirstLastClipping(true)
        xAxis.granularity = 1f
        xAxis.labelCount = 5
        xAxis.valueFormatter = object : ValueFormatter() {
            override fun getFormattedValue(value: Float): String = labels[value] ?: ""
        }

        val yAxis = chart.axisLeft
        yAxis.textColor = Color.parseColor("#cbd5e1")
        yAxis.setDrawGridLines(true)
        yAxis.gridColor = Color.parseColor("#33FFFFFF")
        yAxis.axisMinimum = 0f
        yAxis.setDrawAxisLine(true)
        yAxis.axisLineColor = Color.parseColor("#3DFFFFFF")

        chart.axisRight.isEnabled = true
        chart.axisRight.textColor = Color.parseColor("#cbd5e1")
        chart.axisRight.setDrawGridLines(false)
        chart.axisRight.axisMinimum = 0f
        chart.axisRight.setDrawAxisLine(true)
        chart.axisRight.axisLineColor = Color.parseColor("#3DFFFFFF")

        chart.invalidate()
    }

    private fun renderChartIndicators(container: LinearLayout, specs: List<ChartSetSpec>) {
        container.removeAllViews()
        specs.forEachIndexed { index, spec ->
            val item = LinearLayout(this).apply {
                gravity = android.view.Gravity.CENTER_VERTICAL
                orientation = LinearLayout.HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(
                    0,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                ).apply {
                    if (index > 0) marginStart = dp(6)
                }
            }
            val dot = View(this).apply {
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(spec.color)
                }
                layoutParams = LinearLayout.LayoutParams(dp(8), dp(8))
            }
            val label = TextView(this).apply {
                text = spec.label
                setTextColor(Color.parseColor("#94a3b8"))
                textSize = 10f
                maxLines = 1
                ellipsize = TextUtils.TruncateAt.END
                layoutParams = LinearLayout.LayoutParams(
                    0,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                ).apply { marginStart = dp(5) }
            }
            item.addView(dot)
            item.addView(label)
            container.addView(item)
        }
    }

    private class DashboardChartMarkerView(
        context: android.content.Context,
        private val labels: Map<Float, String>,
        private val chart: LineChart
    ) : MarkerView(context, R.layout.view_chart_marker) {
        private val titleView: TextView = findViewById(R.id.tvChartMarkerTitle)
        private val valueView: TextView = findViewById(R.id.tvChartMarkerValue)

        override fun refreshContent(e: Entry?, highlight: Highlight?) {
            val entry = e ?: return
            val series = chart.data
                ?.getDataSetByIndex(highlight?.dataSetIndex ?: 0)
                ?.label
                .orEmpty()
            titleView.text = labels[entry.x] ?: "Data riwayat"
            valueView.text = "$series · ${formatValue(series, entry.y)}"
            super.refreshContent(e, highlight)
        }

        override fun getOffset(): MPPointF = MPPointF(
            -(width / 2f),
            -height.toFloat() - 10f
        )

        private fun formatValue(series: String, value: Float): String = when {
            series.contains("Energi", ignoreCase = true) -> String.format(Locale.US, "%.3f kWh", value)
            series.contains("Power Factor", ignoreCase = true) -> String.format(Locale.US, "%.2f", value)
            series.contains("Frekuensi", ignoreCase = true) -> String.format(Locale.US, "%.1f Hz", value)
            series.contains("Apparent", ignoreCase = true) -> String.format(Locale.US, "%.0f VA", value)
            series.contains("Tegangan", ignoreCase = true) -> String.format(Locale.US, "%.1f V", value)
            series.contains("Daya", ignoreCase = true) -> String.format(Locale.US, "%.0f W", value)
            series.contains("Arus", ignoreCase = true) -> String.format(Locale.US, "%.2f A", value)
            else -> String.format(Locale.US, "%.2f", value)
        }
    }

    private class SnapshotChartMarkerView(
        context: android.content.Context,
        private val labels: List<String>,
        private val rawValues: List<String>
    ) : MarkerView(context, R.layout.view_chart_marker) {
        private val titleView: TextView = findViewById(R.id.tvChartMarkerTitle)
        private val valueView: TextView = findViewById(R.id.tvChartMarkerValue)

        override fun refreshContent(e: Entry?, highlight: Highlight?) {
            val entry = e ?: return
            val index = entry.x.toInt()
            titleView.text = labels.getOrNull(index) ?: "Snapshot metrik"
            valueView.text = rawValues.getOrNull(index)
                ?: String.format(Locale.US, "%.1f%%", entry.y)
            super.refreshContent(e, highlight)
        }

        override fun getOffset(): MPPointF = MPPointF(
            -(width / 2f),
            -height.toFloat() - 10f
        )
    }

    private fun resetChartZoom() {
        listOf(binding.lineChart, binding.detailLineChart, binding.electricalLineChart).forEach { chart ->
            chart.fitScreen()
            chart.setVisibleXRangeMaximum(maxDataPoints.toFloat())
            chart.data?.let { data ->
                val lastX = data.getDataSetByIndex(0)?.getEntryForIndex(
                    (data.getDataSetByIndex(0)?.entryCount ?: 1) - 1
                )?.x ?: 0f
                chart.moveViewToX(lastX)
            }
            chart.invalidate()
        }
    }

    private fun setupRecyclerView() {
        historyAdapter = HistoryAdapter(emptyList())
        binding.rvHistory.apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = historyAdapter
        }
    }

    private fun setupHistoryPage() {
        historyPageAdapter = HistoryAdapter(emptyList())
        historyPageBinding.rvHistoryPage.apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = historyPageAdapter
        }
        configureChart(
            historyPageBinding.historyLineChart,
            "Belum ada data riwayat.",
            historyChartLabels,
            showBuiltInLegend = false
        )
        configureChart(
            historyPageBinding.historyEnergyPfChart,
            "Belum ada metrik pendukung.",
            historyChartLabels,
            showBuiltInLegend = false
        )
        configureChart(
            historyPageBinding.historyFrequencyApparentChart,
            "Belum ada metrik pendukung.",
            historyChartLabels,
            showBuiltInLegend = false
        )

        val statuses = listOf("Semua Status", "NORMAL", "WARNING", "LEAKAGE", "DANGER")
        historyPageBinding.spHistoryStatus.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            statuses
        )
        historyPageBinding.spHistoryStatus.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                historyStatusFilter = if (position == 0) "ALL" else statuses[position]
                applyHistoryFilters()
            }

            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
        }

        historyPageBinding.btnHistoryFilterAll.setOnClickListener { setHistoryRange(LogRange.ALL) }
        historyPageBinding.btnHistoryFilterToday.setOnClickListener { setHistoryRange(LogRange.TODAY) }
        historyPageBinding.btnHistoryFilter7d.setOnClickListener { setHistoryRange(LogRange.LAST_7_DAYS) }
        historyPageBinding.btnHistoryFilter30d.setOnClickListener { setHistoryRange(LogRange.LAST_30_DAYS) }
        historyPageBinding.btnHistoryFilterDate.setOnClickListener { showDatePicker(forAnalytics = false) }
        historyPageBinding.btnHistoryLogSummary.setOnClickListener {
            selectHistoryPageLogMode(HistoryAdapter.DisplayMode.SUMMARY)
        }
        historyPageBinding.btnHistoryLogDetail.setOnClickListener {
            selectHistoryPageLogMode(HistoryAdapter.DisplayMode.DETAIL)
        }
        historyPageBinding.btnHistoryExport.setOnClickListener { requestHistoryCsvExport() }
        selectHistoryPageLogMode(HistoryAdapter.DisplayMode.SUMMARY)
        updateHistoryFilterControls()
    }

    private fun setupAnalyticsPage() {
        configureChart(
            analyticsPageBinding.analyticsTrendChart,
            "Belum ada data analytics.",
            analyticsChartLabels,
            showBuiltInLegend = false
        )
        configureChart(
            analyticsPageBinding.analyticsEnergyPfChart,
            "Belum ada metrik pendukung.",
            analyticsChartLabels,
            showBuiltInLegend = false
        )
        configureChart(
            analyticsPageBinding.analyticsFrequencyApparentChart,
            "Belum ada metrik pendukung.",
            analyticsChartLabels,
            showBuiltInLegend = false
        )
        configureStatusPieChart(analyticsPageBinding.analyticsStatusChart)
        configureSnapshotChart(analyticsPageBinding.analyticsSnapshotChart)
        renderChartIndicators(analyticsPageBinding.analyticsTrendLegend, mainChartSpecs())
        renderChartIndicators(analyticsPageBinding.analyticsEnergyPfLegend, detailChartSpecs())
        renderChartIndicators(
            analyticsPageBinding.analyticsFrequencyApparentLegend,
            electricalChartSpecs()
        )
        updateAnalyticsStatusChart(emptyMap())
        updateAnalyticsSnapshotChart(null, 0.0, 0.0, 0.0, 0.0, 0.0)

        analyticsPageBinding.btnAnalyticsFilterAll.setOnClickListener { setAnalyticsRange(LogRange.ALL) }
        analyticsPageBinding.btnAnalyticsFilterToday.setOnClickListener { setAnalyticsRange(LogRange.TODAY) }
        analyticsPageBinding.btnAnalyticsFilter7d.setOnClickListener { setAnalyticsRange(LogRange.LAST_7_DAYS) }
        analyticsPageBinding.btnAnalyticsFilter30d.setOnClickListener { setAnalyticsRange(LogRange.LAST_30_DAYS) }
        analyticsPageBinding.btnAnalyticsFilterDate.setOnClickListener { showDatePicker(forAnalytics = true) }
        updateAnalyticsFilterControls()
    }

    private fun selectLogMode(mode: HistoryAdapter.DisplayMode) {
        historyAdapter.setDisplayMode(mode)
        val isDetail = mode == HistoryAdapter.DisplayMode.DETAIL
        binding.btnLogSummary.isSelected = !isDetail
        binding.btnLogDetail.isSelected = isDetail
        binding.tvLogDetailHint.visibility = if (isDetail) View.VISIBLE else View.GONE
    }

    private fun setHistoryRange(range: LogRange) {
        historyRange = range
        if (range != LogRange.CUSTOM_DATE) historySelectedDate = null
        applyHistoryFilters()
    }

    private fun setAnalyticsRange(range: LogRange) {
        analyticsRange = range
        if (range != LogRange.CUSTOM_DATE) analyticsSelectedDate = null
        applyAnalyticsFilters()
    }

    private fun showDatePicker(forAnalytics: Boolean) {
        val selected = if (forAnalytics) analyticsSelectedDate else historySelectedDate
        val initial = selected ?: LocalDate.now()
        DatePickerDialog(
            this,
            { _, year, month, dayOfMonth ->
                val picked = LocalDate.of(year, month + 1, dayOfMonth)
                if (forAnalytics) {
                    analyticsSelectedDate = picked
                    analyticsRange = LogRange.CUSTOM_DATE
                    applyAnalyticsFilters()
                } else {
                    historySelectedDate = picked
                    historyRange = LogRange.CUSTOM_DATE
                    applyHistoryFilters()
                }
            },
            initial.year,
            initial.monthValue - 1,
            initial.dayOfMonth
        ).show()
    }

    private fun selectHistoryPageLogMode(mode: HistoryAdapter.DisplayMode) {
        historyPageAdapter.setDisplayMode(mode)
        val isDetail = mode == HistoryAdapter.DisplayMode.DETAIL
        historyPageBinding.btnHistoryLogSummary.isSelected = !isDetail
        historyPageBinding.btnHistoryLogDetail.isSelected = isDetail
        historyPageBinding.tvHistoryDetailHint.visibility = if (isDetail) View.VISIBLE else View.GONE
    }

    private fun requestHistoryCsvExport() {
        if (historyVisibleLogs.isEmpty()) {
            showToast("Tidak ada data untuk diekspor.")
            return
        }
        pendingCsvLogs = historyVisibleLogs.toList()
        val fileDate = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        exportCsvLauncher.launch("riwayat-log-$fileDate.csv")
    }

    private fun writeHistoryCsv(uri: Uri, logs: List<HistoryLog>) {
        try {
            val output = contentResolver.openOutputStream(uri)
                ?: throw IllegalStateException("Lokasi file tidak dapat dibuka.")
            OutputStreamWriter(output, Charsets.UTF_8).use { writer ->
                writer.write('\uFEFF'.toString())
                writer.write(
                    listOf(
                        "Waktu",
                        "Arus (A)",
                        "Tegangan (V)",
                        "Daya Aktif (W)",
                        "Energi (kWh)",
                        "Power Factor",
                        "Frekuensi (Hz)",
                        "Apparent (VA)",
                        "Status",
                        "Relay",
                        "Sumber"
                    ).joinToString(",")
                )
                writer.write("\n")
                logs.forEach { log ->
                    val arus = logNumber(log.arus)
                    val tegangan = logNumber(log.tegangan)
                    val row = listOf(
                        formatLogDateTime(log),
                        String.format(Locale.US, "%.2f", arus),
                        String.format(Locale.US, "%.1f", tegangan),
                        String.format(Locale.US, "%.0f", logActivePower(log)),
                        String.format(Locale.US, "%.3f", logEnergy(log)),
                        String.format(Locale.US, "%.2f", logPowerFactor(log)),
                        String.format(Locale.US, "%.1f", logFrequency(log)),
                        String.format(Locale.US, "%.0f", logApparentPower(log, arus, tegangan)),
                        normalizeLogStatus(log.status),
                        logRelayLabel(log),
                        logSourceLabel(log)
                    ).joinToString(",") { csvValue(it) }
                    writer.write(row)
                    writer.write("\n")
                }
                writer.flush()
            }
            showToast("Riwayat log berhasil diekspor ke CSV.")
        } catch (error: Exception) {
            Log.e("MainActivity", "CSV export failed", error)
            showToast("Gagal mengekspor CSV: ${error.message ?: "kesalahan tidak diketahui"}")
        } finally {
            pendingCsvLogs = emptyList()
        }
    }

    private fun csvValue(value: String): String = "\"${value.replace("\"", "\"\"")}\""

    private fun applyHistoryFilters() {
        val dateLogs = allLogsList.filter { matchesRange(it, historyRange, historySelectedDate) }
        historyVisibleLogs = if (historyStatusFilter == "ALL") {
            dateLogs
        } else {
            dateLogs.filter { normalizeLogStatus(it.status) == historyStatusFilter }
        }

        updateHistoryFilterControls(dateLogs)
        historyPageBinding.tvHistoryLogCount.text = "${historyVisibleLogs.size} log"
        historyPageBinding.tvHistoryPageEmpty.visibility =
            if (historyVisibleLogs.isEmpty()) View.VISIBLE else View.GONE
        historyPageBinding.rvHistoryPage.visibility =
            if (historyVisibleLogs.isEmpty()) View.GONE else View.VISIBLE
        historyPageAdapter.updateData(historyVisibleLogs)
        renderLogCharts(
            historyPageBinding.historyLineChart,
            historyPageBinding.historyEnergyPfChart,
            historyPageBinding.historyFrequencyApparentChart,
            historyVisibleLogs,
            historyChartLimit,
            historyChartLabels
        )
    }

    private fun applyAnalyticsFilters() {
        val dateLogs = allLogsList.filter { matchesRange(it, analyticsRange, analyticsSelectedDate) }
        analyticsVisibleLogs = dateLogs.sortedWith(
            compareBy<HistoryLog> { logTimestamp(it) }.thenBy { it.key.orEmpty() }
        )
        updateAnalyticsFilterControls(dateLogs)

        val currents = analyticsVisibleLogs.map { logNumber(it.arus) }
        val voltages = analyticsVisibleLogs.map { logNumber(it.tegangan) }
        val activePowers = analyticsVisibleLogs.map { logActivePower(it) }
        val energies = analyticsVisibleLogs.map { logEnergy(it) }
        val powerFactors = analyticsVisibleLogs.map { logPowerFactor(it) }
        val frequencies = analyticsVisibleLogs.map { logFrequency(it) }
        val apparentPowers = analyticsVisibleLogs.map { log ->
            logApparentPower(log, logNumber(log.arus), logNumber(log.tegangan))
        }
        val statusCounts = linkedMapOf("NORMAL" to 0, "WARNING" to 0, "LEAKAGE" to 0, "DANGER" to 0)
        analyticsVisibleLogs.forEach { log ->
            val status = normalizeLogStatus(log.status)
            if (statusCounts.containsKey(status)) statusCounts[status] = (statusCounts[status] ?: 0) + 1
        }

        val avgCurrent = averageValue(currents)
        val minCurrent = minValue(currents)
        val maxCurrent = maxValue(currents)
        val avgVoltage = averageValue(voltages)
        val minVoltage = minValue(voltages)
        val maxVoltage = maxValue(voltages)
        val avgPower = averageValue(activePowers)
        val peakPower = maxValue(activePowers)
        val avgApparent = averageValue(apparentPowers)
        val peakApparent = maxValue(apparentPowers)
        val maxEnergy = maxValue(energies)
        val avgPf = averageValue(powerFactors)
        val avgFreq = averageValue(frequencies)
        val energyLast = if (energies.isNotEmpty()) energies.last() else maxEnergy
        val latest = analyticsVisibleLogs.lastOrNull() ?: latestRealtimeLog
        val latestStatus = latest?.let { normalizeLogStatus(it.status) } ?: "UNKNOWN"
        val riskCount = (statusCounts["WARNING"] ?: 0) +
            (statusCounts["LEAKAGE"] ?: 0) + (statusCounts["DANGER"] ?: 0)

        analyticsPageBinding.tvAnalyticsLatestStatus.text = latestStatus
        analyticsPageBinding.tvAnalyticsLatestStatus.setTextColor(statusColor(latestStatus))
        analyticsPageBinding.tvAnalyticsUpdatedAt.text = latest?.let { formatLogDateTime(it) } ?: "Menunggu data"
        analyticsPageBinding.tvAnalyticsAvgCurrent.text = String.format(Locale.US, "%.2f A", avgCurrent)
        analyticsPageBinding.tvAnalyticsCurrentRange.text = String.format(
            Locale.US,
            "Min %.2f A · Max %.2f A",
            minCurrent,
            maxCurrent
        )
        analyticsPageBinding.tvAnalyticsAvgVoltage.text = String.format(Locale.US, "%.1f V", avgVoltage)
        analyticsPageBinding.tvAnalyticsVoltageRange.text = String.format(
            Locale.US,
            "Min %.1f V · Max %.1f V",
            minVoltage,
            maxVoltage
        )
        analyticsPageBinding.tvAnalyticsPeakPower.text = String.format(Locale.US, "%.0f W", peakPower)
        analyticsPageBinding.tvAnalyticsAvgPower.text = String.format(Locale.US, "Rata-rata %.0f W", avgPower)
        analyticsPageBinding.tvAnalyticsEnergy.text = String.format(Locale.US, "%.3f kWh", energyLast)
        analyticsPageBinding.tvAnalyticsSamples.text = "${analyticsVisibleLogs.size} sampel histori"
        analyticsPageBinding.tvAnalyticsAvgPf.text = String.format(Locale.US, "%.2f", avgPf)
        analyticsPageBinding.tvAnalyticsAvgFreq.text = String.format(Locale.US, "%.1f Hz", avgFreq)
        analyticsPageBinding.tvAnalyticsPeakApparent.text = String.format(Locale.US, "%.0f VA", peakApparent)
        analyticsPageBinding.tvAnalyticsAvgApparent.text = String.format(Locale.US, "Rata-rata %.0f VA", avgApparent)
        analyticsPageBinding.tvAnalyticsRiskCount.text = riskCount.toString()

        renderLogCharts(
            analyticsPageBinding.analyticsTrendChart,
            analyticsPageBinding.analyticsEnergyPfChart,
            analyticsPageBinding.analyticsFrequencyApparentChart,
            analyticsVisibleLogs,
            analyticsTrendLimit,
            analyticsChartLabels
        )
        updateAnalyticsStatusChart(statusCounts)
        updateAnalyticsSnapshotChart(
            latest,
            maxCurrent,
            maxVoltage,
            peakPower,
            maxEnergy,
            peakApparent
        )
    }

    private fun updateHistoryFilterControls(dateLogs: List<HistoryLog> = allLogsList.filter {
        matchesRange(it, historyRange, historySelectedDate)
    }) {
        updateRangeButtons(
            historyPageBinding.btnHistoryFilterAll,
            historyPageBinding.btnHistoryFilterToday,
            historyPageBinding.btnHistoryFilter7d,
            historyPageBinding.btnHistoryFilter30d,
            historyRange
        )
        historyPageBinding.btnHistoryFilterDate.text = dateButtonLabel(historyRange, historySelectedDate)
        historyPageBinding.tvHistoryFilterCount.text = "${dateLogs.size} log"
        historyPageBinding.tvHistoryFilterSummary.text = buildRangeSummary(
            historyRange,
            historySelectedDate,
            allLogsList
        )
    }

    private fun updateAnalyticsFilterControls(dateLogs: List<HistoryLog> = allLogsList.filter {
        matchesRange(it, analyticsRange, analyticsSelectedDate)
    }) {
        updateRangeButtons(
            analyticsPageBinding.btnAnalyticsFilterAll,
            analyticsPageBinding.btnAnalyticsFilterToday,
            analyticsPageBinding.btnAnalyticsFilter7d,
            analyticsPageBinding.btnAnalyticsFilter30d,
            analyticsRange
        )
        analyticsPageBinding.btnAnalyticsFilterDate.text = dateButtonLabel(analyticsRange, analyticsSelectedDate)
        analyticsPageBinding.tvAnalyticsFilterCount.text = "${dateLogs.size} log"
        analyticsPageBinding.tvAnalyticsFilterSummary.text = buildRangeSummary(
            analyticsRange,
            analyticsSelectedDate,
            allLogsList
        )
    }

    private fun updateRangeButtons(
        allButton: View,
        todayButton: View,
        sevenDaysButton: View,
        thirtyDaysButton: View,
        range: LogRange
    ) {
        allButton.isSelected = range == LogRange.ALL
        todayButton.isSelected = range == LogRange.TODAY
        sevenDaysButton.isSelected = range == LogRange.LAST_7_DAYS
        thirtyDaysButton.isSelected = range == LogRange.LAST_30_DAYS
    }

    private fun dateButtonLabel(range: LogRange, selected: LocalDate?): String {
        return if (range == LogRange.CUSTOM_DATE && selected != null) {
            selected.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy", Locale("id", "ID")))
        } else {
            "Pilih tanggal log"
        }
    }

    private fun buildRangeSummary(range: LogRange, selected: LocalDate?, logs: List<HistoryLog>): String {
        val rangeLabel = when (range) {
            LogRange.ALL -> "Semua data tersedia"
            LogRange.TODAY -> "Hari ini"
            LogRange.LAST_7_DAYS -> "7 hari terakhir"
            LogRange.LAST_30_DAYS -> "30 hari terakhir"
            LogRange.CUSTOM_DATE -> selected?.format(
                java.time.format.DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale("id", "ID"))
            ) ?: "Periode terpilih"
        }
        return "$rangeLabel · ${logs.mapNotNull { logDate(it) }.toSet().size} tanggal berdata"
    }

    private fun matchesRange(log: HistoryLog, range: LogRange, selected: LocalDate?): Boolean {
        if (range == LogRange.ALL) return true
        val logDate = logDate(log) ?: return false
        val today = LocalDate.now()
        return when (range) {
            LogRange.ALL -> true
            LogRange.TODAY -> logDate == today
            LogRange.LAST_7_DAYS -> logDate >= today.minusDays(6) && logDate <= today
            LogRange.LAST_30_DAYS -> logDate >= today.minusDays(29) && logDate <= today
            LogRange.CUSTOM_DATE -> logDate == selected
        }
    }

    private fun logDate(log: HistoryLog): LocalDate? {
        val timestamp = logTimestamp(log)
        if (timestamp <= 0L) return null
        return runCatching {
            Instant.ofEpochMilli(timestamp).atZone(ZoneId.systemDefault()).toLocalDate()
        }.getOrNull()
    }

    private fun configureStatusPieChart(chart: PieChart) {
        chart.description.isEnabled = false
        chart.legend.isEnabled = false
        chart.setUsePercentValues(false)
        chart.isDrawHoleEnabled = true
        chart.holeRadius = 58f
        chart.transparentCircleRadius = 62f
        chart.setHoleColor(Color.TRANSPARENT)
        chart.setCenterTextColor(Color.LTGRAY)
        chart.setCenterTextSize(12f)
        chart.setDrawEntryLabels(false)
        chart.setNoDataText("Belum ada log.")
        chart.setNoDataTextColor(Color.parseColor("#9ca3af"))
    }

    private fun configureSnapshotChart(chart: BarChart) {
        chart.description.isEnabled = false
        chart.legend.isEnabled = false
        chart.setDrawGridBackground(false)
        chart.setDrawBorders(false)
        chart.setTouchEnabled(true)
        chart.isDragEnabled = true
        chart.setScaleEnabled(false)
        chart.isHighlightPerTapEnabled = true
        chart.setDrawMarkers(true)
        chart.marker = SnapshotChartMarkerView(
            chart.context,
            analyticsSnapshotLabels,
            analyticsSnapshotRawValues
        )
        chart.setNoDataText("Menunggu data snapshot.")
        chart.setNoDataTextColor(Color.parseColor("#9ca3af"))

        chart.xAxis.apply {
            position = XAxis.XAxisPosition.BOTTOM
            textColor = Color.LTGRAY
            setDrawGridLines(false)
            granularity = 1f
            labelCount = 7
            valueFormatter = object : ValueFormatter() {
                override fun getFormattedValue(value: Float): String =
                    analyticsSnapshotLabels.getOrNull(value.toInt()) ?: ""
            }
        }
        chart.axisLeft.apply {
            textColor = Color.LTGRAY
            axisMinimum = 0f
            axisMaximum = 100f
            setDrawGridLines(true)
            gridColor = Color.parseColor("#33FFFFFF")
        }
        chart.axisRight.isEnabled = false
    }

    private fun renderLogCharts(
        mainChart: LineChart,
        detailChart: LineChart,
        electricalChart: LineChart,
        logs: List<HistoryLog>,
        limit: Int,
        labels: MutableMap<Float, String>
    ) {
        val selected = logs.sortedWith(
            compareBy<HistoryLog> { logTimestamp(it) }.thenBy { it.key.orEmpty() }
        ).takeLast(limit)
        labels.clear()
        selected.forEachIndexed { index, log -> labels[index.toFloat()] = chartLabelFor(log) }

        renderLogChartSeries(mainChart, mainChartSpecs(), selected) { log ->
            val arus = logNumber(log.arus)
            val tegangan = logNumber(log.tegangan)
            listOf(arus.toFloat(), tegangan.toFloat(), logActivePower(log).toFloat())
        }
        renderLogChartSeries(detailChart, detailChartSpecs(), selected) { log ->
            listOf(logEnergy(log).toFloat(), logPowerFactor(log).toFloat())
        }
        renderLogChartSeries(electricalChart, electricalChartSpecs(), selected) { log ->
            val arus = logNumber(log.arus)
            val tegangan = logNumber(log.tegangan)
            listOf(logFrequency(log).toFloat(), logApparentPower(log, arus, tegangan).toFloat())
        }
    }

    private fun renderLogChartSeries(
        chart: LineChart,
        specs: List<ChartSetSpec>,
        logs: List<HistoryLog>,
        values: (HistoryLog) -> List<Float>
    ) {
        if (logs.isEmpty()) {
            chart.clear()
            chart.invalidate()
            return
        }
        val data = LineData()
        specs.forEach { data.addDataSet(createSet(it)) }
        logs.forEachIndexed { index, log ->
            values(log).forEachIndexed { dataSetIndex, value ->
                data.addEntry(Entry(index.toFloat(), value), dataSetIndex)
            }
        }
        chart.data = data
        chart.notifyDataSetChanged()
        chart.setVisibleXRangeMaximum(logs.size.coerceAtLeast(1).toFloat())
        chart.moveViewToX((logs.size - 1).toFloat())
        chart.invalidate()
    }

    private fun updateAnalyticsStatusChart(statusCounts: Map<String, Int>) {
        val labels = listOf("NORMAL", "WARNING", "LEAKAGE", "DANGER")
        val colors = listOf(
            Color.parseColor("#22c55e"),
            Color.parseColor("#fcd34d"),
            Color.parseColor("#fb923c"),
            Color.parseColor("#ef4444")
        )
        val counts = labels.map { statusCounts[it] ?: 0 }
        val total = counts.sum()
        val chart = analyticsPageBinding.analyticsStatusChart
        if (total == 0) {
            chart.clear()
            chart.centerText = "Belum ada log"
        } else {
            val entries = labels.mapIndexed { index, label -> PieEntry(counts[index].toFloat(), label) }
            val dataSet = PieDataSet(entries, "").apply {
                this.colors = colors
                sliceSpace = 2f
                selectionShift = 4f
                setDrawValues(false)
            }
            chart.data = PieData(dataSet)
            chart.centerText = "$total log"
        }
        chart.invalidate()
        renderAnalyticsStatusLegend(labels, counts, colors, total)
    }

    private fun renderAnalyticsStatusLegend(
        labels: List<String>,
        counts: List<Int>,
        colors: List<Int>,
        total: Int
    ) {
        val container = analyticsPageBinding.analyticsStatusLegend
        container.removeAllViews()
        val safeTotal = total.coerceAtLeast(1)
        labels.forEachIndexed { index, label ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { topMargin = dp(6) }
            }
            val left = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            val dot = View(this).apply {
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(colors[index])
                }
                layoutParams = LinearLayout.LayoutParams(dp(9), dp(9)).apply { marginEnd = dp(8) }
            }
            val labelView = TextView(this).apply {
                text = label
                setTextColor(Color.parseColor("#cbd5e1"))
                textSize = 12f
            }
            val percentage = (counts[index] * 100f / safeTotal).toInt()
            val valueView = TextView(this).apply {
                text = "${counts[index]}  ${percentage}%"
                setTextColor(Color.WHITE)
                textSize = 12f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            }
            left.addView(dot)
            left.addView(labelView)
            row.addView(left)
            row.addView(valueView)
            container.addView(row)
        }
    }

    private fun updateAnalyticsSnapshotChart(
        latest: HistoryLog?,
        maxCurrent: Double,
        maxVoltage: Double,
        peakPower: Double,
        maxEnergy: Double,
        peakApparent: Double
    ) {
        val log = latest
        val arus = log?.let { logNumber(it.arus) } ?: 0.0
        val tegangan = log?.let { logNumber(it.tegangan) } ?: 0.0
        val dayaAktif = log?.let { logActivePower(it) } ?: 0.0
        val energi = log?.let { logEnergy(it) } ?: 0.0
        val pf = log?.let { logPowerFactor(it) } ?: 0.0
        val frekuensi = log?.let { logFrequency(it) } ?: 0.0
        val apparent = log?.let { logApparentPower(it, arus, tegangan) } ?: 0.0
        val labels = listOf("Arus", "Tegangan", "Daya", "Energi", "PF", "Frekuensi", "Apparent")
        val values = listOf(arus, tegangan, dayaAktif, energi, pf, frekuensi, apparent)
        val references = listOf(
            maxOf(maxCurrent, 10.0, arus),
            maxOf(maxVoltage, 260.0, tegangan),
            maxOf(peakPower, 2200.0, dayaAktif),
            maxOf(maxEnergy, 1.0, energi),
            1.0,
            65.0,
            maxOf(peakApparent, 2200.0, apparent)
        )
        val colors = listOf(
            Color.parseColor("#22c55e"),
            Color.parseColor("#60a5fa"),
            Color.parseColor("#fcd34d"),
            Color.parseColor("#a78bfa"),
            Color.parseColor("#38bdf8"),
            Color.parseColor("#fb923c"),
            Color.parseColor("#fb923c")
        )
        analyticsSnapshotLabels.clear()
        analyticsSnapshotLabels.addAll(labels)
        analyticsSnapshotRawValues.clear()
        analyticsSnapshotRawValues.addAll(
            listOf(
                String.format(Locale.US, "%.2f A", arus),
                String.format(Locale.US, "%.1f V", tegangan),
                String.format(Locale.US, "%.0f W", dayaAktif),
                String.format(Locale.US, "%.3f kWh", energi),
                String.format(Locale.US, "%.2f", pf),
                String.format(Locale.US, "%.1f Hz", frekuensi),
                String.format(Locale.US, "%.0f VA", apparent)
            )
        )
        val entries = values.mapIndexed { index, value ->
            BarEntry(index.toFloat(), ((value / references[index]) * 100.0).coerceIn(0.0, 100.0).toFloat())
        }
        val dataSet = BarDataSet(entries, "Snapshot terakhir").apply {
            this.colors = colors
            setDrawValues(false)
        }
        analyticsPageBinding.analyticsSnapshotChart.apply {
            data = BarData(dataSet).apply { barWidth = 0.62f }
            xAxis.axisMinimum = -0.5f
            xAxis.axisMaximum = labels.size - 0.5f
            notifyDataSetChanged()
            invalidate()
        }
    }

    private fun averageValue(values: List<Double>): Double {
        val clean = values.filter { it.isFinite() }
        return if (clean.isEmpty()) 0.0 else clean.sum() / clean.size
    }

    private fun minValue(values: List<Double>): Double = values.filter { it.isFinite() }.minOrNull() ?: 0.0

    private fun maxValue(values: List<Double>): Double = values.filter { it.isFinite() }.maxOrNull() ?: 0.0

    private fun statusColor(status: String): Int = when (status) {
        "NORMAL" -> Color.parseColor("#22c55e")
        "WARNING" -> Color.parseColor("#fcd34d")
        "LEAKAGE" -> Color.parseColor("#fb923c")
        "DANGER" -> Color.parseColor("#ef4444")
        else -> Color.parseColor("#94a3b8")
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun startConnectionListener() {
        if (connectedListener != null) return

        connectedRef = db.getReference(".info/connected")
        connectedListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                firebaseConnected = snapshot.getValue(Boolean::class.java) ?: false
                if (firebaseConnected) {
                    watchStartedAt = System.currentTimeMillis()
                }
                refreshPresenceUi()
            }
            override fun onCancelled(error: DatabaseError) {
                Log.w("MainActivity", "Connection listener cancelled: ${error.code} ${error.message}")
            }
        }
        connectedRef?.addValueEventListener(connectedListener!!)
    }

    private fun snapshotNumber(snapshot: DataSnapshot, child: String): Double =
        snapshotNumberOrNull(snapshot, child) ?: 0.0

    private fun snapshotNumberOrNull(snapshot: DataSnapshot, child: String): Double? {
        val value = snapshot.child(child).value ?: return null
        return when (value) {
            is Number -> value.toDouble()
            is String -> value.trim().toDoubleOrNull()
            else -> null
        }
    }

    private fun snapshotLong(snapshot: DataSnapshot, child: String): Long {
        val value = snapshot.child(child).value ?: return 0L
        return when (value) {
            is Number -> value.toLong()
            is String -> value.trim().toLongOrNull() ?: value.trim().toDoubleOrNull()?.toLong() ?: 0L
            else -> 0L
        }
    }

    private fun startDashboardListener() {
        if (dashboardListener != null) return

        dashboardRef = db.getReference("${pathPrefix}listrik")
        dashboardListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                if(!snapshot.exists()) return

                val status = snapshot.child("status").value?.toString() ?: "NORMAL"
                val arus = snapshotNumber(snapshot, "arus")
                val tegangan = snapshotNumber(snapshot, "tegangan")
                val frekuensi = snapshotNumber(snapshot, "frekuensi")
                val pf = snapshotNumber(snapshot, "power_factor")
                val apparent = snapshotNumberOrNull(snapshot, "apparent_power")
                    ?: snapshotNumberOrNull(snapshot, "daya")
                    ?: (arus * tegangan)
                // Prefer daya_w from PZEM/firmware; fall back to V*I*PF.
                val dayaW = snapshotNumberOrNull(snapshot, "daya_w")
                    ?: (apparent * pf)
                val energi = snapshotNumber(snapshot, "energi_kwh")
                val updatedAt = snapshotLong(snapshot, "updated_at")
                val resetByAdmin = snapshot.child("reset_by_admin").value as? Boolean ?: false
                val resetAt = snapshot.child("reset_at").value?.toString().orEmpty()
                val resetNote = snapshot.child("reset_note").value?.toString().orEmpty()
                val relayState = parseRelayState(snapshot.child("relay").value)

                registerDeviceHeartbeat(
                    updatedAt = updatedAt,
                    status = status,
                    arus = arus,
                    tegangan = tegangan,
                    apparent = apparent,
                    energi = energi,
                    frekuensi = frekuensi,
                    pf = pf
                )

                if (resetByAdmin && resetAt.isNotBlank()) {
                    notifyAdminReset(resetAt, resetNote)
                }

                lastDeviceStatus = normalizeLogStatus(status)
                lastDeviceUpdatedAt = updatedAt.takeIf(::isLikelyEpochMs) ?: 0L
                binding.tvStatus.text = lastDeviceStatus
                binding.tvArus.text = String.format("%.2f A", arus)
                binding.tvTegangan.text = String.format("%.1f V", tegangan)
                binding.tvDayaW.text = String.format("%.0f W", dayaW)
                binding.tvEnergiKwh.text = String.format("%.3f kWh", energi)
                binding.tvPowerFactor.text = String.format("%.2f", pf)
                binding.tvFrekuensi.text = String.format("%.0f Hz", frekuensi)
                binding.tvApparentPower.text = String.format("%.0f VA", apparent)
                latestRealtimeLog = HistoryLog(
                    arus = arus,
                    tegangan = tegangan,
                    status = lastDeviceStatus,
                    relay = relayState,
                    waktu = updatedAt.takeIf { it > 0L } ?: System.currentTimeMillis(),
                    daya_w = dayaW,
                    daya = apparent,
                    energi_kwh = energi,
                    frekuensi = frekuensi,
                    power_factor = pf
                )
                refreshPresenceUi()
                renderRelayState(relayState)

                updateStatusColor(lastDeviceStatus)
                addChartEntry(
                    arus = arus.toFloat(),
                    tegangan = tegangan.toFloat(),
                    dayaAktif = dayaW.toFloat(),
                    energi = energi.toFloat(),
                    powerFactor = pf.toFloat(),
                    frekuensi = frekuensi.toFloat(),
                    apparent = apparent.toFloat()
                )
                if (currentPage == AppPage.ANALYTICS) applyAnalyticsFilters()
            }
            override fun onCancelled(error: DatabaseError) {
                Log.e("MainActivity", "Dashboard listener cancelled: ${error.code} ${error.message}")
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Gagal memuat data: ${error.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
        dashboardRef?.addValueEventListener(dashboardListener!!)
    }

    private fun startHistoryListener() {
        if (historyChildListener != null) return

        historyByKey.clear()
        historyList.clear()
        allLogsList.clear()
        binding.tvHistoryEmpty.visibility = View.VISIBLE
        binding.rvHistory.visibility = View.GONE

        val logsQuery = db.getReference("${pathPrefix}logs").orderByKey().limitToLast(historyLogLimit)
        historyQuery = logsQuery
        historyChildListener = object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                upsertHistory(snapshot)
                scheduleRenderHistory()
            }

            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {
                upsertHistory(snapshot)
                scheduleRenderHistory()
            }

            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {
                upsertHistory(snapshot)
                scheduleRenderHistory()
            }

            override fun onChildRemoved(snapshot: DataSnapshot) {
                val key = snapshot.key
                if (key != null) historyByKey.remove(key)
                scheduleRenderHistory()
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e("MainActivity", "History listener cancelled: ${error.code} ${error.message}")
                runOnUiThread {
                    Toast.makeText(
                        this@MainActivity,
                        "Gagal memuat riwayat log: ${if (error.code == DatabaseError.PERMISSION_DENIED) "Akses ditolak — coba login ulang." else error.message}",
                        Toast.LENGTH_LONG
                    ).show()
                    binding.tvHistoryEmpty.visibility = View.VISIBLE
                    binding.rvHistory.visibility = View.GONE
                }
            }
        }
        logsQuery.addChildEventListener(historyChildListener!!)
    }

    private fun upsertHistory(snapshot: DataSnapshot) {
        val key = snapshot.key ?: return
        try {
            // Jangan deserialisasi langsung ke HistoryLog karena data RTDB lama/Simulator
            // dapat berisi campuran Long, Double, String, atau Boolean. Satu record
            // yang bentuknya berbeda tidak boleh membuat callback Firebase crash.
            val log = historyLogFromSnapshot(snapshot) ?: return
            historyByKey[key] = log.copy(key = key)
        } catch (error: Exception) {
            Log.e("MainActivity", "Riwayat diabaikan karena format tidak valid: $key", error)
        }
    }

    private fun historyLogFromSnapshot(snapshot: DataSnapshot): HistoryLog? {
        if (!snapshot.exists()) return null
        fun value(name: String): Any? = snapshot.child(name).value
        return HistoryLog(
            key = snapshot.key,
            arus = value("arus"),
            tegangan = value("tegangan"),
            status = value("status")?.toString() ?: "NORMAL",
            relay = value("relay"),
            waktu = value("waktu"),
            timestamp = value("timestamp"),
            daya_w = value("daya_w"),
            active_power = value("active_power"),
            activePower = value("activePower"),
            power_w = value("power_w"),
            dayaAktif = value("dayaAktif"),
            daya = value("daya"),
            apparent_power = value("apparent_power"),
            apparentPower = value("apparentPower"),
            energi_kwh = value("energi_kwh"),
            energy_kwh = value("energy_kwh"),
            energy = value("energy"),
            energi = value("energi"),
            kwh = value("kwh"),
            frekuensi = value("frekuensi"),
            frequency = value("frequency"),
            hz = value("hz"),
            power_factor = value("power_factor"),
            powerFactor = value("powerFactor"),
            pf = value("pf"),
            apparent = value("apparent"),
            apparent_va = value("apparent_va"),
            daya_va = value("daya_va"),
            va = value("va"),
            source = value("source"),
            sumber = value("sumber"),
            mode = value("mode"),
            endpoint = value("endpoint"),
            dataSource = value("dataSource"),
            sensor_source = value("sensor_source"),
            sensorSource = value("sensorSource"),
            meter_source = value("meter_source"),
            meterSource = value("meterSource"),
            updated_at = value("updated_at"),
            createdAt = value("createdAt"),
            created_at = value("created_at"),
            relayStatus = value("relayStatus"),
            relay_status = value("relay_status")
        )
    }

    /**
     * Debounce: schedule a single renderHistory pass 150ms from now.
     * Rapid-fire onChildAdded callbacks (initial Firebase load) collapse into one render.
     */
    private fun scheduleRenderHistory() {
        uiHandler.removeCallbacks(renderHistoryRunnable)
        uiHandler.postDelayed(renderHistoryRunnable, 150)
    }

    private fun doRenderHistory() {
        allLogsList.clear()
        allLogsList.addAll(
            historyByKey.values.sortedWith(
                compareByDescending<HistoryLog> { logTimestamp(it) }.thenByDescending { it.key.orEmpty() }
            )
        )
        historyList.clear()
        historyList.addAll(allLogsList.take(dashboardLogLimit))

        val wasEmpty = binding.tvHistoryEmpty.visibility == View.VISIBLE
        if (historyList.isEmpty()) {
            binding.tvHistoryEmpty.visibility = View.VISIBLE
            binding.rvHistory.visibility = View.GONE
            historyAdapter.updateData(emptyList())
        } else {
            binding.tvHistoryEmpty.visibility = View.GONE
            binding.rvHistory.visibility = View.VISIBLE
            historyAdapter.updateData(historyList)
            if (wasEmpty) binding.rvHistory.smoothScrollToPosition(0)
        }

        // Gunakan log sebagai bootstrap grafik hanya bila stream realtime belum memberi titik data.
        val chartHasData = (binding.lineChart.data?.entryCount ?: 0) > 0
        if (!chartHasData && allLogsList.isNotEmpty()) {
            val toPlot = allLogsList.take(maxDataPoints).reversed()
            for (log in toPlot) {
                val arus = logNumber(log.arus).toFloat()
                val tegangan = logNumber(log.tegangan).toFloat()
                val daya = logActivePower(log).toFloat()
                val energi = logEnergy(log).toFloat()
                val pf = logPowerFactor(log).toFloat()
                val frekuensi = logFrequency(log).toFloat()
                val apparent = logApparentPower(log, arus.toDouble(), tegangan.toDouble()).toFloat()
                addChartEntryBatch(
                    arus = arus,
                    tegangan = tegangan,
                    dayaAktif = daya,
                    energi = energi,
                    powerFactor = pf,
                    frekuensi = frekuensi,
                    apparent = apparent,
                    label = chartLabelFor(log)
                )
            }
            refreshAllCharts()
        }

        // Halaman Riwayat dan Analytics memakai sumber log yang sama seperti web (hingga 100 entri).
        // Tetap render saat halaman belum aktif agar isi sudah siap saat dipilih dari sidebar.
        applyHistoryFilters()
        applyAnalyticsFilters()
    }

    private fun logNumber(value: Any?): Double = when (value) {
        is Number -> value.toDouble()
        else -> value?.toString()?.toDoubleOrNull() ?: 0.0
    }

    private fun firstLogValue(vararg values: Any?): Any? = values.firstOrNull {
        when (it) {
            null -> false
            is String -> it.isNotBlank()
            else -> true
        }
    }

    private fun logActivePower(log: HistoryLog): Double = logNumber(
        firstLogValue(log.daya_w, log.active_power, log.activePower, log.power_w, log.dayaAktif, log.daya)
    )

    private fun logEnergy(log: HistoryLog): Double = logNumber(
        firstLogValue(log.energi_kwh, log.energy_kwh, log.energy, log.energi, log.kwh)
    )

    private fun logPowerFactor(log: HistoryLog): Double {
        val raw = firstLogValue(log.power_factor, log.powerFactor, log.pf)
        return if (raw == null) 0.85 else logNumber(raw)
    }

    private fun logFrequency(log: HistoryLog): Double = logNumber(
        firstLogValue(log.frekuensi, log.frequency, log.hz)
    )

    private fun logApparentPower(log: HistoryLog, arus: Double, tegangan: Double): Double {
        val direct = firstLogValue(
            log.apparent_power,
            log.apparentPower,
            log.apparent,
            log.apparent_va,
            log.daya_va,
            log.va,
            log.daya
        )
        return if (direct != null) logNumber(direct) else arus * tegangan
    }

    private fun normalizeLogStatus(raw: String?): String = when (
        raw?.trim()?.uppercase(Locale.ROOT) ?: "NORMAL"
    ) {
        "NORMAL" -> "NORMAL"
        "WARNING" -> "WARNING"
        "LEAKAGE" -> "LEAKAGE"
        "DANGER" -> "DANGER"
        else -> "UNKNOWN"
    }

    private fun logRelayLabel(log: HistoryLog): String {
        val raw = firstLogValue(log.relay, log.relayStatus, log.relay_status)
        val text = raw?.toString()?.trim()?.uppercase(Locale.ROOT).orEmpty()
        return when {
            raw == 1 || raw == true || text == "1" || text == "ON" -> "ON"
            raw == 0 || raw == false || text == "0" || text == "OFF" -> "OFF"
            else -> "—"
        }
    }

    private fun logSourceLabel(log: HistoryLog): String {
        val source = firstLogValue(log.source, log.sumber, log.mode, log.endpoint, log.dataSource)
            ?.toString()
            ?.trim()
            ?.uppercase(Locale.ROOT)
        return source?.ifBlank { if (isTempAccount) "SIM" else "CLOUD" }
            ?: if (isTempAccount) "SIM" else "CLOUD"
    }

    private fun logTimestamp(log: HistoryLog): Long {
        val raw = firstLogValue(log.waktu, log.timestamp, log.updated_at, log.createdAt, log.created_at) ?: return 0L
        val numeric = when (raw) {
            is Number -> raw.toLong()
            else -> raw.toString().trim().toLongOrNull()
        }
        if (numeric != null && numeric > 0L) return numeric

        val text = raw.toString().trim()
        if (text.isBlank()) return 0L
        runCatching { Instant.parse(text).toEpochMilli() }.getOrNull()?.let { return it }

        val localMatch = Regex(
            "^(\\d{1,2})[/-](\\d{1,2})[/-](\\d{2,4}),?\\s+(\\d{1,2})[.:](\\d{1,2})(?:[.:](\\d{1,2}))?"
        ).find(text)
        if (localMatch != null) {
            val groups = localMatch.groupValues
            val day = groups[1].toIntOrNull() ?: return 0L
            val month = groups[2].toIntOrNull() ?: return 0L
            var year = groups[3].toIntOrNull() ?: return 0L
            if (year < 100) year += 2000
            val hour = groups[4].toIntOrNull() ?: 0
            val minute = groups[5].toIntOrNull() ?: 0
            val second = groups.getOrNull(6)?.toIntOrNull() ?: 0
            return runCatching {
                LocalDate.of(year, month, day)
                    .atTime(hour, minute, second)
                    .atZone(ZoneId.systemDefault())
                    .toInstant()
                    .toEpochMilli()
            }.getOrDefault(0L)
        }

        val patterns = listOf(
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd HH:mm:ss",
            "dd/MM/yyyy HH:mm:ss",
            "dd-MM-yyyy HH:mm:ss",
            "dd/MM/yyyy, HH:mm:ss",
            "dd-MM-yyyy, HH:mm:ss"
        )
        for (pattern in patterns) {
            val parsed = runCatching {
                SimpleDateFormat(pattern, Locale("id", "ID")).apply { isLenient = false }.parse(text)
            }.getOrNull()
            if (parsed != null) return parsed.time
        }
        return 0L
    }

    private fun formatLogDateTime(log: HistoryLog): String {
        val timestamp = logTimestamp(log)
        if (timestamp > 0L) {
            return SimpleDateFormat("dd/MM/yyyy, HH:mm:ss", Locale("id", "ID")).format(Date(timestamp))
        }
        return firstLogValue(log.waktu, log.timestamp, log.updated_at, log.createdAt, log.created_at)
            ?.toString()
            ?.trim()
            ?.ifBlank { "—" }
            ?: "—"
    }

    private fun chartLabelFor(log: HistoryLog): String {
        val epoch = logTimestamp(log)
        if (epoch > 0L) return SimpleDateFormat("HH:mm:ss", Locale("id", "ID")).format(Date(epoch))
        val text = firstLogValue(log.waktu, log.timestamp, log.updated_at, log.createdAt, log.created_at)
            ?.toString()
            ?.trim()
            .orEmpty()
        val match = Regex("T(\\d{2}:\\d{2}:\\d{2})").find(text)
        return match?.groupValues?.getOrNull(1) ?: text.takeLast(8).ifBlank { "—" }
    }

    private fun updateStatusColor(status: String) {
        binding.tvStatusSummary.text = statusSummaryFor(status)
        binding.tvStatusHint.text = statusHintFor(status)
        if (status == lastStatus) return

        val dangerStatuses = setOf("WARNING", "LEAKAGE", "DANGER")
        val isDanger = dangerStatuses.contains(status)
        val wasDanger = dangerStatuses.contains(lastStatus)

        if (isDanger && !wasDanger) {
            // Munculkan di Notification Tray Android
            val notifTitle = if (status == "DANGER") "BAHAYA KRITIS!" else "PERINGATAN!"
            val notifBody = when (status) {
                "DANGER" -> "Kebocoran arus tingkat bahaya dideteksi!"
                "LEAKAGE" -> "Terdeteksi kebocoran arus. Periksa instalasi!"
                else -> "Beban listrik melebihi batas. Periksa pemakaian!"
            }
            triggerLocalNotification(notifTitle, notifBody)

            // Start alarm global: tetap bunyi walau pindah menu/tab lain
            AlarmForegroundService.start(this)
            
            // Buka halaman Alarm merah Full-Screen yang berisi codingan Suara Sirene & Getar
            val intent = Intent(this, com.iot.listrik.ui.alarm.AlarmActivity::class.java).apply {
                putExtra("EXTRA_TITLE", notifTitle)
                putExtra("EXTRA_MESSAGE", notifBody)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            startActivity(intent)
        } else if (!isDanger && wasDanger) {
            // Status kembali normal/non-danger -> stop alarm global
            AlarmForegroundService.stop(this)
        }
        
        lastStatus = status

        val colorTo = when (status) {
            "DANGER" -> Color.parseColor("#ef4444")
            "LEAKAGE" -> Color.parseColor("#fb923c")
            "NORMAL" -> Color.parseColor("#2eea72")
            else -> Color.parseColor("#fee58a")
        }

        val statusBackground = when (status) {
            "DANGER" -> R.drawable.bg_status_danger
            "LEAKAGE" -> R.drawable.bg_status_leakage
            "NORMAL" -> R.drawable.bg_status_normal
            else -> R.drawable.bg_status_warning
        }
        binding.cardStatusOverlay.setBackgroundResource(statusBackground)

        dangerPulseAnimator?.cancel()
        dangerPulseAnimator = null
        binding.tvStatus.alpha = 1f

        val colorAnimation = ValueAnimator.ofObject(ArgbEvaluator(), currentStatusColor, colorTo)
        colorAnimation.duration = 600
        colorAnimation.addUpdateListener { animator ->
            val color = animator.animatedValue as Int
            currentStatusColor = color
            
            binding.tvStatus.setTextColor(color)
        }
        
        if (status == "DANGER") {
            colorAnimation.addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: android.animation.Animator) {
                    startDangerPulse()
                }
            })
        }
        colorAnimation.start()
    }

    private fun statusSummaryFor(status: String): String = when (status) {
        "DANGER" -> "Bahaya — gangguan ekstrem"
        "LEAKAGE" -> "Indikasi kebocoran arus"
        "WARNING" -> "Peringatan — mendekati batas"
        "UNKNOWN" -> "Status belum dikenali"
        else -> "Sistem stabil"
    }

    private fun statusHintFor(status: String): String = when (status) {
        "DANGER" -> "Auto-cutoff dan notifikasi bahaya diprioritaskan. Periksa beban, kabel, dan kondisi perangkat sebelum menyalakan relay kembali."
        "LEAKAGE" -> "Sistem membaca indikasi arus bocor atau arus abnormal. Periksa isolasi, sambungan, dan kondisi beban sebelum relay dinyalakan kembali."
        "WARNING" -> "Arus mendekati ambang batas. Pantau perubahan beban dan pastikan konsumsi masih sesuai kapasitas uji."
        "UNKNOWN" -> "Status belum dikenali. Tunggu data berikutnya atau periksa koneksi perangkat."
        else -> "Data realtime dibaca dari perangkat dan dievaluasi berdasarkan ambang sistem."
    }

    private fun startDangerPulse() {
        dangerPulseAnimator = ValueAnimator.ofFloat(1f, 0.65f)
        dangerPulseAnimator?.duration = 1000
        dangerPulseAnimator?.repeatCount = ValueAnimator.INFINITE
        dangerPulseAnimator?.repeatMode = ValueAnimator.REVERSE
        dangerPulseAnimator?.addUpdateListener { animator ->
            binding.tvStatus.alpha = animator.animatedValue as Float
        }
        dangerPulseAnimator?.start()
    }

    private data class ChartSetSpec(
        val label: String,
        val color: Int,
        val axis: YAxis.AxisDependency,
        val filled: Boolean = true
    )

    private fun ensureChartSets(chart: LineChart, specs: List<ChartSetSpec>): List<LineDataSet> {
        val data = chart.data ?: LineData().also { chart.data = it }
        specs.forEachIndexed { index, spec ->
            if (data.getDataSetByIndex(index) == null) {
                data.addDataSet(createSet(spec))
            }
        }
        return specs.indices.map { data.getDataSetByIndex(it) as LineDataSet }
    }

    private fun createSet(spec: ChartSetSpec): LineDataSet {
        return LineDataSet(null, spec.label).apply {
            axisDependency = spec.axis
            color = spec.color
            setCircleColor(spec.color)
            lineWidth = 2f
            circleRadius = 3.4f
            circleHoleRadius = 1.4f
            circleHoleColor = Color.parseColor("#111820")
            fillAlpha = 34
            fillColor = spec.color
            highLightColor = Color.WHITE
            valueTextColor = Color.WHITE
            valueTextSize = 9f
            setDrawCircles(true)
            setDrawCircleHole(true)
            setDrawHighlightIndicators(true)
            setDrawValues(false)
            setDrawFilled(spec.filled)
            mode = LineDataSet.Mode.CUBIC_BEZIER
        }
    }

    private fun mainChartSpecs() = listOf(
        ChartSetSpec("Arus (A)", Color.parseColor("#2eea72"), YAxis.AxisDependency.LEFT),
        ChartSetSpec("Tegangan (V)", Color.parseColor("#7dd3fc"), YAxis.AxisDependency.RIGHT),
        ChartSetSpec("Daya Aktif (W)", Color.parseColor("#fee58a"), YAxis.AxisDependency.RIGHT, false)
    )

    private fun detailChartSpecs() = listOf(
        ChartSetSpec("Energi (kWh)", Color.parseColor("#c084fc"), YAxis.AxisDependency.LEFT),
        ChartSetSpec("Power Factor", Color.parseColor("#7dd3fc"), YAxis.AxisDependency.RIGHT)
    )

    private fun electricalChartSpecs() = listOf(
        ChartSetSpec("Frekuensi (Hz)", Color.parseColor("#7dd3fc"), YAxis.AxisDependency.LEFT),
        ChartSetSpec("Apparent (VA)", Color.parseColor("#fb923c"), YAxis.AxisDependency.RIGHT)
    )

    private fun addChartEntry(
        arus: Float,
        tegangan: Float,
        dayaAktif: Float,
        energi: Float,
        powerFactor: Float,
        frekuensi: Float,
        apparent: Float
    ) {
        addChartSample(
            arus,
            tegangan,
            dayaAktif,
            energi,
            powerFactor,
            frekuensi,
            apparent,
            SimpleDateFormat("HH:mm:ss", Locale("id", "ID")).format(Date()),
            redraw = true
        )
    }

    private fun addChartEntryBatch(
        arus: Float,
        tegangan: Float,
        dayaAktif: Float,
        energi: Float,
        powerFactor: Float,
        frekuensi: Float,
        apparent: Float,
        label: String
    ) {
        addChartSample(
            arus,
            tegangan,
            dayaAktif,
            energi,
            powerFactor,
            frekuensi,
            apparent,
            label,
            redraw = false
        )
    }

    private fun addChartSample(
        arus: Float,
        tegangan: Float,
        dayaAktif: Float,
        energi: Float,
        powerFactor: Float,
        frekuensi: Float,
        apparent: Float,
        label: String,
        redraw: Boolean
    ) {
        val x = chartTimeIndex
        chartLabels[x] = label

        val mainSets = ensureChartSets(binding.lineChart, mainChartSpecs())
        val detailSets = ensureChartSets(binding.detailLineChart, detailChartSpecs())
        val electricalSets = ensureChartSets(binding.electricalLineChart, electricalChartSpecs())
        val trimOldest = (mainSets.firstOrNull()?.entryCount ?: 0) >= maxDataPoints

        addEntries(binding.lineChart, mainSets, x, listOf(arus, tegangan, dayaAktif))
        addEntries(binding.detailLineChart, detailSets, x, listOf(energi, powerFactor))
        addEntries(binding.electricalLineChart, electricalSets, x, listOf(frekuensi, apparent))

        if (trimOldest) chartLabels.remove(x - maxDataPoints)
        chartTimeIndex++
        binding.tvChartLoading.visibility = View.GONE
        if (redraw) refreshAllCharts()
    }

    private fun addEntries(
        chart: LineChart,
        sets: List<LineDataSet>,
        x: Float,
        values: List<Float>
    ) {
        val data = chart.data ?: return
        values.forEachIndexed { index, value -> data.addEntry(Entry(x, value), index) }

        if ((sets.firstOrNull()?.entryCount ?: 0) > maxDataPoints) {
            sets.forEach { it.removeFirst() }
            chart.xAxis.axisMinimum = sets.first().getEntryForIndex(0).x
        }
    }

    private fun refreshAllCharts() {
        val lastX = (chartTimeIndex - 1f).coerceAtLeast(0f)
        listOf(binding.lineChart, binding.detailLineChart, binding.electricalLineChart).forEach { chart ->
            chart.data?.notifyDataChanged()
            chart.notifyDataSetChanged()
            chart.setVisibleXRangeMaximum(maxDataPoints.toFloat())
            chart.moveViewToX(lastX)
        }
    }

    private fun setRelay(value: Int) {
        if (!isAdmin || isTempAccount) {
            showToast("Akses ditolak: hanya admin yang bisa mengontrol relay.")
            return
        }

        if (currentConnectionLabel() != "Connected") {
            showToast(relayBlockedReason())
            return
        }

        if (value == 1 && (lastDeviceStatus == "WARNING" || lastDeviceStatus == "DANGER")) {
            showToast("Perintah ON ditolak: kondisi $lastDeviceStatus. Perbaiki kondisi listrik lebih dulu.")
            return
        }

        if (pendingRelayValue != null) return
        pendingRelayValue = value
        updateRelayControls()

        db.getReference("${pathPrefix}commands/relay")
            .setValue(value)
            .addOnSuccessListener {
                showToast("Perintah relay ${if (value == 1) "ON" else "OFF"} dikirim")
                // Firebase menerima perintah lebih cepat daripada perangkat menerapkan state.
                // Lepas kunci setelah timeout bila tidak ada konfirmasi /listrik/relay.
                uiHandler.postDelayed({
                    if (pendingRelayValue == value) {
                        pendingRelayValue = null
                        updateRelayControls()
                    }
                }, 8000)
            }
            .addOnFailureListener { e ->
                pendingRelayValue = null
                updateRelayControls()
                val msg = e.message ?: "Gagal mengirim perintah relay."
                showToast("Gagal mengirim perintah relay: $msg")
            }
    }

    private fun triggerLocalNotification(title: String, message: String) {
        val fullScreenIntent = Intent(this, com.iot.listrik.ui.alarm.AlarmActivity::class.java).apply {
            putExtra("EXTRA_TITLE", title)
            putExtra("EXTRA_MESSAGE", message)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        val fullScreenPendingIntent = android.app.PendingIntent.getActivity(
            this,
            0,
            fullScreenIntent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )

        val channelId = "ALARM_CHANNEL_ID"
        val notificationManager = getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                channelId,
                "Critical Alarms",
                android.app.NotificationManager.IMPORTANCE_HIGH
            )
            notificationManager.createNotificationChannel(channel)
        }

        val notificationBuilder = androidx.core.app.NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
            .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setAutoCancel(true)

        notificationManager.notify(1001, notificationBuilder.build())
    }

    private fun sendTestNotification() {
        if (
            android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) !=
            android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 101)
            showToast("Izinkan notifikasi Android, lalu coba lagi.")
            return
        }

        triggerInfoNotification(
            "Test Notifikasi IoT",
            "Notifikasi aplikasi aktif pada perangkat ini."
        )
        showToast("Test notifikasi dikirim.")
    }

    private fun triggerInfoNotification(title: String, message: String) {
        val channelId = "INFO_CHANNEL_ID"
        val notificationManager =
            getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                channelId,
                "Info Updates",
                android.app.NotificationManager.IMPORTANCE_DEFAULT
            )
            notificationManager.createNotificationChannel(channel)
        }

        val notificationBuilder = androidx.core.app.NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(androidx.core.app.NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)

        notificationManager.notify(1002, notificationBuilder.build())
    }
}
