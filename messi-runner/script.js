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
        case 'jump':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(750, now + 0.12);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
            break;
            
        case 'slide':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.linearRampToValueAtTime(45, now + 0.2);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
            
        case 'powerup':
            // Melodía rápida de 8 bits (Copa del mundo!)
            const notes = [261.63, 329.63, 392.00, 523.25]; // Do4, Mi4, Sol4, Do5
            notes.forEach((freq, idx) => {
                const noteOsc = audioCtx.createOscillator();
                const noteGain = audioCtx.createGain();
                noteOsc.connect(noteGain);
                noteGain.connect(audioCtx.destination);
                noteOsc.type = 'sine';
                noteOsc.frequency.setValueAtTime(freq, now + idx * 0.07);
                noteGain.gain.setValueAtTime(0.15, now + idx * 0.07);
                noteGain.gain.linearRampToValueAtTime(0.001, now + idx * 0.07 + 0.15);
                noteOsc.start(now + idx * 0.07);
                noteOsc.stop(now + idx * 0.07 + 0.15);
            });
            break;

        case 'kick':
            // Sonido de patada/impacto al golpear defensores invencible
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;

        case 'powerup-low':
            // Sonido de advertencia de que se acaba el modo invencible
            osc.type = 'sine';
            osc.frequency.setValueAtTime(330, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.06);
            osc.start(now);
            osc.stop(now + 0.06);
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
            osc.type = 'sine';
            osc.frequency.setValueAtTime(850, now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
            gain.gain.linearRampToValueAtTime(0.02, now + 0.12);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.15);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
            
            const vibrato = audioCtx.createOscillator();
            const vibratoGain = audioCtx.createGain();
            vibrato.frequency.value = 35; 
            vibratoGain.gain.value = 25; 
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
const maxSpeed = 13.5;
const speedStep = 0.0003;
let gameFrame = 0;
let score = 0;
let highScore = localStorage.getItem('messiHighScore') || 0;
let gameActive = false;
let gamePaused = false;

highScoreElement.textContent = `${highScore}m`;

// Variables de juego
let messi;
let obstacles = [];
let powerUps = [];
let particles = [];
let clouds = [];
let animationId;
let shakeTime = 0;
let nextObstacleTimer = 0;
let nextPowerUpTimer = 180; // La copa del mundo aparece tras un rato de juego

// Vallas Publicitarias del Estadio (Scrolling Ad Boards)
class AdBoard {
    constructor() {
        this.width = 180;
        this.height = 14;
        this.y = groundY + 68 - this.height; // Justo arriba de la hierba
        this.messages = [
            "★ GOAT 10 ★", 
            "CAMPEONES DEL MUNDO ⭐⭐⭐", 
            "MESSI RUNNER", 
            "DANIEL EL TRAVIESO", 
            "FÚTBOL ARTE",
            "EL REY LEO"
        ];
        this.text = this.messages[Math.floor(Math.random() * this.messages.length)];
    }
}
let adBoards = [];

