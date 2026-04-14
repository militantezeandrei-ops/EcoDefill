/*
 * LCD Robust Test v2
 * Upload this to Mega — Serial Monitor at 115200 baud
 * Fixed: I2C bus recovery + safe init sequence
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 20, 4);

// Manual I2C bus reset — clears any stuck state from previous sketches
void i2cBusReset() {
  // Toggle SCL 9 times to release any stuck SDA
  pinMode(20, OUTPUT); // SDA
  pinMode(21, OUTPUT); // SCL
  digitalWrite(20, HIGH);
  for (int i = 0; i < 9; i++) {
    digitalWrite(21, LOW);  delayMicroseconds(5);
    digitalWrite(21, HIGH); delayMicroseconds(5);
  }
  // Send STOP condition
  digitalWrite(20, LOW);  delayMicroseconds(5);
  digitalWrite(21, HIGH); delayMicroseconds(5);
  digitalWrite(20, HIGH); delayMicroseconds(5);
}

void setup() {
  Serial.begin(115200);
  delay(1000); // Wait for Serial Monitor to connect
  Serial.println("\n\n=== LCD Robust Test v2 ===");

  // Step 1: Reset I2C bus first
  Serial.println("[1] Resetting I2C bus...");
  i2cBusReset();
  delay(200);
  Serial.println("    Done.");

  // Step 2: Start Wire
  Serial.println("[2] Wire.begin()...");
  Wire.begin();
  Wire.setClock(50000); // Slow down I2C for stability
  delay(200);
  Serial.println("    Done.");

  // Step 3: Init LCD (call twice for reliability)
  Serial.println("[3] lcd.init() x2...");
  lcd.init();
  delay(100);
  lcd.init();
  delay(100);
  Serial.println("    Done.");

  // Step 4: Backlight ON
  Serial.println("[4] lcd.backlight()...");
  lcd.backlight();
  delay(500);
  Serial.println("    --> Does backlight glow NOW? (blue/green light)");

  // Step 5: Print text
  Serial.println("[5] Writing text to LCD...");
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print("  EcoDefill Test  ");
  lcd.setCursor(0, 1); lcd.print("Points: 0           ");
  lcd.setCursor(0, 2); lcd.print("LCD Working! :)     ");
  lcd.setCursor(0, 3); lcd.print("Btn1:+pt Btn2:Scan  ");
  Serial.println("    Done! Check LCD screen.");

  Serial.println("\n=== If you see text on LCD = SUCCESS ===");
  Serial.println("=== If LCD still dark = check contrast screw ===");
}

void loop() {
  // Every 3 seconds, blink backlight to confirm control
  delay(3000);
  lcd.noBacklight();
  Serial.println("[BLINK] OFF");
  delay(300);
  lcd.backlight();
  Serial.println("[BLINK] ON");
}

