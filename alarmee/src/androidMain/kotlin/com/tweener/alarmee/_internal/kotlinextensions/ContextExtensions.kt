package com.tweener.alarmee._internal.kotlinextensions

import android.content.ContentResolver
import android.content.Context
import android.net.Uri

/**
 * @author Vivien Mahe
 * @since 12/01/2025
 */

internal fun Context.getRawUri(rawFilename: String): Uri =
    Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + packageName + "/raw/" + rawFilename)
