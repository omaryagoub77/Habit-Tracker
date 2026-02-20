package com.tweener.alarmee.configuration

import androidx.compose.ui.graphics.Color
import com.tweener.alarmee.channel.AlarmeeNotificationChannel

/**
 * @author Vivien Mahe
 * @since 20/11/2024
 */
data class AlarmeeAndroidPlatformConfiguration(
    val notificationIconResId: Int,
    val notificationIconColor: Color = Color.Transparent,
    val notificationChannels: List<AlarmeeNotificationChannel>,
    val useExactScheduling: Boolean = false,
) : AlarmeePlatformConfiguration
