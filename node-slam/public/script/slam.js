// Sidebar functionality
let sidebarCollapsed = false;

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleIcon = document.getElementById('toggle-icon');

    sidebarCollapsed = !sidebarCollapsed;

    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
        toggleIcon.textContent = '▶';
    } else {
        sidebar.classList.remove('collapsed');
        mainContent.classList.remove('expanded');
        toggleIcon.textContent = '◀';
    }
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('mobile-open');
}

// Navigation
function navigateTo(page) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to clicked item
    event.target.closest('.nav-item').classList.add('active');

    // Here you would implement the actual navigation logic
    switch (page) {
        case 'mapping':
            window.location.href = 'slam.html';
            break;
        case 'saved-maps':
            window.location.href = 'saved-maps.html';
            break;
    }
}

function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        window.location.href = '/index.html';
    }
}

// Canvas setup
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight - 60; // Account for header
    drawGrid();
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gridSize = 20;
    ctx.strokeStyle = 'rgba(0, 255, 150, 0.1)';
    ctx.lineWidth = 1;

    // Draw grid
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw center cross
    ctx.strokeStyle = 'rgba(0, 255, 150, 0.3)';
    ctx.lineWidth = 2;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();

    // Draw robot (for demo)
    drawRobot(centerX, centerY, 0);
}

function drawRobot(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Robot body
    ctx.fillStyle = '#00ff96';
    ctx.fillRect(-10, -10, 20, 20);

    // Robot direction indicator
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(5, -5);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// SLAM Control Functions
function startMapping() {
    document.getElementById('mapping-status').textContent = 'Mapeando...';
    document.getElementById('mapping-status').style.color = '#ffa502';

    // Simulate mapping process
    let quality = 0;
    const interval = setInterval(() => {
        quality += Math.random() * 10;
        if (quality > 100) quality = 100;

        document.getElementById('mapping-quality').textContent = Math.round(quality) + '%';
        document.getElementById('quality-progress').style.width = quality + '%';

        // Update other stats
        document.getElementById('loop-closures').textContent = Math.floor(Math.random() * 10);
        document.getElementById('landmarks').textContent = Math.floor(Math.random() * 100);
        document.getElementById('trajectory-length').textContent = Math.floor(Math.random() * 1000) + ' cm';

        if (quality >= 100) {
            clearInterval(interval);
            document.getElementById('mapping-status').textContent = 'Completado';
            document.getElementById('mapping-status').style.color = '#00ff96';
        }
    }, 500);
}

function stopMapping() {
    document.getElementById('mapping-status').textContent = 'Detenido';
    document.getElementById('mapping-status').style.color = '#ff4757';
}

function resetMap() {
    if (confirm('¿Estás seguro de que quieres resetear el mapa?')) {
        document.getElementById('mapping-quality').textContent = '0%';
        document.getElementById('quality-progress').style.width = '0%';
        document.getElementById('loop-closures').textContent = '0';
        document.getElementById('landmarks').textContent = '0';
        document.getElementById('trajectory-length').textContent = '0 cm';
        document.getElementById('point-count').textContent = '0';
        document.getElementById('mapping-status').textContent = 'Listo';
        document.getElementById('mapping-status').style.color = '#00ff96';
        drawGrid();
    }
}

function saveMap() {
    const mapName = prompt('Ingresa un nombre para el mapa:');
    if (mapName) {
        alert(`Mapa "${mapName}" guardado exitosamente!`);
    }
}

function loadMap() {
    alert('Cargando mapa guardado...');
}

// IMU Calibration Functions
function calibrateIMU(type) {
    alert(`Iniciando calibración del ${type.toUpperCase()}...\nMantenga el robot estático durante 10 segundos.`);

    // Simulate calibration process
    let countdown = 10;
    const interval = setInterval(() => {
        if (countdown > 0) {
            document.getElementById('imu-text').textContent = `Calibrando ${type} (${countdown}s)`;
            countdown--;
        } else {
            clearInterval(interval);
            document.getElementById('imu-text').textContent = 'Online';
            document.getElementById('imu-status').className = 'status-indicator status-online';
            alert(`Calibración del ${type.toUpperCase()} completada!`);
        }
    }, 1000);
}

// Simulate real-time data updates
function simulateIMUData() {
    // Simulate accelerometer data
    document.getElementById('imu-accel-x').textContent = (Math.random() * 2 - 1).toFixed(2);
    document.getElementById('imu-accel-y').textContent = (Math.random() * 2 - 1).toFixed(2);
    document.getElementById('imu-accel-z').textContent = (9.8 + Math.random() * 0.2 - 0.1).toFixed(2);

    // Simulate gyroscope data
    document.getElementById('imu-gyro-x').textContent = (Math.random() * 0.1 - 0.05).toFixed(3);
    document.getElementById('imu-gyro-y').textContent = (Math.random() * 0.1 - 0.05).toFixed(3);
    document.getElementById('imu-gyro-z').textContent = (Math.random() * 0.1 - 0.05).toFixed(3);

    // Simulate magnetometer data
    document.getElementById('imu-mag-x').textContent = (Math.random() * 100 - 50).toFixed(1);
    document.getElementById('imu-mag-y').textContent = (Math.random() * 100 - 50).toFixed(1);
    document.getElementById('imu-mag-z').textContent = (Math.random() * 100 - 50).toFixed(1);

    // Simulate azimuth and update compass
    const azimuth = Math.random() * 360;
    document.getElementById('imu-azimut').textContent = azimuth.toFixed(1) + '°';
    document.getElementById('compass-needle').style.transform =
        `translate(-50%, -100%) rotate(${azimuth}deg)`;

    // Update robot position
    const x = Math.floor(Math.random() * 200 - 100);
    const y = Math.floor(Math.random() * 200 - 100);
    const theta = Math.floor(Math.random() * 360);

    document.getElementById('robot-x').textContent = x;
    document.getElementById('robot-y').textContent = y;
    document.getElementById('robot-theta').textContent = theta + '°';

    // Update point count
    const currentPoints = parseInt(document.getElementById('point-count').textContent);
    document.getElementById('point-count').textContent = currentPoints + Math.floor(Math.random() * 10);

    // Update last update time
    const now = new Date();
    document.getElementById('last-update-display').textContent =
        `Última actualización: ${now.toLocaleTimeString()}`;
}

// Connection simulation
function simulateConnection() {
    setTimeout(() => {
        // WebSocket connection
        document.getElementById('websocket-status').className = 'status-indicator status-online';
        document.getElementById('websocket-text').textContent = 'Conectado';

        // IMU connection
        document.getElementById('imu-status').className = 'status-indicator status-online';
        document.getElementById('imu-text').textContent = 'Online';

        // LIDAR connection
        document.getElementById('lidar-status').className = 'status-indicator status-online';
        document.getElementById('lidar-text').textContent = 'Online';
    }, 2000);
}

// Canvas mouse interactions
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let mapOffset = { x: 0, y: 0 };
let zoomLevel = 1.0;

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStart.x = e.clientX - mapOffset.x;
    dragStart.y = e.clientY - mapOffset.y;
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        mapOffset.x = e.clientX - dragStart.x;
        mapOffset.y = e.clientY - dragStart.y;
        // Redraw with offset (simplified for demo)
        drawGrid();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoomLevel *= delta;
    zoomLevel = Math.max(0.5, Math.min(3.0, zoomLevel));
    document.getElementById('zoom-level').textContent = zoomLevel.toFixed(1) + 'x';
    drawGrid();
});

