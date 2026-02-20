package com.tweener.alarmee

import com.tweener.alarmee.configuration.AlarmeePlatformConfiguration
import com.tweener.alarmee.model.Alarmee
import kotlin.contracts.ExperimentalContracts
import kotlin.contracts.contract
import kotlin.reflect.KClass

/**
 * Class to schedule and manage alarms that trigger at specified times of day.
 * Alarms can be configured with various parameters such as time, time zone, and notification content.
 *
 * When the alarm triggers, a notification will be displayed with the specified title and body.
 *
 * @author Vivien Mahe
 * @since 05/11/2024
 */
interface LocalNotificationService {

    /**
     * Schedules an alarm to be triggered at a specific time of the day. When the alarm is triggered, a notification will be displayed.
     *
     * @param alarmee The [Alarmee] object containing the configuration for the alarm.
     */
    fun schedule(alarmee: Alarmee)

    /**
     * Sends a notification immediately to the device without scheduling an alarm.
     *
     * @param alarmee The [Alarmee] object containing the configuration for the alarm.
     */
    fun immediate(alarmee: Alarmee)

    /**
     * Cancels an existing alarm based on its unique identifier.
     * If an alarm with the specified identifier is found, it will be canceled, preventing any future notifications from being triggered for that alarm.
     *
     * @param uuid The unique identifier for the alarm to be canceled.
     */
    fun cancel(uuid: String)

    /**
     * Cancels all existing scheduled alarms.
     * This will cancel all pending alarms that have been scheduled through this service, preventing any future notifications from being triggered.
     */
    fun cancelAll()
}

/**
 * Ensures that the provided platform configuration matches the specified target platform type and throws an [IllegalArgumentException] if it does not.
 *
 * @param T The expected type of [AlarmeePlatformConfiguration].
 * @param providedPlatformConfiguration The platform configuration instance to be checked.
 * @param targetPlatformConfiguration The `KClass` of the expected platform configuration type.
 *
 * @throws IllegalArgumentException if [providedPlatformConfiguration] is not an instance of [targetPlatformConfiguration].
 *
 * Example usage:
 * ```
 * val configuration: AlarmeePlatformConfiguration = // obtain configuration
 * requirePlatformConfiguration(configuration, AlarmeePlatformConfiguration.Ios::class)
 * // Now `configuration` is smart-cast to `AlarmeePlatformConfiguration.Ios`
 * ```
 */
@OptIn(ExperimentalContracts::class)
internal inline fun <reified T : AlarmeePlatformConfiguration> requirePlatformConfiguration(
    providedPlatformConfiguration: AlarmeePlatformConfiguration,
    targetPlatformConfiguration: KClass<T>,
) {
    contract {
        returns() implies (providedPlatformConfiguration is T)
    }

    if (providedPlatformConfiguration !is T) {
        throw IllegalArgumentException("Expected ${targetPlatformConfiguration::class.simpleName}")
    }
}
