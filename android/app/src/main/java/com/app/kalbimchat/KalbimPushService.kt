package com.app.kalbimchat

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentChange
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import java.util.concurrent.atomic.AtomicInteger

class KalbimPushService : Service() {

    private var listenerRegistration: ListenerRegistration? = null
    private val seenMessageIds = HashSet<String>()
    private var isInitialLoad = true
    private val notificationCounter = AtomicInteger(1000)

    // WhatsApp tarzı mesaj biriktirme stili
    private var activeMessagingStyle: NotificationCompat.MessagingStyle? = null
    private var lastSenderPerson: Person? = null

    companion object {
        private const val TAG = "KalbimPushService"
        const val PREFS_NAME = "KalbimPrefs"
        const val KEY_CURRENT_USER = "current_user_name"
        private const val BG_CHANNEL_ID = "kalbim_bg_channel_v3"
        private const val CHAT_CHANNEL_ID = "kalbim_chat_heads_up_v3"
        private const val BG_NOTIFICATION_ID = 9901
        private const val CHAT_SUMMARY_NOTIFICATION_ID = 8801

        fun start(context: Context) {
            val intent = Intent(context, KalbimPushService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start KalbimPushService", e)
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        startServiceInForeground()
        initFirebaseAndListen()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    private fun startServiceInForeground() {
        val notification = buildForegroundNotification()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    BG_NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(BG_NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting foreground service with type", e)
            try {
                startForeground(BG_NOTIFICATION_ID, notification)
            } catch (inner: Exception) {
                Log.e(TAG, "Fallback startForeground failed", inner)
            }
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java) ?: return

            // 1. Arka plan durumu için sessiz kanal
            val bgChannel = NotificationChannel(
                BG_CHANNEL_ID,
                "Kalbim Arka Plan Servisi",
                NotificationManager.IMPORTANCE_MIN
            ).apply {
                description = "Kalbim uygulamasının kapalıyken mesaj almasını sağlar"
                setShowBadge(false)
            }
            manager.createNotificationChannel(bgChannel)

            // 2. WhatsApp tarzı Heads-up (Ekrana fırlayan, sesli, titreşimli) mesaj kanalı
            val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                .build()

            val chatChannel = NotificationChannel(
                CHAT_CHANNEL_ID,
                "Sohbet Mesajları (Heads-Up)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Sevgilinizden gelen yeni mesajların ekranda görünmesini sağlar"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 350, 150, 350)
                setSound(defaultSoundUri, audioAttributes)
                enableLights(true)
                lightColor = Color.MAGENTA
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            manager.createNotificationChannel(chatChannel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, BG_CHANNEL_ID)
            .setContentTitle("Kalbim")
            .setContentText("Mesajlar arka planda dinleniyor")
            .setSmallIcon(R.drawable.notification_icon)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }

    private fun initFirebaseAndListen() {
        try {
            val options = FirebaseOptions.Builder()
                .setApiKey("YOUR_FIREBASE_API_KEY")
                .setApplicationId("YOUR_FIREBASE_APP_ID")
                .setProjectId("YOUR_PROJECT_ID")
                .setStorageBucket("YOUR_STORAGE_BUCKET")
                .build()

            val app = try {
                FirebaseApp.getInstance("KalbimBackgroundApp")
            } catch (e: Exception) {
                FirebaseApp.initializeApp(this, options, "KalbimBackgroundApp")
            }

            val auth = FirebaseAuth.getInstance(app)
            val db = FirebaseFirestore.getInstance(app)

            if (auth.currentUser == null) {
                auth.signInAnonymously()
                    .addOnSuccessListener {
                        Log.i(TAG, "FirebaseAuth anonymous sign-in success in background service")
                        attachFirestoreListener(db)
                    }
                    .addOnFailureListener { err ->
                        Log.e(TAG, "FirebaseAuth anonymous sign-in failed, attempting listen anyway", err)
                        attachFirestoreListener(db)
                    }
            } else {
                attachFirestoreListener(db)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize Firebase in service", e)
        }
    }

    private fun attachFirestoreListener(db: FirebaseFirestore) {
        listenerRegistration?.remove()
        listenerRegistration = db.collection("kalbim_messages")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(20)
            .addSnapshotListener { snapshots, error ->
                if (error != null) {
                    Log.e(TAG, "Firestore listen error", error)
                    return@addSnapshotListener
                }

                if (snapshots == null) return@addSnapshotListener

                if (isInitialLoad) {
                    for (doc in snapshots.documents) {
                        seenMessageIds.add(doc.id)
                    }
                    isInitialLoad = false
                    Log.i(TAG, "Initial load completed with ${seenMessageIds.size} messages")
                    return@addSnapshotListener
                }

                // Yeni gelen mesajları kronolojik sırayla işlemek için listeyi ters çevirelim
                val addedChanges = snapshots.documentChanges.filter { it.type == DocumentChange.Type.ADDED }

                for (change in addedChanges) {
                    val doc = change.document
                    val messageId = doc.id

                    if (seenMessageIds.contains(messageId)) continue
                    seenMessageIds.add(messageId)

                    val senderName = doc.getString("senderName") ?: "Sevgilim"
                    val body = doc.getString("body")
                    val isImage = doc.contains("imageData") && doc.getString("imageData") != null
                    val isSticker = doc.getBoolean("isSticker") == true || (body?.startsWith("[sticker]") == true)
                    val displayText = if (isSticker) {
                        "Sana bir çıkartma gönderdi 🧸"
                    } else if (!body.isNullOrBlank() && !body.startsWith("[sticker]")) {
                        body
                    } else if (isImage) {
                        "Sana bir görsel gönderdi 📷"
                    } else {
                        "Yeni bir mesaj gönderdi"
                    }

                    val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    val currentUser = prefs.getString(KEY_CURRENT_USER, null)

                    Log.i(TAG, "New message: sender=$senderName, current=$currentUser, body=$displayText")

                    // Kullanıcının kendi attığı mesaj değilse bildirim göster
                    if (currentUser == null || !currentUser.equals(senderName, ignoreCase = true)) {
                        showChatNotification(messageId, senderName, displayText)
                    }
                }
            }
    }

    private fun showChatNotification(messageId: String, sender: String, content: String) {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("messageId", messageId)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            messageId.hashCode(),
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        // WhatsApp tarzı MessagingStyle
        val senderPerson = Person.Builder()
            .setName(sender)
            .setKey(sender)
            .build()
        lastSenderPerson = senderPerson

        val mePerson = Person.Builder()
            .setName("Ben")
            .setKey("me")
            .build()

        if (activeMessagingStyle == null) {
            activeMessagingStyle = NotificationCompat.MessagingStyle(mePerson)
                .setConversationTitle(sender)
        }

        val msgTime = System.currentTimeMillis()
        activeMessagingStyle?.addMessage(content, msgTime, senderPerson)

        // Heads-up için tam bildirim builder'ı
        val notificationBuilder = NotificationCompat.Builder(this, CHAT_CHANNEL_ID)
            .setSmallIcon(R.drawable.notification_icon)
            .setContentTitle(sender)
            .setContentText(content)
            .setStyle(activeMessagingStyle)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            // HEADS-UP (Ekrana fırlama) için kritik ayarlar:
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(pendingIntent, false) // Heads-up tetikleyici
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 350, 150, 350))
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setOnlyAlertOnce(false) // Her gelen mesajda tekrar ses çıkar ve ekrana fırla!
            .setColor(Color.parseColor("#E91E63"))

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        // 1. WhatsApp gibi birleştirilmiş ana sohbet bildirimini güncelle (ekranda ve bildirim merkezinde)
        manager.notify(CHAT_SUMMARY_NOTIFICATION_ID, notificationBuilder.build())

        // 2. Ayrıca ayrı ayrı da düşmesi için her mesaja özel ID ile de bildirim fırlat
        val individualNotifId = notificationCounter.incrementAndGet()
        val individualBuilder = NotificationCompat.Builder(this, CHAT_CHANNEL_ID)
            .setSmallIcon(R.drawable.notification_icon)
            .setContentTitle(sender)
            .setContentText(content)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(pendingIntent, false)
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 350, 150, 350))
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setOnlyAlertOnce(false)
            .setColor(Color.parseColor("#E91E63"))

        manager.notify(individualNotifId, individualBuilder.build())
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        // Uygulama son uygulamalardan kaydırılsa dahi servisi 1 saniye sonra yeniden canlandır
        val restartServiceIntent = Intent(applicationContext, KalbimPushService::class.java)
        val restartPendingIntent = PendingIntent.getService(
            applicationContext,
            1,
            restartServiceIntent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        alarmManager?.set(
            AlarmManager.ELAPSED_REALTIME,
            SystemClock.elapsedRealtime() + 1000,
            restartPendingIntent
        )
    }

    override fun onDestroy() {
        listenerRegistration?.remove()
        super.onDestroy()
    }
}
