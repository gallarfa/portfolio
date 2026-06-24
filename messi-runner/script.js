const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const startBtn = document.getElementById('start-btn');
const soundToggle = document.getElementById('sound-toggle');
const container = document.querySelector('.game-container');

// Audio Context y variables de sonido
let audioCtx = null;
let soundMuted = localStorage.getItem('messiSoundMuted') === 'true';

// Inicializar el icono de sonido al arrancar
soundToggle.textContent = soundMuted ? '🔇' : '🔊';

function playSound(type) {
    if (soundMuted) return;
    
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    switch (type) {
        case 'eat':
            // Sonido de Copa coleccionada (Chime de gol/premio)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // Do5
            osc.frequency.setValueAtTime(659.25, now + 0.08); // Mi5
            osc.frequency.setValueAtTime(783.99, now + 0.16); // Sol5
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
            
        case 'turn':
            // Sonido corto al cambiar de dirección
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(150, now + 0.04);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
            osc.start(now);
            osc.stop(now + 0.04);
            break;
            
        case 'lose':
            // Silbato de falta/tarjeta roja (Game Over)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
            gain.gain.linearRampToValueAtTime(0.02, now + 0.12);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.15);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.45);
            
            const vibrato = audioCtx.createOscillator();
            const vibratoGain = audioCtx.createGain();
            vibrato.frequency.value = 32; 
            vibratoGain.gain.value = 20; 
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);
            vibrato.start(now);
            vibrato.stop(now + 0.45);
            
            osc.start(now);
            osc.stop(now + 0.45);
            break;
    }
}

// Configuración de la cuadrícula
const gridSize = 20;
const tileCount = canvas.width / gridSize; // 20x20 casillas
let gameSpeed = 140; // velocidad de actualización en milisegundos

// Variables del juego
let snake = []; // snake[0] es la cabeza (Messi), los demás son compañeros
let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;
let foodX = 0;
let foodY = 0;
let score = 0;
let highScore = localStorage.getItem('messiCupHighScore') || 0;
let gameLoopId = null;
let gameActive = false;
let gamePaused = false;
let particles = [];
let shakeTime = 0;

// Lista de Compañeros de la Scaloneta (Cuerpo de la viborita)
const teammates = [
    { name: 'Dibu', hairColor: '#78350f', skinColor: '#ffd6ad', jerseyColor: '#10b981', goalie: true }, // Goalie green
    { name: 'De Paul', hairColor: '#d97706', skinColor: '#ffd6ad', jerseyColor: '#38bdf8' },
    { name: 'Di Maria', hairColor: '#1e293b', skinColor: '#ffd6ad', jerseyColor: '#38bdf8' },
    { name: 'Julian', hairColor: '#451a03', skinColor: '#ffd6ad', jerseyColor: '#38bdf8' },
    { name: 'Lautaro', hairColor: '#0f172a', skinColor: '#ffd6ad', jerseyColor: '#38bdf8' },
    { name: 'Enzo', hairColor: '#1e293b', skinColor: '#ffd6ad', jerseyColor: '#38bdf8' },
    { name: 'Mac Allister', hairColor: '#78350f', skinColor: '#ffd6ad', jerseyColor: '#38bdf8' },
    { name: 'Romero', hairColor: '#0f172a', skinColor: '#ffd6ad', jerseyColor: '#38bdf8' },
    { name: 'Otamendi', hairColor: '#1e293b', skinColor: '#ffd6ad', jerseyColor: '#38bdf8', beard: true },
    { name: 'Molina', hairColor: '#451a03', skinColor: '#ffd6ad', jerseyColor: '#38bdf8' }
];

highScoreElement.textContent = highScore;

// Partículas por comer copa (Confeti dorado)
class GoldConfetti {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 2 + Math.random() * 4;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5 - 1;
        this.color = Math.random() > 0.4 ? '#fbbf24' : '#ffffff';
        this.alpha = 1;
        this.life = 20 + Math.random() * 15;
        this.maxLife = this.life;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // caída de gravedad
        this.life--;
        this.alpha = Math.max(0, this.life / this.maxLife);
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.radius * 1.5, this.radius);
        ctx.restore();
    }
}

