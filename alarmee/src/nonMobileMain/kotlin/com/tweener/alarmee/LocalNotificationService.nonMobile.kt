package com.tweener.alarmee

import com.tweener.alarmee.configuration.AlarmeePlatformConfiguration
import com.tweener.alarmee.model.Alarmee
import com.tweener.alarmee.model.RepeatInterval

/**
 * @author Vivien Mahe
 * @since 05/06/2025
 */

actual fun scheduleAlarm(alarmee: Alarmee, config: AlarmeePlatformConfiguration, onSuccess: () -> Unit) {
    TODO("Not yet implemented")
}

actual fun scheduleRepeatingAlarm(alarmee: Alarmee, repeatInterval: RepeatInterval, config: AlarmeePlatformConfiguration, onSuccess: () -> Unit) {
    TODO("Not yet implemented")
}

actual fun cancelAlarm(uuid: String, config: AlarmeePlatformConfiguration) {
    TODO("Not yet implemented")
}

actual fun cancelAllAlarms(config: AlarmeePlatformConfiguration) {
    TODO("Not yet implemented")
}

actual fun immediateAlarm(alarmee: Alarmee, config: AlarmeePlatformConfiguration, onSuccess: () -> Unit) {
    TODO("Not yet implemented")
}
