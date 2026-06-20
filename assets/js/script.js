/* ==================== MOSTRAR / OCULTAR MENÚ MÓVIL ==================== */
const navMenu = document.getElementById('nav-menu'),
      navToggle = document.getElementById('nav-toggle'),
      navClose = document.getElementById('nav-close');

/* Validar si el elemento de toggle existe */
if(navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.add('show-menu');
    });
}

/* Validar si el elemento de cerrar existe */
if(navClose) {
    navClose.addEventListener('click', () => {
        navMenu.classList.remove('show-menu');
    });
}

/* ==================== QUITAR MENÚ MÓVIL AL SELECCIONAR ENLACE ==================== */
const navLink = document.querySelectorAll('.nav__link');

const linkAction = () => {
    const navMenu = document.getElementById('nav-menu');
    // Cuando hacemos clic en cada nav__link, eliminamos la clase show-menu
    navMenu.classList.remove('show-menu');
}
navLink.forEach(n => n.addEventListener('click', linkAction));

/* ==================== CAMBIAR ESTILO DEL HEADER AL HACER SCROLL (STICKY) ==================== */
const scrollHeader = () => {
    const header = document.getElementById('header');
    // Cuando el scroll es superior a 50px de altura, se añade una sombra o fondo
    if(this.scrollY >= 50) {
        header?.classList.add('scroll-header');
    } else {
        header?.classList.remove('scroll-header');
    }
}
window.addEventListener('scroll', scrollHeader);

/* ==================== ACTIVA ENLACES DEL MENÚ CON SCROLL ==================== */
const sections = document.querySelectorAll('section[id]');
    
const scrollActive = () => {
    const scrollY = window.pageYOffset;

    sections.forEach(current => {
        const sectionHeight = current.offsetHeight,
              sectionTop = current.offsetTop - 58,
              sectionId = current.getAttribute('id'),
              sectionsClass = document.querySelector('.nav__menu a[href*=' + sectionId + ']');

        if(scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            sectionsClass?.classList.add('active-link');
        } else {
            sectionsClass?.classList.remove('active-link');
        }                                                    
    });
}
window.addEventListener('scroll', scrollActive);

/* ==================== EFECTO SCROLL REVEAL (INYECCIÓN DINÁMICA NATIVA) ==================== */
// Inyectamos estilos CSS para el reveal dinámicamente sin tocar el archivo CSS
const revealStyle = document.createElement('style');
revealStyle.textContent = `
    .reveal {
        opacity: 0;
        transform: translateY(40px);
        transition: opacity 0.8s cubic-bezier(0.5, 0, 0, 1), transform 0.8s cubic-bezier(0.5, 0, 0, 1);
    }
    .reveal.active {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(revealStyle);

// Seleccionamos elementos que queremos animar en scroll
const elementsToReveal = [
    document.querySelector('.hero__content'),
    document.querySelector('.hero__visual'),
    document.getElementById('title-sobre-mi'),
    document.querySelector('.about__text'),
    document.querySelector('.skills__container'),
    document.getElementById('title-experiencia'),
    ...document.querySelectorAll('.timeline__item'),
    document.getElementById('title-proyectos'),
    ...document.querySelectorAll('.project-card'),
    document.getElementById('title-contacto'),
    document.querySelector('.contact__info')
].filter(el => el !== null); // Filtrar nulos si acaso

// Asignamos la clase reveal
elementsToReveal.forEach(el => el.classList.add('reveal'));

// Intersection Observer para disparar la animación
const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if(entry.isIntersecting) {
            entry.target.classList.add('active');
            // Dejar de observar una vez animado
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15, // Porcentaje visible para disparar la animación
    rootMargin: "0px 0px -50px 0px"
});

// Observar cada elemento
elementsToReveal.forEach(el => revealObserver.observe(el));