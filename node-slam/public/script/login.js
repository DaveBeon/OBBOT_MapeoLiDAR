document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        const btn = document.querySelector('.login-btn');
        btn.textContent = 'Conectando...';
        btn.style.background = 'linear-gradient(135deg, #ffa500, #ff6b35)';
        const isLoggedIn = await login(username, password);
        if (isLoggedIn) {
            btn.textContent = 'Acceso Concedido ✓';
            btn.style.background = 'linear-gradient(135deg, #00ff96, #00ff96)';
            setTimeout(() => {
                window.location.href = '/slam.html';
            }, 1500);
        } else {
            alert('Usuario o contraseña incorrectos');
        }
    }
});

function showForgotPassword() {
    alert('Contacta al administrador del sistema para recuperar tu contraseña.\nEmail: admin@obbot.com');
}

const statusTexts = ['LiDAR Online', 'Sensors Active', 'SLAM Ready', 'Mapping Mode'];
let currentIndex = 0;

setInterval(() => {
    const statusElement = document.querySelector('.status span');
    statusElement.style.opacity = '0';

    setTimeout(() => {
        currentIndex = (currentIndex + 1) % statusTexts.length;
        statusElement.textContent = statusTexts[currentIndex];
        statusElement.style.opacity = '1';
    }, 300);
}, 3000);

function createParticle() {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = '2px';
    particle.style.height = '2px';
    particle.style.background = 'rgba(0, 255, 150, 0.6)';
    particle.style.borderRadius = '50%';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = '100%';
    particle.style.zIndex = '2';
    particle.style.pointerEvents = 'none';

    document.querySelector('.bg-animation').appendChild(particle);

    const animation = particle.animate([
        { transform: 'translateY(0px)', opacity: 1 },
        { transform: 'translateY(-100vh)', opacity: 0 }
    ], {
        duration: Math.random() * 3000 + 2000,
        easing: 'linear'
    });

    animation.onfinish = () => particle.remove();
}

async function login(username, password) {
    const response = await fetch('/api/user/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        const user = await response.json();
        document.cookie = `user=${JSON.stringify(user)}; expires=${new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toUTCString()}; path=/`;
        return true;
    }

    return false;
}


setInterval(createParticle, 500);