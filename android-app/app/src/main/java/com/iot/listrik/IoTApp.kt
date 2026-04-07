package com.iot.listrik

import android.app.Application
import com.google.firebase.FirebaseApp

class IoTApp : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
    }
}
