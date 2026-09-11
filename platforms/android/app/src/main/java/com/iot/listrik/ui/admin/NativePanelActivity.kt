package com.iot.listrik.ui.admin

import android.app.DatePickerDialog
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.content.res.ColorStateList
import android.os.Bundle
import android.net.Uri
import android.text.InputFilter
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.EmailAuthProvider
import com.google.firebase.database.*
import com.iot.listrik.R
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*
import kotlin.concurrent.thread
import org.json.JSONObject
import org.json.JSONArray

/** Native Kotlin admin panels. No WebView/PWA dependency. */
class NativePanelActivity : AppCompatActivity() {
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseDatabase.getInstance()
    private lateinit var root: LinearLayout
    private lateinit var content: LinearLayout
    private lateinit var viewTitle: TextView
    private var activeSection: LinearLayout? = null
    private val fields = mutableMapOf<String, EditText>()
    private val switches = mutableMapOf<String, Switch>()
    private val spinners = mutableMapOf<String, Spinner>()
    private var currentData = mapOf<String, Any?>()
    private var currentSettings = mapOf<String, Any?>()
    private var latestUsers = mutableMapOf<String, Map<String, Any?>>()
    private var userListHost: LinearLayout? = null
    private val telegramRecipients = mutableListOf<TelegramRecipient>()
    private var editingTelegramIndex = -1
    private var telegramList: LinearLayout? = null
    private var telegramSummary: TextView? = null
    private var telegramActionStatus: TextView? = null
    private var discordBotSummaryHost: LinearLayout? = null
    private var adminActionStatus: TextView? = null
    private var databaseBackupStatus: TextView? = null
    private var monitoringWipeStatus: TextView? = null
    private var monitoringWipeActionId = ""
    private var monitoringWipeExpiresAt = 0L

