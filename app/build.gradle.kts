plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "com.devansh.rocketieeai"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.devansh.rocketieeai"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        getByName("debug") {
            val tempKeystore = rootProject.file("debug.keystore")
            if (tempKeystore.exists()) {
                storeFile = tempKeystore
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
        }
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
}
