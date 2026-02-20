package com.tweener.alarmee

import com.tweener.alarmee.configuration.AlarmeePlatformConfiguration

/**
 * @author Vivien Mahe
 * @since 05/06/2025
 */
open class DefaultAlarmeeService : AlarmeeService {

    private lateinit var config: AlarmeePlatformConfiguration

    override lateinit var local: LocalNotificationService
    private var isInitialized = false

    override fun initialize(platformConfiguration: AlarmeePlatformConfiguration) {
        // Check if the service is already initialized to prevent re-initialization
        if (isInitialized) {
            println("AlarmeeService is already initialized.")
            return
        }

        config = platformConfiguration

        // Initialize local notification service
        local = createLocalNotificationService(config)

        isInitialized = true

        println("Alarmee is initialized.")
    }
}

fun createAlarmeeService(): AlarmeeService = DefaultAlarmeeService()

internal expect fun createLocalNotificationService(config: AlarmeePlatformConfiguration): LocalNotificationService
