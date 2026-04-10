package com.iot.listrik.data.model

import com.google.firebase.database.IgnoreExtraProperties

@IgnoreExtraProperties
data class HistoryLog(
    val key: String? = null,
    val arus: Any? = 0.0,
    val tegangan: Any? = 0.0,
    val status: String? = "NORMAL",
    val relay: Any? = 0,
    val waktu: Any? = "",
    val energi_kwh: Any? = 0.0,
    val frekuensi: Any? = 0.0,
    val power_factor: Any? = 0.0
)
