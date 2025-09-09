const net = require("net");
const readline = require("readline");

const HOST = "127.0.0.1";
const PORT = 8000;

const RECT_WIDTH = 400 * 10; // mm
const RECT_HEIGHT = 590 * 10; // mm
const POINTS_PER_SIDE = 100;

let lidarPoints = [];
let currentPointIndex = 0;

let direction = 0; // 1 adelante, -1 atrás, 0 detenido
let turn = 0; // -1 izquierda, 1 derecha, 0 sin giro

let leftEncoderTicks = 1000;
let rightEncoderTicks = 1000;

const stepTicks = 300; // ticks por paso (ajustable)
const turnTicks = 30; // diferencia ticks para giro (ajustable)

let robotX = 0; // metros
let robotY = 0; // metros
let robotTheta = 0; // radianes, 0 mirando hacia X+

function generateRectanglePoints() {
  const a = RECT_WIDTH / 2;
  const b = RECT_HEIGHT / 2;
  const points = [];

  const doorWidth = 200; // ancho de la puerta en mm
  const doorStart = -doorWidth / 2;
  const doorEnd = doorWidth / 2;

  // Lado superior (igual)
  for (let i = 0; i <= POINTS_PER_SIDE; i++) {
    const x = -a + (2 * a * i) / POINTS_PER_SIDE;
    const y = b;
    points.push({ x, y });
  }

  // Lado derecho (igual)
  for (let i = 1; i <= POINTS_PER_SIDE; i++) {
    const x = a;
    const y = b - (2 * b * i) / POINTS_PER_SIDE;
    points.push({ x, y });
  }

  // Lado inferior (con puerta: omitimos puntos en la puerta)
  for (let i = 1; i <= POINTS_PER_SIDE; i++) {
    const x = a - (2 * a * i) / POINTS_PER_SIDE;
    const y = -b;
    if (x < doorStart || x > doorEnd) {
      points.push({ x, y });
    } else {
      // Espacio vacío para la puerta (sin puntos)
      // opcional: puedes poner puntos a mucha distancia (p.ej. 3000 mm) para simular apertura
      // points.push({ x, y: -b - 3000 });
    }
  }

  // Lado izquierdo (igual)
  for (let i = 1; i < POINTS_PER_SIDE; i++) {
    const x = -a;
    const y = -b + (2 * b * i) / POINTS_PER_SIDE;
    points.push({ x, y });
  }

  return points.map((p) => {
    const distance = Math.sqrt(p.x ** 2 + p.y ** 2);
    const angle = (Math.atan2(p.y, p.x) * 180) / Math.PI;
    return {
      distance: Math.floor(distance),
      angle: +(angle < 0 ? angle + 360 : angle).toFixed(2),
      quality: 100,
    };
  });
}

function generateSensorData() {
  const point = lidarPoints[currentPointIndex];
  currentPointIndex = (currentPointIndex + 1) % lidarPoints.length;

  // Actualizar encoders según movimiento y giro
  if (direction !== 0 || turn !== 0) {
    // Avance simple, ambos incrementan igual
    const noiseFactorLeft = 1;
    const noiseFactorRight = 1; // (Math.random() * 0.01 - 0.001); // entre 0.95 y 1.05

    let leftStep = direction * stepTicks * noiseFactorLeft;
    let rightStep = direction * stepTicks * noiseFactorRight;

    // Si giras, modifica ticks para simular diferencia ruedas
    if (turn === -1) {
      // Giro izquierda: rueda derecha más rápida
      leftStep -= turnTicks;
      rightStep += turnTicks;
    } else if (turn === 1) {
      // Giro derecha: rueda izquierda más rápida
      leftStep += turnTicks;
      rightStep -= turnTicks;
    }

    leftEncoderTicks += leftStep;
    rightEncoderTicks += rightStep;

    // Actualizar pose del robot (simplificado)
    const distLeft = (leftStep / 1000) * 0.02;  // Convertir ticks a metros (ejemplo)
    const distRight = (rightStep / 1000) * 0.02;

    const deltaDist = (distLeft + distRight) / 2;
    const deltaTheta = (distRight - distLeft) / 0.15; // 0.15 m separación ruedas, ajustar si quieres

    robotTheta += deltaTheta;
    robotX += deltaDist * Math.cos(robotTheta);
    robotY += deltaDist * Math.sin(robotTheta);
  }

  // Imperfecciones opcionales
  const distanceNoise = (Math.random() - 0.5) * 20;
  const angleNoise = (Math.random() - 0.5) * 0.4;
  const qualityVariation = 90 + Math.floor(Math.random() * 10);

  // Calcular punto global usando orientación robotTheta
  const angleRadPoint = ((point.angle + angleNoise) * Math.PI) / 180;
  const noisyDistance = Math.max(50, point.distance + distanceNoise) / 1000; // mm a metros

  // Coordenadas del punto LIDAR relativas al robot (rotadas por robotTheta)
  const localX = noisyDistance * Math.cos(angleRadPoint);
  const localY = noisyDistance * Math.sin(angleRadPoint);

  const globalX = robotX + localX * Math.cos(robotTheta) - localY * Math.sin(robotTheta);
  const globalY = robotY + localX * Math.sin(robotTheta) + localY * Math.cos(robotTheta);

  return {
    accel_x: direction * 0.02 + Math.random() * 0.01 - 0.005,
    accel_y: 0,
    accel_z: 9.81,

    gyro_x: 0,
    gyro_y: 0,
    gyro_z: turn * 0.1 + Math.random() * 0.01, // algo de giro en z

    mag_x: 30.0 + Math.random() * 0.5 - 0.25,
    mag_y: 5.0 + Math.random() * 0.5 - 0.25,
    mag_z: -20.0 + Math.random() * 0.5 - 0.25,

    temp: 25.0 + Math.random() * 0.3 - 0.15,
    timestamp: +(Date.now() / 1000).toFixed(3),

    distance: +(noisyDistance * 1000).toFixed(1), // mm
    angle: +(point.angle + angleNoise).toFixed(2),
    quality: qualityVariation,

    left: leftEncoderTicks,
    right: rightEncoderTicks,

    global_x: +globalX.toFixed(3),
    global_y: +globalY.toFixed(3),

    robot_x: +robotX.toFixed(3),
    robot_y: +robotY.toFixed(3),
    robot_theta: +(robotTheta * 180 / Math.PI).toFixed(2) // grados
  };
}

