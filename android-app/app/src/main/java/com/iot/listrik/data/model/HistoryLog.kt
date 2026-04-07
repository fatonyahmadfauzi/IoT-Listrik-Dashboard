package com.iot.listrik.data.model

data class HistoryLog(
    val key: String? = null,
    val arus: Double = 0.0,
    val tegangan: Double = 0.0,
    val status: String = "NORMAL",
    val relay: Int = 0,
    val waktu: String = ""
)
