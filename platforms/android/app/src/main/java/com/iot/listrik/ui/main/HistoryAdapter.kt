package com.iot.listrik.ui.main

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.iot.listrik.data.model.HistoryLog
import com.iot.listrik.databinding.ItemHistoryBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class HistoryAdapter(private var logs: List<HistoryLog>) :
    RecyclerView.Adapter<HistoryAdapter.ViewHolder>() {

    class ViewHolder(val binding: ItemHistoryBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemHistoryBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val log = logs[position]
        
        val arusValue = (log.arus as? Number)?.toDouble() ?: 0.0
        val teganganValue = (log.tegangan as? Number)?.toDouble() ?: 0.0
        
        holder.binding.tvHistArus.text = String.format("%.2f A", arusValue)
        holder.binding.tvHistTegangan.text = String.format("%.0f V", teganganValue)
        
        val displayStatus = when (log.status) {
            "DANGER" -> "Critical Leak Detected"
            "WARNING" -> "Check Load"
            else -> "System Stable"
        }
        holder.binding.tvHistStatus.text = displayStatus
        
        when (log.status) {
            "NORMAL" -> {
                holder.binding.tvHistStatus.setTextColor(Color.parseColor("#22c55e"))
                holder.binding.tvHistStatus.setBackgroundColor(Color.parseColor("#1A22c55e"))
            }
            "DANGER" -> {
                holder.binding.tvHistStatus.setTextColor(Color.parseColor("#ef4444"))
                holder.binding.tvHistStatus.setBackgroundColor(Color.parseColor("#33ef4444"))
            }
            else -> {
                // WARNING / LEAKAGE
                holder.binding.tvHistStatus.setTextColor(Color.parseColor("#f59e0b"))
                holder.binding.tvHistStatus.setBackgroundColor(Color.parseColor("#33f59e0b"))
            }
        }

        // Parse waktu (Handle both String and Long timestamp)
        val waktuStr = log.waktu.toString()
        val parts = waktuStr.split(" ")
        if (parts.size >= 2) {
            holder.binding.tvHistDate.text = parts[0]
            holder.binding.tvHistTime.text = parts[1]
        } else {
            holder.binding.tvHistDate.text = waktuStr
            holder.binding.tvHistTime.text = "-"
        }
    }

    override fun getItemCount() = logs.size
    
    fun updateData(newLogs: List<HistoryLog>) {
        logs = newLogs
        notifyDataSetChanged()
    }
}
