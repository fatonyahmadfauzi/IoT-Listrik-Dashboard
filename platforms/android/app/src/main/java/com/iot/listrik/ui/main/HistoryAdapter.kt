package com.iot.listrik.ui.main

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import androidx.recyclerview.widget.DiffUtil
import com.iot.listrik.data.model.HistoryLog
import com.iot.listrik.databinding.ItemHistoryBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Menampilkan 15 log terbaru dalam dua tampilan yang setara dengan dashboard web:
 * ringkas untuk pemantauan cepat dan detail untuk audit parameter listrik.
 */
class HistoryAdapter(private var logs: List<HistoryLog>) :
    RecyclerView.Adapter<HistoryAdapter.ViewHolder>() {

    enum class DisplayMode { SUMMARY, DETAIL }

    private var displayMode = DisplayMode.SUMMARY
    private var defaultSource = "CLOUD"

    class ViewHolder(val binding: ItemHistoryBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemHistoryBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val log = logs[position]
        val binding = holder.binding
        val isDetail = displayMode == DisplayMode.DETAIL

        binding.summaryLayout.visibility = if (isDetail) View.GONE else View.VISIBLE
        binding.detailLayout.visibility = if (isDetail) View.VISIBLE else View.GONE

        val status = normalizeStatus(log.status)
        val arus = number(log.arus)
        val tegangan = number(log.tegangan)
        val dayaAktif = activePower(log)
        val energi = energy(log)
        val powerFactor = powerFactor(log)
        val frekuensi = frequency(log)
        val apparent = apparentPower(log, arus, tegangan)
        val waktu = formatTime(firstValue(log.waktu, log.timestamp, log.updated_at, log.createdAt, log.created_at))
        val relay = relayLabel(firstValue(log.relay, log.relayStatus, log.relay_status))
        val source = sourceLabel(log)
        val meterSource = meterSourceLabel(log)

        binding.tvHistTime.text = waktu
        binding.tvHistValues.text = String.format(
            Locale.US,
            "%.2f A  •  %.1f V  •  %.0f W",
            arus,
            tegangan,
            dayaAktif
        )
        binding.tvHistStatus.text = status
        applyStatusStyle(binding.tvHistStatus, status)
        binding.tvHistRelay.text = "Relay $relay"
        applyMetaStyle(binding.tvHistRelay)
        binding.tvHistSource.text = source
        applyMetaStyle(binding.tvHistSource)
        binding.tvHistMeterSource.text = meterSource
        applyMetaStyle(binding.tvHistMeterSource)

        binding.tvDetailTime.text = waktu
        binding.tvDetailStatus.text = status
        applyStatusStyle(binding.tvDetailStatus, status)
        binding.tvDetailArus.text = String.format(Locale.US, "%.2f A", arus)
        binding.tvDetailTegangan.text = String.format(Locale.US, "%.1f V", tegangan)
        binding.tvDetailDaya.text = String.format(Locale.US, "%.0f W", dayaAktif)
        binding.tvDetailEnergi.text = String.format(Locale.US, "%.3f kWh", energi)
        binding.tvDetailPf.text = String.format(Locale.US, "%.2f", powerFactor)
        binding.tvDetailFrekuensi.text = String.format(Locale.US, "%.1f Hz", frekuensi)
        binding.tvDetailApparent.text = String.format(Locale.US, "%.0f VA", apparent)
        binding.tvDetailRelay.text = "Relay $relay"
        applyMetaStyle(binding.tvDetailRelay)
        binding.tvDetailSource.text = source
        applyMetaStyle(binding.tvDetailSource)
        binding.tvDetailMeterSource.text = meterSource
        applyMetaStyle(binding.tvDetailMeterSource)
    }

    override fun getItemCount() = logs.size

    fun updateData(newLogs: List<HistoryLog>) {
        if (logs === newLogs || logs == newLogs) return
        val oldLogs = logs
        logs = newLogs.toList()
        DiffUtil.calculateDiff(object : DiffUtil.Callback() {
            override fun getOldListSize(): Int = oldLogs.size
            override fun getNewListSize(): Int = logs.size
            override fun areItemsTheSame(oldItemPosition: Int, newItemPosition: Int): Boolean {
                val oldKey = oldLogs[oldItemPosition].key
                val newKey = logs[newItemPosition].key
                return oldKey != null && oldKey == newKey
            }
            override fun areContentsTheSame(oldItemPosition: Int, newItemPosition: Int): Boolean =
                oldLogs[oldItemPosition] == logs[newItemPosition]
        }).dispatchUpdatesTo(this)
    }

    fun setDisplayMode(mode: DisplayMode) {
        if (displayMode == mode) return
        displayMode = mode
        notifyDataSetChanged()
    }

    fun setDefaultSource(source: String) {
        val normalized = source.trim().uppercase(Locale.ROOT).ifBlank { "CLOUD" }
        if (defaultSource == normalized) return
        defaultSource = normalized
        notifyDataSetChanged()
    }

    private fun number(value: Any?): Double = when (value) {
        is Number -> value.toDouble()
        else -> value?.toString()?.toDoubleOrNull() ?: 0.0
    }

    private fun firstValue(vararg values: Any?): Any? = values.firstOrNull {
        when (it) {
            null -> false
            is String -> it.isNotBlank()
            else -> true
        }
    }

    private fun activePower(log: HistoryLog): Double = number(
        firstValue(log.daya_w, log.active_power, log.activePower, log.power_w, log.dayaAktif, log.daya)
    )

    private fun energy(log: HistoryLog): Double = number(
        firstValue(log.energi_kwh, log.energy_kwh, log.energy, log.energi, log.kwh)
    )

    private fun powerFactor(log: HistoryLog): Double {
        val raw = firstValue(log.power_factor, log.powerFactor, log.pf)
        return if (raw == null) 0.85 else number(raw)
    }

    private fun frequency(log: HistoryLog): Double = number(
        firstValue(log.frekuensi, log.frequency, log.hz)
    )

    private fun apparentPower(log: HistoryLog, arus: Double, tegangan: Double): Double {
        val direct = firstValue(
            log.apparent_power,
            log.apparentPower,
            log.apparent,
            log.apparent_va,
            log.daya_va,
            log.va,
            log.daya
        )
        return if (direct != null) number(direct) else arus * tegangan
    }

    private fun normalizeStatus(raw: String?): String = when (raw?.trim()?.uppercase(Locale.ROOT)) {
        "DANGER" -> "DANGER"
        "LEAKAGE" -> "LEAKAGE"
        "WARNING" -> "WARNING"
        "NORMAL" -> "NORMAL"
        "SENSOR_ERROR" -> "SENSOR_ERROR"
        else -> "UNKNOWN"
    }

    private fun relayLabel(raw: Any?): String {
        val text = raw?.toString()?.trim()?.uppercase(Locale.ROOT).orEmpty()
        return when {
            raw == 1 || raw == true || text == "1" || text == "ON" -> "ON"
            raw == 0 || raw == false || text == "0" || text == "OFF" -> "OFF"
            else -> "—"
        }
    }

    private fun sourceLabel(log: HistoryLog): String {
        val raw = firstValue(log.source, log.sumber, log.mode, log.endpoint, log.dataSource)
        return raw?.toString()?.trim()?.uppercase(Locale.ROOT)?.ifBlank { defaultSource } ?: defaultSource
    }

    private fun meterSourceLabel(log: HistoryLog): String {
        val raw = firstValue(log.sensor_source, log.sensorSource, log.meter_source, log.meterSource)
        val value = raw?.toString()?.trim()?.ifBlank { null }
        return value ?: "PZEM-004T"
    }

    private fun formatTime(raw: Any?): String {
        val epoch = number(raw).toLong()
        if (epoch > 1_000_000_000_000L) {
            return SimpleDateFormat("dd MMM yyyy, HH:mm:ss", Locale("id", "ID"))
                .format(Date(epoch))
        }

        val text = raw?.toString()?.trim().orEmpty()
        if (text.isBlank() || (epoch > 0 && epoch < 1_000_000_000_000L)) return "—"

        val isoMatch = Regex("(\\d{4}-\\d{2}-\\d{2})T(\\d{2}:\\d{2}:\\d{2})").find(text)
        if (isoMatch != null) return "${isoMatch.groupValues[1]}, ${isoMatch.groupValues[2]}"
        return text
    }

    private fun applyStatusStyle(view: TextView, status: String) {
        val color = when (status) {
            "DANGER" -> Color.parseColor("#ef4444")
            "LEAKAGE" -> Color.parseColor("#fb923c")
            "WARNING" -> Color.parseColor("#fee58a")
            "NORMAL" -> Color.parseColor("#2eea72")
            "SENSOR_ERROR" -> Color.parseColor("#7c879b")
            else -> Color.parseColor("#94a3b8")
        }
        view.setTextColor(color)
        view.background = roundedDrawable(color, 40, 130)
    }

    private fun applyMetaStyle(view: TextView) {
        view.setTextColor(Color.parseColor("#cbd5e1"))
        view.background = roundedDrawable(Color.WHITE, 24, 70)
    }

    private fun roundedDrawable(color: Int, fillAlpha: Int, strokeAlpha: Int): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 100f
            setColor(Color.argb(fillAlpha, Color.red(color), Color.green(color), Color.blue(color)))
            setStroke(1, Color.argb(strokeAlpha, Color.red(color), Color.green(color), Color.blue(color)))
        }
    }
}
