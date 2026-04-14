/*
 * I2C Address Scanner
 * Upload this to Arduino Mega to find your LCD's I2C address.
 * Open Serial Monitor at 9600 baud after uploading.
 */

#include <Wire.h>

void setup() {
  Wire.begin();
  Serial.begin(9600);
  while (!Serial);

  Serial.println("Scanning I2C addresses...");
  Serial.println("---------------------------");

  int devicesFound = 0;

  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("Device found at address: 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      Serial.println("  <-- Use this in your LCD sketch!");
      devicesFound++;
    }
  }

  if (devicesFound == 0) {
    Serial.println("NO devices found!");
    Serial.println("Check your SDA/SCL wiring.");
  } else {
    Serial.print("Total devices found: ");
    Serial.println(devicesFound);
  }

  Serial.println("---------------------------");
  Serial.println("Done. Copy the address above.");
}

void loop() {
  // Nothing needed here
}
