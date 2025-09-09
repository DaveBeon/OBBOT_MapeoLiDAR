const WebSocket = require('ws');
const { HTTP_PORT } = require('../config/constants');
const { sendToTcpClient } = require('./tcpClientManager');

let wss;
const clients = new Set();

/**
 * Inicia el servidor WebSocket y gestiona nuevas conexiones.
 * @param {http.Server} server - El servidor HTTP/Express.
 */
function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('Nuevo cliente WebSocket conectado');
    clients.add(ws);

    ws.on('close', () => {
      console.log('Cliente WebSocket desconectado');
      clients.delete(ws);
    });

    ws.on('message', (message) => {
      try {
        const { type, command } = JSON.parse(message);
        const payload = Buffer.from([command]);
        sendToTcpClient(type, payload); // o string, según necesites
      } catch (e) {
        console.log(e);
        console.warn("Mensaje WebSocket no es JSON válido");
      }

    });
  });

  console.log(`WebSocket listo en ws://localhost:${HTTP_PORT}`);
}

/**
 * Envía un mensaje a todos los clientes WebSocket conectados.
 * @param {Object|string} data - Los datos que deseas enviar (JSON o string).
 */
function broadcast(data) {
  const message = typeof data === 'string' ? data : JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

module.exports = {
  initWebSocket,
  broadcast,
};
