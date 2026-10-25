# Hardware architecture reference

The maintained wiring, board, network, and pinout guide is [hardware/README.md](../hardware/README.md). Use it with affected sketches; avoid duplicate pin tables.

```text
Bottle / Cup / QR ESP32-CAMs
            | Wi-Fi / HTTP
       ESP32 DevKit ------ HTTPS ------ Next.js API ------ PostgreSQL
            | UART
       Arduino Mega
            | sensors, controls, LCD, servos, relays
```

UART connects DevKit and Mega. Cameras communicate with DevKit over Wi-Fi.

| Component | Sketch |
| --- | --- |
| Controller | hardware/ArduinoMega/mega3.ino |
| Bridge | hardware/Esp32_Devkit/Esp32_Devkit.ino |
| QR camera | hardware/Esp32_QR/Esp32_QR.ino |
| Bottle camera | hardware/Esp32_Bottles/Esp32_Bottle/Esp32_Bottle.ino |
| Cup camera | hardware/Esp32_Cup/Esp32_Cup.ino |

For protocols, inspect sender and receiver together. For QR/dispensing, inspect qr-generate, redeem-initiate, verify-qr, qr-status and clients. Check timers, payloads, units, machine ID, retries, and sessions in source.

Compilation does not verify wiring, calibration, sensor placement, networking, or physical dispensing.
