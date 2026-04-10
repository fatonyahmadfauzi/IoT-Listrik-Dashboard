package com.iot.listrik

import android.app.Application
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.database.FirebaseDatabase

class IoTApp : Application() {
    override fun onCreate() {
        super.onCreate()
        try {
            FirebaseApp.initializeApp(this)

            // Enable RTDB persistence so the app has a local cached view
            // (improves UX on flaky networks and reduces re-fetch).
            FirebaseDatabase.getInstance().setPersistenceEnabled(true)
        } catch (e: Exception) {
            Log.e("IoTApp", "Firebase initialization failed", e)
            // Continue anyway - app can still function without Firebase briefly
        }
    }
}
