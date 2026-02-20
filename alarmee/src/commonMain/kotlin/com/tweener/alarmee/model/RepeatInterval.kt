package com.tweener.alarmee.model

import kotlin.time.Duration

/**
 * Represents the repeat interval for an alarm.
 * It provides predefined intervals (e.g., hourly, daily) and supports custom intervals.
 *
 * @author Vivien Mahe
 * @since 18/11/2024
 */
sealed class RepeatInterval {
    data object Hourly : RepeatInterval()
    data object Daily : RepeatInterval()
    data object Weekly : RepeatInterval()
    data object Monthly : RepeatInterval()
    data object Yearly : RepeatInterval()
    data class Custom(val duration: Duration) : RepeatInterval()
}
