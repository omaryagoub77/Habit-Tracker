package com.tweener.alarmee.channel

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import androidx.annotation.RequiresApi
import com.tweener.alarmee._internal.kotlinextensions.getRawUri
import com.tweener.kmpkit.kotlinextensions.getNotificationManager

/**
 * @author Vivien Mahe
 * @since 06/11/2024
 */
class NotificationChannelRegister(
    private val context: Context,
) {

    @RequiresApi(Build.VERSION_CODES.O)
    fun register(
        id: String,
        name: String,
        importance: Int = NotificationManager.IMPORTANCE_DEFAULT,
        description: String? = null,
        soundFilename: String? = null,
    ) {
        context.getNotificationManager()?.let { notificationManager ->
            val channelDoesNotExist = notificationManager.notificationChannels.none { it.id == id }

            // Only create channel if it does not exists yet
            if (channelDoesNotExist) {
                val audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()

                val channel = NotificationChannel(id, name, importance).apply {
                    description?.let { this.description = description }
                    soundFilename?.let { setSound(context.getRawUri(it), null) }
                }

                notificationManager.createNotificationChannel(channel)

                println("Notification channel '${channel.name}' (ID: '${channel.id}') created!")
            }
        }
    }
}
