package com.example.aashalinkv10.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.aashalinkv10.R
import com.example.aashalinkv10.databinding.ItemNearbyWorkerBinding
import com.example.aashalinkv10.models.EmergencyContact

class NearbyWorkerAdapter(
    private val workers: List<EmergencyContact>,
    private val onItemClick: (EmergencyContact) -> Unit,
    private val onStatusToggle: (EmergencyContact, Boolean) -> Unit
) : RecyclerView.Adapter<NearbyWorkerAdapter.ViewHolder>() {

    class ViewHolder(val binding: ItemNearbyWorkerBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemNearbyWorkerBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val worker = workers[position]
        holder.binding.apply {
            root.setOnClickListener { onItemClick(worker) }
            tvName.text = worker.name
            
            // Designation
            if (worker.designation.isNotEmpty()) {
                tvDesignation.visibility = android.view.View.VISIBLE
                tvDesignation.text = "(${worker.designation})"
            } else {
                tvDesignation.visibility = android.view.View.GONE
            }

            tvVillageDist.text = "${worker.village} • ${String.format("%.1f", worker.distanceKm)} km away"
            
            // Asha ID
            if (worker.ashaId.isNotEmpty()) {
                tvAshaId.visibility = android.view.View.VISIBLE
                tvAshaId.text = "ID: ${worker.ashaId}"
            } else {
                tvAshaId.visibility = android.view.View.GONE
            }
            
            // Initials
            val initials = worker.name.split(" ")
                .filter { it.isNotEmpty() }
                .take(2)
                .joinToString("") { it[0].toString().uppercase() }
            tvInitials.text = initials

            // Status Indicator
            viewStatus.visibility = android.view.View.VISIBLE
            viewStatus.setBackgroundResource(if (worker.isActive) R.drawable.bg_circle_green else R.drawable.bg_circle_orange)

            // Active Toggle
            switchActive.setOnCheckedChangeListener(null)
            switchActive.isChecked = worker.isActive
            switchActive.setOnCheckedChangeListener { _, isChecked ->
                worker.isActive = isChecked
                viewStatus.setBackgroundResource(if (isChecked) R.drawable.bg_circle_green else R.drawable.bg_circle_orange)
                onStatusToggle(worker, isChecked)
            }

            // Alert Toggle
            switchAlert.setOnCheckedChangeListener(null) // Clear listener to avoid trigger on bind
            switchAlert.isChecked = worker.isAutoAlert
            tvAlertBadge.visibility = if (worker.isAutoAlert) android.view.View.VISIBLE else android.view.View.GONE
            
            switchAlert.setOnCheckedChangeListener { _, isChecked ->
                worker.isAutoAlert = isChecked
                tvAlertBadge.visibility = if (isChecked) android.view.View.VISIBLE else android.view.View.GONE
            }

            // Call Button
            btnCall.setOnClickListener {
                if (worker.phone.isNotEmpty()) {
                    val intent = android.content.Intent(android.content.Intent.ACTION_DIAL)
                    intent.data = android.net.Uri.parse("tel:${worker.phone}")
                    it.context.startActivity(intent)
                } else {
                    android.widget.Toast.makeText(it.context, "Phone number not available", android.widget.Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    override fun getItemCount() = workers.size
}
