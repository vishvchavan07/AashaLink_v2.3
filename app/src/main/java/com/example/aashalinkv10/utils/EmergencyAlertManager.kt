package com.example.aashalinkv10.utils

import android.content.Context
import android.location.Location
import android.telephony.SmsManager
import com.example.aashalinkv10.models.EmergencyContact
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.text.SimpleDateFormat
import java.util.*

object EmergencyAlertManager {

    fun hasContacts(context: Context): Boolean {
        val contacts = getSavedContacts(context)
        return contacts.isNotEmpty()
    }

    fun getSavedContacts(context: Context): List<EmergencyContact> {
        val prefs = context.getSharedPreferences("AashaLinkPrefs", Context.MODE_PRIVATE)
        val json = prefs.getString("emergency_contacts_json", null) ?: return emptyList()
        val type = object : TypeToken<List<EmergencyContact>>() {}.type
        return Gson().fromJson(json, type)
    }

    fun sendSOSAlert(
        context: Context,
        location: Location,
        onComplete: (successCount: Int, failCount: Int) -> Unit
    ) {
        val contacts = getSavedContacts(context)
        if (contacts.isEmpty()) {
            onComplete(0, 0)
            return
        }

        // Get worker info (usually stored in SharedPreferences or passed)
        val prefs = context.getSharedPreferences("AashaLinkPrefs", Context.MODE_PRIVATE)
        val workerName = prefs.getString("worker_name", "Asha Worker") ?: "Asha Worker"
        val ashaId = prefs.getString("asha_id", "ID") ?: "ID"
        val village = prefs.getString("village", "Village") ?: "Village"
        val district = prefs.getString("district", "District") ?: "District"

        val mapsLink = "https://maps.google.com/?q=${location.latitude},${location.longitude}"
        val message = buildSOSMessage(workerName, ashaId, village, district, mapsLink)

        var success = 0
        var fail = 0
        val smsManager = SmsManager.getDefault()

        for (contact in contacts) {
            if (contact.isAutoAlert) {
                try {
                    smsManager.sendTextMessage(contact.phone, null, message, null, null)
                    success++
                } catch (e: Exception) {
                    fail++
                }
            }
        }

        // Save alert to Firebase
        saveAlertToFirebase(location, success + fail)

        onComplete(success, fail)
    }

    private fun saveAlertToFirebase(location: Location, count: Int) {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        val db = FirebaseFirestore.getInstance()
        val alert = mapOf(
            "timestamp" to System.currentTimeMillis(),
            "latitude" to location.latitude,
            "longitude" to location.longitude,
            "contactsAlerted" to count
        )
        db.collection("ashaWorkers").document(uid)
            .collection("sosAlerts").add(alert)
    }

    fun buildSOSMessage(
        name: String, ashaId: String,
        village: String, district: String,
        mapsLink: String
    ): String {
        val time = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(Date())
        return "EMERGENCY - AashaLink Alert\n" +
               "Asha Worker: $name ($ashaId)\n" +
               "Location: $mapsLink\n" +
               "Village: $village, $district\n" +
               "Time: $time\n" +
               "Please respond immediately."
    }
}
