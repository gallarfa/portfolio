// Cuando la página cargue completamente
document.addEventListener('DOMContentLoaded', function() {
    
    // Crear botón de menú para móvil
    const nav = document.querySelector('.nav');
    const navMenu = document.querySelector('.nav__menu');
    
    // Crear botón hamburguesa
    const menuButton = document.createElement('button');
    menuButton.innerHTML = '☰';
    menuButton.classList.add('mobile-menu-btn');
    menuButton.style.cssText = `
        display: none;
        background: none;
        border: none;
        font-size: 2rem;
        cursor: pointer;
        color: var(--primary-color);
    `;
    
    // Insertar botón en el nav
    nav.insertBefore(menuButton, navMenu);
    
    // Función para manejar el menú en móvil
    function handleMobileMenu() {
        if (window.innerWidth <= 768) {
            menuButton.style.display = 'block';
            navMenu.style.display = 'none';
            
            menuButton.addEventListener('click', function() {
                if (navMenu.style.display === 'none') {
                    navMenu.style.display = 'flex';
                    navMenu.style.flexDirection = 'column';
                    navMenu.style.position = 'absolute';
                    navMenu.style.top = '70px';
                    navMenu.style.left = '0';
                    navMenu.style.width = '100%';
                    navMenu.style.backgroundColor = 'white';
                    navMenu.style.padding = '1rem';
                    navMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                } else {
                    navMenu.style.display = 'none';
                }
            });
        } else {
            menuButton.style.display = 'none';
            navMenu.style.display = 'flex';
            navMenu.style.flexDirection = 'row';
            navMenu.style.position = 'static';
            navMenu.style.width = 'auto';
            navMenu.style.backgroundColor = 'transparent';
            navMenu.style.padding = '0';
            navMenu.style.boxShadow = 'none';
        }
    }
    
    // Ejecutar al cargar
    handleMobileMenu();
    
    // Ejecutar al cambiar el tamaño de la ventana
    window.addEventListener('resize', handleMobileMenu);
    
    // Smooth scroll para los links del menú
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});