// Inicializar estado del juego
function initGame() {
    // Messi empieza en el centro
    snake = [
        { x: 10, y: 10 }, // Messi (Cabeza)
        { x: 9, y: 10 },  // Compañero 1 (Dibu)
        { x: 8, y: 10 }   // Compañero 2 (De Paul)
    ];
    
    // Dirección inicial (moviendo a la derecha)
    dx = 1;
    dy = 0;
    nextDx = 1;
    nextDy = 0;
    
    score = 0;
    scoreElement.textContent = score;
    gameSpeed = 140;
    particles = [];
    shakeTime = 0;
    gamePaused = false;
    
    placeFood();
}

// Iniciar Partida
function startGame() {
    if (gameActive) return;
    
    initGame();
    gameActive = true;
    overlay.classList.add('hidden');
    container.classList.add('game-active');
    
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    if (gameLoopId) clearTimeout(gameLoopId);
    gameLoop();
}

// Finalizar Partida (Game Over)
function gameOver() {
    gameActive = false;
    clearTimeout(gameLoopId);
    playSound('lose');
    
    shakeTime = 18;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('messiCupHighScore', highScore);
        highScoreElement.textContent = highScore;
        
        // Gran explosión de confeti en toda la pantalla por récord
        for (let i = 0; i < 70; i++) {
            particles.push(new GoldConfetti(
                canvas.width / 2 + (Math.random() - 0.5) * 200,
                canvas.height / 2 + (Math.random() - 0.5) * 100
            ));
        }
    }
    
    overlayTitle.textContent = "¡Tarjeta Roja! 🟥";
    overlayTitle.style.color = "var(--danger-color)";
    overlayDesc.textContent = `¡El equipo chocó! Lograste juntar ${score} Copas del Mundo y armar una Scaloneta de ${snake.length} jugadores.`;
    startBtn.textContent = "Volver a Jugar";
    
    overlay.classList.remove('hidden');
    container.classList.remove('game-active');
}

// Bucle del Juego (Snake tradicional con setInterval/setTimeout)
function gameLoop() {
    if (!gameActive) return;
    
    if (!gamePaused) {
        update();
        draw();
    }
    
    gameLoopId = setTimeout(gameLoop, gameSpeed);
}

// Cambiar Dirección
function changeDirection(dir) {
    if (!gameActive || gamePaused) return;
    
    switch (dir) {
        case 'up':
            if (dy === 0) {
                nextDx = 0;
                nextDy = -1;
                playSound('turn');
            }
            break;
        case 'down':
            if (dy === 0) {
                nextDx = 0;
                nextDy = 1;
                playSound('turn');
            }
            break;
        case 'left':
            if (dx === 0) {
                nextDx = -1;
                nextDy = 0;
                playSound('turn');
            }
            break;
        case 'right':
            if (dx === 0) {
                nextDx = 1;
                nextDy = 0;
                playSound('turn');
            }
            break;
    }
}

// Pausar/Reanudar
function togglePause() {
    if (!gameActive) return;
    gamePaused = !gamePaused;
    
    if (gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px "Space Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('JUEGO PAUSADO', canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = '10px "Space Mono"';
        ctx.fillText('Presiona "P" para Continuar', canvas.width / 2, canvas.height / 2 + 15);
    }
}

// Ubicar Copa del Mundo (Evitando que caiga sobre el equipo)
function placeFood() {
    foodX = Math.floor(Math.random() * tileCount);
    foodY = Math.floor(Math.random() * tileCount);
    
    for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === foodX && snake[i].y === foodY) {
            placeFood();
            return;
        }
    }
}

