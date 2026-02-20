package com.tweener.alarmee

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.tweener.alarmee.configuration.AlarmeePlatformConfiguration

@Composable
fun rememberAlarmeeService(
    platformConfiguration: AlarmeePlatformConfiguration
): AlarmeeService =
    remember(platformConfiguration) {
        createAlarmeeService().apply {
            initialize(platformConfiguration = platformConfiguration)
        }
    }

/**
 * Entry point of the Alarmee library.
 *
 * This service allows you to schedule, trigger, and cancel alarms using the [LocalNotificationService].
 * It must be initialized when your app starts by calling [initialize], typically in your root `App()` composable.
 *
 * Platform-specific configuration is passed through [AlarmeePlatformConfiguration].
 *
 * On Android and iOS targets, the instance of this service can be safely cast to [MobileAlarmeeService],
 * which provides additional access to the [PushNotificationService] for handling remote push notifications.
 *
 * Example:
 * ```kotlin
 * val pushService = (alarmeeService as? MobileAlarmeeService)?.push
 * ```
 *
 * @author Vivien Mahe
 * @since 05/06/2025
 */
interface AlarmeeService {

    /**
     * Provides access to the local notification service, used to schedule or trigger local alarms on the device.
     *
     * Available on all targets (Android, iOS, JS, etc.).
     */
    val local: LocalNotificationService

    /**
     * Initializes the Alarmee service with platform-specific configuration.
     *
     * This method **must be called once when the app is launched**. For example, in your root Composable:
     *
     * ```kotlin
     * val alarmeeService = rememberAlarmeeService(createAlarmeePlatformConfiguration())
     * ```
     *
     * Use this method if your app does not already use a Firebase instance.
     *
     * @param platformConfiguration The platform-specific configuration for Alarmee.
     */
    fun initialize(platformConfiguration: AlarmeePlatformConfiguration)
}
