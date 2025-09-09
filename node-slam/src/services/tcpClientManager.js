let tcpClientSocketArray = [];

function setTcpClient(socket) {
    tcpClientSocketArray.push(socket);
}

function sendToTcpClient(packetId, payload) {

    for (tcpClientSocket of tcpClientSocketArray) {
        if (tcpClientSocket.writable) {

            if (!Buffer.isBuffer(payload)) {
                payload = Buffer.from(payload); // Asegura que sea un Buffer
            }

            const payloadSize = payload.length;
            const buffer = Buffer.alloc(5 + payloadSize); // header (4) + payload + checksum
            let offset = 0;

            // Start byte
            buffer.writeUInt8(0xAA, offset++);
            // Packet ID
            buffer.writeUInt8(packetId, offset++);
            // Payload size (little endian)
            buffer.writeUInt16LE(payloadSize, offset);
            offset += 2;
            // Payload
            payload.copy(buffer, offset);
            offset += payloadSize;

            // Checksum: XOR de todos los bytes anteriores
            let checksum = 0x00;
            for (let i = 0; i < offset; i++) {
                checksum ^= buffer[i];
            }

            buffer.writeUInt8(checksum, offset); // último byte

            // Enviar el paquete
            tcpClientSocket.write(buffer);
            console.log("📤 Paquete TCP enviado:", buffer);


        } else {
            console.warn("⚠️ socket no escribible.");
        }
    }
}

function clearTcpClient() {
    tcpClientSocket = null;
}

module.exports = {
    setTcpClient,
    sendToTcpClient,
    clearTcpClient
};