// Actualizar Físicas y Movimiento
function update() {
    // Confirmar dirección del siguiente tick (evita doble pulsación rápida)
    dx = nextDx;
    dy = nextDy;
    
    // Calcular nueva posición de la cabeza de Messi
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Colisión con paredes
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
    }
    
    // Colisión consigo mismo (teammates)
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }
    
    // Añadir cabeza nueva al inicio de la serpiente
    snake.unshift(head);
    
    // Comer Copa del Mundo
    if (head.x === foodX && head.y === foodY) {
        score++;
        scoreElement.textContent = score;
        playSound('eat');
        
        // Crear partículas doradas de festejo
        const px = foodX * gridSize + gridSize / 2;
        const py = foodY * gridSize + gridSize / 2;
        for (let i = 0; i < 15; i++) {
            particles.push(new GoldConfetti(px, py));
        }
        
        // Incrementar velocidad gradualmente
        gameSpeed = Math.max(75, 140 - score * 2.5);
        
        placeFood();
    } else {
        // Remover cola para mantener el tamaño constante si no come
        snake.pop();
    }
    
    // Actualizar partículas
    particles.forEach((p, index) => {
        p.update();
        if (p.life <= 0) particles.splice(index, 1);
    });
    
    if (shakeTime > 0) shakeTime--;
}

// Dibujar Escenario y Personajes
function draw() {
    ctx.save();
    
    if (shakeTime > 0) {
        const sx = (Math.random() - 0.5) * 6;
        const sy = (Math.random() - 0.5) * 6;
        ctx.translate(sx, sy);
    }
    
    // 1. Limpiar pantalla con el color del campo
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Dibujar césped de fútbol en damero (cuadrículas claras y oscuras)
    for (let y = 0; y < tileCount; y++) {
        for (let x = 0; x < tileCount; x++) {
            if ((x + y) % 2 === 0) {
                ctx.fillStyle = '#059669'; // Verde oscuro
            } else {
                ctx.fillStyle = '#10b981'; // Verde claro
            }
            ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
        }
    }
    
    // 3. Dibujar líneas blancas de cal de la cancha de fútbol (Estética premium)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(gridSize, gridSize, canvas.width - gridSize * 2, canvas.height - gridSize * 2);
    // Círculo central de la cancha
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, gridSize * 3, 0, Math.PI * 2);
    ctx.stroke();
    // Línea de medio campo
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    
    // 4. Dibujar Copa del Mundo (Comida) con brillo dorado neón
    const fx = foodX * gridSize;
    const fy = foodY * gridSize;
    
    ctx.save();
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 8;
    
    ctx.fillStyle = '#fbbf24'; // Copa de oro
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    
    // Copa forma simplificada
    ctx.beginPath();
    // Base de copa
    ctx.fillRect(fx + 4, fy + 16, 12, 3);
    ctx.strokeRect(fx + 4, fy + 16, 12, 3);
    // Tallo
    ctx.fillRect(fx + 8, fy + 9, 4, 7);
    ctx.strokeRect(fx + 8, fy + 9, 4, 7);
    // Globo de arriba
    ctx.beginPath();
    ctx.arc(fx + 10, fy + 7, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
    
    // 5. Dibujar Partículas
    particles.forEach(p => p.draw());
    
    // 6. Dibujar a la Scaloneta (Viborita de jugadores)
    for (let i = 0; i < snake.length; i++) {
        const x = snake[i].x * gridSize;
        const y = snake[i].y * gridSize;
        
        ctx.save();
        
        if (i === 0) {
            // ---- CABEZA: MESSI (DANIEL EL TRAVIESO STYLE) ----
            // Cuello camiseta Argentina
            ctx.fillStyle = '#38bdf8'; // Celeste
            ctx.fillRect(x + 4, y + 14, 12, 5);
            ctx.fillStyle = '#ffffff'; // Tira blanca cuello
            ctx.fillRect(x + 9, y + 14, 2, 5);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 4, y + 14, 12, 5);
            
            // Rostro redondo
            ctx.fillStyle = '#ffd6ad'; // Piel
            ctx.beginPath();
            ctx.arc(x + 10, xOffsetDirection(y, dy) + 10, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Pelo Rubio Despeinado (Daniel el travieso)
            ctx.fillStyle = '#fbbf24'; // Rubio
            ctx.beginPath();
            ctx.arc(x + 10, y + 7, 7.5, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Spikes (Pelo parado)
            ctx.beginPath();
            ctx.moveTo(x + 3, y + 7);
            ctx.lineTo(x + 1, y + 2);
            ctx.lineTo(x + 7, y + 6);
            ctx.lineTo(x + 10, y + 1); // spike central
            ctx.lineTo(x + 13, y + 6);
            ctx.lineTo(x + 18, y + 2);
            ctx.lineTo(x + 17, y + 7);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Ojos
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(x + 8, y + 10, 1, 0, Math.PI * 2);
            ctx.arc(x + 12, y + 10, 1, 0, Math.PI * 2);
            ctx.fill();
            
            // Sonrisa pícara
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(x + 10, y + 12, 2.5, 0.1, Math.PI - 0.1);
            ctx.stroke();
            
        } else {
            // ---- CUERPO: COMPAÑEROS DE LA SELECCIÓN ----
            const companion = teammates[(i - 1) % teammates.length];
            
            // Cuello de camiseta (Dibu de verde, otros de Argentina celeste/blanco)
            ctx.fillStyle = companion.jerseyColor;
            ctx.fillRect(x + 4, y + 14, 12, 5);
            if (!companion.goalie) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x + 9, y + 14, 2, 5);
            }
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 4, y + 14, 12, 5);
            
            // Rostro
            ctx.fillStyle = companion.skinColor;
            ctx.beginPath();
            ctx.arc(x + 10, y + 10, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Pelo del compañero
            ctx.fillStyle = companion.hairColor;
            ctx.beginPath();
            ctx.arc(x + 10, y + 7, 7, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Barba si es Otamendi
            if (companion.beard) {
                ctx.strokeStyle = companion.hairColor;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(x + 10, y + 10.5, 6, 0.2, Math.PI - 0.2);
                ctx.stroke();
            }
            
            // Ojos sencillos
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(x + 8, y + 9.5, 0.8, 0, Math.PI * 2);
            ctx.arc(x + 12, y + 9.5, 0.8, 0, Math.PI * 2);
            ctx.fill();
            
            // Sonrisa alegre
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x + 10, y + 11.5, 2, 0.1, Math.PI - 0.1);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// Función auxiliar para oscilar suavemente en Y según dirección (sin uso especial)
function xOffsetDirection(val, d) {
    return val;
}

// Manejar teclas
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP') {
        togglePause();
        return;
    }
    
    if (!gameActive || gamePaused) return;
    
    // Evitar scroll con las flechas
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
    
    const key = e.key;
    
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        changeDirection('up');
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        changeDirection('down');
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        changeDirection('left');
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        changeDirection('right');
    }
});

