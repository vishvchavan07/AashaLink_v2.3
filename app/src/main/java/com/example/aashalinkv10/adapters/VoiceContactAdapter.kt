package com.example.aashalinkv10.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.example.aashalinkv10.R
import com.example.aashalinkv10.models.EmergencyContact
import com.example.aashalinkv10.ui.activities.SOSVoiceActivity
import com.google.android.material.button.MaterialButton

class VoiceContactAdapter(
    private val contacts: List<EmergencyContact>,
    private val onPlayClick: (EmergencyContact, Int) -> Unit,
    private val onCallClick: (EmergencyContact, Int) -> Unit
) : RecyclerView.Adapter<VoiceContactAdapter.ViewHolder>() {

    private val statuses = IntArray(contacts.size) { SOSVoiceActivity.STATUS_IDLE }

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvInitials: TextView = view.findViewById(R.id.tvInitials)
        val tvName: TextView = view.findViewById(R.id.tvName)
        val tvRelationPhone: TextView = view.findViewById(R.id.tvRelationPhone)
        val btnPlay: MaterialButton = view.findViewById(R.id.btnPlay)
        val btnCall: MaterialButton = view.findViewById(R.id.btnCall)
        val ivStatus: ImageView = view.findViewById(R.id.ivStatus)
        val pbStatus: ProgressBar = view.findViewById(R.id.pbStatus)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_voice_contact, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val contact = contacts[position]
        holder.tvName.text = contact.name
        holder.tvRelationPhone.text = "${contact.relation ?: contact.contactType} • ${contact.phone}"
        holder.tvInitials.text = contact.name.take(1).uppercase()

        holder.btnPlay.setOnClickListener { onPlayClick(contact, position) }
        holder.btnCall.setOnClickListener { onCallClick(contact, position) }

        updateStatusUI(holder, statuses[position])
    }

    override fun getItemCount() = contacts.size

    fun updateStatus(position: Int, status: Int) {
        if (position in statuses.indices) {
            statuses[position] = status
            notifyItemChanged(position)
        }
    }

    private fun updateStatusUI(holder: ViewHolder, status: Int) {
        holder.pbStatus.visibility = View.GONE
        holder.ivStatus.visibility = View.VISIBLE

        when (status) {
            SOSVoiceActivity.STATUS_IDLE -> {
                holder.ivStatus.setImageResource(R.drawable.ic_circle_outline)
                holder.ivStatus.imageTintList = ContextCompat.getColorStateList(holder.itemView.context, android.R.color.darker_gray)
            }
            SOSVoiceActivity.STATUS_IN_PROGRESS -> {
                holder.ivStatus.visibility = View.GONE
                holder.pbStatus.visibility = View.VISIBLE
            }
            SOSVoiceActivity.STATUS_SENT_WA -> {
                holder.ivStatus.setImageResource(R.drawable.ic_check_circle)
                holder.ivStatus.imageTintList = ContextCompat.getColorStateList(holder.itemView.context, android.R.color.holo_green_dark)
            }
            SOSVoiceActivity.STATUS_CALLED -> {
                holder.ivStatus.setImageResource(R.drawable.ic_phone)
                holder.ivStatus.imageTintList = ContextCompat.getColorStateList(holder.itemView.context, android.R.color.holo_blue_dark)
            }
        }
    }
}