    data class TelegramRecipient(
        var name: String,
        var chatId: String,
        var paused: Boolean = false,
        var pausedAt: Long = 0,
        var resumedAt: Long = 0,
        var pauseSource: String = ""
    )

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val route = intent.getStringExtra(EXTRA_ROUTE) ?: "diagnostics"
        val panelTitle = intent.getStringExtra(EXTRA_TITLE) ?: "Panel Sistem"
        buildShell(panelTitle)
        if (route == "diagnostics") {
            showDiagnostics()
            return
        }
        val uid = auth.currentUser?.uid
        if (uid.isNullOrBlank()) {
            message("Sesi login tidak ditemukan.", true)
            return
        }
        db.getReference("users/$uid/role").get()
            .addOnSuccessListener { snap ->
                if (snap.getValue(String::class.java) != "admin") {
                    message("Akses admin diperlukan untuk membuka panel ini.", true)
                    finish()
                    return@addOnSuccessListener
                }
                when (route) {
                    "settings" -> showSettings()
                    "telegram" -> showTelegram()
                    "discord" -> showDiscord()
                    "users" -> showUsers()
                    else -> showDiagnostics()
                }
            }
            .addOnFailureListener {
                message("Role admin tidak dapat diverifikasi: ${it.message}", true)
                finish()
            }
    }

    private fun buildShell(text: String) {
        root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(Color.rgb(7, 12, 20)) }
        val bar = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(dp(8), 0, dp(8), 0); setBackgroundColor(Color.rgb(17, 24, 32)) }
        val back = ImageButton(this).apply {
            setImageResource(R.drawable.ic_arrow_back_24)
            setBackgroundColor(Color.TRANSPARENT)
            setPadding(dp(12), dp(12), dp(12), dp(12))
            scaleType = ImageView.ScaleType.CENTER
            contentDescription = "Kembali"
            isClickable = true
            isFocusable = true
            setOnClickListener { finish() }
        }
        bar.addView(back, LinearLayout.LayoutParams(dp(48), dp(56)))
        viewTitle = TextView(this).apply { this.text = text; textSize = 16f; setTextColor(Color.WHITE); setTypeface(null, Typeface.BOLD); gravity = Gravity.CENTER_VERTICAL; includeFontPadding = false }
        bar.addView(viewTitle, LinearLayout.LayoutParams(0, dp(56), 1f))
        val reload = ImageButton(this).apply {
            setImageResource(R.drawable.ic_refresh_24)
            setBackgroundColor(Color.TRANSPARENT)
            setPadding(dp(12), dp(12), dp(12), dp(12))
            scaleType = ImageView.ScaleType.CENTER
            contentDescription = "Muat ulang"
            isClickable = true
            isFocusable = true
            setOnClickListener { recreate() }
        }
        bar.addView(reload, LinearLayout.LayoutParams(dp(48), dp(56)))
        root.addView(bar, LinearLayout.LayoutParams(-1, dp(56)))
        val scroll = ScrollView(this).apply { isFillViewport = true; clipToPadding = false }
        content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(8), dp(16), dp(24)) }
        scroll.addView(content)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)
    }

    private fun showDiagnostics() {
        section(
            "Pemeriksaan kesehatan sistem",
            "Status diperbarui dari data perangkat terbaru. Pemeriksaan tidak mengubah konfigurasi atau menyalakan beban."
        )
        val overall = badge("MEMERIKSA...", AMBER)
        addToSection(overall, LinearLayout.LayoutParams(-2, dp(28)).apply { topMargin = dp(2) })
        activeSection = null

        val diagnosticsHost = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        content.addView(diagnosticsHost)
        val pinHost = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val firmwareHost = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        var firebaseConnected = false
        var payloadLoaded = false

        fun render() {
            diagnosticsHost.removeAllViews()
            pinHost.removeAllViews()
            val rawStatus = str("status", "UNKNOWN").uppercase(Locale.US)
            val updatedAt = timestampOf(currentData)
            val age = if (updatedAt > 0) System.currentTimeMillis() - updatedAt else Long.MAX_VALUE
            val deviceOnline = firebaseConnected && age <= 20_000L
            val meterOk = currentData["meter_ok"] as? Boolean
                ?: (rawStatus != "SENSOR_ERROR" && numValue("tegangan") > 1.0)
            val lcdReported = currentData["lcd_ok"] is Boolean
            val lcdOk = currentData["lcd_ok"] as? Boolean == true

            diagnosticsHost.addView(statusCard(
                "⚡", "PZEM-004T", "Sensor tegangan, arus, daya, energi, frekuensi, dan faktor daya.",
                if (meterOk && deviceOnline) "BERFUNGSI" else "ERROR",
                if (meterOk && deviceOnline) GREEN else RED,
                listOf("Status pembacaan" to rawStatus, "Arus / tegangan" to "${num("arus", 2)} A / ${num("tegangan", 1)} V")
            ))
            val rssi = numValue("wifi_rssi")
            val wifi = if (rssi <= 0 && rssi > -150) {
                val quality = when { rssi >= -60 -> "Sangat baik"; rssi >= -70 -> "Baik"; rssi >= -80 -> "Lemah"; else -> "Sangat lemah" }
                "${rssi.toInt()} dBm · $quality"
            } else "Menunggu firmware terbaru"
            diagnosticsHost.addView(statusCard(
                "▣", "ESP32 dan Wi-Fi", "Heartbeat perangkat dan kekuatan koneksi terakhir.",
                if (deviceOnline) "ONLINE" else "OFFLINE", if (deviceOnline) GREEN else RED,
                listOf("Wi-Fi" to wifi, "Heap bebas" to heap())
            ))
            val lcdBadge = when { !lcdReported -> "MENUNGGU DATA"; lcdOk -> "TERDETEKSI"; else -> "ERROR" }
            val lcdColor = when { !lcdReported -> AMBER; lcdOk -> GREEN; else -> RED }
            val lcdAddress = currentData["lcd_address"]?.toString()?.toIntOrNull()?.takeIf { it > 0 }
                ?.let { "0x${it.toString(16).uppercase(Locale.US).padStart(2, '0')}" }
                ?: if (lcdReported) "Tidak ditemukan" else "—"
            diagnosticsHost.addView(statusCard(
                "▤", "LCD I2C", "Memeriksa respons modul pada alamat I2C yang dilaporkan ESP32.",
                lcdBadge, lcdColor,
                listOf("Alamat" to lcdAddress, "Catatan" to if (lcdOk) "Modul merespons pada bus I2C" else if (lcdReported) "Periksa VCC, GND, SDA, SCL, dan backpack LCD" else "Upload firmware diagnostik terbaru")
            ))
            diagnosticsHost.addView(statusCard(
                "◉", "Relay dan buzzer", "Menampilkan status logis terakhir; keberhasilan fisik perlu uji langsung.",
                if (deviceOnline) "STATUS LOGIS" else "TIDAK DIKETAHUI", if (deviceOnline) AMBER else RED,
                listOf("Relay logis" to if (deviceOnline) if (bool("relay")) "ON" else "OFF" else "Tidak ada heartbeat", "Buzzer" to "Tidak dapat dipastikan jarak jauh")
            ))
            diagnosticsHost.addView(statusCard(
                "☁", "Firebase", "Status koneksi aplikasi ke Realtime Database.",
                if (firebaseConnected) "TERHUBUNG" else "TERPUTUS", if (firebaseConnected) GREEN else RED,
                listOf("Koneksi" to if (firebaseConnected) "Realtime Database terhubung" else "Koneksi Firebase terputus", "Sumber data" to str("sensor_source", "PZEM-004T"))
            ))

            val pinPanel = surfacePanel("account_tree", "Konfigurasi Hardware", "Pemetaan Pin Firmware", "Menampilkan GPIO yang diuji firmware dan hasil respons komponennya. Informasi ini tidak mendeteksi lokasi kabel pada GPIO lain secara otomatis.")
            val pinOverall = when {
                !deviceOnline || !meterOk || (lcdReported && !lcdOk) -> "PERLU DIPERIKSA" to RED
                !lcdReported -> "DATA BELUM LENGKAP" to AMBER
                else -> "JALUR MERESPONS" to GREEN
            }
            pinPanel.addView(badge(pinOverall.first, pinOverall.second), LinearLayout.LayoutParams(-2, dp(28)).apply { bottomMargin = dp(10) })
            val pzemRx = intData("pzem_rx_pin", 16); val pzemTx = intData("pzem_tx_pin", 17)
            val lcdSda = intData("lcd_sda_pin", 21); val lcdScl = intData("lcd_scl_pin", 22)
            pinPanel.addView(hardwareRow("⚡", "PZEM-004T · UART2", "ESP32 RX GPIO$pzemRx <- PZEM TX · ESP32 TX GPIO$pzemTx -> PZEM RX", if (deviceOnline && meterOk) "RESPONS VALID" else if (!deviceOnline) "TIDAK DIKETAHUI" else "TIDAK MERESPONS", if (deviceOnline && meterOk) GREEN else RED, if (deviceOnline && meterOk) "PZEM menghasilkan pembacaan valid pada UART2 GPIO$pzemRx/GPIO$pzemTx." else "Komunikasi PZEM gagal; periksa TX/RX, level shifter, 5 V, dan GND."))
            pinPanel.addView(hardwareRow("▤", "LCD 1602 · I2C", "SDA GPIO$lcdSda · SCL GPIO$lcdScl", if (!lcdReported) "MENUNGGU FIRMWARE" else if (lcdOk) "I2C MERESPONS" else "TIDAK TERDETEKSI", if (!lcdReported) AMBER else if (lcdOk) GREEN else RED, if (!lcdReported) "Firmware lama belum melaporkan hasil scan I2C pada GPIO$lcdSda/GPIO$lcdScl." else if (lcdOk) "LCD merespons pada SDA GPIO$lcdSda dan SCL GPIO$lcdScl." else "Tidak ada respons LCD pada SDA GPIO$lcdSda/SCL GPIO$lcdScl; periksa VCC, GND, kabel, dan backpack."))
            pinPanel.addView(hardwareRow("◉", "Relay utama", "Output GPIO${intData("relay_pin", 26)}", if (deviceOnline) if (bool("relay")) "LOGIS ON" else "LOGIS OFF" else "TIDAK DIKETAHUI", if (deviceOnline) AMBER else RED, "Firmware hanya mengetahui level output; kontak fisik memerlukan umpan balik tambahan."))
            pinPanel.addView(hardwareRow("♩", "Buzzer", "Output GPIO${intData("buzzer_pin", 25)}", "TERKONFIGURASI", AMBER, "Firmware mengetahui perintah GPIO, tetapi tidak dapat memastikan suara secara fisik."))
            pinHost.addView(pinPanel, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(10) })

            val overallState = when {
                !firebaseConnected || !deviceOnline || !meterOk || (lcdReported && !lcdOk) -> "PERLU DIPERIKSA" to RED
                !lcdReported -> "DATA BELUM LENGKAP" to AMBER
                else -> "SEMUA NORMAL" to GREEN
            }
            styleBadge(overall, overallState.first, overallState.second)
            if (payloadLoaded && firmwareHost.childCount == 0) renderFirmwarePanel(firmwareHost)
        }

        content.addView(pinHost)
        content.addView(firmwareHost)
        db.getReference(".info/connected").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) { firebaseConnected = snapshot.getValue(Boolean::class.java) == true; render() }
            override fun onCancelled(error: DatabaseError) { firebaseConnected = false; render() }
        })
        db.getReference("listrik").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) { currentData = snapMap(snapshot); payloadLoaded = true; render() }
            override fun onCancelled(error: DatabaseError) { currentData = emptyMap(); payloadLoaded = true; render() }
        })
    }

    private fun showSettings() {
        section("Sistem & Sensor", "Atur batas deteksi, interval data, buzzer, dan perlindungan relay. Perubahan disimpan ke node settings dan dibaca ESP32 pada sinkronisasi berikutnya.")
        field("thresholdArus", "Threshold arus (A)", "0.5")
        field("warningPercent", "Batas warning (%)", "80")
        field("sendIntervalMs", "Interval pengiriman (ms)", "2000")
        toggle("realtimeStreamEnabled", "Stream data realtime ke Firebase", true)
        toggle("buzzerEnabled", "Buzzer", true)
        toggle("autoCutoffEnabled", "Auto-cutoff relay", true)

        section("Kalibrasi Sensor", "Bandingkan pembacaan ESP32 dengan alat ukur referensi, lalu masukkan faktor koreksi tanpa mengubah fungsi deteksi.")
        field("arusCalibration", "Faktor kalibrasi arus", "1.000")
        field("teganganCalibration", "Faktor kalibrasi tegangan", "1.000")
        field("powerFactorEstimate", "Estimasi faktor daya", "0.85")
        field("frequencyHz", "Frekuensi (Hz)", "50")
        action("Simpan Pengaturan Sistem") { saveSettings() }

        section("Auto Learning Beban Normal", "ESP32 merekam beban normal selama durasi yang ditentukan. Proses selesai otomatis atau dapat dihentikan manual.")
        field("learningDuration", "Durasi learning (detik)", "120")
        field("learningMargin", "Margin keamanan (%)", "25")
        toggle("learningApply", "Terapkan threshold otomatis", true)
        val learningState = operationStatus("Memuat", "Mengambil status auto learning dari perangkat.")
        addToSection(learningState)
        db.getReference("settings/autoLearning").addValueEventListener(simple { m ->
            val status = m["status"] ?: "idle"
            val samples = m["sampleCount"] ?: 0
            val learned = m["learnedThresholdArus"] ?: 0
            setOperationStatus(learningState, status.toString().uppercase(Locale("id", "ID")), "Sampel: $samples · Threshold hasil: $learned A", if (status.toString().equals("running", true)) AMBER else Color.rgb(125, 211, 252))
        })
        action("Mulai Auto Learning") { startLearning() }
        action("Hentikan Auto Learning") { updateLearning(false) }

        section("Bootstrap Device & Wi-Fi ESP32", "Khusus admin utama. Kirim konfigurasi Wi-Fi dan Firebase ke perangkat fisik melalui Realtime Database.")
        addToSection(compactDetails(listOf(
            "Akun device" to "Gunakan akun khusus ESP32, bukan akun pengguna dashboard.",
            "Penerapan" to "ESP32 membaca konfigurasi bootstrap, menyimpannya, lalu melakukan restart otomatis."
        )))
        field("wifiSsid", "SSID Wi-Fi", "")
        field("wifiPassword", "Password Wi-Fi", "", true)
        field("firebaseApiKey", "Firebase API Key", "")
        field("firebaseDbUrl", "Realtime Database URL", "https://iot-listrik-dashboard-default-rtdb.asia-southeast1.firebasedatabase.app")
        field("iotEmail", "Email akun device", "")
        field("iotPassword", "Password akun device", "", true)
        action("Simpan & Terapkan Bootstrap") { saveBootstrap("save") }
        action("Hapus Wi-Fi & Buka Setup") { saveBootstrap("clear") }

        section("Administrasi Data Realtime", "Khusus admin utama. Pengosongan node listrik memerlukan konfirmasi nama project dan tidak menghapus settings atau pengguna.")
        field("liveConfirmation", "Ketik: IoT Listrik Dashboard", "")
        adminActionStatus = operationStatus("Siap", "Data realtime pada node listrik akan dikembalikan ke nilai default setelah nama project dikonfirmasi.")
        addToSection(adminActionStatus!!)
        action("Kosongkan Data Realtime") { api("confirm-live-reset", mapOf("confirmationText" to value("liveConfirmation"))) }

        renderDatabaseBackupSection()
        renderMonitoringWipeSection()

        section("Backend & Failover Android", "Disimpan pada perangkat Android ini saja. ESP32 tidak membaca konfigurasi klien berikut.")
        field("publicApiBase", "Public API", "")
        field("localApiBase", "Local API", "http://localhost:3000")
        dropdown("dataMode", "Mode data", listOf("AUTO (Firebase → fallback REST lokal)" to "AUTO", "PUBLIC (Firebase / API publik)" to "PUBLIC", "LOCAL (REST lokal)" to "LOCAL"), "AUTO")
        field("healthPath", "Health path", "/health")
        field("retryIntervalMs", "Interval retry (ms)", "6000")
        field("timeoutMs", "Timeout (ms)", "4000")
        toggle("autoFailover", "Auto failover", true)
        action("Simpan Konfigurasi Backend") { saveLocalConfig() }
        loadSettings()
        loadLocalConfig()
    }

    private fun renderDatabaseBackupSection() {
        section(
            "Backup Database Firebase",
            "Membuat snapshot Realtime Database dan mengirimkannya ke email admin tanpa mengubah data apa pun."
        )
        addToSection(infoPanel(
            "Khusus admin utama",
            "Gunakan sebelum reset atau penghapusan data monitoring agar tersedia arsip database dan rules aktif.",
            AMBER
        ))
        addToSection(compactDetails(listOf(
            "Email tujuan" to (auth.currentUser?.email ?: "Email admin belum tersedia"),
            "Lampiran backup" to "default-rtdb-export.json dan database-rules.json",
            "Dampak aksi" to "Hanya membuat dan mengirim backup; data realtime, histori log, settings, dan pengguna tidak disentuh."
        )))
        databaseBackupStatus = operationStatus(
            "Siap",
            "Snapshot akan dibuat ketika tombol dijalankan dan dikirim ke email admin yang sedang login."
        )
        addToSection(databaseBackupStatus!!)
        lateinit var backupButton: Button
        backupButton = action("Kirim Backup Database ke Email Admin") {
            backupButton.isEnabled = false
            setOperationStatus(databaseBackupStatus, "Memproses", "Snapshot database sedang dibuat dan dikirim ke email admin.", AMBER)
            api(
                "send-database-backup-email",
                emptyMap(),
                onError = { error ->
                    backupButton.isEnabled = true
                    setOperationStatus(databaseBackupStatus, "Gagal", error, RED)
                },
                onSuccess = { json ->
                    backupButton.isEnabled = true
                    val sentAt = json.optLong("sentAt", 0L)
                    val label = if (sentAt > 0) SimpleDateFormat("dd/MM/yyyy, HH.mm.ss", Locale("id", "ID")).format(Date(sentAt)) else "baru saja"
                    setOperationStatus(databaseBackupStatus, "Berhasil", "Backup database berhasil dikirim pada $label WIB.", GREEN)
                }
            )
        }
    }

    private fun renderMonitoringWipeSection() {
        section(
            "Hapus Semua Data Monitoring",
            "Mengosongkan node listrik dan menghapus seluruh histori logs setelah OTP email diverifikasi."
        )
        addToSection(infoPanel(
            "Tindakan permanen · khusus admin utama",
            "Data monitoring yang dihapus tidak dapat dipulihkan tanpa file backup. Buat backup terlebih dahulu jika datanya masih diperlukan.",
            RED
        ))
        addToSection(compactDetails(listOf(
            "Data yang dihapus" to "Data realtime pada node listrik dan seluruh histori pada node logs",
            "Data yang dipertahankan" to "Settings, pengguna, Telegram, Discord, dan bootstrap device",
            "Email OTP" to (auth.currentUser?.email ?: "Email admin belum tersedia"),
            "Ketentuan OTP" to "Kode 6 digit berlaku beberapa menit dan hanya dapat dipakai satu kali."
        )))
        field("monitoringWipeOtp", "Kode OTP Email Admin", "")
        fields["monitoringWipeOtp"]?.apply {
            inputType = InputType.TYPE_CLASS_NUMBER
            filters = arrayOf(InputFilter.LengthFilter(6))
            hint = "Masukkan 6 digit OTP"
        }
        monitoringWipeStatus = operationStatus(
            "Siap",
            "Kirim OTP ke email admin, lalu masukkan kode untuk menyetujui penghapusan."
        )
        addToSection(monitoringWipeStatus!!)

        lateinit var sendOtpButton: Button
        lateinit var wipeButton: Button
        sendOtpButton = action("Kirim OTP ke Email Admin") {
            sendOtpButton.isEnabled = false
            setOperationStatus(monitoringWipeStatus, "Mengirim OTP", "Menyiapkan kode verifikasi untuk email admin.", AMBER)
            api(
                "request-monitoring-wipe-otp",
                emptyMap(),
                onError = { error ->
                    sendOtpButton.isEnabled = true
                    setOperationStatus(monitoringWipeStatus, "Gagal Mengirim OTP", error, RED)
                },
                onSuccess = { json ->
                    sendOtpButton.isEnabled = true
                    monitoringWipeActionId = json.optString("actionId", "")
                    monitoringWipeExpiresAt = json.optLong("expiresAt", 0L)
                    val expiry = if (monitoringWipeExpiresAt > 0) SimpleDateFormat("HH.mm.ss", Locale("id", "ID")).format(Date(monitoringWipeExpiresAt)) else "beberapa menit"
                    setOperationStatus(monitoringWipeStatus, "OTP Terkirim", "Masukkan 6 digit OTP dari email admin. Kode berlaku sampai $expiry WIB.", GREEN)
                }
            )
        }
        wipeButton = action("Hapus Semua Data Monitoring") {
            val otp = value("monitoringWipeOtp")
            if (!otp.matches(Regex("\\d{6}"))) {
                message("OTP harus terdiri dari 6 digit angka.", true)
                setOperationStatus(monitoringWipeStatus, "OTP Tidak Valid", "Masukkan tepat 6 digit kode dari email admin.", RED)
                return@action
            }
            if (monitoringWipeActionId.isBlank()) {
                message("Kirim OTP terlebih dahulu.", true)
                setOperationStatus(monitoringWipeStatus, "OTP Belum Diminta", "Tekan Kirim OTP ke Email Admin terlebih dahulu.", AMBER)
                return@action
            }
            AlertDialogBuilder(this)
                .setTitle("Hapus semua data monitoring?")
                .setMessage("Data /listrik akan dikosongkan dan seluruh histori /logs akan dihapus. Aksi ini tidak dapat dibatalkan.")
                .setNegativeButton("Batal", null)
                .setPositiveButton("Hapus Data") { _, _ ->
                    wipeButton.isEnabled = false
                    setOperationStatus(monitoringWipeStatus, "Memverifikasi", "Memeriksa OTP dan menghapus data monitoring.", AMBER)
                    api(
                        "confirm-monitoring-wipe",
                        mapOf("otp" to otp, "actionId" to monitoringWipeActionId),
                        onError = { error ->
                            wipeButton.isEnabled = true
                            setOperationStatus(monitoringWipeStatus, "Gagal", error, RED)
                        },
                        onSuccess = { json ->
                            wipeButton.isEnabled = true
                            monitoringWipeActionId = ""
                            monitoringWipeExpiresAt = 0L
                            fields["monitoringWipeOtp"]?.setText("")
                            val clearedAt = json.optLong("clearedAt", 0L)
                            val label = if (clearedAt > 0) SimpleDateFormat("dd/MM/yyyy, HH.mm.ss", Locale("id", "ID")).format(Date(clearedAt)) else "baru saja"
                            setOperationStatus(monitoringWipeStatus, "Berhasil", "Semua data monitoring berhasil dikosongkan pada $label WIB.", GREEN)
                        }
                    )
                }
                .show()
        }
    }

    private fun showTelegram() {
        section("Konfigurasi Telegram", "Atur bot dan penerima notifikasi Telegram langsung dari aplikasi Android.")
        field("telegramBotToken", "Bot Token", "", true)
        val connectRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val connect = actionButton("Hubungkan Bot", false) {
            api("telegram-admin-action", mapOf("action" to "profile", "token" to value("telegramBotToken"))) { json ->
                val botUrl = json.optString("botUrl")
                telegramActionStatus?.text = "Bot @${json.optString("username")} berhasil dikenali. Membuka chat bot di Telegram."
                telegramActionStatus?.setTextColor(GREEN)
                if (botUrl.startsWith("https://")) runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(botUrl))) }
            }
        }
        val test = actionButton("Test Kirim Pesan", false) {
            val active = telegramRecipients.filterNot { it.paused }
            api("telegram-admin-action", mapOf("action" to "test", "token" to value("telegramBotToken"), "recipients" to active.map { mapOf("name" to it.name, "chatId" to it.chatId, "paused" to it.paused) })) { json ->
                telegramActionStatus?.text = "Test berhasil dikirim ke ${json.optInt("successCount")}/${json.optInt("totalRecipients")} tujuan."
                telegramActionStatus?.setTextColor(GREEN)
            }
        }
        connectRow.addView(connect, LinearLayout.LayoutParams(0, dp(44), 1f).apply { rightMargin = dp(5) })
        connectRow.addView(test, LinearLayout.LayoutParams(0, dp(44), 1f).apply { leftMargin = dp(5) })
        addToSection(connectRow, LinearLayout.LayoutParams(-1, dp(44)).apply { topMargin = dp(8); bottomMargin = dp(8) })
        telegramActionStatus = TextView(this).apply { text = "Bot belum diperiksa."; textSize = 11.5f; setTextColor(Color.rgb(148, 163, 184)); setPadding(dp(10), dp(7), dp(10), dp(7)) }
        addToSection(telegramActionStatus!!)
        addToSection(TextView(this).apply { text = "Command personal per Chat ID: /pause, /resume, /status, /diagnostik, /system_update, /firmware, dan /help. Perintah hanya berlaku untuk chat yang mengirimkannya."; textSize = 12f; setTextColor(Color.rgb(148, 163, 184)); setPadding(dp(10), dp(9), dp(10), dp(9)); background = rounded(Color.rgb(15, 34, 55), Color.rgb(37, 99, 235), 10) })
        addToSection(TextView(this).apply { text = "Tambahkan satu atau lebih tujuan. Untuk grup awali dengan -100; untuk pribadi gunakan ID numerik positif. Cara cek: kirim pesan ke @iot_kebocoran_bot lalu buka endpoint getUpdates Telegram."; textSize = 11.5f; setTextColor(Color.rgb(148, 163, 184)); setPadding(0, dp(8), 0, dp(4)) })
        field("telegramRecipientName", "Nama / Label", "")
        field("telegramRecipientChatId", "Chat ID / Group ID", "")
        val addRecipient = actionButton("Tambah Penerima", false) {
            val name = value("telegramRecipientName"); val chatId = value("telegramRecipientChatId")
            if (!chatId.matches(Regex("-?\\d+"))) { message("Chat ID harus berupa angka.", true); return@actionButton }
            if (telegramRecipients.any { it.chatId == chatId }) { message("Chat ID sudah ada.", true); return@actionButton }
            telegramRecipients.add(TelegramRecipient(name, chatId)); renderTelegramRecipients()
            fields["telegramRecipientName"]?.setText(""); fields["telegramRecipientChatId"]?.setText("")
        }
        addToSection(addRecipient, LinearLayout.LayoutParams(-1, dp(44)).apply { topMargin = dp(5); bottomMargin = dp(8) })
        telegramSummary = TextView(this).apply { textSize = 12f; setTextColor(Color.rgb(148, 163, 184)); setPadding(dp(10), dp(8), dp(10), dp(8)) }
        addToSection(telegramSummary!!)
        telegramList = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        addToSection(telegramList!!)
        toggle("telegramNotifyEnabled", "Notifikasi Telegram", true)
        action("Simpan Pengaturan Telegram") {
            val activeIds = telegramRecipients.filterNot { it.paused }.map { it.chatId }
            updateSettings(mapOf("telegramBotToken" to value("telegramBotToken"), "telegramRecipients" to telegramRecipients.map { mapOf("name" to it.name, "chatId" to it.chatId, "paused" to it.paused, "pausedAt" to it.pausedAt, "resumedAt" to it.resumedAt, "pauseSource" to it.pauseSource) }, "telegramChatIds" to activeIds, "telegramChatId" to activeIds.joinToString(","), "telegramNotifyEnabled" to checked("telegramNotifyEnabled")))
        }
        loadTelegramSettings()
    }

    private fun actionButton(label: String, danger: Boolean, run: () -> Unit): Button = Button(this).apply {
        text = label; setAllCaps(false); textSize = 12f; setTypeface(null, Typeface.BOLD); setTextColor(Color.WHITE); minHeight = 0; stateListAnimator = null; backgroundTintList = null
        background = rounded(if (danger) Color.rgb(153, 27, 27) else Color.rgb(37, 99, 235), if (danger) RED else Color.rgb(59, 130, 246), 10); setOnClickListener { run() }
    }

    private fun loadTelegramSettings() {
        db.getReference("settings").addListenerForSingleValueEvent(object : ValueEventListener {
            override fun onDataChange(s: DataSnapshot) {
                val m = snapMap(s); currentSettings = m
                fields["telegramBotToken"]?.setText(m["telegramBotToken"]?.toString() ?: "")
                switches["telegramNotifyEnabled"]?.isChecked = m["telegramNotifyEnabled"] as? Boolean ?: true
                telegramRecipients.clear()
                val raw = m["telegramRecipients"]
                if (raw is List<*>) raw.forEach { item ->
                    if (item is Map<*, *>) telegramRecipients.add(TelegramRecipient(item["name"]?.toString() ?: "", item["chatId"]?.toString() ?: "", item["paused"] == true, item["pausedAt"]?.toString()?.toLongOrNull() ?: 0L, item["resumedAt"]?.toString()?.toLongOrNull() ?: 0L, item["pauseSource"]?.toString() ?: ""))
                }
                if (telegramRecipients.isEmpty()) {
                    val ids = m["telegramChatIds"]?.toString()?.split(",") ?: listOf(m["telegramChatId"]?.toString() ?: "")
                    ids.map { it.trim() }.filter { it.matches(Regex("-?\\d+")) }.forEach { telegramRecipients.add(TelegramRecipient("", it)) }
                }
                renderTelegramRecipients()
            }
            override fun onCancelled(e: DatabaseError) { message("Gagal memuat Telegram: ${e.message}", true) }
        })
    }

    private fun renderTelegramRecipients() {
        val list = telegramList ?: return
        list.removeAllViews()
        val paused = telegramRecipients.count { it.paused }
        telegramSummary?.text = "${telegramRecipients.size} Chat ID / Group ID tersimpan\n${telegramRecipients.size - paused} aktif • $paused pause. Hanya penerima aktif menerima alert, backup, laporan, dan test Telegram."
        telegramRecipients.forEachIndexed { index, recipient ->
            val row = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(11), dp(9), dp(11), dp(9)); background = rounded(Color.rgb(13, 20, 28), Color.rgb(42, 54, 68), 10); setOnClickListener { showTelegramRecipientDialog(index) } }
            row.addView(TextView(this).apply { text = recipient.name.ifBlank { "Penerima ${index + 1}" }; textSize = 13.5f; setTextColor(Color.WHITE); setTypeface(null, Typeface.BOLD) })
            row.addView(TextView(this).apply { text = "${recipient.chatId} • ${if (recipient.paused) "PAUSE" else "AKTIF"}  · ketuk untuk edit/hapus"; textSize = 11.5f; setTextColor(if (recipient.paused) Color.rgb(253, 230, 138) else Color.rgb(134, 239, 172)); setPadding(0, dp(4), 0, 0) })
            list.addView(row, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(7) })
        }
    }

    private fun showTelegramRecipientDialog(index: Int) {
        val recipient = telegramRecipients.getOrNull(index) ?: return
        val options = arrayOf(if (recipient.paused) "Resume penerima" else "Pause penerima", "Edit penerima", "Hapus penerima")
        AlertDialogBuilder(this).setTitle(recipient.name.ifBlank { recipient.chatId }).setItems(options) { _, which ->
            when (which) {
                0 -> { recipient.paused = !recipient.paused; if (recipient.paused) recipient.pausedAt = System.currentTimeMillis() else recipient.resumedAt = System.currentTimeMillis(); recipient.pauseSource = "android"; renderTelegramRecipients() }
                1 -> showEditTelegramDialog(index)
                2 -> { telegramRecipients.removeAt(index); renderTelegramRecipients() }
            }
        }.setNegativeButton("Tutup", null).show()
    }

    private fun showEditTelegramDialog(index: Int) {
        val r = telegramRecipients.getOrNull(index) ?: return
        val wrap = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(18), 0, dp(18), 0) }
        val name = EditText(this).apply { setText(r.name); hint = "Nama / Label" }; val id = EditText(this).apply { setText(r.chatId); hint = "Chat ID / Group ID" }
        wrap.addView(name, LinearLayout.LayoutParams(-1, dp(44))); wrap.addView(id, LinearLayout.LayoutParams(-1, dp(44)))
        AlertDialogBuilder(this).setTitle("Edit Penerima Telegram").setView(wrap).setPositiveButton("Simpan") { _, _ -> if (id.text.toString().trim().matches(Regex("-?\\d+"))) { r.name = name.text.toString().trim(); r.chatId = id.text.toString().trim(); renderTelegramRecipients() } else message("Chat ID harus berupa angka.", true) }.setNegativeButton("Batal", null).show()
    }

    private fun showDiscord() {
        section("Konfigurasi Discord", "Atur webhook dan pengujian notifikasi Discord langsung dari aplikasi Android.")
        field("webhookAlerts", "Webhook Alerts", "", true)
        field("webhookRelay", "Webhook Relay", "", true)
        field("webhookMonitoring", "Webhook Monitoring", "", true)
        field("webhookDailyReport", "Webhook Daily Report", "", true)
        field("webhookLogs", "Webhook Logs", "", true)
        field("webhookDiagnostics", "Webhook Diagnostik Sistem", "", true)
        toggle("discordEnabled", "Discord aktif", true)
        action("Simpan Konfigurasi Discord") { updatePath("settings/discord", mapOf("webhookAlerts" to value("webhookAlerts"), "webhookRelay" to value("webhookRelay"), "webhookMonitoring" to value("webhookMonitoring"), "webhookDailyReport" to value("webhookDailyReport"), "webhookLogs" to value("webhookLogs"), "webhookDiagnostics" to value("webhookDiagnostics"), "enabled" to checked("discordEnabled"))) }
        action("Test Webhook Alerts") { postWebhook(value("webhookAlerts"), false) }
        action("Test Webhook Diagnostik") { postWebhook(value("webhookDiagnostics"), true) }
        loadDiscordSettingsNative()
        section("Discord Bot Admin", "Status bot, server, ban/unban dikelola melalui API admin yang aman.")
        discordBotSummaryHost = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        addToSection(discordBotSummaryHost!!)
        loadDiscordBotStatusNative()
        field("discordBotToken", "Discord Bot Token", "", true)
        field("discordGuildId", "Guild / Server ID", "")
        action("Simpan & Cek Discord Bot") { api("save-discord-bot-config", mapOf("token" to value("discordBotToken"), "guildId" to value("discordGuildId"))) { renderDiscordBotSnapshot(it) } }
        action("Muat Status Discord Bot") { loadDiscordBotStatusNative() }
        field("discordUserId", "Discord User ID", "")
        field("discordBanReason", "Alasan ban / unban", "Dikelola melalui Android IoT Listrik")
        action("Ban Pengguna Discord") { api("ban-discord-user", mapOf("userId" to value("discordUserId"), "reason" to value("discordBanReason"))) { renderDiscordBotSnapshot(it) } }
        action("Unban Pengguna Discord") { api("unban-discord-user", mapOf("userId" to value("discordUserId"), "reason" to value("discordBanReason"))) { renderDiscordBotSnapshot(it) } }
    }


    private fun loadDiscordSettingsNative() {
        db.getReference("settings/discord").addListenerForSingleValueEvent(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val data = snapMap(snapshot)
                listOf("webhookAlerts", "webhookRelay", "webhookMonitoring", "webhookDailyReport", "webhookLogs", "webhookDiagnostics").forEach { key ->
                    fields[key]?.setText(data[key]?.toString() ?: "")
                }
                switches["discordEnabled"]?.isChecked = data["enabled"] as? Boolean ?: true
            }
            override fun onCancelled(error: DatabaseError) { message("Gagal memuat Discord: ${error.message}", true) }
        })
    }

    private fun showUsers() {
        section("Manajemen Pengguna", "Daftar menggabungkan Firebase Authentication dan profil RTDB agar akun tidak hilang dari tampilan.")
        action("Tambah Pengguna") { showAddUserDialog() }
        userListHost = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        addToSection(userListHost!!)
        loadManagedUsers()
    }

    private fun loadManagedUsers() {
        val host = userListHost ?: return
        host.removeAllViews()
        host.addView(TextView(this).apply {
            text = "Memuat akun Authentication dan profil RTDB..."
            textSize = 12f
            setTextColor(Color.rgb(148, 163, 184))
            setPadding(dp(4), dp(10), dp(4), dp(10))
        })
        api("user-admin-action", mapOf("action" to "list"), onError = { error ->
            host.removeAllViews()
            host.addView(TextView(this).apply {
                text = error
                textSize = 12f
                setTextColor(RED)
                setPadding(dp(4), dp(10), dp(4), dp(10))
            })
        }, onSuccess = { json ->
            host.removeAllViews()
            latestUsers.clear()
            val users = json.optJSONArray("users") ?: JSONArray()
            if (users.length() == 0) {
                host.addView(TextView(this).apply {
                    text = "Belum ada pengguna."
                    textSize = 12f
                    setTextColor(Color.rgb(148, 163, 184))
                    setPadding(dp(4), dp(10), dp(4), dp(10))
                })
                return@api
            }
            for (i in 0 until users.length()) {
                val item = users.optJSONObject(i) ?: continue
                val uid = item.optString("uid")
                val role = item.optString("role", "user")
                val state = item.optString("state", "SYNCED")
                val m = mapOf<String, Any?>(
                    "uid" to uid,
                    "email" to item.optString("email"),
                    "displayName" to item.optString("displayName"),
                    "role" to role,
                    "state" to state,
                    "authExists" to item.optBoolean("authExists"),
                    "profileExists" to item.optBoolean("profileExists")
                )
                latestUsers[uid] = m
                val row = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(dp(12), dp(11), dp(12), dp(11))
                    background = rounded(Color.rgb(13, 20, 28), Color.rgb(42, 54, 68), 12)
                    setOnClickListener { chooseUser(uid) }
                }
                val top = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
                top.addView(TextView(this).apply {
                    text = item.optString("displayName").ifBlank { "—" }
                    textSize = 13f
                    setTextColor(Color.WHITE)
                    setTypeface(null, Typeface.BOLD)
                }, LinearLayout.LayoutParams(0, -2, 1f))
                top.addView(badge(role.uppercase(Locale.US), if (role == "admin") AMBER else Color.rgb(96, 165, 250)), LinearLayout.LayoutParams(-2, dp(27)))
                row.addView(top)
                row.addView(TextView(this).apply {
                    text = item.optString("email").ifBlank { "—" }
                    textSize = 12f
                    setTextColor(Color.rgb(148, 163, 184))
                    setPadding(0, dp(4), 0, 0)
                })
                if (state != "SYNCED") {
                    row.addView(TextView(this).apply {
                        text = if (state == "PROFILE_MISSING") "Profil RTDB belum ada — ubah role untuk memulihkan" else "Akun Authentication tidak ditemukan"
                        textSize = 10.5f
                        setTextColor(AMBER)
                        setPadding(0, dp(5), 0, 0)
                    })
                }
                host.addView(row, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(8) })
            }
        })
    }

    private fun chooseUser(uid: String) {
        val m = latestUsers[uid] ?: return
        val email = m["email"]?.toString().orEmpty()
        val state = m["state"]?.toString().orEmpty().uppercase(Locale.US)
        val isCurrentAccount = uid == auth.currentUser?.uid
        val authExists = m["authExists"] == true
        val isOrphan = state == "AUTH_MISSING" || !authExists
        val actions = when {
            isCurrentAccount -> arrayOf("Kirim Reset Password")
            isOrphan -> arrayOf("Jadikan Admin", "Jadikan User", "Hapus Profil Sisa")
            else -> arrayOf("Jadikan Admin", "Jadikan User", "Kirim Reset Password", "Hapus Akun Permanen")
        }

        AlertDialogBuilder(this).setTitle(email.ifBlank { uid }).setItems(actions) { _, which ->
            if (isCurrentAccount) {
                if (email.isNotBlank()) {
                    auth.sendPasswordResetEmail(email)
                        .addOnSuccessListener { message("Email reset password dikirim.", false) }
                        .addOnFailureListener { message("Gagal: ${it.message}", true) }
                } else message("Email akun tidak tersedia.", true)
                return@setItems
            }

            when {
                which == 0 -> api("user-admin-action", mapOf("action" to "set_role", "uid" to uid, "role" to "admin")) { loadManagedUsers() }
                which == 1 -> api("user-admin-action", mapOf("action" to "set_role", "uid" to uid, "role" to "user")) { loadManagedUsers() }
                !isOrphan && which == 2 -> if (email.isNotBlank()) auth.sendPasswordResetEmail(email)
                    .addOnSuccessListener { message("Email reset password dikirim.", false) }
                    .addOnFailureListener { message("Gagal: ${it.message}", true) }
                else -> {
                    val title = if (isOrphan) "Hapus profil sisa?" else "Hapus akun secara permanen?"
                    val text = if (isOrphan)
                        "Profil RTDB akan dihapus. Akun Firebase Authentication untuk akun ini memang sudah tidak ada."
                    else
                        "Firebase Authentication dan profil RTDB akan dihapus. Pengguna tidak dapat login lagi. Tindakan ini tidak dapat dibatalkan."
                    AlertDialogBuilder(this)
                        .setTitle(title)
                        .setMessage(text)
                        .setNegativeButton("Batal", null)
                        .setPositiveButton(if (isOrphan) "Hapus Profil" else "Hapus Akun") { _, _ ->
                            val action = if (isOrphan) "delete_profile" else "delete_account"
                            api("user-admin-action", mapOf("action" to action, "uid" to uid), onError = { error -> message(error, true) }) {
                                message(if (isOrphan) "Profil RTDB berhasil dihapus." else "Akun dihapus permanen dan tidak dapat login lagi.", false)
                                loadManagedUsers()
                            }
                        }
                        .show()
                }
            }
        }.setNegativeButton("Tutup", null).show()
    }

    private fun showAddUserDialog() {
        val wrap = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(18), 0, dp(18), 0) }
        fun input(hintText: String, secret: Boolean = false): EditText = EditText(this).also {
            it.hint = hintText
            it.inputType = if (secret) InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD else InputType.TYPE_CLASS_TEXT
            wrap.addView(it, LinearLayout.LayoutParams(-1, dp(52)))
        }
        val name = input("Nama lengkap")
        val email = input("Email")
        val password = input("Password minimal 8 karakter", true)
        val role = Spinner(this).apply { adapter = ArrayAdapter(this@NativePanelActivity, android.R.layout.simple_spinner_dropdown_item, listOf("user", "admin")) }
        wrap.addView(role, LinearLayout.LayoutParams(-1, dp(52)))
        AlertDialogBuilder(this).setTitle("Tambah Pengguna").setView(wrap)
            .setPositiveButton("Buat") { _, _ -> createSecondaryUser(name.text.toString().trim(), email.text.toString().trim(), password.text.toString(), role.selectedItem.toString()) }
            .setNegativeButton("Batal", null).show()
    }

    private fun createSecondaryUser(name: String, email: String, password: String, role: String) {
        if (email.isBlank() || password.length < 8) {
            message("Email wajib dan password minimal 8 karakter.", true)
            return
        }
        api(
            "user-admin-action",
            mapOf(
                "action" to "create",
                "email" to email,
                "password" to password,
                "displayName" to name,
                "role" to role
            )
        ) { loadManagedUsers() }
    }

    private fun loadSettings() { db.getReference("settings").addListenerForSingleValueEvent(object: ValueEventListener { override fun onDataChange(s:DataSnapshot){ currentSettings=snapMap(s); fields.forEach{(k,v)-> if(k in currentSettings) v.setText(currentSettings[k].toString())}; switches.forEach{(k,v)-> if(k in currentSettings) v.isChecked=currentSettings[k] as? Boolean ?: v.isChecked }; fields["telegramChatIds"]?.setText((currentSettings["telegramChatIds"] as? List<*>)?.joinToString(",") ?: currentSettings["telegramChatId"]?.toString() ?: "") }; override fun onCancelled(e:DatabaseError){message(e.message,true)} }) }
    private fun saveSettings(){ val p=mapOf("thresholdArus" to value("thresholdArus").toDoubleOrNull(),"warningPercent" to value("warningPercent").toDoubleOrNull(),"sendIntervalMs" to value("sendIntervalMs").toLongOrNull(),"realtimeStreamEnabled" to checked("realtimeStreamEnabled"),"buzzerEnabled" to checked("buzzerEnabled"),"autoCutoffEnabled" to checked("autoCutoffEnabled"),"powerFactorEstimate" to value("powerFactorEstimate").toDoubleOrNull(),"frequencyHz" to value("frequencyHz").toDoubleOrNull(),"arusCalibration" to value("arusCalibration").toDoubleOrNull(),"teganganCalibration" to value("teganganCalibration").toDoubleOrNull()); updateSettings(p) }
    private fun startLearning(){ val d=(value("learningDuration").toLongOrNull()?:120)*1000; updatePath("settings/autoLearning",mapOf("active" to true,"status" to "running","requestId" to "learn-${System.currentTimeMillis()}","durationMs" to d,"marginPercent" to (value("learningMargin").toDoubleOrNull()?:25),"applyToThreshold" to checked("learningApply"),"startedAt" to ServerValue.TIMESTAMP,"startedBy" to auth.currentUser?.email,"sampleCount" to 0,"message" to "Menunggu ESP32 membaca perintah auto learning.")) }
    private fun updateLearning(active:Boolean){ updatePath("settings/autoLearning",mapOf("active" to active,"status" to if(active) "running" else "stopped","stoppedAt" to ServerValue.TIMESTAMP,"stoppedBy" to auth.currentUser?.email,"message" to if(active) "" else "Learning dihentikan oleh admin.")) }
    private fun saveBootstrap(action:String){ val p=mapOf("action" to action,"requestId" to "bootstrap-${System.currentTimeMillis()}","pending" to true,"status" to "pending","statusMessage" to "Menunggu ESP32 menerapkan bootstrap.","requestedAt" to ServerValue.TIMESTAMP,"requestedBy" to auth.currentUser?.email,"wifiSsid" to if(action=="clear") "" else value("wifiSsid"),"wifiPassword" to if(action=="clear") "" else value("wifiPassword"),"firebaseApiKey" to value("firebaseApiKey"),"firebaseDbUrl" to value("firebaseDbUrl"),"iotEmail" to value("iotEmail"),"iotPassword" to value("iotPassword"),"restartRequired" to true); updatePath("settings/deviceBootstrap",p) }
    private fun loadLocalConfig() {
        val prefs = getSharedPreferences("iot_client_config", MODE_PRIVATE)
        fields["publicApiBase"]?.setText(prefs.getString("publicApiBase", "") ?: "")
        fields["localApiBase"]?.setText(prefs.getString("localApiBase", "http://localhost:3000") ?: "http://localhost:3000")
        fields["healthPath"]?.setText(prefs.getString("healthPath", "/health") ?: "/health")
        fields["retryIntervalMs"]?.setText(prefs.getLong("retryIntervalMs", 6000L).toString())
        fields["timeoutMs"]?.setText(prefs.getLong("timeoutMs", 4000L).toString())
        switches["autoFailover"]?.isChecked = prefs.getBoolean("autoFailover", true)
        val modes = listOf("AUTO", "PUBLIC", "LOCAL")
        spinners["dataMode"]?.setSelection(modes.indexOf(prefs.getString("mode", "AUTO")).coerceAtLeast(0))
    }

    private fun saveLocalConfig(){ getSharedPreferences("iot_client_config",MODE_PRIVATE).edit().putString("publicApiBase",value("publicApiBase")).putString("localApiBase",value("localApiBase")).putString("mode", spinnerValue("dataMode")).putString("healthPath",value("healthPath")).putLong("retryIntervalMs",value("retryIntervalMs").toLongOrNull()?:6000L).putLong("timeoutMs",value("timeoutMs").toLongOrNull()?:4000L).putBoolean("autoFailover",checked("autoFailover")).apply(); message("Konfigurasi backend Android disimpan.",false) }
    private fun updateSettings(p:Map<String,Any?>){ updatePath("settings",p) }
    private fun updatePath(path:String,value:Any?){
        val task = if (value is Map<*, *>) {
            db.getReference(path).updateChildren(value.mapKeys { it.key.toString() })
        } else {
            db.getReference(path).setValue(value)
        }
        task.addOnSuccessListener { message("Berhasil disimpan.", false) }
            .addOnFailureListener { message("Gagal: ${it.message}", true) }
    }

    private fun api(
        path: String,
        body: Map<String, Any?>,
        onError: (String) -> Unit = {},
        onSuccess: (JSONObject) -> Unit = {}
    ) {
        auth.currentUser?.getIdToken(false)?.addOnSuccessListener { id ->
            thread {
                try {
                    val c = URL("https://iot-listrik-dashboard.vercel.app/api/$path").openConnection() as HttpURLConnection
                    c.requestMethod = "POST"; c.doOutput = true; c.connectTimeout = 12000; c.readTimeout = 30000
                    c.setRequestProperty("Content-Type", "application/json")
                    c.setRequestProperty("Authorization", "Bearer ${id.token}")
                    c.outputStream.use { it.write(JSONObject(body).toString().toByteArray()) }
                    val code = c.responseCode
                    val stream = if (code in 200..299) c.inputStream else c.errorStream
                    val response = stream?.bufferedReader()?.readText().orEmpty()
                    val json = runCatching { JSONObject(response) }.getOrNull()
                    val label = json?.optString("message")?.takeIf { it.isNotBlank() }
                        ?: if (path == "telegram-admin-action" && code in 200..299 && body["action"] == "test") "Test Telegram berhasil dikirim ke ${json?.optInt("successCount", 0)}/${json?.optInt("totalRecipients", 0)} tujuan${json?.optString("username")?.takeIf { it.isNotBlank() }?.let { " lewat @$it" } ?: ""}."
                        else if (path == "telegram-admin-action" && code in 200..299 && json?.optString("username").orEmpty().isNotBlank()) "Bot @${json?.optString("username")} berhasil dikenali dan terhubung."
                        else if (path == "get-discord-bot-status" && code in 200..299) "Ringkasan Discord Bot berhasil diperbarui."
                        else json?.optString("error")?.takeIf { it.isNotBlank() }
                        ?: "HTTP $code"
                    runOnUiThread {
                        val failed = code !in 200..299
                        message(label, failed)
                        adminActionStatus?.text = label
                        adminActionStatus?.setTextColor(if (failed) RED else GREEN)
                        if (!failed && json != null) onSuccess(json) else if (failed) onError(label)
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        val label = "Gagal: ${e.message}"
                        message(label, true)
                        onError(label)
                    }
                }
            }
        } ?: message("Sesi login tidak ditemukan.", true)
    }
    private fun postWebhook(url: String, diagnostics: Boolean) {
        if (!checked("discordEnabled")) { message("Master Switch Discord sedang dimatikan.", true); return }
        if (!url.startsWith("https://discord.com/api/webhooks/")) { message(if (diagnostics) "Webhook Diagnostik belum valid." else "Webhook Alerts belum valid.", true); return }
        if (diagnostics && currentData.isEmpty()) {
            message("Memuat data diagnostik perangkat...", false)
            db.getReference("listrik").get()
                .addOnSuccessListener { snapshot ->
                    val loaded = snapMap(snapshot)
                    if (loaded.isEmpty()) message("Data diagnostik perangkat belum tersedia.", true)
                    else { currentData = loaded; postWebhook(url, true) }
                }
                .addOnFailureListener { message("Gagal memuat diagnostik: ${it.message}", true) }
            return
        }
        val snapshotData = currentData.toMap()
        thread {
            var c: HttpURLConnection? = null
            try {
                val embed = if (diagnostics) buildDiagnosticTestEmbed(snapshotData) else JSONObject().put("title", "🔔 Test Notifikasi — IoT Listrik Dashboard").put("description", "Koneksi Discord Webhook berhasil. Sistem notifikasi Android siap digunakan.").put("color", 0x5865F2).put("fields", JSONArray().put(JSONObject().put("name", "Status").put("value", "✅ Webhook terhubung").put("inline", true)).put(JSONObject().put("name", "Platform").put("value", "Android Native").put("inline", true)))
                c = URL(url).openConnection() as HttpURLConnection
                c.requestMethod = "POST"; c.doOutput = true; c.connectTimeout = 12000; c.readTimeout = 20000
                c.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                c.outputStream.use { it.write(JSONObject().put("embeds", JSONArray().put(embed)).toString().toByteArray(Charsets.UTF_8)) }
                val code = c.responseCode
                val detail = (if (code in 200..299) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
                runOnUiThread { if (!isFinishing && !isDestroyed) message(if (code in 200..299 || code == 204) "Berhasil mengirim ke ${if (diagnostics) "#diagnostik-sistem" else "#alerts"}." else "Discord menolak HTTP $code ${detail.take(120)}", code !in 200..299) }
            } catch (e: Exception) { runOnUiThread { if (!isFinishing && !isDestroyed) message("Gagal Discord: ${e.message}", true) } } finally { c?.disconnect() }
        }
    }

    private fun buildDiagnosticTestEmbed(data: Map<String, Any?>): JSONObject {
        fun n(key: String) = data[key]?.toString()?.toDoubleOrNull() ?: 0.0
        val status = data["status"]?.toString()?.uppercase(Locale.US) ?: "UNKNOWN"
        val updated = timestampOf(data); val age = if (updated > 0) (System.currentTimeMillis() - updated).coerceAtLeast(0) else Long.MAX_VALUE; val online = updated > 0 && age <= 20000L
        val meterOk = data["meter_ok"] as? Boolean ?: (status != "SENSOR_ERROR" && n("tegangan") > 1.0); val lcdReported = data["lcd_ok"] is Boolean; val lcdOk = data["lcd_ok"] == true
        val overall = if (!online || !meterOk || (lcdReported && !lcdOk)) "PERLU DIPERIKSA" else if (!lcdReported) "DATA BELUM LENGKAP" else "SEMUA NORMAL"
        val rssi = n("wifi_rssi"); val wifi = if (rssi >= 0) "Belum dilaporkan" else "${rssi.toInt()} dBm - ${if (rssi >= -60) "Sangat baik" else if (rssi >= -70) "Baik" else if (rssi >= -80) "Lemah" else "Sangat lemah"}"
        val embed = JSONObject().put("title", "🩺 Diagnostik Sistem IoT Listrik").put("description", "**Kesimpulan: $overall**\nPerangkat: **${if (online) "ONLINE" else "OFFLINE"}** · Heartbeat: **${if (online) "AKTIF" else "TIDAK AKTIF"}**\nUpdate terakhir: ${if (updated > 0) "${updated / 1000} (${age / 1000} detik lalu)" else "Belum ada timestamp"}").put("color", if (!online || !meterOk || (lcdReported && !lcdOk)) 0xED4245 else if (!lcdReported) 0xFEE75C else 0x57F287)
        val fields = JSONArray().put(JSONObject().put("name", "Sensor dan Perangkat").put("inline", false).put("value", "PZEM-004T: **${if (meterOk && online) "BERFUNGSI" else "ERROR"}**\nStatus baca: `$status`\nArus / tegangan: `${"%.2f".format(Locale.US, n("arus"))} A / ${"%.1f".format(Locale.US, n("tegangan"))} V`\nESP32 dan Wi-Fi: **${if (online) "ONLINE" else "OFFLINE"}**\nWi-Fi: `$wifi`\nHeap bebas: `${data["free_heap"]?.toString()?.toLongOrNull()?.let { "${it / 1024} KB" } ?: "Belum dilaporkan"}`")).put(JSONObject().put("name", "LCD, Relay, dan Firebase").put("inline", false).put("value", "LCD I2C: **${if (!lcdReported) "MENUNGGU DATA" else if (lcdOk) "I2C MERESPONS" else "ERROR"}**\nLCD alamat: `${if (lcdOk && n("lcd_address") > 0) "0x${n("lcd_address").toInt().toString(16).uppercase(Locale.US)}" else "Tidak ditemukan"}`\nRelay logis: **${if (online) if (data["relay"] == true || data["relay"]?.toString() == "1") "ON" else "OFF" else "TIDAK DIKETAHUI"}**\nBuzzer: **TERKONFIGURASI**\nFirebase: **TERHUBUNG**\nSumber data: `PZEM-004T`")).put(JSONObject().put("name", "Pemetaan Pin Firmware").put("inline", false).put("value", "`PZEM RX GPIO16 <- PZEM TX`\n`PZEM TX GPIO17 -> PZEM RX`\n`LCD SDA GPIO21 | SCL GPIO22`\n`Relay GPIO26 | Buzzer GPIO25`")).put(JSONObject().put("name", "🔄 Firmware Release ESP32").put("inline", false).put("value", "Versi terpasang: `${data["firmware_version"] ?: "v1.0.0"}`\nRelease GitHub: `v1.1.9`\nAsset firmware: **Belum tersedia di GitHub Release**\nManifest: **BELUM TERSEDIA**\nTarget board: `${data["firmware_board"] ?: "esp32-dev-module"}`\nOTA: **${if (data["firmware_ota_capable"] == true) "AKTIF" else "BELUM AKTIF"}**"))
        return embed.put("fields", fields).put("footer", JSONObject().put("text", "IoT Listrik Dashboard Android — Diagnostic Webhook Test"))
    }


    private fun section(h: String, sub: String) {
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(13), dp(14), dp(13))
            background = rounded(Color.rgb(17, 24, 32), Color.rgb(42, 54, 68), 14)
        }
        panel.addView(TextView(this).apply {
            text = h
            textSize = 14f
            setTextColor(Color.WHITE)
            setTypeface(null, Typeface.BOLD)
            includeFontPadding = false
        })
        panel.addView(TextView(this).apply {
            text = sub
            textSize = 10.5f
            setTextColor(Color.rgb(148, 163, 184))
            setLineSpacing(dp(1).toFloat(), 1f)
            setPadding(0, dp(5), 0, 0)
        })
        panel.addView(View(this).apply { setBackgroundColor(Color.rgb(42, 54, 68)) }, LinearLayout.LayoutParams(-1, dp(1)).apply {
            topMargin = dp(11)
            bottomMargin = dp(8)
        })
        content.addView(panel, LinearLayout.LayoutParams(-1, -2).apply {
            topMargin = dp(6)
            bottomMargin = dp(3)
        })
        activeSection = panel
    }

    private fun addToSection(view: View, params: LinearLayout.LayoutParams? = null) {
        val target = activeSection ?: content
        val resolved = params ?: (view.layoutParams as? LinearLayout.LayoutParams
            ?: LinearLayout.LayoutParams(-1, -2))
        target.addView(view, resolved)
    }

    private fun loadDiscordBotStatusNative() {
        api("get-discord-bot-status", emptyMap()) { renderDiscordBotSnapshot(it) }
    }

    private fun renderDiscordBotSnapshot(json: JSONObject) {
        val host = discordBotSummaryHost ?: return
        host.removeAllViews()
        val configured = json.optBoolean("configured", false)
        val color = if (configured) GREEN else AMBER
        val botName = json.optJSONObject("botUser")?.optString("displayName", "Discord Bot") ?: "Discord Bot"
        val guild = json.optString("guildName", "—")
        host.addView(TextView(this).apply { text = if (configured) "✓  Bot aktif dan terhubung" else "Bot belum dikonfigurasi"; textSize = 13f; setTypeface(null, Typeface.BOLD); setTextColor(color); setPadding(dp(10), dp(8), dp(10), dp(5)); background = rounded(if (configured) Color.rgb(10, 55, 34) else Color.rgb(69, 52, 20), color, 10) })
        host.addView(TextView(this).apply { text = if (configured) "Bot $botName tersambung ke server $guild. Kamu sekarang bisa melihat jumlah member dan mengelola daftar ban dari dashboard admin." else "Simpan Bot Token dan Guild ID untuk mulai membaca jumlah member dan daftar ban."; textSize = 11.5f; setTextColor(Color.rgb(148, 163, 184)); setPadding(0, dp(8), 0, dp(8)) })
        val checkedAt = json.optLong("lastCheckedAt", 0L).takeIf { it > 0 }?.let { SimpleDateFormat("dd/MM/yyyy, HH.mm.ss", Locale("id", "ID")).format(Date(it)) } ?: "Belum pernah"
        host.addView(infoRows(listOf("Token Tersimpan" to json.optString("maskedToken", "—"), "Bot Account" to botName, "Server / Guild" to guild, "Terakhir Dicek" to checkedAt)))
        host.addView(TextView(this).apply { text = "RINGKASAN SERVER DISCORD"; textSize = 10f; setTypeface(null, Typeface.BOLD); setTextColor(Color.rgb(125, 211, 252)); setPadding(0, dp(12), 0, dp(6)) })
        host.addView(infoRows(listOf("Total Member" to json.optInt("memberCount", 0).toString(), "Member Online" to json.optInt("onlineCount", 0).toString(), "Daftar Ban" to json.optInt("banCount", 0).toString(), "Guild ID" to json.optString("guildId", "—"))))
    }

    private fun infoRows(rows: List<Pair<String, String>>): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL; setPadding(dp(10), dp(7), dp(10), dp(7)); background = rounded(Color.rgb(13, 20, 28), Color.rgb(42, 54, 68), 10)
        rows.forEach { (label, value) ->
            val line = LinearLayout(this@NativePanelActivity).apply { gravity = Gravity.CENTER_VERTICAL; setPadding(0, dp(3), 0, dp(3)) }
            line.addView(TextView(this@NativePanelActivity).apply { text = label; textSize = 11f; setTextColor(Color.rgb(148, 163, 184)) }, LinearLayout.LayoutParams(0, -2, .45f))
            line.addView(TextView(this@NativePanelActivity).apply { text = value; textSize = 11.5f; setTextColor(Color.rgb(226, 232, 240)); setTypeface(null, Typeface.BOLD) }, LinearLayout.LayoutParams(0, -2, .55f))
            addView(line)
        }
    }

    private fun statusCard(iconText: String, title: String, description: String, badgeText: String, color: Int, details: List<Pair<String, String>>): LinearLayout {
        val item = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(12), dp(11), dp(12), dp(11)); background = rounded(Color.rgb(17, 24, 32), Color.rgb(42, 54, 68), 14) }
        val top = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        top.addView(TextView(this).apply { text = title; textSize = 13f; setTextColor(Color.WHITE); setTypeface(null, Typeface.BOLD); setPadding(0, 0, dp(6), 0) }, LinearLayout.LayoutParams(0, -2, 1f))
        top.addView(badge(badgeText, color), LinearLayout.LayoutParams(-2, dp(27)))
        item.addView(top)
        item.addView(TextView(this).apply { text = description; textSize = 11.5f; setTextColor(Color.rgb(148, 163, 184)); setPadding(0, dp(4), 0, 0) })
        item.addView(View(this).apply { setBackgroundColor(Color.rgb(42, 54, 68)) }, LinearLayout.LayoutParams(-1, dp(1)).apply { topMargin = dp(10); bottomMargin = dp(9) })
        details.forEach { (label, value) ->
            val line = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL; setPadding(0, dp(2), 0, dp(2)) }
            line.addView(TextView(this).apply { text = label; textSize = 12f; setTextColor(Color.rgb(148, 163, 184)) }, LinearLayout.LayoutParams(0, -2, 0.42f))
            line.addView(TextView(this).apply { text = value; textSize = 12f; setTextColor(Color.rgb(226, 232, 240)) }, LinearLayout.LayoutParams(0, -2, 0.58f))
            item.addView(line)
        }
        item.layoutParams = LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(10) }
        return item
    }

    private fun surfacePanel(iconName: String, eyebrow: String, title: String, description: String): LinearLayout {
        val panel = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(12), dp(12), dp(12), dp(12)); background = rounded(Color.rgb(17, 24, 32), Color.rgb(42, 54, 68), 14) }
        panel.addView(TextView(this).apply { text = eyebrow.uppercase(Locale.US); textSize = 9f; setTypeface(null, Typeface.BOLD); setTextColor(Color.rgb(125, 211, 252)); setPadding(0, 0, 0, dp(6)) })
        val head = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        val copy = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        copy.addView(TextView(this).apply { text = title; textSize = 15f; setTextColor(Color.WHITE); setTypeface(null, Typeface.BOLD) })
        copy.addView(TextView(this).apply { text = description; textSize = 12f; setTextColor(Color.rgb(148, 163, 184)); setPadding(0, dp(3), 0, 0) })
        head.addView(copy, LinearLayout.LayoutParams(0, -2, 1f)); panel.addView(head)
        panel.addView(View(this).apply { setBackgroundColor(Color.rgb(42, 54, 68)) }, LinearLayout.LayoutParams(-1, dp(1)).apply { topMargin = dp(12); bottomMargin = dp(10) })
        return panel
    }

    private fun hardwareRow(iconText: String, title: String, path: String, state: String, color: Int, note: String): LinearLayout {
        val row = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(10), dp(10), dp(10), dp(10)); background = rounded(Color.rgb(13, 20, 28), Color.rgb(42, 54, 68), 12) }
        val top = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        top.addView(TextView(this).apply { text = title + "\n" + path; textSize = 12f; setTextColor(Color.WHITE); setLineSpacing(0f, 1.08f) }, LinearLayout.LayoutParams(0, -2, 1f))
        top.addView(badge(state, color), LinearLayout.LayoutParams(-2, dp(27)))
        row.addView(top)
        row.addView(TextView(this).apply { text = note; textSize = 11.5f; setTextColor(Color.rgb(148, 163, 184)); setPadding(0, dp(6), 0, 0) })
        row.layoutParams = LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(8) }
        return row
    }

    private fun badge(text: String, color: Int): TextView = TextView(this).apply {
        this.text = text; textSize = 9f; setTypeface(null, Typeface.BOLD); gravity = Gravity.CENTER; setPadding(dp(8), dp(4), dp(8), dp(4)); setTextColor(color); background = rounded(Color.rgb(25, 55, 67), color, 999)
    }

    private fun styleBadge(view: TextView, text: String, color: Int) { view.text = text; view.setTextColor(color); view.background = rounded(Color.rgb(25, 55, 67), color, 999) }

    private fun timestampOf(data: Map<String, Any?>): Long {
        listOf("updated_at", "updatedAt", "timestamp").forEach { key ->
            val raw = data[key] ?: return@forEach
            val value = raw.toString().toLongOrNull()
            if (value != null && value > 1_000_000_000_000L) return value
        }
        return 0L
    }

    private fun numValue(key: String): Double = currentData[key]?.toString()?.toDoubleOrNull() ?: Double.NaN
    private fun intData(key: String, fallback: Int): Int = currentData[key]?.toString()?.toIntOrNull() ?: fallback

    private fun renderFirmwarePanel(host: LinearLayout) {
        val panel = surfacePanel("system_update", "Firmware Release", "Pemeriksaan Firmware ESP32", "Membandingkan versi perangkat dengan release GitHub. Pemeriksaan ini tidak mengubah firmware.")
        val status = badge("BELUM DIPERIKSA", AMBER)
        panel.addView(status, LinearLayout.LayoutParams(-2, dp(27)).apply { bottomMargin = dp(10) })
        val info = TextView(this).apply { text = "Versi terpasang: ${str("firmware_version", "1.0.0")}\nRelease GitHub: memeriksa...\nAsset firmware: belum diperiksa\nTarget board: ${str("firmware_board", "esp32-dev-module")}"; textSize = 12f; setTextColor(Color.rgb(203, 213, 225)); setLineSpacing(0f, 1.2f) }
        panel.addView(info)
        val output = TextView(this).apply { text = ""; textSize = 11f; typeface = Typeface.MONOSPACE; setTextColor(Color.rgb(148, 163, 184)); setPadding(0, dp(10), 0, 0) }
        panel.addView(output)
        val button = Button(this).apply { text = "Cek Versi Firmware"; setAllCaps(false); textSize = 13f; setTextColor(Color.WHITE); background = rounded(Color.rgb(37, 99, 235), Color.rgb(59, 130, 246), 10); backgroundTintList = null; minHeight = 0; stateListAnimator = null; setOnClickListener { checkFirmwareNative(status, info, output) } }
        panel.addView(button, LinearLayout.LayoutParams(-1, dp(44)).apply { topMargin = dp(10) })
        panel.addView(Button(this).apply { text = "Update melalui Desktop/PC"; setAllCaps(false); isEnabled = false }, LinearLayout.LayoutParams(-1, dp(44)).apply { topMargin = dp(8) })
        panel.addView(TextView(this).apply { text = "Pembaruan firmware tidak dilakukan langsung dari Android. Gunakan komputer desktop/PC melalui USB dan alat pemrograman ESP32. Android hanya memeriksa versi dan ketersediaan release."; textSize = 11.5f; setTextColor(Color.rgb(148, 163, 184)); setPadding(0, dp(8), 0, 0) })
        host.addView(panel, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(10) })
        checkFirmwareNative(status, info, output)
    }

    private fun checkFirmwareNative(status: TextView, info: TextView, output: TextView) {
        statusBadgeLoading(status)
        thread {
            try {
                val c = URL("https://api.github.com/repos/fatonyahmadfauzi/IoT-Listrik-Dashboard/releases/latest").openConnection() as HttpURLConnection
                c.setRequestProperty("Accept", "application/vnd.github+json"); c.connectTimeout = 10000; c.readTimeout = 15000
                val json = JSONObject(c.inputStream.bufferedReader().readText()); val tag = json.optString("tag_name", "—"); val assets = json.optJSONArray("assets") ?: JSONArray(); var bin = ""; var manifest = false; val names = mutableListOf<String>()
                for (i in 0 until assets.length()) { val name = assets.optJSONObject(i)?.optString("name").orEmpty(); if (name.isNotBlank()) names.add(name); if (name.endsWith(".bin", true)) bin = name; if (name.equals("firmware-manifest.json", true)) manifest = true }
                val text = "Versi terpasang: ${str("firmware_version", "1.0.0")}\nRelease GitHub: $tag\nAsset firmware: ${if (bin.isBlank()) "Belum tersedia di GitHub Release" else bin}\nTarget board: ${str("firmware_board", "esp32-dev-module")}"
                val lines = mutableListOf("Memeriksa release firmware GitHub...", "Release terbaru: $tag", "Asset release: ${if (names.isEmpty()) "tidak ada asset" else names.joinToString(", ")}", if (manifest) "firmware-manifest.json tersedia pada release." else "firmware-manifest.json belum tersedia pada release.", if (bin.isBlank()) "Belum ada file .bin firmware ESP32 pada release ini." else "Firmware binary: $bin", if (bool("firmware_ota_capable")) "Perangkat melaporkan partition scheme OTA aktif." else "Perangkat belum memakai partition scheme OTA. Upload bootstrap OTA pertama harus dilakukan melalui USB.", "Pembaruan dilakukan melalui desktop/PC menggunakan USB. Android hanya memeriksa versi dan release.")
                val log = lines.joinToString("\n")
                runOnUiThread { info.text = text; output.text = log; styleBadge(status, if (bin.isBlank()) "ASSET BELUM ADA" else "TERSEDIA", if (bin.isBlank()) AMBER else GREEN) }
            } catch (e: Exception) { runOnUiThread { styleBadge(status, "GAGAL DIPERIKSA", RED); output.text = "Pemeriksaan gagal: ${e.message}" } }
        }
    }

    private fun statusBadgeLoading(view: TextView) = styleBadge(view, "MEMERIKSA", AMBER)

    private fun sectionIcon(title: String): String = when {
        title.contains("Diagnostik", true) -> "⌁"
        title.contains("Sistem", true) || title.contains("Backend", true) -> "⚙"
        title.contains("Learning", true) -> "◌"
        title.contains("Bootstrap", true) -> "⌁"
        title.contains("Administrasi", true) -> "▣"
        title.contains("Telegram", true) -> "➤"
        title.contains("Discord", true) -> "◈"
        title.contains("Pengguna", true) -> "●"
        else -> "•"
    }

    private fun rounded(fill: Int, stroke: Int? = null, radius: Int = 12): GradientDrawable = GradientDrawable().apply {
        setColor(fill)
        cornerRadius = dp(radius).toFloat()
        stroke?.let { setStroke(dp(1), it) }
    }

    private fun dropdown(k: String, label: String, options: List<Pair<String, String>>, default: String) {
        val wrap = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, dp(2), 0, 0) }
        wrap.addView(TextView(this).apply { text = label; textSize = 12f; setTextColor(Color.rgb(203, 213, 225)) })
        val spinner = Spinner(this).apply {
            adapter = object : ArrayAdapter<String>(this@NativePanelActivity, android.R.layout.simple_spinner_item, options.map { it.first }) {
                override fun getView(position: Int, convertView: View?, parent: android.view.ViewGroup): View = (super.getView(position, convertView, parent) as TextView).apply { textSize = 12f; setTextColor(Color.WHITE); setPadding(dp(12), 0, dp(12), 0) }
                override fun getDropDownView(position: Int, convertView: View?, parent: android.view.ViewGroup): View = (super.getDropDownView(position, convertView, parent) as TextView).apply { textSize = 12f; setTextColor(Color.WHITE); setBackgroundColor(Color.rgb(17, 24, 32)); setPadding(dp(12), dp(10), dp(12), dp(10)) }
            }
            setSelection(options.indexOfFirst { it.second == default }.coerceAtLeast(0))
            background = rounded(Color.rgb(22, 29, 37), Color.rgb(71, 85, 105), 12)
        }
        wrap.addView(spinner, LinearLayout.LayoutParams(-1, dp(44)).apply { topMargin = dp(5) })
        addToSection(wrap, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(4); bottomMargin = dp(7) })
        spinners[k] = spinner
    }

    private fun spinnerValue(k: String): String {
        val spinner = spinners[k] ?: return "AUTO"
        val selected = spinner.selectedItemPosition
        val values = listOf("AUTO", "PUBLIC", "LOCAL")
        return values.getOrElse(selected) { "AUTO" }
    }

    private fun field(k: String, label: String, default: String, secret: Boolean = false) {
        val wrap = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, dp(2), 0, 0)
        }
        wrap.addView(TextView(this).apply {
            text = label
            textSize = 10.5f
            setTextColor(Color.rgb(203, 213, 225))
        })
        val edit = EditText(this).apply {
            setText(default)
            textSize = 13f
            setTextColor(Color.WHITE)
            setHintTextColor(Color.rgb(100, 116, 139))
            setSingleLine(true)
            setPadding(dp(12), 0, dp(12), 0)
            background = rounded(Color.rgb(22, 29, 37), Color.rgb(71, 85, 105), 12)
            inputType = if (secret) InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            else InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_NORMAL
        }
        wrap.addView(edit, LinearLayout.LayoutParams(-1, dp(46)).apply { topMargin = dp(4) })
        addToSection(wrap, LinearLayout.LayoutParams(-1, -2).apply {
            topMargin = dp(3)
            bottomMargin = dp(5)
        })
        fields[k] = edit
    }

    private fun toggle(k: String, label: String, default: Boolean) {
        val row = LinearLayout(this).apply {
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(2), 0, 0, 0)
        }
        row.addView(TextView(this).apply {
            text = label
            textSize = 11.5f
            setTextColor(Color.rgb(226, 232, 240))
        }, LinearLayout.LayoutParams(0, dp(44), 1f))
        val toggle = Switch(this).apply {
            isChecked = default
            thumbTintList = ColorStateList.valueOf(Color.rgb(125, 211, 252))
            trackTintList = ColorStateList.valueOf(Color.rgb(51, 65, 85))
        }
        row.addView(toggle, LinearLayout.LayoutParams(dp(48), dp(44)))
        addToSection(row, LinearLayout.LayoutParams(-1, dp(46)).apply {
            topMargin = dp(2)
            bottomMargin = dp(2)
        })
        switches[k] = toggle
    }

    private fun action(label: String, run: () -> Unit): Button {
        val button = Button(this).apply {
            text = label
            setAllCaps(false)
            textSize = 12f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            val destructive = label.contains("Hapus", true) || label.contains("Kosongkan", true) || label.contains("Ban Pengguna", true)
            val secondary = label.contains("Hentikan", true) || label.contains("Muat Status", true)
            background = when {
                destructive -> rounded(Color.rgb(153, 27, 27), Color.rgb(239, 68, 68), 10)
                secondary -> rounded(Color.rgb(30, 41, 59), Color.rgb(71, 85, 105), 10)
                else -> rounded(Color.rgb(37, 99, 235), Color.rgb(59, 130, 246), 10)
            }
            backgroundTintList = null
            minHeight = 0
            stateListAnimator = null
            setPadding(dp(10), 0, dp(10), 0)
            setOnClickListener { run() }
        }
        addToSection(button, LinearLayout.LayoutParams(-1, dp(44)).apply {
            topMargin = dp(4)
            bottomMargin = dp(4)
            leftMargin = dp(2)
            rightMargin = dp(2)
        })
        return button
    }

    private fun infoPanel(title: String, body: String, accent: Int): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(11), dp(9), dp(11), dp(9))
        background = rounded(Color.rgb(13, 20, 28), accent, 10)
        addView(TextView(this@NativePanelActivity).apply {
            text = title
            textSize = 11.5f
            setTypeface(null, Typeface.BOLD)
            setTextColor(accent)
            includeFontPadding = false
        })
        addView(TextView(this@NativePanelActivity).apply {
            text = body
            textSize = 11f
            setTextColor(Color.rgb(203, 213, 225))
            setLineSpacing(dp(1).toFloat(), 1f)
            setPadding(0, dp(4), 0, 0)
        })
        layoutParams = LinearLayout.LayoutParams(-1, -2).apply {
            topMargin = dp(3)
            bottomMargin = dp(5)
        }
    }

    private fun compactDetails(items: List<Pair<String, String>>): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(11), dp(5), dp(11), dp(5))
        background = rounded(Color.rgb(13, 20, 28), Color.rgb(42, 54, 68), 10)
        items.forEachIndexed { index, (title, body) ->
            if (index > 0) addView(View(this@NativePanelActivity).apply { setBackgroundColor(Color.rgb(35, 47, 60)) }, LinearLayout.LayoutParams(-1, dp(1)).apply {
                topMargin = dp(6)
                bottomMargin = dp(6)
            })
            addView(TextView(this@NativePanelActivity).apply {
                text = title.uppercase(Locale("id", "ID"))
                textSize = 9.5f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.rgb(125, 211, 252))
                includeFontPadding = false
            })
            addView(TextView(this@NativePanelActivity).apply {
                text = body
                textSize = 11.25f
                setTextColor(Color.rgb(226, 232, 240))
                setLineSpacing(dp(1).toFloat(), 1f)
                setPadding(0, dp(3), 0, 0)
            })
        }
        layoutParams = LinearLayout.LayoutParams(-1, -2).apply {
            topMargin = dp(3)
            bottomMargin = dp(5)
        }
    }

    private fun detailGrid(items: List<Pair<String, String>>): LinearLayout = compactDetails(items)

    private fun operationStatus(title: String, body: String): TextView = TextView(this).apply {
        textSize = 11f
        setLineSpacing(dp(1).toFloat(), 1f)
        setPadding(dp(11), dp(9), dp(11), dp(9))
        setOperationStatus(this, title, body, Color.rgb(125, 211, 252))
    }

    private fun setOperationStatus(view: TextView?, title: String, body: String, accent: Int) {
        view ?: return
        view.text = "$title\n$body"
        view.setTextColor(Color.rgb(226, 232, 240))
        view.background = rounded(Color.rgb(13, 20, 28), accent, 10)
    }

    private fun card(parent: LinearLayout, heading: String, body: String, color: Int) {
        val item = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(13), dp(14), dp(13))
            background = rounded(Color.rgb(17, 24, 32), Color.rgb(42, 54, 68), 14)
        }
        val top = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        top.addView(TextView(this).apply {
            text = heading
            textSize = 15f
            setTextColor(Color.WHITE)
            setTypeface(null, Typeface.BOLD)
        }, LinearLayout.LayoutParams(0, -2, 1f))
        val status = body.lineSequence()
            .firstOrNull { it.contains("Status", true) || it.contains("Koneksi", true) || it.contains("Relay", true) }
            ?.substringAfter(":", "")?.trim()?.takeIf { it.isNotBlank() } ?: "INFO"
        top.addView(TextView(this).apply {
            text = status.uppercase(Locale.US)
            textSize = 9f
            setTypeface(null, Typeface.BOLD)
            setTextColor(if (color == Color.rgb(239, 68, 68)) Color.rgb(254, 202, 202) else color)
            gravity = Gravity.CENTER
            setPadding(dp(8), dp(4), dp(8), dp(4))
            background = rounded(if (color == Color.rgb(239, 68, 68)) Color.rgb(86, 28, 35) else Color.rgb(25, 55, 67), color, 999)
        }, LinearLayout.LayoutParams(-2, dp(26)))
        item.addView(top)
        item.addView(View(this).apply { setBackgroundColor(Color.rgb(42, 54, 68)) }, LinearLayout.LayoutParams(-1, dp(1)).apply {
            topMargin = dp(10)
            bottomMargin = dp(9)
        })
        item.addView(TextView(this).apply {
            text = body
            textSize = 12f
            setTextColor(Color.rgb(203, 213, 225))
            setLineSpacing(0f, 1.15f)
        })
        parent.addView(item, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(10) })
    }

    private fun message(s:String,error:Boolean){Toast.makeText(this,s,Toast.LENGTH_LONG).show()}
    private fun value(k:String)=fields[k]?.text?.toString()?.trim().orEmpty(); private fun checked(k:String)=switches[k]?.isChecked?:false
    private fun str(k:String,d:String)=currentData[k]?.toString()?:d; private fun bool(k:String)=currentData[k] == true || currentData[k]?.toString()=="1"; private fun num(k:String,d:Int)=currentData[k]?.toString()?.toDoubleOrNull()?.let{"%1$.${d}f".format(Locale.US,it)}?:"0"; private fun heap()=currentData["free_heap"]?.toString()?.toLongOrNull()?.let{"${it/1024} KB"}?:"Menunggu firmware terbaru"; private fun statusColor(s:String)=if(s=="NORMAL")Color.rgb(46,234,114) else Color.rgb(239,68,68)
    private fun snapMap(s:DataSnapshot): Map<String,Any?> = s.children.associate{it.key.orEmpty() to it.value}; private fun simple(f:(Map<String,Any?>)->Unit)=object:ValueEventListener{override fun onDataChange(s:DataSnapshot)=f(snapMap(s));override fun onCancelled(e:DatabaseError){}}
    private fun dp(v:Int)= (v*resources.displayMetrics.density).toInt()
    private fun AlertDialogBuilder(c:Context)=android.app.AlertDialog.Builder(c)
    companion object {
        const val EXTRA_ROUTE = "admin_route"
        const val EXTRA_TITLE = "admin_title"
        val GREEN: Int = Color.rgb(46, 234, 114)
        val RED: Int = Color.rgb(239, 68, 68)
        val AMBER: Int = Color.rgb(254, 229, 138)
    }
}
