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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
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
        FirebaseMessaging.getInstance().subscribeToTopic("iot_alarms")

        binding.btnLogout.setOnClickListener {
            auth.signOut()
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }

        binding.btnRelayOn.setOnClickListener { setRelay(1) }
        binding.btnRelayOff.setOnClickListener { setRelay(0) }

        binding.btnDemoNormal.setOnClickListener { triggerDemoMode("NORMAL") }
        binding.btnDemoWarning.setOnClickListener { triggerDemoMode("WARNING") }
        binding.btnDemoDanger.setOnClickListener { triggerDemoMode("DANGER") }

        setupChart()
        setupRecyclerView()
        
        startConnectionListener()
        startDashboardListener()
        startHistoryListener()
    }

    private fun setupChart() {
        val chart = binding.lineChart
        chart.description.isEnabled = false
        chart.setDrawGridBackground(false)
        chart.setDrawBorders(false)
        chart.axisRight.isEnabled = false
        chart.legend.textColor = Color.WHITE

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

        val data = LineData()
        chart.data = data
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
        val connectedRef = db.getReference(".info/connected")
        connectedRef.addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val connected = snapshot.getValue(Boolean::class.java) ?: false
                if (connected) {
                    binding.tvConnectionState.text = "Connected"
                    binding.tvConnectionState.setTextColor(Color.parseColor("#22c55e"))
                } else {
                    binding.tvConnectionState.text = "Offline / Reconnecting..."
                    binding.tvConnectionState.setTextColor(Color.parseColor("#ef4444"))
                }
            }
            override fun onCancelled(error: DatabaseError) { }
        })
    }

    private fun startDashboardListener() {
        db.getReference("listrik").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                if(!snapshot.exists()) return
                
                val status = snapshot.child("status").getValue(String::class.java) ?: "NORMAL"
                val arus = snapshot.child("arus").getValue(Double::class.java) ?: 0.0
                val tegangan = snapshot.child("tegangan").getValue(Double::class.java) ?: 0.0
                
                val statusText = when (status) {
                    "DANGER" -> "Critical Leak Detected"
                    "WARNING" -> "Check Load"
                    else -> "System Stable"
                }
                
                binding.tvStatus.text = statusText
                binding.tvArus.text = String.format("%.2f", arus)
                binding.tvTegangan.text = String.format("%.1f", tegangan)

                updateStatusColor(status)
                addChartEntry(arus.toFloat(), tegangan.toFloat())
            }
            override fun onCancelled(error: DatabaseError) { }
        })
    }

    private fun startHistoryListener() {
        val logsQuery = db.getReference("logs").orderByKey().limitToLast(15)
        logsQuery.addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                historyList.clear()
                for (child in snapshot.children) {
                    val log = child.getValue(HistoryLog::class.java)
                    if (log != null) {
                        historyList.add(0, log.copy(key = child.key)) // Reverse order (newest first)
                    }
                }
                if (historyList.isEmpty()) {
                    binding.tvHistoryEmpty.visibility = View.VISIBLE
                    binding.rvHistory.visibility = View.GONE
                } else {
                    binding.tvHistoryEmpty.visibility = View.GONE
                    binding.rvHistory.visibility = View.VISIBLE
                    historyAdapter.updateData(historyList)
                    binding.rvHistory.smoothScrollToPosition(0)
                }
            }
            override fun onCancelled(error: DatabaseError) { }
        })
    }

    private fun updateStatusColor(status: String) {
        if (status == lastStatus) return
        
        // --- 🚨 TRIGGER ALARM LOKAL UNTUK DEMO 🚨 ---
        if (status == "DANGER" && lastStatus != "DANGER") {
            // Munculkan di Notification Tray Android
            triggerLocalNotification("BAHAYA KRITIS!", "Kebocoran arus tingkat bahaya dideteksi!")
            
            // Buka halaman Alarm merah Full-Screen yang berisi codingan Suara Sirene & Getar
            val intent = Intent(this, com.iot.listrik.ui.alarm.AlarmActivity::class.java).apply {
                putExtra("EXTRA_TITLE", "BAHAYA!")
                putExtra("EXTRA_MESSAGE", "Kebocoran arus tingkat bahaya dideteksi!")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
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
        val data = chart.data ?: return
        
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
        db.getReference("listrik/relay").setValue(value)
    }

    private fun triggerDemoMode(state: String) {
        // Force fully overriding the RTDB so FCM Web and Cloud Functions will catch it instantly
        // Wait, Cloud Functions requires it to hit /listrik/status!
        db.getReference("listrik/status").setValue(state)
        
        // Let's also enforce dummy data to look more realistic if needed,
        // although real ESP will overwrite it. Temporary override is enough for demo.
        if (state == "DANGER") {
            db.getReference("listrik/arus").setValue(3.45)
            db.getReference("listrik/tegangan").setValue(180.0)
        } else if (state == "WARNING") {
            db.getReference("listrik/arus").setValue(1.15)
        } else {
            db.getReference("listrik/arus").setValue(0.45)
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
}
