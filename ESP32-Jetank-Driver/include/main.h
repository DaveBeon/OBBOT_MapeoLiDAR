#include "MPU9250.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <ArduinoWebsockets.h>
#include <HardwareSerial.h>
#include <RPLidar.h>
#include <WiFi.h>

#include "components/platform.h"
#include "components/tcpClient.h"

#define RPLIDAR_MOTOR 0
#define STATUS_LED 4

using namespace websockets;


const char *ssid = "Proyecto";
const char *password = "P12345678";
const uint16_t tcp_port = 8000;

// struct slam_type
// {
//     float accel_x;
//     float accel_y;
//     float accel_z;
//     float gyro_x;
//     float gyro_y;
//     float gyro_z;
//     float mag_x;
//     float mag_y;
//     float mag_z;
//     float temp;
//     float distance;
//     float angle;
//     uint8_t quality;
//     uint32_t left;
//     uint32_t right;
//     uint32_t timestamp;
// } slam_data;

void connectToWiFi();
void TaskIMU(void *pvParameters);
void TaskLidar(void *pvParameters);
void calibrateIMU(uint8_t cmd);
void encodersCallback(int32_t leftEnc, int32_t rightEnc);
void setupOTA();
