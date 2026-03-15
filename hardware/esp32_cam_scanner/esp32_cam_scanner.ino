#include <Arduino.h>
#include <ESP32QRCodeReader.h>

// ESP32-CAM AI-Thinker Pin Definition
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

ESP32QRCodeReader reader(CAMERA_MODEL_AI_THINKER);

struct QRCodeData qrCodeData;

void onQrCodeTask(void *pvParameters)
{
  struct QRCodeData qrCodeData;

  while (true)
  {
    if (reader.receiveQrCode(&qrCodeData, 100))
    {
      if (qrCodeData.valid)
      {
        // Send the scanned token over Serial to the main ESP32
        // We use print() instead of println() if we want exact string without newline,
        // but println() is usually easier to parse on the receiving end.
        Serial.println((const char *)qrCodeData.payload);
      }
    }
    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}

void setup() {
  // Initialize Serial connection to main ESP32
  // We use 115200 baud. The main ESP32 must also use 115200 for Serial2
  Serial.begin(115200);
  
  // Give camera time to wake up
  delay(1000);
  
  // Start the QR Reader
  reader.setup();
  reader.beginOnCore(1); // Run camera on Core 1

  // Start the task that polls for decoded QR codes
  xTaskCreate(onQrCodeTask, "onQrCode", 4 * 1024, NULL, 4, NULL);
}

void loop() {
  // Main loop does nothing, FreeRTOS task handles everything
  delay(1000);
}
