/**
 * sensors.h — PZEM-004T Metering
 * ─────────────────────────────────────────────────────────────────────
 * All calibration factors are passed as PARAMETERS (not constants)
 * so they can be updated at runtime from Firebase /settings without
 * reflashing the firmware.
 *
 * Wiring:
 *  PZEM-004T TX → ESP32 RX2 (PZEM_RX_PIN)
 *  PZEM-004T RX → ESP32 TX2 (PZEM_TX_PIN)
 *  PZEM VCC/GND → 5 V/common GND. Use level shifting if needed.
 *
 * NOTE: PZEM object is lazy-initialized in initSensors() to avoid
 *       accessing Serial2 before setup(). Global constructors run
 *       before setup() and can cause StoreProhibited crashes.
 * ─────────────────────────────────────────────────────────────────────
 */

#ifndef SENSORS_H
#define SENSORS_H

#include "config.h"
#include <Arduino.h>
#include <math.h>

#include <PZEM004Tv30.h>

// Lazy-initialized — created in initSensors() after Serial2.begin()
static PZEM004Tv30* pzem = nullptr;

struct ElectricalReading {
  float arus = 0.0f;
  float tegangan = 0.0f;
  float dayaW = 0.0f;
  float apparentPowerVa = 0.0f;
  float energiKwh = 0.0f;
  float frekuensi = 50.0f;
  float powerFactor = 0.85f;
  bool energyFromMeter = false;
  bool valid = false;
  const char* sensorSource = "PZEM-004T";
};

// ─── initSensors() ────────────────────────────────────────────
/**
 * Start the PZEM serial bus and create the PZEM object.
 * MUST be called in setup() before any readElectrical() call.
 */
void initSensors() {
  // Let the PZEM constructor handle Serial2.begin() internally.
  // Do NOT call Serial2.begin() separately — double-init corrupts
  // UART state and can cause StoreProhibited crashes on ESP32.
  pzem = new PZEM004Tv30(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);
  delay(100);  // let UART settle after PZEM init

  if (pzem) {
    Serial.println("[PZEM] Sensor diinisialisasi OK");
  } else {
    Serial.println("[PZEM] GAGAL alokasi memori untuk sensor!");
  }
}

// ─── computeDaya() ────────────────────────────────────────────
/**
 * Calculate apparent power (VA) — approximate only.
 * True power factor measurement would require phase angle detection.
 *
 * @param arus      Current in Amperes
 * @param tegangan  Voltage in Volts
 * @return float    Apparent power in VA
 */
float computeDaya(float arus, float tegangan) {
  return arus * tegangan;
}

bool isValidMeterValue(float value) {
  return !isnan(value) && isfinite(value) && value >= 0.0f;
}

float clampPowerFactor(float pf, float fallback) {
  if (!isValidMeterValue(pf) || pf <= 0.0f || pf > 1.0f) return fallback;
  return pf;
}

ElectricalReading readElectrical(RuntimeSettings& settings,
                                 float previousEnergyKwh = 0.0f) {
  ElectricalReading r;
  r.energiKwh = previousEnergyKwh;
  r.frekuensi = settings.frequencyHz;
  r.powerFactor = settings.powerFactorEstimate;

  // Guard: PZEM not initialized (sensor not connected or init failed)
  if (!pzem) {
    Serial.println("[PZEM] Sensor belum diinisialisasi — skip pembacaan");
    r.valid = false;
    r.sensorSource = "PZEM-004T";
    return r;
  }

  float pzemVoltage = pzem->voltage();
  float pzemCurrent = pzem->current();

  if (isValidMeterValue(pzemVoltage) && pzemVoltage > 1.0f &&
      isValidMeterValue(pzemCurrent)) {
    float pzemPower = pzem->power();
    float pzemEnergy = pzem->energy();
    float pzemFrequency = pzem->frequency();
    float pzemPf = pzem->pf();

    r.tegangan = fmaxf(pzemVoltage * settings.teganganCalibration, 0.0f);
    r.arus = fmaxf(pzemCurrent * settings.arusCalibration, 0.0f);
    r.apparentPowerVa = computeDaya(r.arus, r.tegangan);
    r.powerFactor = clampPowerFactor(pzemPf, settings.powerFactorEstimate);
    float powerScale = settings.arusCalibration * settings.teganganCalibration;
    if (powerScale <= 0.0f) powerScale = 1.0f;
    r.dayaW = isValidMeterValue(pzemPower)
      ? fmaxf(pzemPower * powerScale, 0.0f)
      : fmaxf(r.apparentPowerVa * r.powerFactor, 0.0f);
    r.frekuensi = isValidMeterValue(pzemFrequency) && pzemFrequency > 0.0f
      ? pzemFrequency
      : settings.frequencyHz;
    if (isValidMeterValue(pzemEnergy)) {
      r.energiKwh = fmaxf(pzemEnergy * powerScale, 0.0f);
      r.energyFromMeter = true;
    }
    r.valid = true;
    r.sensorSource = "PZEM-004T";
    return r;
  }

  static unsigned long lastInvalidPzemLogMs = 0;
  unsigned long now = millis();
  if (now - lastInvalidPzemLogMs >= 5000UL) {
    lastInvalidPzemLogMs = now;
    Serial.printf("[PZEM] Pembacaan tidak valid: V=%.2f I=%.3f. Cek TX/RX silang, 5V/GND common, dan alamat PZEM.\n",
                  pzemVoltage, pzemCurrent);
  }

  r.arus = 0.0f;
  r.tegangan = 0.0f;
  r.apparentPowerVa = 0.0f;
  r.dayaW = 0.0f;
  r.valid = false;
  r.sensorSource = "PZEM-004T";
  return r;
}

// ─── determineStatus() ────────────────────────────────────────
/**
 * Three-level status from measured current vs threshold.
 *
 *  DANGER  : arus ≥ threshold
 *  WARNING : threshold × warnRatio ≤ arus < threshold  (warnRatio = warningPercent/100)
 *  NORMAL  : arus < threshold × warnRatio
 *
 * @param arus            Measured current (A)
 * @param threshold       Max safe current (A)
 * @param warningPercent  e.g. 80 → WARNING from 80% of threshold upward
 */
String determineStatus(float arus, float threshold, float warningPercent) {
  float wr = warningPercent / 100.0f;
  if (wr < 0.05f)  wr = 0.05f;
  if (wr > 0.99f)  wr = 0.99f;

  if (arus >= threshold)                        return "DANGER";
  if (arus >= threshold * wr)                   return "WARNING";
  return "NORMAL";
}

#endif // SENSORS_H
