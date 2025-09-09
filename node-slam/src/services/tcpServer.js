const net = require('net');
const { START_BYTE, IMU_PACKET_ID, LIDAR_PACKET_ID, ENCODERS_PACKET_ID, TCP_PORT, HOST } = require('../config/constants');
const { calculateXORChecksum } = require('../utils/checksum');
const { broadcast } = require('../services/websocketServer');
const { setTcpClient, clearTcpClient } = require('./tcpClientManager');


let latestImuData = {};
let latestLidarData = {};
let lastUpdateTime = null;

const ticks_per_rev = 2000
const wheel_diameter = 0.08;
const wheel_base = 0.04;

function handleClient(socket) {
    console.log("TCP Client connected: ", socket.remoteAddress);
    setTcpClient(socket);


    broadcast({ type: 'clientConnected', client: socket.remoteAddress });
    let rawBuffer = Buffer.alloc(0);

    socket.on('data', (data) => {
        rawBuffer = Buffer.concat([rawBuffer, data]);

        while (true) {

            if (rawBuffer.length < 5) break;

            if (rawBuffer[0] !== START_BYTE) {
                console.warn(`❌ Incorrect START_BYTE: ${rawBuffer[0].toString(16).toUpperCase()}. Expected: ${START_BYTE.toString(16).toUpperCase()}. Discarding 1 byte.`);
                rawBuffer = rawBuffer.subarray(1); // Discard the invalid byte and try again
                continue;
            }

            const packetId = rawBuffer[1];
            const payloadSize = rawBuffer.readUInt16LE(2);
            const expectedPacketLength = 4 + payloadSize + 1; // Header (4) + Payload (N) + Checksum (1)


            if (rawBuffer.length < expectedPacketLength) {
                break;
            }

            const packet = rawBuffer.subarray(0, expectedPacketLength);
            const headerPart = packet.subarray(0, 4); // [START_BYTE, PacketID, PayloadSize_LSB, PayloadSize_MSB]
            const payloadPart = packet.subarray(4, 4 + payloadSize);
            const receivedChecksum = packet[expectedPacketLength - 1];
            const dataForChecksum = Buffer.concat([headerPart, payloadPart]);
            const calculatedChecksum = calculateXORChecksum(dataForChecksum);

            if (calculatedChecksum !== receivedChecksum) {
                console.warn(`❌ Checksum invalid: Expected ${calculatedChecksum.toString(16).toUpperCase()}, Received ${receivedChecksum.toString(16).toUpperCase()}. Discarding packet.`);
                rawBuffer = rawBuffer.subarray(expectedPacketLength); // Discard the bad packet
                continue; // Try processing the next potential packet
            }

            if (packetId === IMU_PACKET_ID) {
                try {
                    const jsonString = payloadPart.toString();
                    const latestImuData = JSON.parse(jsonString);
                    broadcast({ type: 'slam', data: latestImuData });
                } catch (e) {
                    console.error('❌ Error parsing IMU JSON:', e);
                }
            }
            lastUpdateTime = Date.now() / 1000; // Unix timestamp in seconds
            rawBuffer = rawBuffer.subarray(expectedPacketLength);
        }
    });

    socket.on('end', () => {
        console.info("🔌 TCP Client disconnected");
        clearTcpClient();
    });

    socket.on('error', (err) => {
        console.error(`⚠️ TCP Client error: ${err.message}`);
        clearTcpClient();
    });
}

function parseSLAM(payloadPart) {
    return {
        // IMU
        accel_x: payloadPart.readFloatLE(0),
        accel_y: payloadPart.readFloatLE(4),
        accel_z: payloadPart.readFloatLE(8),
        gyro_x: payloadPart.readFloatLE(12),
        gyro_y: payloadPart.readFloatLE(16),
        gyro_z: payloadPart.readFloatLE(20),
        mag_x: payloadPart.readFloatLE(24),
        mag_y: payloadPart.readFloatLE(28),
        mag_z: payloadPart.readFloatLE(32),
        temp: payloadPart.readFloatLE(36),

        // LIDAR
        distance: payloadPart.readFloatLE(40),
        angle: payloadPart.readFloatLE(44),
        quality: payloadPart.readUInt8(48),

        // Encoders
        left: payloadPart.readUInt32LE(49),
        right: payloadPart.readUInt32LE(53),

        // Timestamp
        timestamp: payloadPart.readUInt32LE(57)
    };
}



function startTcpServer() {
    const server = net.createServer(handleClient);
    server.listen(TCP_PORT, HOST, () => {
        console.log(`TCP server listening on ${HOST}:${TCP_PORT}`);
    });
}


module.exports = {
    startTcpServer,
    getLatestData: () => ({ imu: latestImuData, lidar: latestLidarData, lastUpdateTime }),
};
