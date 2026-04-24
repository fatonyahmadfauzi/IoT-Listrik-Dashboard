package com.iot.listrik.ui.main

import android.animation.ArgbEvaluator
import android.animation.ValueAnimator
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import android.widget.Toast
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.Entry
import com.github.mikephil.charting.data.LineData
import com.github.mikephil.charting.data.LineDataSet
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.*
import com.google.firebase.messaging.FirebaseMessaging
import com.iot.listrik.R
import com.iot.listrik.data.model.HistoryLog
import com.iot.listrik.databinding.ActivityMainBinding
import com.iot.listrik.ui.auth.LoginActivity
import com.iot.listrik.service.AlarmForegroundService

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseDatabase.getInstance()

    private var chartTimeIndex = 0f
    private val maxDataPoints = 20

    private lateinit var historyAdapter: HistoryAdapter
    private val historyList = mutableListOf<HistoryLog>()
    private val arusHistory = mutableListOf<Float>()
    private val tegHistory = mutableListOf<Float>()

    private var currentStatusColor = Color.parseColor("#22c55e")
    private var lastStatus = ""
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
    private val deviceStaleMs = 15000L
    private val presenceHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val presenceCheckRunnable = object : Runnable {
        override fun run() {
            refreshPresenceUi()
            presenceHandler.postDelayed(this, 3000)
        }
    }
    private var firebaseConnected = true
    private var lastDeviceHeartbeatAt = 0L
    private var lastUpdatedMarker: Long? = null
    private var lastSensorSignature = ""
    private var lastResetMarker: String? = null
    private var watchStartedAt = System.currentTimeMillis()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            binding = ActivityMainBinding.inflate(layoutInflater)
            setContentView(binding.root)

            // Request POST_NOTIFICATIONS for Android 13+
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) !=
                    android.content.pm.PackageManager.PERMISSION_GRANTED
                ) {
                    requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 101)
                }
            }

            // Sub to FCM Alarms
            try {
                FirebaseMessaging.getInstance().subscribeToTopic("iot_alarms")
            } catch (e: Exception) {
                Log.e("MainActivity", "FCM subscription failed", e)
            }

            binding.btnLogout.setOnClickListener {
                // Stop alarm supaya tidak lanjut bunyi setelah logout
                AlarmForegroundService.stop(this)
                auth.signOut()
                startActivity(Intent(this, LoginActivity::class.java))
                finish()
            }

            binding.btnRelayOn?.setOnClickListener { setRelay(1) }
            binding.btnRelayOff?.setOnClickListener { setRelay(0) }

            binding.btnDemoNormal?.setOnClickListener { triggerDemoMode("NORMAL") }
            binding.btnDemoWarning?.setOnClickListener { triggerDemoMode("WARNING") }
            binding.btnDemoDanger?.setOnClickListener { triggerDemoMode("DANGER") }

            setupChart()
            setupRecyclerView()

            // Default: sembunyikan kontrol write sampai role diketahui.
            binding.relaySection?.visibility = View.GONE
            binding.demoSection?.visibility = View.GONE
        } catch (e: Exception) {
            Log.e("MainActivity", "onCreate failed", e)
            Toast.makeText(this, "Initialization error: ${e.message}", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    override fun onStart() {
        super.onStart()
        initializeSession()
        presenceHandler.removeCallbacks(presenceCheckRunnable)
        presenceHandler.post(presenceCheckRunnable)
    }

    override fun onStop() {
        super.onStop()
        if (listenersAttached) {
            detachListeners()
            listenersAttached = false
        }
        sessionTimer?.cancel()
        presenceHandler.removeCallbacks(presenceCheckRunnable)
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

        user.getIdToken(false).addOnSuccessListener { result ->
            val isTemp = result.claims["isTempAccount"] as? Boolean ?: false
            val expiresAt = (result.claims["expiresAt"] as? Number)?.toLong()

            isTempAccount = isTemp
            pathPrefix = if (isTemp) "sim/${user.uid}/" else ""

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
            fetchRoleAndApplyUi(user.uid)
            attachListeners()
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

        if (isAdmin) {
            binding.relaySection.visibility = View.VISIBLE
            binding.demoSection.visibility = View.VISIBLE
        } else {
            binding.relaySection.visibility = View.GONE
            binding.demoSection.visibility = View.GONE
        }

        updateRelayControls()
    }

    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
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
        showToast(message)
        triggerInfoNotification("Data realtime dikosongkan", message)
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
        binding.btnRelayOn.isEnabled = canControl
        binding.btnRelayOff.isEnabled = canControl
        binding.btnRelayOn.alpha = if (canControl) 1f else 0.55f
        binding.btnRelayOff.alpha = if (canControl) 1f else 0.55f
    }

    private fun refreshPresenceUi() {
        val label = currentConnectionLabel()
        val color = when (label) {
            "Connected" -> Color.parseColor("#22c55e")
            "Memeriksa perangkat..." -> Color.parseColor("#f59e0b")
            "Memulihkan..." -> Color.parseColor("#f59e0b")
            else -> Color.parseColor("#ef4444")
        }

        binding.tvConnectionState.text = label
        binding.tvConnectionState.setTextColor(color)
        binding.tvDataSource.text = if (label == "Connected") "CLOUD" else "CLOUD • $label"
        updateRelayControls()
    }

    private fun setupChart() {
        val chart = binding.lineChart
        chart.description.isEnabled = false
        chart.setDrawGridBackground(false)
        chart.setDrawBorders(false)
        chart.axisRight.isEnabled = false
        chart.legend.textColor = Color.WHITE
        
        // Add No Data text placeholder
        chart.setNoDataText("Belum ada riwayat statistik.")
        chart.setNoDataTextColor(Color.parseColor("#9ca3af"))
        
        val xAxis = chart.xAxis
        xAxis.position = XAxis.XAxisPosition.BOTTOM
        xAxis.textColor = Color.LTGRAY
        xAxis.setDrawGridLines(false)
        xAxis.setAvoidFirstLastClipping(true)

        val yAxis = chart.axisLeft
        yAxis.textColor = Color.LTGRAY
        yAxis.setDrawGridLines(true)
        yAxis.gridColor = Color.parseColor("#33FFFFFF")
        yAxis.axisMinimum = 0f

        chart.invalidate()
    }

    private fun setupRecyclerView() {
        historyAdapter = HistoryAdapter(emptyList())
        binding.rvHistory.apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = historyAdapter
        }
    }

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
            override fun onCancelled(error: DatabaseError) { }
        }
        connectedRef?.addValueEventListener(connectedListener!!)
    }

    private fun startDashboardListener() {
        if (dashboardListener != null) return

        dashboardRef = db.getReference("${pathPrefix}listrik")
        dashboardListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                if(!snapshot.exists()) return

                val status = snapshot.child("status").getValue(String::class.java) ?: "NORMAL"
                val arus = snapshot.child("arus").getValue(Double::class.java) ?: 0.0
                val tegangan = snapshot.child("tegangan").getValue(Double::class.java) ?: 0.0
                val frekuensi = snapshot.child("frekuensi").getValue(Double::class.java) ?: 50.0
                val pf = snapshot.child("power_factor").getValue(Double::class.java) ?: 0.85
                val apparent = snapshot.child("apparent_power").getValue(Double::class.java)
                    ?: snapshot.child("daya").getValue(Double::class.java)
                    ?: (arus * tegangan)
                // Prefer daya_w written by simulator; fall back to V*I*PF
                val dayaW = snapshot.child("daya_w").getValue(Double::class.java)
                    ?: (apparent * pf)
                val energi = snapshot.child("energi_kwh").getValue(Double::class.java) ?: 0.0
                val updatedAt = snapshot.child("updated_at").getValue(Long::class.java)
                    ?: snapshot.child("updated_at").getValue(Double::class.java)?.toLong()
                    ?: snapshot.child("updated_at").getValue(String::class.java)?.toLongOrNull()
                    ?: 0L
                val resetByAdmin = snapshot.child("reset_by_admin").getValue(Boolean::class.java) ?: false
                val resetAt = snapshot.child("reset_at").getValue(String::class.java) ?: ""
                val resetNote = snapshot.child("reset_note").getValue(String::class.java) ?: ""

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

                binding.tvStatus.text = status
                binding.tvArus.text = String.format("%.2f", arus)
                binding.tvTegangan.text = String.format("%.1f", tegangan)
                binding.tvDayaW.text = String.format("%.0f", dayaW)
                binding.tvEnergiKwh.text = String.format("%.3f", energi)
                refreshPresenceUi()

                updateStatusColor(status)
                addChartEntry(arus.toFloat(), tegangan.toFloat())
            }
            override fun onCancelled(error: DatabaseError) { }
        }
        dashboardRef?.addValueEventListener(dashboardListener!!)
    }

    private fun startHistoryListener() {
        if (historyChildListener != null) return

        historyByKey.clear()
        historyList.clear()
        binding.tvHistoryEmpty.visibility = View.VISIBLE
        binding.rvHistory.visibility = View.GONE

        val logsQuery = db.getReference("${pathPrefix}logs").orderByKey().limitToLast(15)
        historyQuery = logsQuery
        historyChildListener = object : ChildEventListener {
            override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                upsertHistory(snapshot)
                renderHistory()
            }

            override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {
                upsertHistory(snapshot)
                renderHistory()
            }

            override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {
                // We don't rely on ordering shifts for this UI (history is rebuilt from keys),
                // but we must implement the callback to satisfy ChildEventListener contract.
                upsertHistory(snapshot)
                renderHistory()
            }

            override fun onChildRemoved(snapshot: DataSnapshot) {
                val key = snapshot.key
                if (key != null) historyByKey.remove(key)
                renderHistory()
            }

            override fun onCancelled(error: DatabaseError) { }
        }
        logsQuery.addChildEventListener(historyChildListener!!)
    }

    private fun upsertHistory(snapshot: DataSnapshot) {
        val key = snapshot.key ?: return
        val log = snapshot.getValue(HistoryLog::class.java) ?: return
        historyByKey[key] = log.copy(key = key)
    }

    private fun renderHistory() {
        historyList.clear()
        val keysDesc = historyByKey.keys.sortedDescending()
        for (k in keysDesc) {
            historyByKey[k]?.let { historyList.add(it) }
        }

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
        
        // Populasikan data logs ke grafik jika grafik masih kosong (baru dibuka)
        val chart = binding.lineChart
        if (chart.data == null && historyList.isNotEmpty()) {
            // Ambil maksimal 20 data terakhir, di-urutkan kronologis (terlama ke terbaru)
            val toPlot = historyList.take(maxDataPoints).reversed()
            for (log in toPlot) {
                val arus = (log.arus as? Number)?.toFloat() ?: 0f
                val teg = (log.tegangan as? Number)?.toFloat() ?: 0f
                addChartEntry(arus, teg)
            }
        }
    }

    private fun updateStatusColor(status: String) {
        if (status == lastStatus) return
        
        // --- 🚨 TRIGGER ALARM LOKAL UNTUK DEMO 🚨 ---
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
            "NORMAL" -> Color.parseColor("#22c55e")
            else -> Color.parseColor("#f59e0b")
        }

        dangerPulseAnimator?.cancel()
        dangerPulseAnimator = null

        val colorAnimation = ValueAnimator.ofObject(ArgbEvaluator(), currentStatusColor, colorTo)
        colorAnimation.duration = 600
        colorAnimation.addUpdateListener { animator ->
            val color = animator.animatedValue as Int
            currentStatusColor = color
            
            val alphaColor = Color.argb(
                50,
                Color.red(color),
                Color.green(color),
                Color.blue(color)
            )
            binding.cardStatusOverlay.setBackgroundColor(alphaColor)
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

    private fun startDangerPulse() {
        val baseColor = Color.parseColor("#ef4444")
        val glowColor = Color.parseColor("#33ff4444") // Add a glow tint
        val normalAlpha = Color.argb(50, Color.red(baseColor), Color.green(baseColor), Color.blue(baseColor))

        dangerPulseAnimator = ValueAnimator.ofObject(ArgbEvaluator(), normalAlpha, glowColor)
        dangerPulseAnimator?.duration = 1000
        dangerPulseAnimator?.repeatCount = ValueAnimator.INFINITE
        dangerPulseAnimator?.repeatMode = ValueAnimator.REVERSE
        dangerPulseAnimator?.addUpdateListener { animator ->
            val color = animator.animatedValue as Int
            binding.cardStatusOverlay.setBackgroundColor(color)
        }
        dangerPulseAnimator?.start()
    }

    private fun addChartEntry(arus: Float, tegangan: Float) {
        val chart = binding.lineChart
        var data = chart.data
        if (data == null) {
            data = LineData()
            chart.data = data
        }
        
        binding.tvChartLoading.visibility = View.GONE

        var setArus = data.getDataSetByIndex(0) as LineDataSet?
        var setTeg = data.getDataSetByIndex(1) as LineDataSet?

        if (setArus == null) {
            setArus = createSet("Arus (A)", Color.parseColor("#06b6d4"))
            data.addDataSet(setArus)
        }
        if (setTeg == null) {
            // Tegangan scale is much higher, normally requires a second Y-Axis
            // But we will map it on the same axis for simplicity, user can see the shape.
            // Or ideally scale it.
            setTeg = createSet("Tegangan (V)", Color.parseColor("#f59e0b"))
            // Disable tegangan plot if not requested, but let's just plot it
            setTeg.axisDependency = com.github.mikephil.charting.components.YAxis.AxisDependency.RIGHT
            chart.axisRight.isEnabled = true
            chart.axisRight.textColor = Color.LTGRAY
            chart.axisRight.setDrawGridLines(false)
            data.addDataSet(setTeg)
        }

        data.addEntry(Entry(chartTimeIndex, arus), 0)
        data.addEntry(Entry(chartTimeIndex, tegangan), 1)
        
        chartTimeIndex++
        
        // Remove old entries to keep window to last maxDataPoints
        if (setArus.entryCount > maxDataPoints) {
            setArus.removeFirst()
            setTeg.removeFirst()
            // Re-adjust X bounds
            chart.xAxis.axisMinimum = setArus.getEntryForIndex(0).x
        }

        data.notifyDataChanged()
        chart.notifyDataSetChanged()
        chart.setVisibleXRangeMaximum(maxDataPoints.toFloat())
        chart.moveViewToX(data.entryCount.toFloat())

        // Calculate and Update Stats
        arusHistory.add(arus)
        tegHistory.add(tegangan)
        if (arusHistory.size > maxDataPoints) arusHistory.removeAt(0)
        if (tegHistory.size > maxDataPoints) tegHistory.removeAt(0)

        val avgArus = arusHistory.average()
        val maxArus = arusHistory.maxOrNull() ?: 0f
        val avgTeg = tegHistory.average()
        val maxTeg = tegHistory.maxOrNull() ?: 0f

        binding.tvAvgArus.text = String.format("%.2f A", avgArus)
        binding.tvMaxArus.text = String.format("%.2f A", maxArus)
        binding.tvAvgTeg.text = String.format("%.1f V", avgTeg)
        binding.tvMaxTeg.text = String.format("%.1f V", maxTeg)
    }

    private fun createSet(label: String, colorRGB: Int): LineDataSet {
        val set = LineDataSet(null, label)
        set.axisDependency = com.github.mikephil.charting.components.YAxis.AxisDependency.LEFT
        set.color = colorRGB
        set.setCircleColor(colorRGB)
        set.lineWidth = 2f
        set.circleRadius = 3f
        set.fillAlpha = 65
        set.fillColor = colorRGB
        set.highLightColor = Color.WHITE
        set.valueTextColor = Color.WHITE
        set.valueTextSize = 9f
        set.setDrawValues(false)
        set.mode = LineDataSet.Mode.CUBIC_BEZIER // Smooth line
        return set
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

        db.getReference("${pathPrefix}listrik/relay")
            .setValue(value)
            .addOnFailureListener { e ->
                val msg = e.message ?: "Gagal mengirim perintah relay."
                showToast("Gagal mengirim perintah relay: $msg")
            }
    }

    private fun triggerDemoMode(state: String) {
        if (!isAdmin || isTempAccount) {
            showToast("Demo mode hanya tersedia untuk admin.")
            return
        }

        // Force fully overriding the RTDB so FCM Web and Cloud Functions will catch it instantly
        // Wait, Cloud Functions requires it to hit /listrik/status!
        db.getReference("${pathPrefix}listrik/status").setValue(state)
        
        // Let's also enforce dummy data to look more realistic if needed,
        // although real ESP will overwrite it. Temporary override is enough for demo.
        if (state == "DANGER") {
            db.getReference("${pathPrefix}listrik/arus").setValue(3.45)
            db.getReference("${pathPrefix}listrik/tegangan").setValue(180.0)
        } else if (state == "WARNING") {
            db.getReference("${pathPrefix}listrik/arus").setValue(1.15)
        } else {
            db.getReference("${pathPrefix}listrik/arus").setValue(0.45)
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