function generateOnlyEnconders() {

  // Actualizar encoders según movimiento y giro
  if (direction !== 0 || turn !== 0) {
    // Avance simple, ambos incrementan igual
    const noiseFactorLeft = 1;
    const noiseFactorRight = 1; // (Math.random() * 0.01 - 0.001); // entre 0.95 y 1.05

    let leftStep = direction * stepTicks * noiseFactorLeft;
    let rightStep = direction * stepTicks * noiseFactorRight;

    // Si giras, modifica ticks para simular diferencia ruedas
    if (turn === -1) {
      // Giro izquierda: rueda derecha más rápida
      leftStep -= turnTicks;
      rightStep += turnTicks;
    } else if (turn === 1) {
      // Giro derecha: rueda izquierda más rápida
      leftStep += turnTicks;
      rightStep -= turnTicks;
    }

    leftEncoderTicks += leftStep;
    rightEncoderTicks += rightStep;

    // Actualizar pose del robot (simplificado)
    const distLeft = (leftStep / 1000) * 0.02;  // Convertir ticks a metros (ejemplo)
    const distRight = (rightStep / 1000) * 0.02;

    const deltaDist = (distLeft + distRight) / 2;
    const deltaTheta = (distRight - distLeft) / 0.15; // 0.15 m separación ruedas, ajustar si quieres

    robotTheta += deltaTheta;
    robotX += deltaDist * Math.cos(robotTheta);
    robotY += deltaDist * Math.sin(robotTheta);
  }



  return {

    left: leftEncoderTicks,
    right: rightEncoderTicks,

  };
}

function calculateXORChecksum(buffer) {
  return buffer.reduce((acc, val) => acc ^ val, 0);
}

function sendPacket(dataObj) {
  const json = JSON.stringify(dataObj);
  const jsonBuffer = Buffer.from(json, "utf8");
  const payloadLength = jsonBuffer.length;

  const header = Buffer.alloc(4);
  header.writeUInt8(0xaa, 0); // START_BYTE
  header.writeUInt8(0x01, 1); // TYPE_BYTE
  header.writeUInt16LE(payloadLength, 2); // PAYLOAD_LENGTH

  const dataForChecksum = Buffer.concat([header, jsonBuffer]);
  const checksum = calculateXORChecksum(dataForChecksum);

  const fullPacket = Buffer.concat([dataForChecksum, Buffer.from([checksum])]);

  client.write(fullPacket);
}

const client = new net.Socket();

client.connect(PORT, HOST, () => {
  console.log(`✅ Conectado al servidor TCP en ${HOST}:${PORT}`);
  client.on("data", (data) => {
    const cmdValue = data.readUInt8(4);
    switch (cmdValue) {
      case 1:
        console.log("⬅️ Retrocediendo");
        direction = -1;
        break;
      case 2:
        console.log("➡️ Avanzando");
        direction = 1;
        break;
      case 3:
        console.log("↪️ Girando izquierda");
        turn = -1;
        break;
      case 4:
        console.log("↩️ Girando derecha");
        turn = 1;
        break;
      case 5:
        console.log("⏸️ Detenido");
        direction = 0;
        turn = 0;
        break;
    }

  });

  lidarPoints = generateRectanglePoints();

  startSimulating();
});

function startSimulating() {
  setInterval(() => {
    const data = generateSensorData();
    sendPacket(data);
  }, 50); // 20 Hz
}
