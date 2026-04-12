package com.example.aashalinkv10.ui.bottomsheets

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.example.aashalinkv10.R
import com.example.aashalinkv10.databinding.LayoutWorkerDetailBottomSheetBinding
import com.example.aashalinkv10.models.EmergencyContact
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

class WorkerDetailBottomSheet : BottomSheetDialogFragment() {

    private var _binding: LayoutWorkerDetailBottomSheetBinding? = null
    private val binding get() = _binding!!
    private var worker: EmergencyContact? = null

    fun setWorker(worker: EmergencyContact) {
        this.worker = worker
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = LayoutWorkerDetailBottomSheetBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        worker?.let { w ->
            binding.apply {
                tvName.text = w.name
                tvDesignation.text = if (w.designation.isNotEmpty()) w.designation else "Asha Worker"
                tvAshaId.text = if (w.ashaId.isNotEmpty()) w.ashaId else "N/A"
                tvVillage.text = if (w.village.isNotEmpty()) w.village else "N/A"
                tvDistance.text = if (w.distanceKm >= 0) "${String.format("%.1f", w.distanceKm)} km away" else "N/A"
                tvPhone.text = if (w.phone.isNotEmpty()) w.phone else "N/A"

                // Initials
                val initials = w.name.split(" ")
                    .filter { it.isNotEmpty() }
                    .take(2)
                    .joinToString("") { it[0].toString().uppercase() }
                tvInitials.text = initials

                btnCall.setOnClickListener {
                    if (w.phone.isNotEmpty()) {
                        val intent = Intent(Intent.ACTION_DIAL)
                        intent.data = Uri.parse("tel:${w.phone}")
                        startActivity(intent)
                    }
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        const val TAG = "WorkerDetailBottomSheet"
    }
}