// Initialize everything
window.addEventListener('load', () => {
    resizeCanvas();

    const user = JSON.parse(getCookie());
    const title = document.getElementById('page-title');
    title.textContent = user ? `Buenos Dias, ${user.name}` : 'Bienvenido a OBBOT';

    // Start real-time data simulation
    // simulateConnection();
    // setInterval(simulateIMUData, 1000);
});

window.addEventListener('resize', resizeCanvas);

// Close mobile sidebar when clicking outside
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.querySelector('.mobile-menu-toggle');

    if (window.innerWidth <= 768 &&
        sidebar.classList.contains('mobile-open') &&
        !sidebar.contains(e.target) &&
        !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('mobile-open');
    }
});

const keyDown = {};

document.addEventListener('keydown', (e) => {
    if (keyDown[e.key]) return; // Evita repetir si ya está presionada
    keyDown[e.key] = true;
    console.log(`🔑 Tecla presionada: ${e.key}`);
    switch (e.key) {
        case 's':
            if (e.ctrlKey) {
                e.preventDefault();
                slam.saveMap();
            }
            break;
        case 'r':
            if (e.ctrlKey) {
                e.preventDefault();
                slam.resetMap();
            }
            break;
        case ' ':
            e.preventDefault();
            if (slam.isMapping) {
                slam.stopMapping();
            } else {
                slam.startMapping();
            }
            break;
        case 'Escape':
            slam.zoom = 1.0;
            slam.panX = 0;
            slam.panY = 0;
            const zoomEl = document.getElementById('zoom-level');
            if (zoomEl) zoomEl.textContent = '1.0x';
            break;
        case 't':
            slam.addTestLidarPoint();
            break;
        case 'd':
            slam.toggleDebug();
            break;
        case 'ArrowUp':
            slam.sendWebSocketCommand(0x01, 0x02);
            break;
        case 'ArrowDown':
            slam.sendWebSocketCommand(0x01, 0x01);
            break;
        case 'ArrowLeft':
            slam.sendWebSocketCommand(0x01, 0x03);
            break;
        case 'ArrowRight':
            slam.sendWebSocketCommand(0x01, 0x04);
            break;
        case 'p':
            slam.sendWebSocketCommand(0x01, 0x05);
            break;
    }
});

document.addEventListener('keyup', (e) => {
    keyDown[e.key] = false;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        slam.sendWebSocketCommand(0x01, 0x05); // STOP
    }
});

function getCookie() {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${"user"}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

console.log('🚀 SLAM System initialized with debug features');
console.log('📋 Debug commands:');
console.log('  - Press T to add test LIDAR point');
console.log('  - Press D to toggle debug mode');
console.log('  - Type addTestPoint() in console');
console.log('  - Type toggleDebug() in console');