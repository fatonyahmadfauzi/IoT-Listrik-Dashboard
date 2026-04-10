/**
 * sensors.h — SCT-013 (Current) + ZMPT101B (Voltage) Sensor Reading
 * ─────────────────────────────────────────────────────────────────────
 * All calibration factors are passed as PARAMETERS (not constants)
 * so they can be updated at runtime from Firebase /settings without
 * reflashing the firmware.
 *
 * Wiring assumptions:
 *  SCT-013 → PIN_ARUS  via 22Ω burden resistor + 10kΩ/10kΩ voltage
 *             divider to bias the AC signal at Vcc/2 (1.65 V).
 *  ZMPT101B → PIN_TEGANGAN. The module already provides biased AC
 *             output in the 0–3.3 V range; adjust pot until 1.65 V mid.
 *
 * IMPORTANT: Use only ADC1 pins (GPIO32-39) when Wi-Fi is active.
 *            ADC2 is disabled when Wi-Fi radio is on.
 * ─────────────────────────────────────────────────────────────────────
 */

#ifndef SENSORS_H
#define SENSORS_H

#include "config.h"
#include <Arduino.h>

// ─── initSensors() ────────────────────────────────────────────
/**
 * Configure ADC resolution and attenuation.
 * Must be called once in setup() BEFORE any analogRead.
 */
void initSensors() {
  analogReadResolution(12);          // 12-bit → values 0..4095
  analogSetAttenuation(ADC_11db);    // 0–3.9 V input range (broadest)
}

// ─── readArus() ───────────────────────────────────────────────
/**
 * Read AC current RMS from SCT-013.
 * Collects ADC_SAMPLES samples, computes RMS of the AC component,
 * converts to Amperes, then applies the runtime calibration factor.
 *
 * Formula:
 *   rms_ADC = sqrt( Σ(sample − midpoint)² / N )
 *   rms_V   = rms_ADC × (Vref / Resolution)      ← Volts across burden
 *   I_rms   = (rms_V / burden_R) × turns_ratio   ← Primary Amperes
 *   result  = I_rms × calibrationFactor           ← Calibrated value
 *
 * @param calibrationFactor  Runtime multiplier from RuntimeSettings.arusCalibration
 * @return float  Calibrated current RMS in Amperes (always ≥ 0)
 */
float readArus(float calibrationFactor = 1.0f) {
  long sumSq = 0;

  for (int i = 0; i < ADC_SAMPLES; i++) {
    int sample = analogRead(PIN_ARUS);
    long offset = (long)sample - ADC_MIDPOINT;
    sumSq += offset * offset;
    delayMicroseconds(50);  // ~20 kHz sampling rate — sufficient for 50 Hz AC
  }

  float rmsADC = sqrtf((float)sumSq / ADC_SAMPLES);
  float rmsV   = rmsADC * (ADC_VREF / (float)ADC_RESOLUTION);
  float amps   = (rmsV / SCT_BURDEN_R) * SCT_RATIO;

  return fmaxf(amps * calibrationFactor, 0.0f);
}

// ─── readTegangan() ───────────────────────────────────────────
/**
 * Read AC voltage RMS from ZMPT101B.
 * Same RMS method as readArus(). The calibrationFactor converts
 * the raw ADC RMS voltage into the true AC voltage in Volts.
 *
 * Calibration procedure:
 *   1. Measure a known AC voltage with a reference voltmeter.
 *   2. Note the raw value printed via Serial (before calibration).
 *   3. calibrationFactor = knownVoltage / rawValue
 *   4. Enter this factor in the web Settings page → Kalibrasi Tegangan.
 *
 * Example: voltmeter reads 220 V, raw output was 0.336 V rms
 *          → calibrationFactor = 220 / 0.336 ≈ 654.8
 *
 * @param calibrationFactor  Runtime multiplier from RuntimeSettings.teganganCalibration
 * @return float  Calibrated voltage RMS in Volts (always ≥ 0)
 */
float readTegangan(float calibrationFactor = 1.0f) {
  long sumSq = 0;

  for (int i = 0; i < ADC_SAMPLES; i++) {
    int sample = analogRead(PIN_TEGANGAN);
    long offset = (long)sample - ADC_MIDPOINT;
    sumSq += offset * offset;
    delayMicroseconds(50);
  }

  float rmsADC = sqrtf((float)sumSq / ADC_SAMPLES);
  float rmsV   = rmsADC * (ADC_VREF / (float)ADC_RESOLUTION);

  return fmaxf(rmsV * calibrationFactor, 0.0f);
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
