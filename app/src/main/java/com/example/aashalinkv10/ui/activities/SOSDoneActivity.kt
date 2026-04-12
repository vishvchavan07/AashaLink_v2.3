package com.example.aashalinkv10.ui.activities

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.CountDownTimer
import android.widget.TextView
import com.example.aashalinkv10.R
import com.example.aashalinkv10.models.EmergencyContact
import com.google.android.material.button.MaterialButton
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

class SOSDoneActivity : BaseActivity() {

    private var returnTimer: CountDownTimer? = null
    private var primaryContact: EmergencyContact? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sos_done)

        val voiceCount = intent.getIntExtra("contacts_alerted", 0)
        val smsCount = intent.getIntExtra("sms_count", 0)

        findViewById<TextView>(R.id.tvAlertSummary).text = "Alerted $voiceCount people with your location\nand voice message"
        findViewById<TextView>(R.id.tvSmsCount).text = "$smsCount contacts"
        findViewById<TextView>(R.id.tvVoiceCount).text = "$voiceCount contacts"

        loadPrimaryContact()

        findViewById<MaterialButton>(R.id.btnCall108).setOnClickListener { dialNumber("108") }
        
        val btnCallPrimary = findViewById<MaterialButton>(R.id.btnCallPrimary)
        primaryContact?.let { contact ->
            btnCallPrimary.text = "Call ${contact.name}"
            btnCallPrimary.setOnClickListener { dialNumber(contact.phone) }
        } ?: run {
            btnCallPrimary.text = "Call Emergency"
            btnCallPrimary.setOnClickListener { dialNumber("108") }
        }

        startReturnTimer()
    }

    private fun loadPrimaryContact() {
        val prefs = getSharedPreferences("AashaLinkPrefs", Context.MODE_PRIVATE)
        val json = prefs.getString("emergency_contacts_json", null)
        if (json != null) {
            val type = object : TypeToken<List<EmergencyContact>>() {}.type
            val contacts: List<EmergencyContact> = Gson().fromJson(json, type)
            primaryContact = contacts.find { it.isAutoAlert } // Assuming first auto-alert is primary
        }
    }

    private fun dialNumber(number: String) {
        val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$number"))
        if (checkSelfPermission(Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
            startActivity(intent)
        } else {
            val intent2 = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number"))
            startActivity(intent2)
        }
    }

    private fun startReturnTimer() {
        val tvCountdown = findViewById<TextView>(R.id.tvReturnCountdown)
        returnTimer = object : CountDownTimer(10000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                val seconds = millisUntilFinished / 1000
                tvCountdown.text = "Returning to home in ${seconds}s..."
            }

            override fun onFinish() {
                val intent = Intent(this@SOSDoneActivity, MainActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
                startActivity(intent)
                finish()
            }
        }.start()
    }

    override fun onDestroy() {
        super.onDestroy()
        returnTimer?.cancel()
    }
}
