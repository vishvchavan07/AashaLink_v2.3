package com.example.aashalinkv10.ui.bottomsheets

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Toast
import com.example.aashalinkv10.R
import com.example.aashalinkv10.databinding.LayoutAddContactBottomSheetBinding
import com.example.aashalinkv10.models.EmergencyContact
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import java.util.*

class AddContactBottomSheet : BottomSheetDialogFragment() {

    private var _binding: LayoutAddContactBottomSheetBinding? = null
    private val binding get() = _binding!!

    private var listener: OnContactAddedListener? = null

    interface OnContactAddedListener {
        fun onContactAdded(contact: EmergencyContact)
    }

    fun setOnContactAddedListener(listener: OnContactAddedListener) {
        this.listener = listener
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = LayoutAddContactBottomSheetBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRelationSpinner()

        binding.btnClose.setOnClickListener { dismiss() }

        binding.btnAddContact.setOnClickListener {
            validateAndAdd()
        }
    }

    private fun setupRelationSpinner() {
        val relations = arrayOf(
            "Husband", "Wife", "Father", "Mother", 
            "Brother", "Sister", "Son", "Daughter", "Other"
        )
        val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, relations)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerRelation.adapter = adapter
    }

    private fun validateAndAdd() {
        val name = binding.etName.text.toString().trim()
        val phone = binding.etPhone.text.toString().trim()
        val relation = binding.spinnerRelation.selectedItem.toString()
        val isPrimary = binding.cbPrimary.isChecked

        if (name.isEmpty()) {
            binding.etName.error = getString(R.string.error_name_empty)
            return
        }

        if (phone.length != 10) {
            binding.etPhone.error = getString(R.string.error_invalid_phone)
            return
        }

        val contact = EmergencyContact(
            id = UUID.randomUUID().toString(),
            name = name,
            phone = "+91$phone",
            relation = relation,
            contactType = "family",
            isPrimary = isPrimary,
            addedAt = System.currentTimeMillis()
        )

        listener?.onContactAdded(contact)
        dismiss()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        const val TAG = "AddContactBottomSheet"
    }
}
