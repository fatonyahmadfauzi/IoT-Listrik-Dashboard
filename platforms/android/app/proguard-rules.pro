# Keep Firebase Messaging service entry points used from the Android manifest.
-keep class com.iot.listrik.service.FCMReceiverService { *; }
-keep class com.iot.listrik.IoTApp { *; }

# Keep model classes used by Firebase Realtime Database deserialization.
-keep class com.iot.listrik.data.model.** { *; }
