#include "main.h"
#include <ArduinoOTA.h>
#include <ESPmDNS.h>

TaskHandle_t taskHandleIMU = NULL;
TaskHandle_t taskHandleLidar = NULL;
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

HardwareSerial LIDARSerial(1);
RPLidar lidar;
MPU9250 IMU(Wire, 0x68);

Platform plataforma;
TcpClient tcpClient;

int32_t left = 0;
int32_t right = 0;

void setup()
{
    Serial.begin(115200);
    LIDARSerial.begin(115200, SERIAL_8N1, 16, 17);

    pinMode(RPLIDAR_MOTOR, OUTPUT); // Lidar Motor
    pinMode(STATUS_LED, OUTPUT);    // Status LED

    plataforma.stopWheels();
    plataforma.onEncodersValues = encodersCallback;

    delay(2000);

    connectToWiFi();
    setupOTA();

    tcpClient.connectToServer();
    tcpClient.onMotorCommand = [](uint8_t cmd) { plataforma.wheelProcessCommand(cmd); };
    tcpClient.onIMUCommand = [](uint8_t cmd) { calibrateIMU(cmd); };

    xTaskCreatePinnedToCore(TaskIMU, "IMU Task", 4096, NULL, 1, &taskHandleIMU, 0);
    xTaskCreatePinnedToCore(TaskLidar, "Lidar Task", 4096, NULL, 1, &taskHandleLidar, 1);
}

void loop()
{
    ArduinoOTA.handle(); // ← permite OTA desde loop
}

void connectToWiFi()
{
    // WiFi.config(IPAddress(10, 0, 0, 68), IPAddress(255, 255, 255, 0), IPAddress(10, 0, 0, 1), IPAddress(8, 8, 8, 8));
    WiFi.begin(ssid, password);
    Serial.print("Conectando a WiFi");
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }
    Serial.printf("✅ WiFi conectado a %s\n", WiFi.localIP().toString().c_str());
}

void TaskIMU(void *pvParameters)
{
    float imuData[11];
    TickType_t xLastWakeTime = xTaskGetTickCount();
    const TickType_t xFrequency = pdMS_TO_TICKS(50); // 20Hz
    uint8_t ledState = LOW;

    ledcSetup(0, 1000, 8);
    ledcAttachPin(RPLIDAR_MOTOR, 0);
    ledcWrite(0, 255); // Enciende motor
    lidar.startScan(true);

    lidar.begin(LIDARSerial);
    if (IMU.begin() < 0)
    {
        Serial.println("❌ IMU no se pudo inicializar");
        vTaskDelete(NULL);
    }

    IMU.setAccelRange(MPU9250::ACCEL_RANGE_2G);
    IMU.setGyroRange(MPU9250::GYRO_RANGE_250DPS);
    IMU.setDlpfBandwidth(MPU9250::DLPF_BANDWIDTH_20HZ);

    while (true)
    {
        if (!tcpClient.isConnected())
        {
            tcpClient.connectToServer();
        }
        else
        {
            IMU.readSensor();
            JsonDocument doc;
            doc["accel_x"] = IMU.getAccelX_mss();
            doc["accel_y"] = IMU.getAccelY_mss();
            doc["accel_z"] = IMU.getAccelZ_mss();
            doc["gyro_x"] = IMU.getGyroX_rads();
            doc["gyro_y"] = IMU.getGyroY_rads();
            doc["gyro_z"] = IMU.getGyroZ_rads();
            doc["mag_x"] = IMU.getMagX_uT();
            doc["mag_y"] = IMU.getMagY_uT();
            doc["mag_z"] = IMU.getMagZ_uT();
            doc["temp"] = IMU.getTemperature_C();
            doc["timestamp"] = millis() / 1000.0;

            if (IS_OK(lidar.waitPoint()))
            {
                doc["distance"] = lidar.getCurrentPoint().distance;
                doc["angle"] = lidar.getCurrentPoint().angle;
                doc["quality"] = (uint8_t)lidar.getCurrentPoint().quality;
            }
            else
            {
                ledcWrite(0, 0); // Apagar motor
                rplidar_response_device_info_t info;
                if (IS_OK(lidar.getDeviceInfo(info, 100)))
                {
                    lidar.startScan();
                    ledcWrite(0, 255);
                    delay(1000);
                }
            }

            portENTER_CRITICAL(&mux);
            doc["left"] = left;
            doc["right"] = right;
            portEXIT_CRITICAL(&mux);

            char buffer[360];
            size_t len = serializeJson(doc, buffer, sizeof(buffer));
            tcpClient.sendPacket(0x01, (uint8_t *)buffer, len);

            digitalWrite(4, ledState);
            ledState = !ledState;
            tcpClient.receivePacket();
            vTaskDelayUntil(&xLastWakeTime, xFrequency);
        }
    }
}

void TaskLidar(void *pvParameters)
{
    TickType_t xLastWakeTime = xTaskGetTickCount();
    const TickType_t xFrequency = pdMS_TO_TICKS(20); // 50Hz
    float lidarData[3];

    while (true)
    {
        plataforma.readEncoders();
        // vTaskDelayUntil(&xLastWakeTime, xFrequency);
    }
}

void calibrateIMU(uint8_t cmd)
{
    switch (cmd)
    {
    case 1:
        Serial.println("📦 Calibrando Acelerometro ");
        IMU.calibrateAccel();
        Serial.println("✅ Fin de Calibración");
        break;
    case 2:
        Serial.println("📦 Calibrando Magnetometro ");
        IMU.calibrateMag();
        Serial.println("✅ Fin de Calibración");
        break;
    case 3:
        Serial.println("📦 Calibrando Gyro ");
        IMU.calibrateGyro();
        Serial.println("✅ Fin de Calibración");
        break;
    default:
        Serial.println("❌ Comando desconocido");
        break;
    }
}

void encodersCallback(int32_t leftEnc, int32_t rightEnc)
{
    Serial.printf("Encoders, Left: %d Right: %d \n", leftEnc, rightEnc);
    portENTER_CRITICAL_ISR(&mux);
    left += leftEnc;
    right += rightEnc;
    portEXIT_CRITICAL_ISR(&mux);
}

void setupOTA()
{
    ArduinoOTA.onStart([]() {
        Serial.printf("✅ Starting OTA %s update.\n", ArduinoOTA.getCommand() == U_FLASH ? "sketch" : "filesystem");
    });

    ArduinoOTA.onEnd([]() {
        Serial.println("✅ OTA Done");
        ESP.restart();
    });

    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("📦 OTA Progress: %u%%\n", (progress * 100) / total);
    });

    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf("❌ OTA Error[%u]: ", error);
        if (error == OTA_AUTH_ERROR)
            Serial.println("Auth Failed");
        else if (error == OTA_BEGIN_ERROR)
            Serial.println("Begin Failed");
        else if (error == OTA_CONNECT_ERROR)
            Serial.println("Connect Failed");
        else if (error == OTA_RECEIVE_ERROR)
            Serial.println("Receive Failed");
        else if (error == OTA_END_ERROR)
            Serial.println("End Failed");
    });

    ArduinoOTA.begin();
}