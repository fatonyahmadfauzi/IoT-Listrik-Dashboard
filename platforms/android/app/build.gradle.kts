import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

val appVersionName = "1.0.0"

android {
    namespace = "com.iot.listrik"
    compileSdk = 34

    val keystoreProperties = Properties()
    // rootProject for this module is already `android-app/`, so don't double-prefix.
    val keystorePropertiesFile = rootProject.file("keystore/keystore.properties")
    val hasReleaseSigning = keystorePropertiesFile.exists()
    if (hasReleaseSigning) {
        keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
    }

    val keystoreDir = rootProject.file("keystore")

    defaultConfig {
        applicationId = "com.iot.listrik"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = appVersionName
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        viewBinding = true
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                val storeFileName = keystoreProperties.getProperty("storeFile", "release-keystore.jks")
                storeFile = file(keystoreDir.resolve(storeFileName))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias", "fatony")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }

}

val renameReleaseApk by tasks.registering {
    doLast {
        val apkDir = file("$buildDir/outputs/apk/release")
        val original = apkDir.resolve("app-release.apk")
        val renamed = apkDir.resolve("IoT Listrik Dashboard $appVersionName.apk")

        if (original.exists()) {
            original.copyTo(renamed, overwrite = true)
            original.delete()
            println("Renamed release APK to: ${renamed.name}")
        } else {
            throw GradleException("Expected release APK not found: ${original.absolutePath}")
        }
    }
}

tasks.matching { it.name == "assembleRelease" }.configureEach {
    finalizedBy(renameReleaseApk)
}

dependencies {
    implementation("com.github.PhilJay:MPAndroidChart:v3.1.0")
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    
    // Lifecycle & ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.7.0")
    
    // Firebase BoM
    implementation(platform("com.google.firebase:firebase-bom:32.7.4"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-database-ktx")
    implementation("com.google.firebase:firebase-messaging-ktx")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")
}
