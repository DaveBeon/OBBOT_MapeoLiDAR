#pragma once

#include <Arduino.h>

enum moveDirection
{
    FORWARD,
    BACKWARD,
    LEFT,
    RIGHT,
};

enum encoderType
{
    LEFT_ENCODER,
    RIGHT_ENCODER,
};

class Platform
{
  private:
    const int leftDirectionMotorPin = 18;
    const int rightDirectionMotorPin = 19;
    const int leftMotorPin = 23;
    const int rightMotorPin = 5;

    const int leftMotorEncoderPinA = 34;
    const int leftMotorEncoderPinB = 35;
    const int rightMotorEncoderPinA = 39;
    const int rightMotorEncoderPinB = 36;

    const int freq = 5000;         // Frecuencia en Hz
    const int pwmChannelLeft = 1;  // Canal 1 para pin 23
    const int pwmChannelRight = 2; // Canal 0 para pin 5
    const int resolution = 8;      // Resolución: 8 bits (0-255)

    int32_t posLeft = 0;
    int32_t posRight = 0;
    int32_t lastPosLeft = 0;
    int32_t lastPosRight = 0;

    uint speed = 128;

    unsigned long lastEncoderLeftTime = 0;
    unsigned long lastEncoderRightTime = 0;
    const unsigned long debounceTime = 2; // ms

    int lastStateLeftA = 0;
    int lastStateRightA = 0;

  public:
    Platform(/* args */);
    ~Platform();

    std::function<void(const int32_t, const int32_t)> onEncodersValues;

    void moveWheels(moveDirection direction, uint8_t speed);
    void move(int8_t speedLeft, int8_t speedRight);
    void stopWheels();
    void readEncoders();
    void emitEncodersValues(int32_t leftEnc, int32_t rightEnc);
    void wheelProcessCommand(uint8_t command);
    void maintainStraightness(uint8_t baseSpeed);
};

Platform::Platform(/* args */)
{
    pinMode(leftDirectionMotorPin, OUTPUT);  // Left Direction
    pinMode(rightDirectionMotorPin, OUTPUT); // Right Direction
    pinMode(leftMotorPin, OUTPUT);           // Lidar Motor
    pinMode(rightMotorPin, OUTPUT);          // Lidar Motor

    pinMode(leftMotorEncoderPinA, INPUT);
    pinMode(leftMotorEncoderPinB, INPUT);
    pinMode(rightMotorEncoderPinA, INPUT);
    pinMode(rightMotorEncoderPinB, INPUT);

    ledcSetup(pwmChannelRight, freq, resolution);
    ledcAttachPin(rightMotorPin, pwmChannelRight);

    ledcSetup(pwmChannelLeft, freq, resolution);
    ledcAttachPin(leftMotorPin, pwmChannelLeft);

    lastStateLeftA = digitalRead(leftMotorEncoderPinA);
    lastStateRightA = digitalRead(rightMotorEncoderPinA);
}

Platform::~Platform()
{
}

void Platform::wheelProcessCommand(uint8_t command)
{
    switch (command)
    {
    case 1:
        Serial.println("📦 Foward ");
        moveWheels(FORWARD, speed);
        break;
    case 2:
        Serial.println("📦 Backward ");
        moveWheels(BACKWARD, speed);
        break;
    case 3:
        Serial.println("📦 Left ");
        moveWheels(LEFT, speed);
        break;
    case 4:
        Serial.println("📦 Right ");
        moveWheels(RIGHT, speed);
        break;
    case 5:
        Serial.println("📦 Stop ");
        stopWheels();
        break;
    default:
        Serial.print("❓ Comando desconocido: ");
        Serial.println(command);
        break;
    }
}

void Platform::emitEncodersValues(int32_t leftEnc, int32_t rightEnc)
{
    if (onEncodersValues)
    {
        onEncodersValues(leftEnc, rightEnc);
    }
}

void Platform::moveWheels(moveDirection direction, uint8_t speed)
{
    switch (direction)
    {
    case FORWARD:
        digitalWrite(leftDirectionMotorPin, HIGH);
        digitalWrite(rightDirectionMotorPin, HIGH);
        maintainStraightness(speed);
        break;
    case BACKWARD:
        digitalWrite(leftDirectionMotorPin, LOW);
        digitalWrite(rightDirectionMotorPin, LOW);
        ledcWrite(pwmChannelLeft, speed);
        ledcWrite(pwmChannelRight, speed);
        break;
    case LEFT:
        digitalWrite(leftDirectionMotorPin, HIGH);
        digitalWrite(rightDirectionMotorPin, LOW);
        ledcWrite(pwmChannelLeft, speed);
        ledcWrite(pwmChannelRight, speed);
        break;
    case RIGHT:
        digitalWrite(leftDirectionMotorPin, LOW);
        digitalWrite(rightDirectionMotorPin, HIGH);
        ledcWrite(pwmChannelLeft, speed);
        ledcWrite(pwmChannelRight, speed);
        break;
    }
}

void Platform::stopWheels()
{
    digitalWrite(leftDirectionMotorPin, LOW);
    digitalWrite(rightDirectionMotorPin, LOW);
    ledcWrite(pwmChannelLeft, 0);
    ledcWrite(pwmChannelRight, 0);
}

void Platform::readEncoders()
{
    unsigned long now = millis();

    int stateLeftA = digitalRead(leftMotorEncoderPinA);
    if (stateLeftA != lastStateLeftA && stateLeftA == HIGH)
    {
        if (now - lastEncoderLeftTime > debounceTime)
        {
            int dirLeft = digitalRead(leftMotorEncoderPinB); // Dirección
            if (dirLeft == LOW)
                posLeft++; // hacia adelante
            else
                posLeft--; // hacia atrás

            lastEncoderLeftTime = now;
        }
    }
    lastStateLeftA = stateLeftA;

    // === RIGHT ENCODER ===
    int stateRightA = digitalRead(rightMotorEncoderPinA);
    if (stateRightA != lastStateRightA && stateRightA == HIGH)
    {
        if (now - lastEncoderRightTime > debounceTime)
        {
            int dirRight = digitalRead(rightMotorEncoderPinB);
            if (dirRight == LOW)
                posRight++; // hacia adelante
            else
                posRight--; // hacia atrás

            lastEncoderRightTime = now;
        }
    }
    lastStateRightA = stateRightA;

    // Emitir solo si hubo cambio
    if (posLeft != lastPosLeft || posRight != lastPosRight)
    {
        emitEncodersValues(posLeft, posRight);
        lastPosLeft = posLeft;
        lastPosRight = posRight;
    }

    delay(1);
}

void Platform::maintainStraightness(uint8_t baseSpeed)
{
    float Kp = 0.1;
    int32_t error = posLeft - posRight;
    int correction = (int)(error * Kp);
    int leftSpeed = baseSpeed - correction;
    int rightSpeed = baseSpeed + correction;
    if (leftSpeed < 0)
        leftSpeed = 0;
    if (leftSpeed > 255)
        leftSpeed = 255;
    if (rightSpeed < 0)
        rightSpeed = 0;
    if (rightSpeed > 255)
        rightSpeed = 255;

    move(leftSpeed, rightSpeed);
}

void Platform::move(int8_t speedLeft, int8_t speedRight)
{
    ledcWrite(pwmChannelLeft, abs(speedLeft));
    ledcWrite(pwmChannelRight, abs(speedRight));
}