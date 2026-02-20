package com.tweener.alarmee.channel

import android.app.NotificationManager

/**
 * Represents a notification channel that can be registered on the device.
 *
 * @property id The unique identifier of the channel.
 * @property name The name of the channel.
 * @property importance The importance of the channel. Default is [NotificationManager.IMPORTANCE_DEFAULT].
 * @property soundFilename The filename, without extension, of the sound to play when a notification is triggered. The file must be located in the `res/raw` directory.
 *
 * @author Vivien Mahe
 * @since 20/11/2024
 */
data class AlarmeeNotificationChannel(
    val id: String,
    val name: String,
    val importance: Int = NotificationManager.IMPORTANCE_DEFAULT,
    val soundFilename: String? = null,
)
