package com.example.aashalinkv10.ui.activities

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.net.Uri
import android.os.Bundle
import android.os.CountDownTimer
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.aashalinkv10.R
import com.example.aashalinkv10.adapters.VoiceContactAdapter
import com.example.aashalinkv10.models.EmergencyContact
import com.google.android.material.button.MaterialButton
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.io.File

class SOSVoiceActivity : BaseActivity() {

    private var mediaRecorder: MediaRecorder? = null
    private var voiceFilePath: String = ""
    private var isRecording = false
    private var recordingSeconds = 0
    private var recordingTimer: CountDownTimer? = null
    private var contacts: List<EmergencyContact> = emptyList()
    private lateinit var adapter: VoiceContactAdapter

    private lateinit var btnMic: FloatingActionButton
    private lateinit var tvRecordTimer: TextView
    private lateinit var btnSendVoiceAll: MaterialButton
    private lateinit var btnSkipVoice: MaterialButton
    private lateinit var tvSuggestedMessage: TextView
    private lateinit var rvVoiceContacts: RecyclerView
    private lateinit var layoutWaveform: View
    private lateinit var viewPulse: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sos_voice)

        initViews()
        setupData()
        setupListeners()
        
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), REQUEST_RECORD_AUDIO)
        }
    }

    private fun initViews() {
        btnMic = findViewById(R.id.btnMic)
        tvRecordTimer = findViewById(R.id.tvRecordTimer)
        btnSendVoiceAll = findViewById(R.id.btnSendVoiceAll)
        btnSkipVoice = findViewById(R.id.btnSkipVoice)
        tvSuggestedMessage = findViewById(R.id.tvSuggestedMessage)
        rvVoiceContacts = findViewById(R.id.rvVoiceContacts)
        layoutWaveform = findViewById(R.id.layoutWaveform)
        viewPulse = findViewById(R.id.viewPulse)
    }

    private fun setupData() {
        val contactsJson = intent.getStringExtra("contacts_json")
        if (contactsJson != null) {
            val type = object : TypeToken<List<EmergencyContact>>() {}.type
            contacts = Gson().fromJson(contactsJson, type)
        }

        val sentCount = intent.getIntExtra("sent_count", 0)
        findViewById<TextView>(R.id.tvLocationSentStatus).text = "Location sent to $sentCount contacts"
        findViewById<TextView>(R.id.tvContactNames).text = contacts.joinToString(", ") { it.name }

        val prefs = getSharedPreferences("AashaLinkPrefs", Context.MODE_PRIVATE)
        val workerName = prefs.getString("worker_name", "Asha Worker") ?: "Asha Worker"
        val workerVillage = prefs.getString("village", "Village") ?: "Village"

        val suggestion = getString(R.string.sos_voice_suggestion)
            .replace("[naam]", workerName)
            .replace("[name]", workerName)
            .replace("[peyar]", workerName)
            .replace("[hesaru]", workerName)
            .replace("[peru]", workerName)
            .replace("[village]", workerVillage)
        
        tvSuggestedMessage.text = suggestion

        adapter = VoiceContactAdapter(contacts, 
            onPlayClick = { _, _ -> playRecordedVoice() },
            onCallClick = { contact, _ -> dialContact(contact) }
        )
        rvVoiceContacts.layoutManager = LinearLayoutManager(this)
        rvVoiceContacts.adapter = adapter
    }

    private fun setupListeners() {
        btnMic.setOnClickListener {
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), REQUEST_RECORD_AUDIO)
                return@setOnClickListener
            }
            if (!isRecording) startRecording()
            else stopRecording()
        }

        btnSendVoiceAll.setOnClickListener { sendVoiceToAll() }
        btnSkipVoice.setOnClickListener { onAllVoicesSent(0) }
        findViewById<View>(R.id.btnCopy).setOnClickListener {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            val clip = android.content.ClipData.newPlainText("SOS Message", tvSuggestedMessage.text)
            clipboard.setPrimaryClip(clip)
            Toast.makeText(this, "Message copied to clipboard", Toast.LENGTH_SHORT).show()
        }
    }

    private fun startRecording() {
        val fileName = "sos_voice_${System.currentTimeMillis()}.3gp"
        voiceFilePath = "${externalCacheDir?.absolutePath}/$fileName"

        try {
            mediaRecorder = MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.THREE_GPP)
                setAudioEncoder(MediaRecorder.AudioEncoder.AMR_NB)
                setOutputFile(voiceFilePath)
                setMaxDuration(30000)
                setOnInfoListener { _, what, _ ->
                    if (what == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) {
                        stopRecording()
                    }
                }
                prepare()
                start()
            }
            isRecording = true
            btnMic.setImageResource(R.drawable.ic_mic)
            btnMic.backgroundTintList = ContextCompat.getColorStateList(this, android.R.color.holo_red_dark)
            btnMic.imageTintList = ContextCompat.getColorStateList(this, android.R.color.white)
            layoutWaveform.visibility = View.VISIBLE
            
            viewPulse.visibility = View.VISIBLE
            val pulseAnim = android.view.animation.AnimationUtils.loadAnimation(this, R.anim.pulse)
            viewPulse.startAnimation(pulseAnim)
            
            startRecordingTimer()
        } catch (e: Exception) {
            Toast.makeText(this, "Recording failed: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun stopRecording() {
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
        } catch (e: Exception) {}
        
        mediaRecorder = null
        isRecording = false
        recordingTimer?.cancel()
        layoutWaveform.visibility = View.INVISIBLE
        viewPulse.clearAnimation()
        viewPulse.visibility = View.GONE

        btnMic.setImageResource(R.drawable.ic_check_circle)
        btnMic.backgroundTintList = ContextCompat.getColorStateList(this, android.R.color.holo_green_dark)
        btnMic.imageTintList = ContextCompat.getColorStateList(this, android.R.color.white)
        
        btnSendVoiceAll.isEnabled = true
        Toast.makeText(this, "Voice recorded. Ready to send.", Toast.LENGTH_SHORT).show()
    }

    private fun startRecordingTimer() {
        recordingSeconds = 0
        tvRecordTimer.setTextColor(ContextCompat.getColor(this, android.R.color.black))
        recordingTimer = object : CountDownTimer(30000, 1000) {
            override fun onTick(millisLeft: Long) {
                recordingSeconds++
                tvRecordTimer.text = "0:${recordingSeconds.toString().padStart(2, '0')}"
                if (recordingSeconds >= 25) {
                    tvRecordTimer.setTextColor(ContextCompat.getColor(this@SOSVoiceActivity, android.R.color.holo_red_dark))
                }
            }
            override fun onFinish() {
                stopRecording()
            }
        }.start()
    }

    private fun sendVoiceToAll() {
        if (voiceFilePath.isEmpty()) {
            Toast.makeText(this, "Please record a voice message first", Toast.LENGTH_SHORT).show()
            return
        }

        btnSendVoiceAll.isEnabled = false
        var sentCount = 0
        sendVoiceToNextContact(0, sentCount)
    }

    private fun sendVoiceToNextContact(index: Int, sentCount: Int) {
        if (index >= contacts.size) {
            onAllVoicesSent(sentCount)
            return
        }

        val contact = contacts[index]
        btnSendVoiceAll.text = "Sending... (${index + 1}/${contacts.size})"
        adapter.updateStatus(index, STATUS_IN_PROGRESS)

        if (isWhatsAppInstalled()) {
            sendViaWhatsApp(contact, index) {
                adapter.updateStatus(index, STATUS_SENT_WA)
                Handler(Looper.getMainLooper()).postDelayed({
                    sendVoiceToNextContact(index + 1, sentCount + 1)
                }, 1500)
            }
        } else {
            dialContact(contact)
            adapter.updateStatus(index, STATUS_CALLED)
            Handler(Looper.getMainLooper()).postDelayed({
                sendVoiceToNextContact(index + 1, sentCount + 1)
            }, 3000)
        }
    }

    private fun sendViaWhatsApp(contact: EmergencyContact, index: Int, onDone: () -> Unit) {
        val cleanPhone = contact.phone.replace("+91", "").replace(" ", "").replace("-", "")
        val voiceUri = FileProvider.getUriForFile(this, "${packageName}.fileprovider", File(voiceFilePath))

        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "audio/3gpp"
            putExtra(Intent.EXTRA_STREAM, voiceUri)
            putExtra("jid", "91$cleanPhone@s.whatsapp.net")
            setPackage("com.whatsapp")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        try {
            startActivityForResult(intent, REQUEST_WA_SEND_BASE + index)
            // Note: onActivityResult will be called when user returns from WA
            // For this demo/flow, we might need to simulate the callback or wait for user to return
            currentOnDone = onDone
        } catch (e: ActivityNotFoundException) {
            dialContact(contact)
            adapter.updateStatus(index, STATUS_CALLED)
            onDone()
        }
    }

    private var currentOnDone: (() -> Unit)? = null

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode >= REQUEST_WA_SEND_BASE) {
            currentOnDone?.invoke()
            currentOnDone = null
        }
    }

    private fun dialContact(contact: EmergencyContact) {
        val dialIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:${contact.phone}"))
        if (checkSelfPermission(Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
            startActivity(dialIntent)
        } else {
            val dialIntent2 = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${contact.phone}"))
            startActivity(dialIntent2)
        }
    }

    private fun isWhatsAppInstalled(): Boolean {
        return try {
            packageManager.getPackageInfo("com.whatsapp", 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    private fun onAllVoicesSent(count: Int) {
        val intent = Intent(this, SOSDoneActivity::class.java)
        intent.putExtra("contacts_alerted", count)
        intent.putExtra("sms_count", contacts.size)
        startActivity(intent)
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            if (isRecording) {
                mediaRecorder?.stop()
            }
        } catch (e: Exception) {
            // Ignore
        }
        mediaRecorder?.release()
        mediaRecorder = null
        recordingTimer?.cancel()
    }

    companion object {
        const val STATUS_IDLE = 0
        const val STATUS_IN_PROGRESS = 1
        const val STATUS_SENT_WA = 2
        const val STATUS_CALLED = 3
        const val REQUEST_WA_SEND_BASE = 100
        const val REQUEST_RECORD_AUDIO = 200
    }
}
