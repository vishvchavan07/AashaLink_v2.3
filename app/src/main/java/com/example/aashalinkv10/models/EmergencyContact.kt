package com.example.aashalinkv10.models

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class EmergencyContact(
    val id: String = "",
    val name: String = "",
    val phone: String = "",         // format: +91XXXXXXXXXX
    val relation: String = "",      // Husband/Father/Mother/Sister etc.
    val contactType: String = "",   // "family" / "supervisor" / "asha_worker"
    val designation: String = "",   // ANM / PHC Officer / etc (for supervisor)
    val village: String = "",       // for nearby asha workers
    val distanceKm: Double = -1.0,  // -1.0 indicates N/A (e.g. for family/supervisor)
    val isPrimary: Boolean = false, // primary family contact
    val isAutoAlert: Boolean = true,// auto include in SOS
    val ashaId: String = "",        // for nearby asha workers
    val latitude: Double = 0.0,     // for nearby asha workers
    val longitude: Double = 0.0,    // for nearby asha workers
    val addedAt: Long = System.currentTimeMillis()
)
