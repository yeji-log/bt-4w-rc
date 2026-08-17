/*
  rc_car_firmware.ino
  4륜구동 RC카 — HM-10(BLE) 시리얼 명령 수신 → L298N으로 좌/우 모터 쌍 제어

  프로토콜 (터미널 탭 / 게임패드 탭 공통, 한 글자씩 즉시 처리):
    F   전진
    B   후진
    L   좌회전 (제자리 피벗)
    R   우회전 (제자리 피벗)
    S   정지
    U   속도 단계 증가 (+25, 최대 255)
    D   속도 단계 감소 (-25, 최소 100 — 모터가 멈추지 않는 선)
  ※ 다른 문자(예: 웹앱이 붙이는 개행 '\n')는 무시되므로 별도 종료 문자 없이도 안전합니다.

  배선:
    HM-10 TX  → Arduino 10번 (SoftwareSerial RX)
    HM-10 RX  ← Arduino 11번 (SoftwareSerial TX)
      ⚠️ HM-10 RX는 3.3V 로직입니다. Arduino TX(5V)를 직결하면 모듈이 손상되거나
         통신이 불안정할 수 있으므로 저항 분배(예: 1kΩ+2kΩ) 또는 레벨시프터를 꼭 사용하세요.

    L298N (좌측 모터 2개 병렬 = OUT1/OUT2, 우측 모터 2개 병렬 = OUT3/OUT4)
      in1 → 2   in2 → 3   (좌측 방향)
      in3 → 4   in4 → 5   (우측 방향)
      ena → 9   (좌측 PWM 속도)
      enb → 6   (우측 PWM 속도)
*/

#include <SoftwareSerial.h>

// 블루투스 핀
SoftwareSerial BTSerial(10, 11);

// L298N 핀 정의
const int in1 = 2;
const int in2 = 3;
const int in3 = 4;
const int in4 = 5;
const int ena = 9; // 속도 제어 핀 (PWM)
const int enb = 6; // 속도 제어 핀 (PWM)

// 초기 속도 설정 (0 ~ 255)
int motorSpeed = 200;
const int speedStep = 25; // U/D 입력 시 변경될 속도 크기

// 현재 수행 중인 동작 기억 변수 (속도 변경 시 현재 동작 유지용)
char currentCommand = 'S';

void setup() {
  pinMode(in1, OUTPUT);
  pinMode(in2, OUTPUT);
  pinMode(in3, OUTPUT);
  pinMode(in4, OUTPUT);
  pinMode(ena, OUTPUT);
  pinMode(enb, OUTPUT);

  BTSerial.begin(9600);
  stopCar();
}

void loop() {
  if (BTSerial.available()) {
    char command = BTSerial.read();

    switch (command) {
      case 'F':
      case 'B':
      case 'L':
      case 'R':
      case 'S':
        currentCommand = command; // 동작 명령 기억
        executeCommand(currentCommand);
        break;

      case 'U': // 속도 증가
        motorSpeed += speedStep;
        if (motorSpeed > 255) {
          motorSpeed = 255; // 최대 속도 제한
        }
        // 현재 움직이는 중이었다면 바뀐 속도 즉시 적용
        if (currentCommand != 'S') {
          setSpeed(motorSpeed);
        }
        break;

      case 'D': // 속도 감소
        motorSpeed -= speedStep;
        if (motorSpeed < 100) {
          motorSpeed = 100; // 최소 속도 제한 (모터가 멈추지 않을 정도)
        }
        // 현재 움직이는 중이었다면 바뀐 속도 즉시 적용
        if (currentCommand != 'S') {
          setSpeed(motorSpeed);
        }
        break;
    }
  }
}

// 명령어 실행 함수
void executeCommand(char cmd) {
  switch (cmd) {
    case 'F': moveForward(); break;
    case 'B': moveBackward(); break;
    case 'L': turnLeft(); break;
    case 'R': turnRight(); break;
    case 'S': stopCar(); break;
  }
}

// 모터 속도 적용 함수
void setSpeed(int speed) {
  analogWrite(ena, speed);
  analogWrite(enb, speed);
}

void moveForward() {
  setSpeed(motorSpeed);
  digitalWrite(in1, HIGH); digitalWrite(in2, LOW);
  digitalWrite(in3, HIGH); digitalWrite(in4, LOW);
}

void moveBackward() {
  setSpeed(motorSpeed);
  digitalWrite(in1, LOW); digitalWrite(in2, HIGH);
  digitalWrite(in3, LOW); digitalWrite(in4, HIGH);
}

void turnLeft() {
  setSpeed(motorSpeed);
  digitalWrite(in1, LOW); digitalWrite(in2, HIGH);
  digitalWrite(in3, HIGH); digitalWrite(in4, LOW);
}

void turnRight() {
  setSpeed(motorSpeed);
  digitalWrite(in1, HIGH); digitalWrite(in2, LOW);
  digitalWrite(in3, LOW); digitalWrite(in4, HIGH);
}

void stopCar() {
  setSpeed(0);
  digitalWrite(in1, LOW); digitalWrite(in2, LOW);
  digitalWrite(in3, LOW); digitalWrite(in4, LOW);
}
