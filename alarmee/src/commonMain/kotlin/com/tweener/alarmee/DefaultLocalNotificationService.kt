package com.tweener.alarmee

import com.tweener.alarmee.configuration.AlarmeePlatformConfiguration
import com.tweener.alarmee.model.Alarmee
import com.tweener.alarmee.model.RepeatInterval
import com.tweener.kmpkit.kotlinextensions.ignoreNanoSeconds
import com.tweener.kmpkit.kotlinextensions.now
import com.tweener.kmpkit.kotlinextensions.plus
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.LocalDateTime
import kotlin.time.Duration.Companion.minutes

/**
 * @author Vivien Mahe
 * @since 05/06/2025
 */
internal class DefaultLocalNotificationService(
    private val config: AlarmeePlatformConfiguration
) : LocalNotificationService {

    override fun schedule(alarmee: Alarmee) {
        validateAlarmee(alarmee = alarmee, schedule = true)

        val scheduledDateTime = adjustDateInFuture(alarmee = alarmee)
        val updatedAlarmee = alarmee.copy(scheduledDateTime = scheduledDateTime)

        updatedAlarmee.repeatInterval
            ?.let { repeatInterval ->
                scheduleRepeatingAlarm(alarmee = updatedAlarmee, repeatInterval = repeatInterval, config = config) {
                    val message = when (repeatInterval) {
                        is RepeatInterval.Hourly -> "every hour at minute: ${scheduledDateTime!!.minute}"
                        is RepeatInterval.Daily -> "every day at ${scheduledDateTime!!.time}"
                        is RepeatInterval.Weekly -> "every week on ${scheduledDateTime!!.dayOfWeek} at ${scheduledDateTime.time}"
                        is RepeatInterval.Monthly -> "every month on day ${scheduledDateTime!!.day} at ${scheduledDateTime.time}"
                        is RepeatInterval.Yearly -> "every year on the ${scheduledDateTime!!.month}/${scheduledDateTime.day} at ${scheduledDateTime.time}"
                        is RepeatInterval.Custom -> "every ${repeatInterval.duration}"
                    }

                    println("Notification with title '${updatedAlarmee.notificationTitle}' scheduled $message.")
                }
            }
            ?: run {
                scheduleAlarm(alarmee = alarmee, config = config) {
                    println("Notification with title '${updatedAlarmee.notificationTitle}' scheduled at ${updatedAlarmee.scheduledDateTime}.")
                }
            }
    }

    override fun immediate(alarmee: Alarmee) {
        validateAlarmee(alarmee = alarmee)

        immediateAlarm(alarmee = alarmee, config = config) {
            println("Notification with title '${alarmee.notificationTitle}' successfully sent.")
        }
    }

    override fun cancel(uuid: String) {
        cancelAlarm(uuid = uuid, config = config)
    }

    override fun cancelAll() {
        cancelAllAlarms(config = config)
    }

    private fun validateAlarmee(alarmee: Alarmee, schedule: Boolean = false) {
        if (schedule) {
            if (alarmee.repeatInterval == null) {
                // One-off Alarmees conditions
                require(alarmee.scheduledDateTime != null) { "scheduledDateTime is required for one-off Alarmees." }
            } else {
                // Repeating Alarmees conditions
                if (alarmee.repeatInterval is RepeatInterval.Custom) {
                    require(alarmee.repeatInterval.duration >= 1.minutes) { "Custom repeat interval duration must be at least 1 minute." }
                } else {
                    require(alarmee.scheduledDateTime != null) { "scheduledDateTime is required for repeating Alarmees with repeatInterval: ${alarmee.repeatInterval}." }
                }
            }
        }
    }

    /**
     * Adjusts the scheduled date and time to the future if it's in the past.
     * - For one-off alarms, adjusts to the next day.
     * - For repeating alarms, adjusts to the next valid occurrence based on the repeat interval.
     *
     * @param alarmee The alarm configuration containing the scheduled date and repeat interval.
     * @return The adjusted date and time in the future.
     */
    private fun adjustDateInFuture(alarmee: Alarmee): LocalDateTime? {
        if (alarmee.scheduledDateTime == null) {
            return null
        }

        val now = LocalDateTime.now(timeZone = alarmee.timeZone).ignoreNanoSeconds()
        var adjustedDateTime = alarmee.scheduledDateTime.ignoreNanoSeconds()

        while (adjustedDateTime <= now) {
            adjustedDateTime = if (alarmee.repeatInterval == null) {
                // One-off alarm: adjust to tomorrow
                adjustedDateTime.plus(1, DateTimeUnit.DAY, timeZone = alarmee.timeZone)
            } else {
                // Repeating alarm: adjust to the next valid occurrence
                when (alarmee.repeatInterval) {
                    is RepeatInterval.Hourly -> adjustedDateTime.plus(value = 1, unit = DateTimeUnit.HOUR, timeZone = alarmee.timeZone)
                    is RepeatInterval.Daily -> adjustedDateTime.plus(value = 1, unit = DateTimeUnit.DAY, timeZone = alarmee.timeZone)
                    is RepeatInterval.Weekly -> adjustedDateTime.plus(value = 1, unit = DateTimeUnit.WEEK, timeZone = alarmee.timeZone)
                    is RepeatInterval.Monthly -> adjustedDateTime.plus(value = 1, unit = DateTimeUnit.MONTH, timeZone = alarmee.timeZone)
                    is RepeatInterval.Yearly -> adjustedDateTime.plus(value = 1, unit = DateTimeUnit.YEAR, timeZone = alarmee.timeZone)
                    is RepeatInterval.Custom -> adjustedDateTime.plus(duration = alarmee.repeatInterval.duration, timeZone = alarmee.timeZone)
                }
            }
        }

        if (adjustedDateTime != alarmee.scheduledDateTime.ignoreNanoSeconds()) {
            println("The scheduled date and time (${alarmee.scheduledDateTime.ignoreNanoSeconds()}) was in the past. It has been adjusted to the future: $adjustedDateTime")
        }

        return adjustedDateTime
    }
}

internal expect fun scheduleAlarm(alarmee: Alarmee, config: AlarmeePlatformConfiguration, onSuccess: () -> Unit)

internal expect fun scheduleRepeatingAlarm(alarmee: Alarmee, repeatInterval: RepeatInterval, config: AlarmeePlatformConfiguration, onSuccess: () -> Unit)

internal expect fun cancelAlarm(uuid: String, config: AlarmeePlatformConfiguration)

internal expect fun cancelAllAlarms(config: AlarmeePlatformConfiguration)

internal expect fun immediateAlarm(alarmee: Alarmee, config: AlarmeePlatformConfiguration, onSuccess: () -> Unit)

