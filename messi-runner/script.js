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

// Función para sintetizar sonidos retro con Web Audio API
function playSound(type) {
    if (soundMuted) return;
    
    // Crear el contexto de audio si no se ha inicializado
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Si el contexto está suspendido (política del navegador), lo activamos
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    switch (type) {
        case 'jump':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
            break;
            
        case 'slide':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.linearRampToValueAtTime(40, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
            
        case 'milestone':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now); // Re5
            osc.frequency.setValueAtTime(880, now + 0.08); // La5
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
            break;
            
        case 'lose':
            // Sonido de silbato del árbitro (PFE-PFE!)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(850, now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
            gain.gain.linearRampToValueAtTime(0.02, now + 0.12);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.15);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
            
            // Vibrato rápido para el efecto de silbato
            const vibrato = audioCtx.createOscillator();
            const vibratoGain = audioCtx.createGain();
            vibrato.frequency.value = 35; // Frecuencia del trino
            vibratoGain.gain.value = 25; // Profundidad de vibrato en Hz
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);
            vibrato.start(now);
            vibrato.stop(now + 0.4);
            
            osc.start(now);
            osc.stop(now + 0.4);
            break;
    }
}

// Configuración de dimensiones y físicas
const groundY = 220;
let speed = 6;
const baseSpeed = 6;
const maxSpeed = 13;
const speedStep = 0.0003;
let gameFrame = 0;
let score = 0;
let highScore = localStorage.getItem('messiHighScore') || 0;
let gameActive = false;

highScoreElement.textContent = `${highScore}m`;

// Variables de juego
let messi;
let obstacles = [];
let particles = [];
let clouds = [];
let animationId;
let shakeTime = 0;
let nextObstacleTimer = 0;

