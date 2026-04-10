package com.iot.listrik.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.iot.listrik.ui.alarm.AlarmActivity
import com.iot.listrik.service.AlarmForegroundService

class FCMReceiverService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        val action = message.data["action"]
        if (action == "TRIGGER_ALARM") {
            Log.d("FCM", "TRIGGER_ALARM received!")
            // Start alarm global supaya tetap bunyi walau user pindah menu/tab
            AlarmForegroundService.start(this)
            showFullScreenAlarm(
                message.data["title"] ?: "BAHAYA!",
                message.data["message"] ?: "Kebocoran arus dideteksi."
            )
        } else if (action == "STOP_ALARM") {
            Log.d("FCM", "STOP_ALARM received - stopping service.")
            AlarmForegroundService.stop(this)
        }
    }

    private fun showFullScreenAlarm(title: String, message: String) {
        val fullScreenIntent = Intent(this, AlarmActivity::class.java).apply {
            putExtra("EXTRA_TITLE", title)
            putExtra("EXTRA_MESSAGE", message)
            // Hindari CLEAR_TASK (sering bikin crash pada beberapa device saat dipanggil dari service)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }

        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            0,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val channelId = "ALARM_CHANNEL_ID"
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Critical Alarms",
                NotificationManager.IMPORTANCE_HIGH
            )
            notificationManager.createNotificationChannel(channel)
        }

        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            // THE MOST IMPORTANT LINE FOR FULL SCREEN WAKE
            .setFullScreenIntent(fullScreenPendingIntent, true) 
            .setAutoCancel(true)

        notificationManager.notify(1001, notificationBuilder.build())
    }
}
