package expo.modules.androidsms

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AndroidSmsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AndroidSms")

    AsyncFunction("getSmsMessages") { maxCount: Int ->
      val context = appContext.reactContext
        ?: throw Exception("Context unavailable")

      if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS)
        != PackageManager.PERMISSION_GRANTED
      ) {
        throw Exception("READ_SMS permission not granted")
      }

      val messages = mutableListOf<Map<String, Any>>()
      val uri = Uri.parse("content://sms")
      val cursor = context.contentResolver.query(
        uri,
        arrayOf("_id", "address", "body", "date"),
        "type != 2",
        null,
        "date DESC"
      )

      var count = 0
      cursor?.use {
        while (it.moveToNext() && count < maxCount) {
          val id = it.getString(0) ?: continue
          val address = it.getString(1) ?: ""
          val body = it.getString(2) ?: ""
          val date = it.getLong(3)
          messages.add(mapOf("id" to id, "address" to address, "body" to body, "date" to date))
          count++
        }
      }

      messages
    }
  }
}
