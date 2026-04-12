package com.example.aashalinkv10.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.aashalinkv10.R
import com.example.aashalinkv10.databinding.ItemFamilyContactBinding
import com.example.aashalinkv10.models.EmergencyContact

class FamilyContactAdapter(
    private val contacts: List<EmergencyContact>,
    private val onDeleteClick: (EmergencyContact) -> Unit,
    private val onItemClick: (EmergencyContact) -> Unit
) : RecyclerView.Adapter<FamilyContactAdapter.ViewHolder>() {

    class ViewHolder(val binding: ItemFamilyContactBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemFamilyContactBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val contact = contacts[position]
        holder.binding.apply {
            root.setOnClickListener { onItemClick(contact) }
            tvName.text = contact.name
            tvRelationPhone.text = "${contact.relation} • ${contact.phone}"
            
            // Initials
            val initials = contact.name.split(" ")
                .filter { it.isNotEmpty() }
                .take(2)
                .joinToString("") { it[0].toString().uppercase() }
            tvInitials.text = initials

            // Primary Badge
            tvPrimaryBadge.visibility = if (contact.isPrimary) android.view.View.VISIBLE else android.view.View.GONE

            btnDelete.setOnClickListener { onDeleteClick(contact) }
        }
    }

    override fun getItemCount() = contacts.size
}
