package com.example.aashalinkv10.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.aashalinkv10.R
import com.example.aashalinkv10.databinding.ItemNearbyWorkerBinding
import com.example.aashalinkv10.models.EmergencyContact

class NearbyWorkerAdapter(
    private val workers: List<EmergencyContact>
) : RecyclerView.Adapter<NearbyWorkerAdapter.ViewHolder>() {

    class ViewHolder(val binding: ItemNearbyWorkerBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemNearbyWorkerBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val worker = workers[position]
        holder.binding.apply {
            tvName.text = worker.name
            tvVillageDist.text = "${worker.village} • ${String.format("%.1f", worker.distanceKm)} km away"
            
            // Initials
            val initials = worker.name.split(" ")
                .filter { it.isNotEmpty() }
                .take(2)
                .joinToString("") { it[0].toString().uppercase() }
            tvInitials.text = initials

            // Alert Toggle
            switchAlert.setOnCheckedChangeListener(null) // Clear listener to avoid trigger on bind
            switchAlert.isChecked = worker.isAutoAlert
            tvAlertBadge.visibility = if (worker.isAutoAlert) android.view.View.VISIBLE else android.view.View.GONE
            
            switchAlert.setOnCheckedChangeListener { _, isChecked ->
                worker.isAutoAlert = isChecked
                tvAlertBadge.visibility = if (isChecked) android.view.View.VISIBLE else android.view.View.GONE
            }
        }
    }

    override fun getItemCount() = workers.size
}
