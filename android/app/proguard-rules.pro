# Regras de R8/ProGuard do Treino Força (release com minificação habilitada).

# Preserva a ponte JS ↔ Java do Capacitor e as classes acessadas por reflexão.
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class * {
    @com.getcapacitor.JSInject <fields>;
    @com.getcapacitor.JSInject <methods>;
}
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin <fields>;
}

# Anotações necessárias em runtime.
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable

# WebView / Cordova plugins (se algum for adicionado depois).
-keep class org.apache.cordova.** { *; }
