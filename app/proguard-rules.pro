-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * extends com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
-keepclassmembers,allowobfuscation class * {
  @com.google.gson.annotations.SerializedName <fields>;
}

# Keep data classes for Gson serialization
-keep class dev.wolly.dsbmaterial.data.** { *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Jsoup
-keeppackagenames org.jsoup.nodes
-keep class org.jsoup.** { *; }

# Kotlin coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** {
  volatile <fields>;
}

# AndroidX
-keep class androidx.lifecycle.** { *; }
-keep class androidx.datastore.** { *; }

# Room instantiates generated *_Impl database classes reflectively at runtime.
# Room 2.6.1's own rule only keeps the class, not its constructor, so R8 full
# mode (AGP 9) strips the no-arg <init> and crashes WorkManager at startup.
-keepclassmembers class * extends androidx.room.RoomDatabase {
    <init>();
}
