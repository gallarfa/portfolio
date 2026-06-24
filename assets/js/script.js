document.addEventListener('DOMContentLoaded', () => {

    /* ==================== NAVEGACIÓN POR PESTAÑAS (TABS) ==================== */
    const navItems = document.querySelectorAll('.sidebar__nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Inicializar visualización de pestañas en base al estado de la clase
    tabContents.forEach(tab => {
        if (tab.classList.contains('is-active')) {
            tab.style.display = 'block';
            // Pequeño timeout para asegurar que la opacidad transicione tras el display block
            setTimeout(() => {
                tab.style.opacity = '1';
                tab.style.transform = 'translateY(0)';
            }, 50);
        } else {
            tab.style.display = 'none';
            tab.style.opacity = '0';
            tab.style.transform = 'translateY(15px)';
        }
    });

    const switchTab = (tabId) => {
        const activeTab = document.querySelector('.tab-content.is-active');
        const targetTab = document.getElementById(tabId);
        
        if (activeTab === targetTab) return;
        
        // 1. Desvanecer pestaña activa actual
        if (activeTab) {
            activeTab.style.opacity = '0';
            activeTab.style.transform = 'translateY(15px)';
            activeTab.classList.remove('is-active');
            
            setTimeout(() => {
                activeTab.style.display = 'none';
                
                // 2. Mostrar nueva pestaña activa
                targetTab.style.display = 'block';
                // Forzar reflow para que el navegador registre el cambio de display
                targetTab.offsetHeight;
                
                targetTab.classList.add('is-active');
                targetTab.style.opacity = '1';
                targetTab.style.transform = 'translateY(0)';
            }, 250); // coincide con la transición de opacidad
        } else {
            targetTab.style.display = 'block';
            targetTab.offsetHeight;
            targetTab.classList.add('is-active');
            targetTab.style.opacity = '1';
            targetTab.style.transform = 'translateY(0)';
        }
        
        // 3. Actualizar menú lateral
        navItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('is-active');
            } else {
                item.classList.remove('is-active');
            }
        });
        
        // Scroll al tope automático si el contenido es largo
        targetTab.scrollTop = 0;
    };

    // Agregar click listeners a ítems de navegación
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Enlaces directos desde el Inicio
    const goToProjectsBtn = document.getElementById('go-to-projects');
    const goToContactBtn = document.getElementById('go-to-contact');

    if (goToProjectsBtn) {
        goToProjectsBtn.addEventListener('click', () => switchTab('proyectos'));
    }
    if (goToContactBtn) {
        goToContactBtn.addEventListener('click', () => switchTab('contacto'));
    }

    /* ==================== SELECTOR DE TEMA (LIGHT / DARK) ==================== */
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    
    // Cargar preferencia del tema guardado
    const savedTheme = localStorage.getItem('theme') || 'dark';
    body.setAttribute('data-theme', savedTheme);
    updateThemeButtonText(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeButtonText(newTheme);
    });

    function updateThemeButtonText(theme) {
        const textSpan = themeToggleBtn.querySelector('.theme-btn__text');
        if (theme === 'dark') {
            textSpan.textContent = 'Light';
            themeToggleBtn.classList.remove('is-selected');
        } else {
            textSpan.textContent = 'Dark';
            themeToggleBtn.classList.add('is-selected');
        }
    }

    /* ==================== ALTERNADOR DE FUENTE MONOESPACIADA ==================== */
    const monoToggleBtn = document.getElementById('mono-toggle');
    
    // Cargar preferencia de fuente guardada
    const savedFont = localStorage.getItem('fontStyle') || 'regular';
    if (savedFont === 'mono') {
        body.classList.add('is-mono');
        monoToggleBtn.classList.add('is-selected');
    } else {
        body.classList.remove('is-mono');
        monoToggleBtn.classList.remove('is-selected');
    }

    monoToggleBtn.addEventListener('click', () => {
        const isMonoActive = body.classList.contains('is-mono');
        
        if (isMonoActive) {
            body.classList.remove('is-mono');
            monoToggleBtn.classList.remove('is-selected');
            localStorage.setItem('fontStyle', 'regular');
        } else {
            body.classList.add('is-mono');
            monoToggleBtn.classList.add('is-selected');
            localStorage.setItem('fontStyle', 'mono');
        }
    });

});