// Configuración de Nubes de Fondo
class Cloud {
    constructor() {
        this.x = canvas.width + Math.random() * 200;
        this.y = 30 + Math.random() * 70;
        this.size = 30 + Math.random() * 30;
        this.speed = 0.5 + Math.random() * 0.8;
    }
    update() {
        this.x -= this.speed;
    }
    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 0.6, this.y - this.size * 0.2, this.size * 0.8, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 1.2, this.y, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Configuración de Partículas (Polvo al correr / Pasto / Confeti)
class Particle {
    constructor(x, y, color, type = 'dust') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.radius = type === 'confetti' ? 2 + Math.random() * 4 : 1 + Math.random() * 3;
        this.vx = type === 'confetti' ? (Math.random() - 0.5) * 6 : -speed * 0.4 + (Math.random() - 0.5) * 2;
        this.vy = type === 'confetti' ? -Math.random() * 8 : (Math.random() - 0.8) * 3;
        this.alpha = 1;
        this.life = type === 'confetti' ? 80 + Math.random() * 40 : 25 + Math.random() * 15;
        this.maxLife = this.life;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.type === 'confetti') {
            this.vy += 0.2; // Gravedad para el confeti
        }
        this.life--;
        this.alpha = Math.max(0, this.life / this.maxLife);
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        if (this.type === 'confetti') {
            // Dibujar rectángulos de colores para confeti
            ctx.fillRect(this.x, this.y, this.radius * 1.5, this.radius);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// Configuración del personaje Messi (Estilo Daniel el Travieso)
class Messi {
    constructor() {
        this.x = 80;
        this.y = groundY;
        this.width = 46;
        this.height = 72;
        this.vy = 0;
        this.gravity = 0.65;
        this.jumpForce = -13.5;
        this.jumping = false;
        this.ducking = false;
        
        // Pelota de fútbol
        this.ball = {
            rotation: 0,
            yOffset: 0,
            radius: 8.5
        };
    }
    
    jump() {
        if (!this.jumping && !this.ducking) {
            this.vy = this.jumpForce;
            this.jumping = true;
            playSound('jump');
            
            // Generar partículas de pasto en el salto
            for(let i=0; i<8; i++) {
                particles.push(new Particle(this.x + 20, groundY + 70, '#4ade80', 'grass'));
            }
        }
    }
    
    duck(isDucking) {
        if (this.jumping) return;
        
        if (isDucking && !this.ducking) {
            this.ducking = true;
            this.height = 42; // Hitbox más baja
            playSound('slide');
        } else if (!isDucking && this.ducking) {
            this.ducking = false;
            this.height = 72; // Restaurar hitbox
        }
    }
    
    update() {
        // Gravedad
        if (this.jumping) {
            this.vy += this.gravity;
            this.y += this.vy;
            
            // Colisión con el suelo
            if (this.y >= groundY) {
                this.y = groundY;
                this.vy = 0;
                this.jumping = false;
            }
        }
        
        // Actualizar la pelota
        this.ball.rotation += speed * 0.06;
        if (this.jumping) {
            // La pelota sube junto con Messi
            this.ball.yOffset = 48;
        } else if (this.ducking) {
            // Pelota bajo el pecho
            this.ball.yOffset = 28;
            this.ball.rotation += speed * 0.02; // Gira menos
        } else {
            // Bote rítmico mientras corre
            this.ball.yOffset = 56 + Math.sin(gameFrame * 0.2) * 3;
        }
        
        // Polvo al correr en el suelo
        if (!this.jumping && !this.ducking && gameFrame % 3 === 0) {
            particles.push(new Particle(this.x + 5, groundY + 68, 'rgba(255, 255, 255, 0.15)'));
        }
        // Chispas/pasto al barrerse
        if (this.ducking && gameFrame % 2 === 0) {
            particles.push(new Particle(this.x + 10 + Math.random()*20, groundY + 68, '#4ade80', 'grass'));
            particles.push(new Particle(this.x + 10 + Math.random()*20, groundY + 68, '#fbbf24', 'grass'));
        }
    }
    
    draw() {
        const bounce = (!this.jumping && !this.ducking) ? Math.sin(gameFrame * 0.2) * 2 : 0;
        
        const bodyX = this.x;
        const bodyY = this.y + bounce;
        
        ctx.save();
        
        if (this.ducking) {
            // ---- DIBUJAR A MESSI DESLIZÁNDOSE / AGACHADO ----
            // Cuerpo inclinado hacia adelante
            ctx.translate(bodyX + 23, bodyY + 42);
            ctx.rotate(0.25);
            ctx.translate(-(bodyX + 23), -(bodyY + 42));
            
            // Camiseta Argentina estirada (deslizándose)
            ctx.fillStyle = '#38bdf8'; // Celeste
            ctx.beginPath();
            ctx.roundRect(bodyX + 2, bodyY + 12, 40, 20, 4);
            ctx.fill();
            // Rayas blancas
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(bodyX + 12, bodyY + 12, 6, 20);
            ctx.fillRect(bodyX + 24, bodyY + 12, 6, 20);
            // Bordes negros
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(bodyX + 2, bodyY + 12, 40, 20, 4);
            ctx.stroke();
            
            // Pantaloncito negro
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.roundRect(bodyX - 6, bodyY + 18, 12, 14, 2);
            ctx.fill();
            ctx.stroke();
            
            // Piernas estiradas deslizando
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            // Pierna estirada
            ctx.beginPath();
            ctx.moveTo(bodyX + 2, bodyY + 22);
            ctx.lineTo(bodyX - 18, bodyY + 26);
            ctx.stroke();
            // Botita dorada
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(bodyX - 18, bodyY + 26, 4.5, 0, Math.PI*2);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Cabeza agachada adelante
            const headX = bodyX + 38;
            const headY = bodyY + 6;
            
            // Rostro Daniel el Travieso agachado
            ctx.fillStyle = '#ffd6ad';
            ctx.beginPath();
            ctx.arc(headX, headY, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            
            // Pelo Rubio Travieso
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(headX - 3, headY - 8, 9, Math.PI, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            // Mechón rubio despeinado
            ctx.beginPath();
            ctx.moveTo(headX - 10, headY - 10);
            ctx.lineTo(headX - 18, headY - 14);
            ctx.lineTo(headX - 6, headY - 6);
            ctx.fill();
            ctx.stroke();
            
            // Ojos divertidos
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(headX + 5, headY - 1, 2, 0, Math.PI*2);
            ctx.fill();
            
            // Sonrisa pícara
            ctx.beginPath();
            ctx.arc(headX + 7, headY + 4, 3, 0, Math.PI);
            ctx.stroke();
            
        } else {
            // ---- DIBUJAR A MESSI CORRIENDO / JUMPING (ESTILO DANIEL EL TRAVIESO) ----
            
            // 1. PIERNAS EN ANIMACIÓN DE CARRERA
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            
            let legPhase = gameFrame * 0.18;
            if (this.jumping) legPhase = 1.5; // Piernas encogidas en el aire
            
            const leftLegY = bodyY + 54 + (this.jumping ? -8 : Math.sin(legPhase) * 10);
            const leftLegX = bodyX + 15 + (this.jumping ? -4 : Math.cos(legPhase) * 12);
            
            const rightLegY = bodyY + 54 + (this.jumping ? -8 : Math.sin(legPhase + Math.PI) * 10);
            const rightLegX = bodyX + 25 + (this.jumping ? 4 : Math.cos(legPhase + Math.PI) * 12);
            
            // Pierna Izquierda (Atrás)
            ctx.beginPath();
            ctx.moveTo(bodyX + 15, bodyY + 45);
            ctx.lineTo(leftLegX, leftLegY);
            ctx.stroke();
            // Zapatilla Dorada
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(leftLegX, leftLegY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Pierna Derecha (Adelante)
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(bodyX + 27, bodyY + 45);
            ctx.lineTo(rightLegX, rightLegY);
            ctx.stroke();
            // Zapatilla Dorada
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(rightLegX, rightLegY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // 2. CUERPO (Camiseta de Argentina con rayas verticales)
            ctx.fillStyle = '#38bdf8'; // Celeste base
            ctx.beginPath();
            ctx.roundRect(bodyX + 10, bodyY + 20, 24, 28, 4);
            ctx.fill();
            
            // Rayas blancas verticales de la camiseta
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(bodyX + 16, bodyY + 20, 4, 28);
            ctx.fillRect(bodyX + 24, bodyY + 20, 4, 28);
            
            // Contorno de la camiseta
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(bodyX + 10, bodyY + 20, 24, 28, 4);
            ctx.stroke();
            
            // Detalle del número 10 dorado (pequeño en el pecho)
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 7px "Space Mono"';
            ctx.fillText('10', bodyX + 19, bodyY + 36);
            
            // Pantaloncito Negro
            ctx.fillStyle = '#000000';
            ctx.fillRect(bodyX + 10, bodyY + 43, 24, 6);
            ctx.strokeRect(bodyX + 10, bodyY + 43, 24, 6);
            
            // Brazo balanceándose
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4.5;
            const armAngle = this.jumping ? -0.8 : Math.sin(legPhase + Math.PI) * 0.8;
            const handX = bodyX + 8 + Math.sin(armAngle) * 16;
            const handY = bodyY + 32 + Math.cos(armAngle) * 12;
            ctx.beginPath();
            ctx.moveTo(bodyX + 16, bodyY + 24);
            ctx.lineTo(handX, handY);
            ctx.stroke();
            // Manito piel
            ctx.fillStyle = '#ffd6ad';
            ctx.beginPath();
            ctx.arc(handX, handY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // 3. CABEZA (Daniel el Travieso style)
            const headX = bodyX + 22;
            const headY = bodyY + 8;
            
            // Pelo rubio despeinado y puntiagudo de Daniel el Travieso
            ctx.fillStyle = '#fbbf24'; // Rubio
            ctx.beginPath();
            // Base del pelo redondo arriba
            ctx.arc(headX, headY - 1, 14, Math.PI, Math.PI*2);
            ctx.fill();
            
            // Spikes / Puntas de pelo de Daniel
            ctx.beginPath();
            ctx.moveTo(headX - 13, headY - 3);
            ctx.lineTo(headX - 17, headY - 10);
            ctx.lineTo(headX - 9, headY - 10);
            ctx.lineTo(headX - 11, headY - 19); // Spike principal izquierdo
            ctx.lineTo(headX - 3, headY - 13);
            ctx.lineTo(headX, headY - 21); // Spike central
            ctx.lineTo(headX + 4, headY - 13);
            ctx.lineTo(headX + 10, headY - 18); // Spike derecho
            ctx.lineTo(headX + 9, headY - 8);
            ctx.lineTo(headX + 14, headY - 9);
            ctx.lineTo(headX + 12, headY - 2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            
            // Cara redonda
            ctx.fillStyle = '#ffd6ad';
            ctx.beginPath();
            ctx.arc(headX, headY + 1, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Pelo rubio patillas y flequillo
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(headX - 9, headY - 3, 3, 0, Math.PI*2);
            ctx.arc(headX + 9, headY - 3, 3, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Ojos picarones y redondos grandes
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(headX - 4, headY - 1, 2, 0, Math.PI * 2);
            ctx.arc(headX + 4, headY - 1, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Sonrisa traviesa con lengua o mueca al costado
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(headX, headY + 4, 4, 0.1, Math.PI - 0.1);
            ctx.stroke();
        }
        
        ctx.restore();
        
        // 4. DIBUJAR PELOTA DE FÚTBOL GIRATORIA
        const ballX = this.x + 40;
        const ballY = this.y + this.ball.yOffset;
        const radius = this.ball.radius;
        
        ctx.save();
        ctx.translate(ballX, ballY);
        ctx.rotate(this.ball.rotation);
        
        // Circulo base blanco
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Gajos negros tradicionales de pelota
        ctx.fillStyle = '#000000';
        // Centro
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Líneas radiales hacia afuera para simular hexágonos
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        for (let angle = 0; angle < Math.PI * 2; angle += (Math.PI * 2 / 5)) {
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * (radius * 0.3), Math.sin(angle) * (radius * 0.3));
            ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            ctx.stroke();
        }
        ctx.restore();
    }
}

// Configuración de los Obstáculos (Rivales y Tarjetas)
class Obstacle {
    constructor(type) {
        this.type = type; // 'slide', 'stand', 'card'
        this.x = canvas.width + 50;
        
        if (type === 'slide') {
            // Rival barriéndose (Defensor vestido de rojo/blanco)
            this.width = 65;
            this.height = 42;
            this.y = groundY + 28;
            this.jersey = '#dc2626'; // Rojo rival
        } else if (type === 'stand') {
            // Rival de pie interponiéndose
            this.width = 44;
            this.height = 70;
            this.y = groundY;
            this.jersey = '#1e3a8a'; // Azul oscuro rival
        } else if (type === 'card') {
            // Tarjeta del árbitro volando a la altura de la cabeza
            this.width = 16;
            this.height = 24;
            this.y = groundY - 26; // Altura aérea
            this.cardColor = Math.random() > 0.5 ? '#ef4444' : '#fbbf24'; // Roja o Amarilla
        }
    }
    
    update() {
        this.x -= speed;
    }
    
    draw() {
        ctx.save();
        
        if (this.type === 'slide') {
            // DIBUJAR DEFENSOR HACIENDO BARRIDA DESLIZANTE
            const rivalX = this.x;
            const rivalY = this.y;
            
            // Cuerpo deslizado
            ctx.fillStyle = this.jersey;
            ctx.beginPath();
            ctx.roundRect(rivalX, rivalY + 12, 55, 18, 4);
            ctx.fill();
            // Contorno
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(rivalX, rivalY + 12, 55, 18);
            
            // Pantalones blancos
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(rivalX + 42, rivalY + 12, 10, 18);
            ctx.strokeRect(rivalX + 42, rivalY + 12, 10, 18);
            
            // Piernas de barrida estiradas hacia adelante (izquierda de la pantalla)
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(rivalX, rivalY + 22);
            ctx.lineTo(rivalX - 15, rivalY + 26);
            ctx.stroke();
            
            // Botín rival
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(rivalX - 15, rivalY + 26, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Cabeza del defensor barriéndose (caída atrás)
            const headX = rivalX + 48;
            const headY = rivalY + 4;
            ctx.fillStyle = '#e0a96d';
            ctx.beginPath();
            ctx.arc(headX, headY, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            // Pelo marrón
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(headX + 2, headY - 5, 8, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
        } else if (this.type === 'stand') {
            // DIBUJAR DEFENSOR RIVAL DE PIE
            const rivalX = this.x;
            const rivalY = this.y;
            const bounce = Math.sin(gameFrame * 0.15 + Math.PI) * 2;
            
            // Piernas corriendo
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            let legPhase = gameFrame * 0.18 + Math.PI;
            ctx.beginPath();
            ctx.moveTo(rivalX + 15, rivalY + 45);
            ctx.lineTo(rivalX + 10 + Math.cos(legPhase)*8, rivalY + 54 + Math.sin(legPhase)*8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rivalX + 25, rivalY + 45);
            ctx.lineTo(rivalX + 30 + Math.cos(legPhase + Math.PI)*8, rivalY + 54 + Math.sin(legPhase + Math.PI)*8);
            ctx.stroke();
            
            // Cuerpo camiseta roja
            ctx.fillStyle = this.jersey;
            ctx.beginPath();
            ctx.roundRect(rivalX + 8, rivalY + 18 + bounce, 24, 28, 4);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(rivalX + 8, rivalY + 18 + bounce, 24, 28);
            
            // Pantalón blanco
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(rivalX + 8, rivalY + 41 + bounce, 24, 6);
            ctx.strokeRect(rivalX + 8, rivalY + 41 + bounce, 24, 6);
            
            // Cabeza
            const headX = rivalX + 20;
            const headY = rivalY + 8 + bounce;
            ctx.fillStyle = '#c68a4c';
            ctx.beginPath();
            ctx.arc(headX, headY, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Cabello
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(headX, headY - 4, 9, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Expresión de enfado del defensor
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(headX - 6, headY - 4); // Ceja enojada
            ctx.lineTo(headX - 2, headY - 2);
            ctx.moveTo(headX + 6, headY - 4);
            ctx.lineTo(headX + 2, headY - 2);
            ctx.stroke();
            
        } else if (this.type === 'card') {
            // DIBUJAR TARJETA FLOTANTE DE ÁRBITRO
            ctx.fillStyle = this.cardColor;
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, 3);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Detalle en el centro (silueta de silbato o número)
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(this.x + 3, this.y + 4, this.width - 6, this.height - 8);
        }
        
        ctx.restore();
        
        // Dibujar hitboxes de ayuda en desarrollo (opcional)
        // ctx.strokeStyle = 'red';
        // ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// Inicializar Juego
function initGame() {
    messi = new Messi();
    obstacles = [];
    particles = [];
    clouds = [];
    speed = baseSpeed;
    gameFrame = 0;
    score = 0;
    nextObstacleTimer = 50;
    scoreElement.textContent = '0m';
    
    // Generar nubes iniciales
    for (let i = 0; i < 4; i++) {
        const cloud = new Cloud();
        cloud.x = Math.random() * canvas.width;
        clouds.push(cloud);
    }
}

// Iniciar/Reiniciar carrera
function startGame() {
    if (gameActive) return;
    
    initGame();
    gameActive = true;
    overlay.classList.add('hidden');
    container.classList.add('game-active');
    
    // Asegurar que el contexto de audio esté corriendo
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
}

// Finalizar Carrera (Game Over)
function gameOver() {
    gameActive = false;
    cancelAnimationFrame(animationId);
    playSound('lose');
    
    // Temblor de pantalla (Screen Shake)
    shakeTime = 20;
    
    // Récord
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('messiHighScore', highScore);
        highScoreElement.textContent = `${highScore}m`;
        
        // Confeti por nuevo récord
        for(let i=0; i<60; i++) {
            particles.push(new Particle(
                canvas.width / 2 + (Math.random() - 0.5) * 200,
                canvas.height / 3 + (Math.random() - 0.5) * 100,
                `hsl(${Math.random() * 360}, 90%, 60%)`,
                'confetti'
            ));
        }
        playSound('milestone');
    }
    
    overlayTitle.textContent = "¡Árbitro Pita Fin!";
    overlayTitle.style.color = "var(--danger-color)";
    overlayDesc.textContent = `¡Te interceptaron! Dribblaste con éxito una distancia de ${score} metros antes de que te quitaran el balón.`;
    startBtn.textContent = "Volver a Intentar";
    
    overlay.classList.remove('hidden');
    container.classList.remove('game-active');
}

// Bucle principal
function gameLoop() {
    if (!gameActive) return;
    
    update();
    draw();
    
    animationId = requestAnimationFrame(gameLoop);
}

// Actualizar estados
function update() {
    gameFrame++;
    
    // Aumento de velocidad progresiva
    if (speed < maxSpeed) {
        speed += speedStep;
    }
    
    // Actualizar puntaje (un metro cada 8 frames)
    if (gameFrame % 8 === 0) {
        score++;
        scoreElement.textContent = `${score}m`;
        
        // Pitar silbato cada 100 metros como logro
        if (score > 0 && score % 100 === 0) {
            playSound('milestone');
        }
    }
    
    // Messi
    messi.update();
    
    // Generar Nubes
    if (gameFrame % 140 === 0) {
        clouds.push(new Cloud());
    }
    clouds.forEach((cloud, index) => {
        cloud.update();
        if (cloud.x < -100) clouds.splice(index, 1);
    });
    
    // Generar Obstáculos dinámicamente con tiempos aleatorios decrecientes por velocidad
    nextObstacleTimer--;
    if (nextObstacleTimer <= 0) {
        const types = ['slide', 'stand', 'card'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        obstacles.push(new Obstacle(randomType));
        // Intervalo entre obstáculos depende de la velocidad actual
        nextObstacleTimer = 65 + Math.random() * 80 - (speed * 3);
    }
    
    // Actualizar y colisionar obstáculos
    obstacles.forEach((obs, index) => {
        obs.update();
        
        // Eliminar si sale de pantalla
        if (obs.x < -100) {
            obstacles.splice(index, 1);
            return;
        }
        
        // Detección de colisiones (AABB Box overlap)
        // Reducimos un poco los márgenes para tener colisiones perfectas y justas
        const toleranceX = 8;
        const toleranceY = 6;
        
        if (
            messi.x + toleranceX < obs.x + obs.width &&
            messi.x + messi.width - toleranceX > obs.x &&
            messi.y + toleranceY < obs.y + obs.height &&
            messi.y + messi.height - toleranceY > obs.y
        ) {
            gameOver();
        }
    });
    
    // Partículas
    particles.forEach((part, index) => {
        part.update();
        if (part.life <= 0) particles.splice(index, 1);
    });
    
    // Efecto de sacudida
    if (shakeTime > 0) shakeTime--;
}

// Dibujar pantalla
function draw() {
    ctx.save();
    
    // Manejar sacudida de pantalla
    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * 8;
        const dy = (Math.random() - 0.5) * 8;
        ctx.translate(dx, dy);
    }
    
    // 1. Limpiar pantalla con azul nocturno
    ctx.fillStyle = varColor('--canvas-bg', '#020617');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Dibujar Estadio / Siluetas de reflectores en el fondo
    drawStadiumBackground();
    
    // 3. Dibujar Nubes
    clouds.forEach(cloud => cloud.draw());
    
    // 4. Dibujar el Suelo (Línea de pasto y tierra)
    drawGround();
    
    // 5. Dibujar Partículas
    particles.forEach(part => part.draw());
    
    // 6. Dibujar Obstáculos
    obstacles.forEach(obs => obs.draw());
    
    // 7. Dibujar Messi
    messi.draw();
    
    ctx.restore();
}

// Auxiliar para obtener colores CSS variables
function varColor(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// Dibujar fondo de estadio
function drawStadiumBackground() {
    // Degradado del cielo en el fondo
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY + 50);
    skyGrad.addColorStop(0, '#020617');
    skyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, groundY + 50);
    
    // Dibujar reflectores del estadio distantes
    ctx.fillStyle = 'rgba(30, 41, 59, 0.2)';
    
    // Torretas reflectoras 1 (Izquierda)
    ctx.fillRect(100, 30, 8, groundY - 30);
    ctx.fillRect(92, 20, 24, 10);
    // Luces encendidas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.arc(104, 25, 18, 0, Math.PI, true);
    ctx.fill();
    
    // Torreta reflectoras 2 (Derecha)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.2)';
    ctx.fillRect(700, 30, 8, groundY - 30);
    ctx.fillRect(692, 20, 24, 10);
    // Luces encendidas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.arc(704, 25, 18, 0, Math.PI, true);
    ctx.fill();
    
    // Silueta de graderías del estadio (montañas grises distantes)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, groundY + 50);
    ctx.lineTo(0, 140);
    ctx.quadraticCurveTo(canvas.width / 2, 110, canvas.width, 140);
    ctx.lineTo(canvas.width, groundY + 50);
    ctx.fill();
}

// Dibujar Suelo de fútbol
function drawGround() {
    const grassTop = groundY + 68;
    
    // Tierra
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, grassTop, canvas.width, canvas.height - grassTop);
    
    // Pasto verde grueso
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, grassTop, canvas.width, 4);
    
    // Línea de cal blanca del campo de juego (desplazándose)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    const lineWidth = 30;
    const gapWidth = 90;
    const totalStep = lineWidth + gapWidth;
    let xOffset = -(gameFrame * speed) % totalStep;
    
    for (let x = xOffset; x < canvas.width; x += totalStep) {
        ctx.fillRect(x, grassTop + 12, lineWidth, 3);
    }
    
    // Línea lateral de cal de la cancha de fútbol
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, grassTop + 8, canvas.width, 2);
}

// Controles y Teclado
const keysPressed = {};

window.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    
    keysPressed[e.code] = true;
    
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        messi.jump();
    }
    
    if (e.code === 'ArrowDown') {
        e.preventDefault();
        messi.duck(true);
    }
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.code] = false;
    
    if (e.code === 'ArrowDown') {
        e.preventDefault();
        messi.duck(false);
    }
});

// Event Listeners de Botones y Overlays
startBtn.addEventListener('click', startGame);

// Botón de sonido
soundToggle.addEventListener('click', () => {
    soundMuted = !soundMuted;
    localStorage.setItem('messiSoundMuted', soundMuted);
    soundToggle.textContent = soundMuted ? '🔇' : '🔊';
    soundToggle.blur();
});

// Vinculación de Controles Táctiles para Móviles
const bindTouchBtn = (id, actionType) => {
    const el = document.getElementById(id);
    if (!el) return;
    
    el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameActive) return;
        el.classList.add('pressed');
        
        if (actionType === 'jump') {
            messi.jump();
        } else if (actionType === 'duck') {
            messi.duck(true);
        }
    }, { passive: false });
    
    el.addEventListener('touchend', (e) => {
        e.preventDefault();
        el.classList.remove('pressed');
        
        if (actionType === 'duck') {
            messi.duck(false);
        }
    }, { passive: false });
    
    // Soporte con mouse para simulación local
    el.addEventListener('mousedown', (e) => {
        if (!gameActive) return;
        el.classList.add('pressed');
        if (actionType === 'jump') {
            messi.jump();
        } else if (actionType === 'duck') {
            messi.duck(true);
        }
    });
    
    el.addEventListener('mouseup', () => {
        el.classList.remove('pressed');
        if (actionType === 'duck') {
            messi.duck(false);
        }
    });
    
    el.addEventListener('mouseleave', () => {
        el.classList.remove('pressed');
        if (actionType === 'duck') {
            messi.duck(false);
        }
    });
};

bindTouchBtn('touch-jump', 'jump');
bindTouchBtn('touch-slide', 'duck');

// Soporte de tap directo en la pantalla para saltar si no se usan los botones
canvas.addEventListener('touchstart', (e) => {
    if (!gameActive) return;
    
    const touchX = e.touches[0].clientX;
    const rect = canvas.getBoundingClientRect();
    const relativeX = touchX - rect.left;
    
    // Si toca la mitad derecha de la pantalla salta, si toca la mitad izquierda se agacha
    if (relativeX > rect.width / 2) {
        messi.jump();
    } else {
        messi.duck(true);
    }
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
    if (!gameActive) return;
    messi.duck(false);
}, { passive: true });

// Dibujar frame inicial (Messi driblando pelota en el suelo)
initGame();
draw();
