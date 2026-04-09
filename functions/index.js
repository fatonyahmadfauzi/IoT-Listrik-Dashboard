const { onValueUpdated } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");

admin.initializeApp();

exports.checkAlarmStatus = onValueUpdated(
  {
    ref: "/listrik/status",
    region: "asia-southeast1"
  },
  async (event) => {
    const status = event.data.after.val();
    const previousStatus = event.data.before.val();
    
    // Only trigger if status becomes DANGER
    if (status === "DANGER" && previousStatus !== "DANGER") {
      console.log("CRITICAL: Status is DANGER. Triggering FCM alarm!");
      
      const payload = {
        topic: "iot_alarms",
        data: {
          action: "TRIGGER_ALARM",
          status: "DANGER",
          title: "BAHAYA KRITIS!",
          message: "⚠️ Kebocoran Arus Terdeteksi!"
        },
        android: {
          priority: "high", // Required for FullScreenIntent
        }
      };
      
      try {
        await admin.messaging().send(payload);
        console.log("Successfully sent FCM message.");
      } catch (error) {
        console.error("Error sending FCM message:", error);
      }
    }
    
    // Trigger stop alarm if status recovers
    if (status === "NORMAL" && (previousStatus === "DANGER" || previousStatus === "WARNING")) {
      const payload = {
        topic: "iot_alarms",
        data: {
          action: "STOP_ALARM",
          status: "NORMAL"
        },
        android: {
          priority: "high"
        }
      };
      try {
        await admin.messaging().send(payload);
        console.log("Successfully sent STOP FCM message.");
      } catch (error) {
        console.error("Error sending STOP FCM message:", error);
      }
    }
  }
);
