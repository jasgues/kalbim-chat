package com.app.kalbimchat

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class KalbimServiceModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "KalbimService"

    @ReactMethod
    fun setCurrentUser(userName: String) {
        val prefs = reactContext.getSharedPreferences(KalbimPushService.PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KalbimPushService.KEY_CURRENT_USER, userName).apply()
        KalbimPushService.start(reactContext)
    }

    @ReactMethod
    fun startPushService() {
        KalbimPushService.start(reactContext)
    }

    @ReactMethod
    fun saveImageToGallery(input: String, promise: Promise) {
        thread {
            try {
                var bitmap: Bitmap? = null

                if (input.startsWith("http://") || input.startsWith("https://")) {
                    val url = URL(input)
                    val conn = url.openConnection() as HttpURLConnection
                    conn.doInput = true
                    conn.connect()
                    val inputStrm: InputStream = conn.inputStream
                    bitmap = BitmapFactory.decodeStream(inputStrm)
                    inputStrm.close()
                } else if (input.startsWith("data:")) {
                    val base64Index = input.indexOf("base64,")
                    val rawBase64 = if (base64Index != -1) input.substring(base64Index + 7) else input
                    val decodedBytes = Base64.decode(rawBase64, Base64.DEFAULT)
                    bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                } else if (input.startsWith("file://") || input.startsWith("content://")) {
                    val uri = Uri.parse(input)
                    val inputStrm = reactContext.contentResolver.openInputStream(uri)
                    bitmap = BitmapFactory.decodeStream(inputStrm)
                    inputStrm?.close()
                } else if (input.startsWith("asset:/")) {
                    val assetPath = input.replace("asset:/", "").removePrefix("/")
                    val inputStrm = reactContext.assets.open(assetPath)
                    bitmap = BitmapFactory.decodeStream(inputStrm)
                    inputStrm.close()
                } else {
                    val decodedBytes = Base64.decode(input, Base64.DEFAULT)
                    bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                }

                if (bitmap == null) {
                    promise.reject("DECODE_ERROR", "Görsel çözümlenemedi.")
                    return@thread
                }

                val filename = "Kalbim_${System.currentTimeMillis()}.png"
                val resolver = reactContext.contentResolver

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val contentValues = ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                        put(MediaStore.MediaColumns.MIME_TYPE, "image/png")
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + File.separator + "Kalbim")
                        put(MediaStore.MediaColumns.IS_PENDING, 1)
                    }

                    val imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                    if (imageUri != null) {
                        resolver.openOutputStream(imageUri)?.use { out ->
                            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
                        }
                        contentValues.clear()
                        contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                        resolver.update(imageUri, contentValues, null, null)
                        promise.resolve(imageUri.toString())
                    } else {
                        promise.reject("INSERT_ERROR", "Görsel galeriye kaydedilemedi.")
                    }
                } else {
                    val picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
                    val kalbimDir = File(picturesDir, "Kalbim")
                    if (!kalbimDir.exists()) {
                        kalbimDir.mkdirs()
                    }
                    val destFile = File(kalbimDir, filename)
                    FileOutputStream(destFile).use { out ->
                        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
                    }
                    android.media.MediaScannerConnection.scanFile(
                        reactContext,
                        arrayOf(destFile.absolutePath),
                        arrayOf("image/png"),
                        null
                    )
                    promise.resolve(destFile.absolutePath)
                }
            } catch (e: Exception) {
                promise.reject("SAVE_EXCEPTION", e.localizedMessage ?: "Görsel kaydedilirken bir hata oluştu.")
            }
        }
    }
}

