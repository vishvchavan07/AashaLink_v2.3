package com.example.aashalinkv10.ui.activities

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.core.app.ActivityCompat
import com.example.aashalinkv10.R
import com.example.aashalinkv10.databinding.ActivitySosBinding
import com.example.aashalinkv10.utils.EmergencyAlertManager
import com.google.android.gms.location.LocationServices
import com.google.gson.Gson

class SOSActivity : BaseActivity() {

    private lateinit var binding: ActivitySosBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySosBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupUI()
    }

    override fun onResume() {
        super.onResume()
        checkContacts()
    }

    private fun setupUI() {
        binding.btnBack.setOnClickListener { finish() }
        binding.btnEditContacts.setOnClickListener {
            startActivity(Intent(this, EmergencyContactsActivity::class.java))
        }

        binding.btnSosMain.setOnClickListener {
            handleSosPress()
        }
    }

    private fun checkContacts() {
        if (!EmergencyAlertManager.hasContacts(this)) {
            binding.bannerWarning.visibility = View.VISIBLE
            binding.bannerSuccess.visibility = View.GONE
            binding.tvContactNames.text = ""
            
            // Auto redirect if first time
            val prefs = getSharedPreferences("AashaLinkPrefs", MODE_PRIVATE)
            if (prefs.getBoolean("first_time_sos", true)) {
                prefs.edit().putBoolean("first_time_sos", false).apply()
                Toast.makeText(this, "Set up contacts before using SOS", Toast.LENGTH_LONG).show()
                startActivity(Intent(this, EmergencyContactsActivity::class.java))
            }
        } else {
            val contacts = EmergencyAlertManager.getSavedContacts(this)
            val count = contacts.count { it.isAutoAlert }
            binding.bannerWarning.visibility = View.GONE
            binding.bannerSuccess.visibility = View.VISIBLE
            binding.tvBannerSuccess.text = "✅ $count contacts will be alerted"
            
            val names = contacts.filter { it.isAutoAlert }.joinToString(", ") { it.name }
            binding.tvContactNames.text = names
        }
    }

    private fun handleSosPress() {
        if (!EmergencyAlertManager.hasContacts(this)) {
            Toast.makeText(this, "Please add emergency contacts first", Toast.LENGTH_SHORT).show()
            return
        }

        val contacts = EmergencyAlertManager.getSavedContacts(this).filter { it.isAutoAlert }
        val names = contacts.joinToString("\n") { "- ${it.name} (${it.relation})" }

        AlertDialog.Builder(this)
            .setTitle("Send SOS Alert?")
            .setMessage("The following contacts will be alerted with your live location:\n\n$names")
            .setPositiveButton("SEND SOS") { _, _ ->
                triggerSos(contacts.size)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun triggerSos(count: Int) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED ||
            ActivityCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.SEND_SMS,
                Manifest.permission.CALL_PHONE
            ), 101)
            return
        }

        binding.layoutLoading.visibility = View.VISIBLE
        
        val fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            if (location != null) {
                EmergencyAlertManager.sendSOSAlert(this, location) { success, fail ->
                    binding.layoutLoading.visibility = View.GONE
                    Toast.makeText(this, "SOS sent to $success people", Toast.LENGTH_LONG).show()
                    
                    val contacts = EmergencyAlertManager.getSavedContacts(this).filter { it.isAutoAlert }
                    val contactsJson = Gson().toJson(contacts)
                    val intent = Intent(this, SOSVoiceActivity::class.java)
                    intent.putExtra("contacts_json", contactsJson)
                    intent.putExtra("sent_count", success)
                    startActivity(intent)
                }
            } else {
                // Handle null location (send without link or use last known)
                Toast.makeText(this, "Could not get GPS. Sending alert without location.", Toast.LENGTH_SHORT).show()
                
                val contacts = EmergencyAlertManager.getSavedContacts(this).filter { it.isAutoAlert }
                val contactsJson = Gson().toJson(contacts)
                val intent = Intent(this, SOSVoiceActivity::class.java)
                intent.putExtra("contacts_json", contactsJson)
                intent.putExtra("sent_count", 0)
                startActivity(intent)
                
                binding.layoutLoading.visibility = View.GONE
            }
        }.addOnFailureListener {
            binding.layoutLoading.visibility = View.GONE
            Toast.makeText(this, "SOS Failed: ${it.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun dial108() {
        val intent = Intent(Intent.ACTION_CALL)
        intent.data = Uri.parse("tel:108")
        startActivity(intent)
    }
}