// Registrar eventos táctiles (D-Pad circular de la viborita)
const bindMobileBtn = (id, direction) => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            el.classList.add('pressed');
            changeDirection(direction);
        }, { passive: false });
        
        el.addEventListener('touchend', (e) => {
            e.preventDefault();
            el.classList.remove('pressed');
        }, { passive: false });
        
        // Soporte mouse
        el.addEventListener('mousedown', (e) => {
            el.classList.add('pressed');
            changeDirection(direction);
        });
        
        el.addEventListener('mouseup', () => {
            el.classList.remove('pressed');
        });
        
        el.addEventListener('mouseleave', () => {
            el.classList.remove('pressed');
        });
    }
};

bindMobileBtn('ctrl-up', 'up');
bindMobileBtn('ctrl-down', 'down');
bindMobileBtn('ctrl-left', 'left');
bindMobileBtn('ctrl-right', 'right');

// Event Listeners generales
startBtn.addEventListener('click', startGame);

soundToggle.addEventListener('click', () => {
    soundMuted = !soundMuted;
    localStorage.setItem('messiSoundMuted', soundMuted);
    soundToggle.textContent = soundMuted ? '🔇' : '🔊';
    soundToggle.blur();
});

// Soporte gestos deslizar (Swipe) sobre el canvas
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
    if (!gameActive || gamePaused) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    if (Math.abs(diffX) < 25 && Math.abs(diffY) < 25) return; // Ignorar toques accidentales
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) {
            changeDirection('right');
        } else {
            changeDirection('left');
        }
    } else {
        if (diffY > 0) {
            changeDirection('down');
        } else {
            changeDirection('up');
        }
    }
}, { passive: true });

// Dibujar estado inicial estático
initGame();
draw();
