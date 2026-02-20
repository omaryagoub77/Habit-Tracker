package com.tweener.alarmee._internal

import android.content.Context
import androidx.startup.Initializer

/**
 * @author Vivien Mahe
 * @since 05/06/2025
 */

lateinit var applicationContext: Context

class ContextInitializer : Initializer<Unit> {

    override fun create(context: Context) {
        applicationContext = context.applicationContext
    }

    override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
}
