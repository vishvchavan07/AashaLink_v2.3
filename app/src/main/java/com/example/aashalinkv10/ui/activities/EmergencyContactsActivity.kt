package com.example.aashalinkv10.ui.activities

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.aashalinkv10.R
import com.example.aashalinkv10.adapters.FamilyContactAdapter
import com.example.aashalinkv10.adapters.NearbyWorkerAdapter
import com.example.aashalinkv10.databinding.ActivityEmergencyContactsBinding
import com.example.aashalinkv10.models.EmergencyContact
import com.example.aashalinkv10.ui.bottomsheets.AddContactBottomSheet
import com.example.aashalinkv10.utils.EmergencyAlertManager
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.gson.Gson
import java.util.*

class EmergencyContactsActivity : BaseActivity(), AddContactBottomSheet.OnContactAddedListener {

    private lateinit var binding: ActivityEmergencyContactsBinding
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private val uid get() = auth.currentUser?.uid ?: ""

    private lateinit var familyAdapter: FamilyContactAdapter
    private lateinit var nearbyAdapter: NearbyWorkerAdapter

    private val familyContacts = mutableListOf<EmergencyContact>()
    private val nearbyWorkers = mutableListOf<EmergencyContact>()
    private var supervisorContact: EmergencyContact? = null

    private lateinit var fusedLocationClient: FusedLocationProviderClient

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityEmergencyContactsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        setupUI()
        loadSavedContacts()
        detectNearbyAshaWorkers()
    }

    override fun onResume() {
        super.onResume()
        // Automatically try to detect workers if we were previously blocked by permissions/GPS
        if (binding.btnOpenSettings.visibility == View.VISIBLE) {
            detectNearbyAshaWorkers()
        }
    }

    private fun setupUI() {
        binding.btnBack.setOnClickListener { finish() }

        // Family List
        familyAdapter = FamilyContactAdapter(familyContacts) { contact ->
            familyContacts.remove(contact)
            updateFamilyUI()
        }
        binding.rvFamilyContacts.layoutManager = LinearLayoutManager(this)
        binding.rvFamilyContacts.adapter = familyAdapter

        binding.btnAddFamily.setOnClickListener {
            if (familyContacts.size >= 3) {
                Toast.makeText(this, R.string.max_family_limit, Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val bottomSheet = AddContactBottomSheet()
            bottomSheet.setOnContactAddedListener(this)
            bottomSheet.show(supportFragmentManager, AddContactBottomSheet.TAG)
        }

        // Supervisor Section
        val designations = arrayOf("ANM", "PHC Doctor", "Block Health Officer", "CDMO", "Other")
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, designations)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerDesignation.adapter = adapter

        binding.btnEditSupervisor.setOnClickListener {
            val isEditing = binding.etSupervisorName.isEnabled
            toggleSupervisorEdit(!isEditing)
        }

        // Nearby Workers
        nearbyAdapter = NearbyWorkerAdapter(nearbyWorkers)
        binding.rvNearbyWorkers.layoutManager = LinearLayoutManager(this)
        binding.rvNearbyWorkers.adapter = nearbyAdapter

        binding.btnRefreshNearby.setOnClickListener { detectNearbyAshaWorkers() }

        binding.btnOpenSettings.setOnClickListener {
            val intent = android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            val uri = android.net.Uri.fromParts("package", packageName, null)
            intent.data = uri
            startActivity(intent)
        }

        binding.btnSaveContacts.setOnClickListener { saveAllContacts() }

        updateSosPreview()
    }

    private fun updateSosPreview() {
        val prefs = getSharedPreferences("AashaLinkPrefs", Context.MODE_PRIVATE)
        val workerName = prefs.getString("worker_name", "[Your Name]") ?: "[Your Name]"
        val ashaId = prefs.getString("asha_id", "[Your ID]") ?: "[Your ID]"
        val village = prefs.getString("village", "[Your Village]") ?: "[Your Village]"
        val district = prefs.getString("district", "[Your District]") ?: "[Your District]"

        val previewText = "EMERGENCY - AashaLink Alert\n" +
                "Asha Worker: $workerName ($ashaId)\n" +
                "Location: [Live location link will be auto-filled]\n" +
                "Village: $village, $district\n" +
                "Time: [Current Time]\n" +
                "Please respond immediately."
        
        binding.tvSosPreview.text = previewText
    }

    private fun toggleSupervisorEdit(editable: Boolean) {
        binding.etSupervisorName.isEnabled = editable
        binding.spinnerDesignation.isEnabled = editable
        binding.etSupervisorPhone.isEnabled = editable
        binding.btnEditSupervisor.text = if (editable) getString(R.string.save) else getString(R.string.edit)
        
        if (!editable) {
            // Logic to temporarily store supervisor data in memory
            val name = binding.etSupervisorName.text.toString().trim()
            val phone = binding.etSupervisorPhone.text.toString().trim()
            val desig = binding.spinnerDesignation.selectedItem?.toString() ?: ""
            
            if (name.isNotEmpty() && phone.isNotEmpty()) {
                supervisorContact = EmergencyContact(
                    id = "supervisor_id",
                    name = name,
                    phone = if (phone.startsWith("+91")) phone else "+91$phone",
                    designation = desig,
                    contactType = "supervisor",
                    distanceKm = -1.0,
                    isAutoAlert = true
                )
                Toast.makeText(this, "Supervisor details updated locally", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun loadSavedContacts() {
        if (uid.isEmpty()) return

        db.collection("ashaWorkers").document(uid)
            .collection("emergencyContacts")
            .get()
            .addOnSuccessListener { documents ->
                familyContacts.clear()
                for (doc in documents) {
                    val contact = doc.toObject(EmergencyContact::class.java)
                    when (contact.contactType) {
                        "family" -> familyContacts.add(contact)
                        "supervisor" -> {
                            supervisorContact = contact
                            populateSupervisorUI(contact)
                        }
                        "asha_worker" -> {
                            // These are usually dynamic, but we can load saved preferences
                        }
                    }
                }
                updateFamilyUI()
            }
    }

    private fun populateSupervisorUI(contact: EmergencyContact) {
        binding.etSupervisorName.setText(contact.name)
        binding.etSupervisorPhone.setText(contact.phone)
        val designations = resources.getStringArray(R.array.designations)
        val index = designations.indexOf(contact.designation)
        if (index >= 0) binding.spinnerDesignation.setSelection(index)
    }

    private fun updateFamilyUI() {
        familyAdapter.notifyDataSetChanged()
        binding.tvFamilyCount.text = "${familyContacts.size}/3"
    }

    override fun onContactAdded(contact: EmergencyContact) {
        familyContacts.add(contact)
        updateFamilyUI()
    }

    private fun detectNearbyAshaWorkers() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            binding.tvNearbyStatus.visibility = View.VISIBLE
            binding.tvNearbyStatus.text = getString(R.string.location_permission_denied)
            binding.btnOpenSettings.visibility = View.VISIBLE
            binding.pbNearby.visibility = View.GONE
            return
        }

        val locationManager = getSystemService(Context.LOCATION_SERVICE) as android.location.LocationManager
        val isGpsEnabled = locationManager.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER)
        if (!isGpsEnabled) {
            binding.tvNearbyStatus.visibility = View.VISIBLE
            binding.tvNearbyStatus.text = getString(R.string.location_services_disabled)
            binding.btnOpenSettings.visibility = View.VISIBLE
            binding.pbNearby.visibility = View.GONE
            return
        }

        binding.btnOpenSettings.visibility = View.GONE
        binding.pbNearby.visibility = View.VISIBLE
        binding.tvNearbyStatus.visibility = View.VISIBLE
        binding.tvNearbyStatus.text = getString(R.string.detecting_workers)

        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            if (location != null) {
                val myLat = location.latitude
                val myLng = location.longitude

                // Update own location
                db.collection("ashaWorkers").document(uid)
                    .update("latitude", myLat, "longitude", myLng)

                // Query others
                db.collection("ashaWorkers")
                    .whereEqualTo("isActive", true)
                    .get()
                    .addOnSuccessListener { result ->
                        nearbyWorkers.clear()
                        for (doc in result) {
                            if (doc.id == uid) continue
                            
                            val lat = doc.getDouble("latitude") ?: 0.0
                            val lng = doc.getDouble("longitude") ?: 0.0
                            val name = doc.getString("name") ?: "Asha Worker"
                            val phone = doc.getString("phoneNumber") ?: ""
                            val village = doc.getString("village") ?: ""
                            val ashaId = doc.getString("ashaId") ?: ""

                            val distance = calculateDistance(myLat, myLng, lat, lng)
                            if (distance <= 5.0) {
                                nearbyWorkers.add(EmergencyContact(
                                    id = doc.id,
                                    name = name,
                                    phone = phone,
                                    village = village,
                                    distanceKm = distance,
                                    ashaId = ashaId,
                                    contactType = "asha_worker",
                                    latitude = lat,
                                    longitude = lng
                                ))
                            }
                        }
                        nearbyWorkers.sortBy { it.distanceKm }
                        nearbyAdapter.notifyDataSetChanged()
                        
                        binding.pbNearby.visibility = View.GONE
                        if (nearbyWorkers.isEmpty()) {
                            binding.tvNearbyStatus.text = getString(R.string.no_workers_nearby)
                        } else {
                            binding.tvNearbyStatus.visibility = View.GONE
                        }
                    }
            } else {
                binding.pbNearby.visibility = View.GONE
                binding.tvNearbyStatus.text = "Could not get location"
            }
        }
    }

    private fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val R = 6371.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    private fun saveAllContacts() {
        if (uid.isEmpty()) return
        
        // 1. Explicitly capture Supervisor Data from UI fields
        val sName = binding.etSupervisorName.text.toString().trim()
        val sPhone = binding.etSupervisorPhone.text.toString().trim()
        val sDesig = binding.spinnerDesignation.selectedItem?.toString() ?: ""
        
        if (sName.isNotEmpty() && sPhone.isNotEmpty()) {
            supervisorContact = EmergencyContact(
                id = "supervisor_id",
                name = sName,
                phone = if (sPhone.startsWith("+91")) sPhone else "+91$sPhone",
                designation = sDesig,
                contactType = "supervisor",
                distanceKm = -1.0,
                isAutoAlert = true
            )
        }

        // 2. Prepare final list for saving (Family + Supervisor + Nearby Workers)
        val allToSave = mutableListOf<EmergencyContact>()
        allToSave.addAll(familyContacts)
        supervisorContact?.let { allToSave.add(it) }
        allToSave.addAll(nearbyWorkers.filter { it.isAutoAlert })

        if (allToSave.isEmpty()) {
            Toast.makeText(this, "Please add at least one emergency contact", Toast.LENGTH_SHORT).show()
            return
        }

        // 3. Save to Firestore using a Batch operation
        val batch = db.batch()
        val contactsRef = db.collection("ashaWorkers").document(uid).collection("emergencyContacts")
        
        contactsRef.get().addOnSuccessListener { documents ->
            // Delete existing contacts to avoid duplicates/stale data
            for (doc in documents) batch.delete(doc.reference)
            
            // Add all current contacts to the batch
            for (contact in allToSave) {
                val docRef = contactsRef.document(contact.id)
                batch.set(docRef, contact)
            }
            
            batch.commit().addOnSuccessListener {
                // 4. Backup to SharedPreferences for offline SOS functionality
                saveToSharedPrefs(allToSave)
                Toast.makeText(this, R.string.contacts_saved, Toast.LENGTH_SHORT).show()
                finish()
            }.addOnFailureListener { e ->
                Toast.makeText(this, "Failed to save to cloud: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }.addOnFailureListener { e ->
            Toast.makeText(this, "Failed to sync with cloud: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun saveToSharedPrefs(contacts: List<EmergencyContact>) {
        val prefs = getSharedPreferences("AashaLinkPrefs", Context.MODE_PRIVATE)
        val json = Gson().toJson(contacts)
        prefs.edit().putString("emergency_contacts_json", json).apply()
    }
}