// Configuración de Nubes de Fondo
class Cloud {
    constructor() {
        this.x = canvas.width + Math.random() * 200;
        this.y = 20 + Math.random() * 70;
        this.size = 28 + Math.random() * 28;
        this.speed = 0.4 + Math.random() * 0.7;
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

// Configuración de Partículas (Polvo al correr / Pasto / Confeti / Chispas doradas)
class Particle {
    constructor(x, y, color, type = 'dust') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.radius = type === 'confetti' ? 2.5 + Math.random() * 3.5 : 1 + Math.random() * 2.5;
        this.vx = type === 'confetti' ? (Math.random() - 0.5) * 7 : -speed * 0.35 + (Math.random() - 0.5) * 2;
        this.vy = type === 'confetti' ? -Math.random() * 8 : (Math.random() - 0.75) * 3;
        if (type === 'gold-trail') {
            this.vx = -speed * 0.7 - Math.random() * 2;
            this.vy = (Math.random() - 0.5) * 3;
        }
        this.alpha = 1;
        this.life = type === 'confetti' ? 90 + Math.random() * 30 : 20 + Math.random() * 15;
        this.maxLife = this.life;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.type === 'confetti') {
            this.vy += 0.22; // Gravedad
        }
        this.life--;
        this.alpha = Math.max(0, this.life / this.maxLife);
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        if (this.type === 'confetti') {
            ctx.fillRect(this.x, this.y, this.radius * 1.6, this.radius);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// Copa del Mundo (Power-Up de Invencibilidad)
class WorldCup {
    constructor() {
        this.width = 24;
        this.height = 36;
        this.x = canvas.width + 50;
        // Altura: A veces en el suelo, a veces flotando un poco
        this.y = Math.random() > 0.5 ? groundY + 15 : groundY - 20;
        this.pulse = 0;
    }
    
    update() {
        this.x -= speed;
        this.pulse += 0.15;
    }
    
    draw() {
        ctx.save();
        
        // Efecto de aura dorada brillante que pulsa
        const glow = 5 + Math.sin(this.pulse) * 4;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = glow;
        
        const cupX = this.x;
        const cupY = this.y;
        
        // Dibujar Copa del Mundo estilizada (Píxeles/Vectores)
        ctx.fillStyle = '#fbbf24'; // Oro
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        
        // Base de la copa
        ctx.beginPath();
        ctx.roundRect(cupX + 2, cupY + 28, 20, 8, 2);
        ctx.fill();
        ctx.stroke();
        
        // Tiras verdes de malaquita de la base
        ctx.fillStyle = '#10b981';
        ctx.fillRect(cupX + 4, cupY + 30, 16, 2);
        
        // Tallo/Cuerpo de la copa
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(cupX + 6, cupY + 28);
        ctx.lineTo(cupX + 9, cupY + 14);
        ctx.lineTo(cupX + 15, cupY + 14);
        ctx.lineTo(cupX + 18, cupY + 28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Globos/Mano sosteniendo el mundo arriba
        ctx.beginPath();
        ctx.arc(cupX + 12, cupY + 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Detalle interno del mundo
        ctx.fillStyle = '#d97706'; // Oro más oscuro
        ctx.fillRect(cupX + 9, cupY + 8, 6, 4);
        
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
            xOffset: 0,
            radius: 8.5
        };

        // Estado de súper Messi (invencible)
        this.invincible = false;
        this.invincibleTimer = 0;
    }
    
    jump() {
        if (!this.jumping && !this.ducking) {
            this.vy = this.jumpForce;
            this.jumping = true;
            playSound('jump');
            
            // Partículas de pasto
            for(let i=0; i<8; i++) {
                particles.push(new Particle(this.x + 20, groundY + 70, '#4ade80', 'grass'));
            }
        }
    }
    
    duck(isDucking) {
        if (this.jumping) return;
        
        if (isDucking && !this.ducking) {
            this.ducking = true;
            this.height = 42; 
            playSound('slide');
        } else if (!isDucking && this.ducking) {
            this.ducking = false;
            this.height = 72; 
        }
    }
    
    update() {
        // Manejar invencibilidad
        if (this.invincible) {
            this.invincibleTimer--;
            
            // Advertencia por audio antes de que se acabe
            if (this.invincibleTimer > 0 && this.invincibleTimer < 90 && this.invincibleTimer % 30 === 0) {
                playSound('powerup-low');
            }
            
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
            
            // Partículas de estela dorada (gloria!)
            if (gameFrame % 2 === 0) {
                particles.push(new Particle(
                    this.x + Math.random() * 30, 
                    this.y + Math.random() * this.height, 
                    Math.random() > 0.5 ? '#fbbf24' : '#ffffff', 
                    'gold-trail'
                ));
            }
        }

        // Gravedad
        if (this.jumping) {
            this.vy += this.gravity;
            this.y += this.vy;
            
            if (this.y >= groundY) {
                this.y = groundY;
                this.vy = 0;
                this.jumping = false;
            }
        }
        
        // Animación mejorada de la pelota (Dribbling real)
        // La pelota se desplaza adelante y atrás del pie de Messi siguiendo el ciclo de correr
        const legPhase = gameFrame * 0.18;
        this.ball.rotation += speed * 0.07;
        
        if (this.jumping) {
            this.ball.yOffset = 48;
            this.ball.xOffset = 38;
        } else if (this.ducking) {
            this.ball.yOffset = 28;
            this.ball.xOffset = 45; // Más adelante
            this.ball.rotation += speed * 0.03;
        } else {
            // Dribbling: bota en Y y se mece en X
            this.ball.yOffset = 56 + Math.sin(legPhase) * 3;
            this.ball.xOffset = 38 + Math.cos(legPhase) * 6; // Dribbling realista!
        }
        
        // Polvo al correr
        if (!this.jumping && !this.ducking && gameFrame % 3 === 0) {
            particles.push(new Particle(this.x + 5, groundY + 68, 'rgba(255, 255, 255, 0.15)'));
        }
        // Chispas al barrerse
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
        
        // Si es invencible, Messi brilla con aura de Oro
        if (this.invincible) {
            // Parpadea ligeramente cuando se está por terminar
            if (this.invincibleTimer > 90 || Math.floor(gameFrame / 5) % 2 === 0) {
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 18;
            }
        }
        
        if (this.ducking) {
            // ---- DIBUJAR A MESSI DESLIZÁNDOSE / AGACHADO ----
            ctx.translate(bodyX + 23, bodyY + 42);
            ctx.rotate(0.25);
            ctx.translate(-(bodyX + 23), -(bodyY + 42));
            
            // Camiseta
            ctx.fillStyle = this.invincible ? '#fbbf24' : '#38bdf8';
            ctx.beginPath();
            ctx.roundRect(bodyX + 2, bodyY + 12, 40, 20, 4);
            ctx.fill();
            if (!this.invincible) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(bodyX + 12, bodyY + 12, 6, 20);
                ctx.fillRect(bodyX + 24, bodyY + 12, 6, 20);
            }
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(bodyX + 2, bodyY + 12, 40, 20, 4);
            ctx.stroke();
            
            // Pantaloncito
            ctx.fillStyle = this.invincible ? '#d97706' : '#000000';
            ctx.beginPath();
            ctx.roundRect(bodyX - 6, bodyY + 18, 12, 14, 2);
            ctx.fill();
            ctx.stroke();
            
            // Piernas
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(bodyX + 2, bodyY + 22);
            ctx.lineTo(bodyX - 18, bodyY + 26);
            ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(bodyX - 18, bodyY + 26, 4.5, 0, Math.PI*2);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Cabeza
            const headX = bodyX + 38;
            const headY = bodyY + 6;
            ctx.fillStyle = '#ffd6ad';
            ctx.beginPath();
            ctx.arc(headX, headY, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            
            // Pelo Rubio Daniel
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(headX - 3, headY - 8, 9, Math.PI, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(headX - 10, headY - 10);
            ctx.lineTo(headX - 18, headY - 14);
            ctx.lineTo(headX - 6, headY - 6);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(headX + 5, headY - 1, 2, 0, Math.PI*2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(headX + 7, headY + 4, 3, 0, Math.PI);
            ctx.stroke();
            
        } else {
            // ---- DIBUJAR A MESSI CORRIENDO / JUMPING ----
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            
            let legPhase = gameFrame * 0.18;
            if (this.jumping) legPhase = 1.5; 
            
            const leftLegY = bodyY + 54 + (this.jumping ? -8 : Math.sin(legPhase) * 10);
            const leftLegX = bodyX + 15 + (this.jumping ? -4 : Math.cos(legPhase) * 12);
            
            const rightLegY = bodyY + 54 + (this.jumping ? -8 : Math.sin(legPhase + Math.PI) * 10);
            const rightLegX = bodyX + 25 + (this.jumping ? 4 : Math.cos(legPhase + Math.PI) * 12);
            
            // Pierna Izquierda
            ctx.beginPath();
            ctx.moveTo(bodyX + 15, bodyY + 45);
            ctx.lineTo(leftLegX, leftLegY);
            ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(leftLegX, leftLegY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Pierna Derecha
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(bodyX + 27, bodyY + 45);
            ctx.lineTo(rightLegX, rightLegY);
            ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(rightLegX, rightLegY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Camiseta Celeste/Blanca o Dorada si es Invencible
            ctx.fillStyle = this.invincible ? '#fbbf24' : '#38bdf8';
            ctx.beginPath();
            ctx.roundRect(bodyX + 10, bodyY + 20, 24, 28, 4);
            ctx.fill();
            
            if (!this.invincible) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(bodyX + 16, bodyY + 20, 4, 28);
                ctx.fillRect(bodyX + 24, bodyY + 20, 4, 28);
            }
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(bodyX + 10, bodyY + 20, 24, 28, 4);
            ctx.stroke();
            
            // Número 10
            ctx.fillStyle = this.invincible ? '#000000' : '#fbbf24';
            ctx.font = 'bold 7px "Space Mono"';
            ctx.fillText('10', bodyX + 19, bodyY + 36);
            
            // Pantaloncito
            ctx.fillStyle = this.invincible ? '#d97706' : '#000000';
            ctx.fillRect(bodyX + 10, bodyY + 43, 24, 6);
            ctx.strokeRect(bodyX + 10, bodyY + 43, 24, 6);
            
            // Brazo
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4.5;
            const armAngle = this.jumping ? -0.8 : Math.sin(legPhase + Math.PI) * 0.8;
            const handX = bodyX + 8 + Math.sin(armAngle) * 16;
            const handY = bodyY + 32 + Math.cos(armAngle) * 12;
            ctx.beginPath();
            ctx.moveTo(bodyX + 16, bodyY + 24);
            ctx.lineTo(handX, handY);
            ctx.stroke();
            ctx.fillStyle = '#ffd6ad';
            ctx.beginPath();
            ctx.arc(handX, handY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // CABEZA
            const headX = bodyX + 22;
            const headY = bodyY + 8;
            
            // Pelo rubio Daniel
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(headX, headY - 1, 14, Math.PI, Math.PI*2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(headX - 13, headY - 3);
            ctx.lineTo(headX - 17, headY - 10);
            ctx.lineTo(headX - 9, headY - 10);
            ctx.lineTo(headX - 11, headY - 19); 
            ctx.lineTo(headX - 3, headY - 13);
            ctx.lineTo(headX, headY - 21); 
            ctx.lineTo(headX + 4, headY - 13);
            ctx.lineTo(headX + 10, headY - 18); 
            ctx.lineTo(headX + 9, headY - 8);
            ctx.lineTo(headX + 14, headY - 9);
            ctx.lineTo(headX + 12, headY - 2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            
            ctx.fillStyle = '#ffd6ad';
            ctx.beginPath();
            ctx.arc(headX, headY + 1, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(headX - 9, headY - 3, 3, 0, Math.PI*2);
            ctx.arc(headX + 9, headY - 3, 3, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(headX - 4, headY - 1, 2, 0, Math.PI * 2);
            ctx.arc(headX + 4, headY - 1, 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(headX, headY + 4, 4, 0.1, Math.PI - 0.1);
            ctx.stroke();
        }
        
        ctx.restore();
        
        // 4. DIBUJAR PELOTA DE FÚTBOL (Dorada si es invencible)
        const ballX = this.x + this.ball.xOffset;
        const ballY = this.y + this.ball.yOffset;
        const radius = this.ball.radius;
        
        ctx.save();
        ctx.translate(ballX, ballY);
        ctx.rotate(this.ball.rotation);
        
        if (this.invincible) {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10;
        }
        
        ctx.fillStyle = this.invincible ? '#fbbf24' : '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = this.invincible ? '#d97706' : '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
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
        this.type = type; 
        this.x = canvas.width + 50;
        
        // Lanzamiento físico si es arrollado por súper Messi
        this.launched = false;
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
        this.rotSpeed = 0;
        
        // Colores de camisetas aleatorias para los rivales
        const teamJerseys = ['#dc2626', '#eab308', '#2563eb', '#ffffff']; // Rojo, Amarillo (Brasil), Azul, Blanco
        this.jersey = teamJerseys[Math.floor(Math.random() * teamJerseys.length)];
        
        if (type === 'slide') {
            this.width = 65;
            this.height = 42;
            this.y = groundY + 28;
        } else if (type === 'stand') {
            this.width = 44;
            this.height = 70;
            this.y = groundY;
        } else if (type === 'card') {
            this.width = 16;
            this.height = 24;
            this.y = groundY - 26; 
            this.cardColor = Math.random() > 0.5 ? '#ef4444' : '#fbbf24'; 
        }
    }
    
    update() {
        if (this.launched) {
            // Físicas parabólicas de lanzamiento
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.5; // Gravedad del cuerpo lanzado
            this.rotation += this.rotSpeed;
        } else {
            this.x -= speed;
        }
    }
    
    draw() {
        ctx.save();
        
        // Aplicar transformaciones si está lanzado
        if (this.launched) {
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.rotate(this.rotation);
            ctx.translate(-(this.x + this.width/2), -(this.y + this.height/2));
            ctx.globalAlpha = 0.8;
        }
        
        const rivalX = this.x;
        const rivalY = this.y;
        
        if (this.type === 'slide') {
            // DEFENSOR BARRIDA
            ctx.fillStyle = this.jersey;
            ctx.beginPath();
            ctx.roundRect(rivalX, rivalY + 12, 55, 18, 4);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(rivalX, rivalY + 12, 55, 18);
            
            ctx.fillStyle = '#000000'; // Short oscuro
            ctx.fillRect(rivalX + 42, rivalY + 12, 10, 18);
            ctx.strokeRect(rivalX + 42, rivalY + 12, 10, 18);
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(rivalX, rivalY + 22);
            ctx.lineTo(rivalX - 15, rivalY + 26);
            ctx.stroke();
            
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(rivalX - 15, rivalY + 26, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            const headX = rivalX + 48;
            const headY = rivalY + 4;
            ctx.fillStyle = '#e0a96d';
            ctx.beginPath();
            ctx.arc(headX, headY, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(headX + 2, headY - 5, 8, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
        } else if (this.type === 'stand') {
            // DEFENSOR DE PIE
            const bounce = this.launched ? 0 : Math.sin(gameFrame * 0.15 + Math.PI) * 2;
            
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
            
            ctx.fillStyle = this.jersey;
            ctx.beginPath();
            ctx.roundRect(rivalX + 8, rivalY + 18 + bounce, 24, 28, 4);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(rivalX + 8, rivalY + 18 + bounce, 24, 28);
            
            ctx.fillStyle = '#000000';
            ctx.fillRect(rivalX + 8, rivalY + 41 + bounce, 24, 6);
            ctx.strokeRect(rivalX + 8, rivalY + 41 + bounce, 24, 6);
            
            const headX = rivalX + 20;
            const headY = rivalY + 8 + bounce;
            ctx.fillStyle = '#c68a4c';
            ctx.beginPath();
            ctx.arc(headX, headY, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(headX, headY - 4, 9, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(headX - 6, headY - 4); 
            ctx.lineTo(headX - 2, headY - 2);
            ctx.moveTo(headX + 6, headY - 4);
            ctx.lineTo(headX + 2, headY - 2);
            ctx.stroke();
            
        } else if (this.type === 'card') {
            // TARJETA VOLADORA
            ctx.fillStyle = this.cardColor;
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, 3);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(this.x + 3, this.y + 4, this.width - 6, this.height - 8);
        }
        
        ctx.restore();
    }
}

// Inicializar Juego
function initGame() {
    messi = new Messi();
    obstacles = [];
    powerUps = [];
    particles = [];
    clouds = [];
    adBoards = [];
    speed = baseSpeed;
    gameFrame = 0;
    score = 0;
    nextObstacleTimer = 50;
    nextPowerUpTimer = 250; 
    scoreElement.textContent = '0m';
    gamePaused = false;
    
    // Generar nubes iniciales
    for (let i = 0; i < 4; i++) {
        const cloud = new Cloud();
        cloud.x = Math.random() * canvas.width;
        clouds.push(cloud);
    }

    // Generar vallas publicitarias iniciales
    for (let x = 0; x < canvas.width + 200; x += 220) {
        const board = new AdBoard();
        board.x = x;
        adBoards.push(board);
    }
}

// Iniciar/Reiniciar carrera
function startGame() {
    if (gameActive) return;
    
    initGame();
    gameActive = true;
    overlay.classList.add('hidden');
    container.classList.add('game-active');
    
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
    
    shakeTime = 25;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('messiHighScore', highScore);
        highScoreElement.textContent = `${highScore}m`;
        
        for(let i=0; i<80; i++) {
            particles.push(new Particle(
                canvas.width / 2 + (Math.random() - 0.5) * 300,
                canvas.height / 3 + (Math.random() - 0.5) * 100,
                `hsl(${Math.random() * 360}, 95%, 60%)`,
                'confetti'
            ));
        }
        playSound('milestone');
    }
    
    overlayTitle.textContent = "¡Árbitro Pita Fin!";
    overlayTitle.style.color = "var(--danger-color)";
    overlayDesc.textContent = `¡Te quitaron el balón! Dribblaste con éxito una distancia de ${score} metros antes del silbatazo final.`;
    startBtn.textContent = "Volver a Intentar";
    
    overlay.classList.remove('hidden');
    container.classList.remove('game-active');
}

// Bucle principal
function gameLoop() {
    if (!gameActive) return;
    
    if (!gamePaused) {
        update();
        draw();
    }
    
    animationId = requestAnimationFrame(gameLoop);
}

// Pausar/Reanudar
function togglePause() {
    if (!gameActive) return;
    gamePaused = !gamePaused;
    
    if (gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "Space Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('JUEGO PAUSADO', canvas.width / 2, canvas.height / 2);
        ctx.font = '12px "Space Mono"';
        ctx.fillText('Presiona "P" para Reanudar', canvas.width / 2, canvas.height / 2 + 30);
    }
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
        
        if (score > 0 && score % 100 === 0) {
            playSound('milestone');
        }
    }
    
    // Actualizar Messi
    messi.update();
    
    // Generar Nubes
    if (gameFrame % 140 === 0) {
        clouds.push(new Cloud());
    }
    clouds.forEach((cloud, index) => {
        cloud.update();
        if (cloud.x < -100) clouds.splice(index, 1);
    });

    // Actualizar Vallas Publicitarias (Scrolling Ad Boards)
    adBoards.forEach((board, index) => {
        board.x -= speed;
        if (board.x < -board.width) {
            // Volver a colocar al final
            board.x = canvas.width + Math.random() * 80;
            const newBoard = new AdBoard();
            board.text = newBoard.text; // Cambiar mensaje publicitario
        }
    });
    
    // Generar Copa del Mundo (Power-Up)
    nextPowerUpTimer--;
    if (nextPowerUpTimer <= 0 && !messi.invincible) {
        powerUps.push(new WorldCup());
        nextPowerUpTimer = 400 + Math.random() * 300; // Spawnea cada tanto tiempo
    }

    // Actualizar y colisionar Copas del Mundo
    powerUps.forEach((cup, index) => {
        cup.update();
        
        if (cup.x < -100) {
            powerUps.splice(index, 1);
            return;
        }

        // Colisión con la copa
        if (
            messi.x < cup.x + cup.width &&
            messi.x + messi.width > cup.x &&
            messi.y < cup.y + cup.height &&
            messi.y + messi.height > cup.y
        ) {
            powerUps.splice(index, 1);
            messi.invincible = true;
            messi.invincibleTimer = 360; // 6 segundos de invencibilidad
            playSound('powerup');
            
            // Confeti de celebración por la copa!
            for(let i=0; i<30; i++) {
                particles.push(new Particle(messi.x + 20, messi.y + 20, '#fbbf24', 'confetti'));
            }
        }
    });
    
    // Generar Obstáculos
    nextObstacleTimer--;
    if (nextObstacleTimer <= 0) {
        const types = ['slide', 'stand', 'card'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        obstacles.push(new Obstacle(randomType));
        nextObstacleTimer = 70 + Math.random() * 80 - (speed * 3.5);
    }
    
    // Actualizar y colisionar obstáculos
    obstacles.forEach((obs, index) => {
        obs.update();
        
        if (obs.x < -200 || obs.y > canvas.height + 100) {
            obstacles.splice(index, 1);
            return;
        }
        
        // Si el obstáculo ya fue lanzado por estar invencible, no colisiona más
        if (obs.launched) return;

        // Detección de colisiones
        const toleranceX = 8;
        const toleranceY = 6;
        
        if (
            messi.x + toleranceX < obs.x + obs.width &&
            messi.x + messi.width - toleranceX > obs.x &&
            messi.y + toleranceY < obs.y + obs.height &&
            messi.y + messi.height - toleranceY > obs.y
        ) {
            if (messi.invincible) {
                // Súper Messi arrolla al defensor! Lo lanza volando!
                obs.launched = true;
                obs.vx = 8 + speed * 0.4;
                obs.vy = -11 - Math.random() * 4;
                obs.rotSpeed = 0.2 + Math.random() * 0.2;
                playSound('kick');
                score += 15; // Puntos extra por eludir arrollando!
                shakeTime = 8;
                
                // Chispas doradas de la colisión
                for (let i = 0; i < 12; i++) {
                    particles.push(new Particle(obs.x, obs.y + 10, '#fbbf24', 'gold-trail'));
                }
            } else {
                gameOver();
            }
        }
    });
    
    // Partículas
    particles.forEach((part, index) => {
        part.update();
        if (part.life <= 0) particles.splice(index, 1);
    });
    
    if (shakeTime > 0) shakeTime--;
}

// Dibujar pantalla
function draw() {
    ctx.save();
    
    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * 8;
        const dy = (Math.random() - 0.5) * 8;
        ctx.translate(dx, dy);
    }
    
    // 1. Fondo cielo
    ctx.fillStyle = varColor('--canvas-bg', '#020617');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Graderías / Parallax del estadio
    drawStadiumBackground();
    
    // 3. Nubes
    clouds.forEach(cloud => cloud.draw());

    // 4. Vallas Publicitarias (Ad Boards) con su mensaje LED
    drawAdBoards();
    
    // 5. Suelo y pasto
    drawGround();
    
    // 6. Partículas
    particles.forEach(part => part.draw());
    
    // 7. Copas del mundo
    powerUps.forEach(cup => cup.draw());

    // 8. Obstáculos (rivales/tarjetas)
    obstacles.forEach(obs => obs.draw());
    
    // 9. Messi
    messi.draw();

    // 10. Interfaz del Power-Up (Barra de invencibilidad si está activa)
    if (messi.invincible) {
        drawPowerUpBar();
    }
    
    ctx.restore();
}

// Auxiliar para obtener colores CSS variables
function varColor(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// Dibujar fondo de estadio con público silueteado y focos de neón
function drawStadiumBackground() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY + 50);
    skyGrad.addColorStop(0, '#020512');
    skyGrad.addColorStop(1, '#0b0f19');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, groundY + 50);

    // Haz de luz de los reflectores (Spotlight beams)
    const beamGrad1 = ctx.createLinearGradient(104, 25, 150, groundY + 50);
    beamGrad1.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
    beamGrad1.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = beamGrad1;
    ctx.beginPath();
    ctx.moveTo(104, 25);
    ctx.lineTo(0, groundY + 50);
    ctx.lineTo(250, groundY + 50);
    ctx.closePath();
    ctx.fill();

    const beamGrad2 = ctx.createLinearGradient(704, 25, 650, groundY + 50);
    beamGrad2.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
    beamGrad2.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = beamGrad2;
    ctx.beginPath();
    ctx.moveTo(704, 25);
    ctx.lineTo(550, groundY + 50);
    ctx.lineTo(canvas.width, groundY + 50);
    ctx.closePath();
    ctx.fill();
    
    // Dibujar reflectores del estadio
    ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
    ctx.fillRect(100, 30, 8, groundY - 30);
    ctx.fillRect(92, 20, 24, 10);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(104, 25, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
    ctx.fillRect(700, 30, 8, groundY - 30);
    ctx.fillRect(692, 20, 24, 10);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(704, 25, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Silueta del público en las tribunas
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, groundY + 50);
    ctx.lineTo(0, 135);
    ctx.quadraticCurveTo(canvas.width / 2, 110, canvas.width, 135);
    ctx.lineTo(canvas.width, groundY + 50);
    ctx.fill();

    // Dibujar cabecitas del público (Píxeles/Textura de tribuna que vibra)
    ctx.fillStyle = 'rgba(21, 29, 45, 0.7)';
    const bounceOffset = (gameFrame % 20 < 10) ? 1 : 0; 
    for (let x = 10; x < canvas.width; x += 16) {
        const heightY = 135 + Math.sin(x * 0.05) * 5 + bounceOffset;
        ctx.beginPath();
        ctx.arc(x, heightY, 3.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Destellos de cámaras/flashes en la tribuna (Camera flashes!)
    for (let i = 0; i < 18; i++) {
        const flashX = (Math.sin(i * 37.3) * 0.5 + 0.5) * canvas.width;
        const flashY = 110 + (Math.cos(i * 49.7) * 0.5 + 0.5) * 25 + Math.sin(gameFrame * 0.05 + i) * 2;
        
        if (Math.sin(gameFrame * 0.12 + i * 2.7) > 0.85) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffffff';
            ctx.fillRect(flashX, flashY, 2.5, 2.5);
            ctx.shadowBlur = 0;
        }
    }
}

// Dibujar Vallas Publicitarias (Ad Boards)
function drawAdBoards() {
    adBoards.forEach(board => {
        // Estructura de la valla
        ctx.fillStyle = '#1e293b'; // Panel oscuro
        ctx.fillRect(board.x, board.y, board.width, board.height);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(board.x, board.y, board.width, board.height);
        
        // Patas de la valla
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(board.x + 20, board.y + board.height, 6, 4);
        ctx.fillRect(board.x + board.width - 26, board.y + board.height, 6, 4);
        
        // Texto LED luminoso en la valla
        ctx.fillStyle = '#fbbf24'; // Oro LED
        ctx.font = 'bold 7.5px "Press Start 2P"';
        ctx.textAlign = 'center';
        
        // Hacer parpadear el texto LED ligeramente
        if (gameFrame % 40 > 8) {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 4;
            ctx.fillText(board.text, board.x + board.width / 2, board.y + board.height - 3.5);
            ctx.shadowBlur = 0; // Reset
        }
    });
}

// Dibujar Suelo de fútbol
function drawGround() {
    const grassTop = groundY + 68;
    
    ctx.fillStyle = '#0f172a'; // Subsuelo oscuro
    ctx.fillRect(0, grassTop, canvas.width, canvas.height - grassTop);
    
    ctx.fillStyle = '#10b981'; // Pasto verde grueso
    ctx.fillRect(0, grassTop, canvas.width, 4);
    
    // Líneas blancas del campo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    const lineWidth = 30;
    const gapWidth = 90;
    const totalStep = lineWidth + gapWidth;
    let xOffset = -(gameFrame * speed) % totalStep;
    
    for (let x = xOffset; x < canvas.width; x += totalStep) {
        ctx.fillRect(x, grassTop + 12, lineWidth, 3.5);
    }
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(0, grassTop + 8, canvas.width, 2.5);
}

// Dibujar la barra de tiempo restante de la Copa del Mundo (Invencible)
function drawPowerUpBar() {
    const barWidth = 240;
    const barHeight = 8;
    const barX = canvas.width / 2 - barWidth / 2;
    const barY = 22;
    
    const percentage = messi.invincibleTimer / 360;
    
    ctx.save();
    
    // Texto informativo
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 8.5px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 5;
    ctx.fillText('¡MODO LEYENDA INVENCIBLE!', canvas.width / 2, barY - 7);
    
    // Contenedor de la barra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();
    
    // Relleno dorado que disminuye
    const fillWidth = barWidth * percentage;
    const grad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(1, '#f59e0b');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillWidth, barHeight, 3);
    ctx.fill();
    
    ctx.restore();
}

// Controles y Teclado
const keysPressed = {};

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP') {
        togglePause();
        return;
    }

    if (!gameActive || gamePaused) return;
    
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
    if (!gameActive || gamePaused) return;
    
    keysPressed[e.code] = false;
    
    if (e.code === 'ArrowDown') {
        e.preventDefault();
        messi.duck(false);
    }
});

// Event Listeners de Botones y Overlays
startBtn.addEventListener('click', startGame);

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
        if (!gameActive || gamePaused) return;
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
        if (!gameActive || gamePaused) return;
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
    if (!gameActive || gamePaused) return;
    
    const touchX = e.touches[0].clientX;
    const rect = canvas.getBoundingClientRect();
    const relativeX = touchX - rect.left;
    
    if (relativeX > rect.width / 2) {
        messi.jump();
    } else {
        messi.duck(true);
    }
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
    if (!gameActive || gamePaused) return;
    messi.duck(false);
}, { passive: true });

// Dibujar frame inicial (Messi driblando pelota en el suelo)
initGame();
draw();
