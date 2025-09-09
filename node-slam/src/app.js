const express = require("express");
const http = require("http");
const path = require("path");
const { HTTP_PORT } = require("./config/constants");
const { startTcpServer } = require("./services/tcpServer");
const { initWebSocket } = require("./services/websocketServer");
const usersRoutes = require("./routes/users.routes");
const mapsRoutes = require("./routes/maps.routes");

const app = express();
const server = http.createServer(app);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de API
app.use("/api/user", usersRoutes);
app.use("/api/map", mapsRoutes);


// Iniciar servidores
startTcpServer();
initWebSocket(server);

server.listen(HTTP_PORT, () => {
  console.log(`HTTP server listening on http://localhost:${HTTP_PORT}`);
});
