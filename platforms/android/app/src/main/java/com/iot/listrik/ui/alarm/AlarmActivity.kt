package com.iot.listrik.ui.alarm

import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.iot.listrik.databinding.ActivityAlarmBinding
import com.iot.listrik.service.AlarmForegroundService

class AlarmActivity : AppCompatActivity() {
    private lateinit var binding: ActivityAlarmBinding
    private var stopReceiverRegistered = false
    private val stopReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == AlarmForegroundService.ACTION_ALARM_STOPPED) finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // OVERRIDE LOCK SCREEN
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        super.onCreate(savedInstanceState)
        binding = ActivityAlarmBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val title = intent.getStringExtra("EXTRA_TITLE") ?: "BAHAYA KRITIS!"
        val message = intent.getStringExtra("EXTRA_MESSAGE") ?: "Kebocoran arus dideteksi."
        
        binding.tvAlarmTitle.text = title
        binding.tvAlarmBody.text = message

        if (!AlarmForegroundService.isActive(this)) {
            finish()
            return
        }

        // Suara dan getaran hanya dikelola AlarmForegroundService agar
        // perintah STOP_ALARM dapat menghentikan alarm secara konsisten.
        AlarmForegroundService.start(this)

        binding.btnDismiss.setOnClickListener {
            // Pastikan alarm global (service) juga berhenti saat user dismiss
            AlarmForegroundService.stop(this)
            finish() // Close alarm, returns to previous app or home
        }
    }

    override fun onStart() {
        super.onStart()
        if (!AlarmForegroundService.isActive(this)) {
            finish()
            return
        }
        if (!stopReceiverRegistered) {
            ContextCompat.registerReceiver(
                this,
                stopReceiver,
                IntentFilter(AlarmForegroundService.ACTION_ALARM_STOPPED),
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
            stopReceiverRegistered = true
        }
    }

    override fun onStop() {
        if (stopReceiverRegistered) {
            unregisterReceiver(stopReceiver)
            stopReceiverRegistered = false
        }
        super.onStop()
    }
}

