# ⚡ IoT Listrik Dashboard

A real-time electricity monitoring dashboard built with IoT sensors. Monitor power consumption, voltage, current, and energy usage from anywhere.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

---

## 🔍 Overview

**IoT Listrik Dashboard** is a web-based dashboard to monitor electrical parameters in real time using IoT devices. Data from sensors (e.g., PZEM-004T, ACS712) is transmitted to a backend via MQTT or HTTP and visualized on an interactive dashboard.

---

## ✨ Features

- 📊 Real-time monitoring of voltage, current, power, and energy
- 🕐 Historical data logging and charts
- 🚨 Threshold alerts and notifications
- 📱 Responsive design — works on desktop & mobile
- 🔌 Multi-device support

---

## 🛠 Tech Stack

| Layer       | Technology              |
|-------------|-------------------------|
| Frontend    | HTML / CSS / JavaScript |
| Backend     | Node.js / Python / etc. |
| Database    | InfluxDB / MySQL / etc. |
| Broker      | MQTT (Mosquitto)        |
| Hardware    | ESP8266 / ESP32         |
| Sensor      | PZEM-004T / ACS712      |

> Update this table to match your actual stack.

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16 (or your runtime)
- MQTT Broker (e.g., Mosquitto)
- IoT device flashed with the appropriate firmware

### Installation

```bash
# Clone the repository
git clone https://github.com/fatonyahmadfauzi/IoT-Listrik-Dashboard.git
cd IoT-Listrik-Dashboard

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
MQTT_BROKER=mqtt://localhost:1883
MQTT_TOPIC=iot/listrik/#
DB_HOST=localhost
DB_PORT=3306
DB_NAME=iot_listrik
DB_USER=root
DB_PASS=secret
```

---

## 📁 Project Structure

```
IoT-Listrik-Dashboard/
├── src/
│   ├── frontend/        # Dashboard UI (HTML, CSS, JS)
│   ├── backend/         # Server & API routes
│   └── firmware/        # ESP8266/ESP32 firmware code
├── docs/                # Documentation & wiring diagrams
├── .env.example         # Example environment config
├── package.json
└── README.md
```

---

## ⚙️ Configuration

- **MQTT Topic**: Customize the topic schema to match your device firmware.
- **Sensor Calibration**: Adjust calibration constants in the firmware for accurate readings.
- **Alerts**: Set voltage/current thresholds in the dashboard settings.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">Made with ❤️ by <a href="https://github.com/fatonyahmadfauzi">fatonyahmadfauzi</a></p>
