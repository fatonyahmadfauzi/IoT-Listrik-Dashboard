package com.iot.listrik.ui.alarm

import android.app.KeyguardManager
import android.content.Context
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import com.iot.listrik.databinding.ActivityAlarmBinding

class AlarmActivity : AppCompatActivity() {
    private lateinit var binding: ActivityAlarmBinding
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var fadeAnimator: android.animation.ValueAnimator? = null

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

        startSirenAndVibration()

        binding.btnDismiss.setOnClickListener {
            stopSirenAndVibration()
            finish() // Close alarm, returns to previous app or home
        }
    }

    private fun startSirenAndVibration() {
        // Play Alarm Sound with fallback
        var uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        if (uri != null) {
            try {
                mediaPlayer = MediaPlayer().apply {
                    val audioAttributes = android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                    setAudioAttributes(audioAttributes)
                    setDataSource(this@AlarmActivity, uri)
                    isLooping = true
                    prepare()
                    
                    setVolume(0f, 0f)
                    start()
                    
                    // Fade In Audio Drama (over 6 seconds)
                    fadeAnimator = android.animation.ValueAnimator.ofFloat(0f, 1f)
                    fadeAnimator?.duration = 6000
                    fadeAnimator?.addUpdateListener { animator ->
                        val v = animator.animatedValue as Float
                        try {
                            setVolume(v, v)
                        } catch (e: Exception) {
                            // Ignore if released
                        }
                    }
                    fadeAnimator?.start()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // Vibrate
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        
        val pattern = longArrayOf(0, 100, 50, 100, 50, 600, 200, 600)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(pattern, 0)
        }
    }

    private fun stopSirenAndVibration() {
        fadeAnimator?.cancel()
        fadeAnimator = null
        
        try {
            mediaPlayer?.stop()
        } catch (e: Exception) {}
        mediaPlayer?.release()
        mediaPlayer = null
        
        vibrator?.cancel()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopSirenAndVibration()
    }
}
