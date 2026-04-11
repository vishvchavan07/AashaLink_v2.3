package com.example.aashalinkv10.ui.activities

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.core.app.ActivityCompat
import com.example.aashalinkv10.databinding.ActivityMainBinding
import com.google.android.gms.location.LocationServices
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

class MainActivity : BaseActivity() {

    private lateinit var binding: ActivityMainBinding
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        updateMyLocationInFirebase()
    }

    private fun updateMyLocationInFirebase() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return
        }

        val fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            location?.let {
                val uid = auth.currentUser?.uid ?: return@let
                db.collection("ashaWorkers")
                    .document(uid)
                    .update(
                        mapOf(
                            "latitude" to it.latitude,
                            "longitude" to it.longitude,
                            "isActive" to true,
                            "lastSeen" to System.currentTimeMillis()
                        )
                    )
            }
        }
    }
}
