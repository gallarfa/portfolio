document.addEventListener('DOMContentLoaded', () => {

    /* ==================== TRANSLATIONS DICTIONARY ==================== */
    const translations = {
        es: {
            sidebar_subtitle: "Desarrollador de Software",
            nav_home: "Inicio",
            nav_projects: "Proyectos",
            nav_about: "Sobre Mí",
            nav_experience: "Experiencia",
            nav_contact: "Contacto",
            sidebar_footer_sub: "Hecho con excelencia técnica.",
            home_greeting: "Disponible para trabajar",
            home_description: "Desarrollador enfocado en crear interfaces modernas, responsivas y de alto rendimiento. Con experiencia práctica en soporte de plataformas Fintech y desarrollo de APIs Backend. Siempre impulsado por la mejora continua.",
            home_btn_projects: "Ver Proyectos",
            home_btn_contact: "Contactarme",
            projects_title: "Proyectos Destacados",
            project_badge_completed: "Completado",
            project_badge_progress: "En Progreso",
            project1_title: "App de Tareas - Backend API",
            project1_desc: "API RESTful robusta para gestión de tareas. Cuenta con CRUD completo, persistencia en base de datos MongoDB con Mongoose y enrutamiento modular limpio.",
            project2_title: "Agente de Triage - Salud Mental",
            project2_desc: "Agente clasificador semántico para triage clínico que prioriza urgencias de salud mental localmente usando Ollama y Llama 3.2, con mitigación de alucinaciones y exportación en HTML/CSV.",
            project3_title: "API REST con FastAPI & Docker",
            project3_desc: "API de gestión de usuarios dockerizada con docker-compose. Implementa seguridad JWT con hashing bcrypt, campos opcionales de base de datos y control global robusto de excepciones de SQL.",
            project4_title: "Juego Snake Classic Pro",
            project4_desc: "Implementación interactiva del clásico juego Snake mediante HTML5 Canvas, con almacenamiento local (localStorage) de récord histórico, controles WASD y dificultad progresiva.",
            project5_title: "MovieHub - Buscador",
            project5_desc: "Aplicación web que consume la API de TMDB. Incluye búsqueda con debounce, diseño responsivo premium, favoritos mediante localStorage y filtrados.",
            project6_title: "TaskFlow - Kanban Board",
            project6_desc: "Gestor de tareas avanzado con interfaz tipo Kanban (Drag & Drop), control de estado global mediante Zustand, filtros múltiples y exportación a JSON.",
            project_btn_code: "Código",
            project_btn_play: "Jugar",
            project_btn_soon_w3: "Próximamente (Semana 3)",
            project_btn_soon_w5: "Próximamente (Semana 5)",
            about_title: "Sobre Mí",
            about_p1: "Soy estudiante del último año de la carrera de <strong>Analista de Sistemas</strong> en Posadas, Misiones. Mi fascinación por la tecnología me ha llevado a capacitarme de manera constante en tecnologías Full Stack, especializándome actualmente en el desarrollo Frontend moderno.",
            about_p2: "A través de mis experiencias laborales previas, he aprendido el valor del trabajo en equipo, la comunicación técnica fluida y la importancia de una UX excepcional. Busco mi primera oportunidad formal como desarrollador frontend donde pueda aportar mi entusiasmo y bases sólidas, colaborando en la creación de software de calidad.",
            about_location: "Ubicación",
            about_languages: "Idiomas",
            about_lang_desc: "Español (Nativo) / Inglés (B2 en prep.)",
            skills_frontend: "Frontend",
            skills_backend: "Backend & DB",
            skills_tools: "Herramientas",
            skills_teamwork: "Trabajo en equipo",
            skills_com: "Comunicación",
            exp_title: "Experiencia Profesional",
            exp_silicon_title: "Desarrollador Back-End",
            exp_silicon_desc: "Participación activa en el diseño y desarrollo de APIs REST utilizando Node.js y Express. Aplicación de arquitecturas de backend y patrones de enrutamiento modulares. Trabajo diario con Git y GitHub bajo flujos de trabajo colaborativos y resolución de incidencias en Jira.",
            exp_wallbit_title: "Soporte Técnico Interno",
            exp_wallbit_desc: "Resolución de consultas técnicas y operativas de primer nivel a usuarios a través de chat y correo electrónico. Validación de identidad y aplicación de protocolos de seguridad anti-fraude. Trabajo ágil con Trello/Jira y ganancia de visión sobre el funcionamiento de productos digitales financieros y UX.",
            contact_title: "Hablemos",
            contact_intro: "¿Buscas incorporar un desarrollador con iniciativa, pasión y bases sólidas en tu equipo? ¡No dudes en contactarme! Estoy abierto a propuestas de empleo o pasantías."
        },
        en: {
            sidebar_subtitle: "Software Developer",
            nav_home: "Home",
            nav_projects: "Projects",
            nav_about: "About Me",
            nav_experience: "Experience",
            nav_contact: "Contact",
            sidebar_footer_sub: "Crafted with technical excellence.",
            home_greeting: "Open to Work",
            home_description: "Developer focused on creating modern, responsive, and high-performance interfaces. With practical experience in Fintech platform support and Backend API development. Always driven by continuous improvement.",
            home_btn_projects: "View Projects",
            home_btn_contact: "Contact Me",
            projects_title: "Featured Projects",
            project_badge_completed: "Completed",
            project_badge_progress: "In Progress",
            project1_title: "Task App - Backend API",
            project1_desc: "Robust RESTful API for task management. Features full CRUD, MongoDB persistence with Mongoose, and clean modular routing.",
            project2_title: "Triage Agent - Mental Health",
            project2_desc: "Semantic classifier agent for clinical triage that prioritizes mental health emergencies locally using Ollama and Llama 3.2, with hallucination mitigation and HTML/CSV exports.",
            project3_title: "REST API with FastAPI & Docker",
            project3_desc: "Dockerized user management API with docker-compose. Implements JWT security with bcrypt hashing, optional DB fields, and robust global SQL exception control.",
            project4_title: "Classic Snake Game Pro",
            project4_desc: "Interactive implementation of the classic Snake game using HTML5 Canvas, featuring local storage (localStorage) for high scores, WASD controls, and progressive difficulty.",
            project5_title: "MovieHub - Search App",
            project5_desc: "Web application consuming the TMDB API. Includes debounced search, premium responsive design, favorites with localStorage, and filters.",
            project6_title: "TaskFlow - Kanban Board",
            project6_desc: "Advanced task manager with Kanban-style interface (Drag & Drop), global state management via Zustand, multiple filters, and JSON export.",
            project_btn_code: "Code",
            project_btn_play: "Play",
            project_btn_soon_w3: "Coming Soon (Week 3)",
            project_btn_soon_w5: "Coming Soon (Week 5)",
            about_title: "About Me",
            about_p1: "I am a final-year student of the <strong>Systems Analyst</strong> degree in Posadas, Misiones. My fascination with technology has led me to constantly train in Full Stack technologies, currently specializing in modern Frontend development.",
            about_p2: "Through my previous work experiences, I have learned the value of teamwork, fluent technical communication, and the importance of an exceptional UX. I am looking for my first formal opportunity as a frontend developer where I can contribute my enthusiasm and solid foundation, collaborating in the creation of quality software.",
            about_location: "Location",
            about_languages: "Languages",
            about_lang_desc: "Spanish (Native) / English (B2 prep.)",
            skills_frontend: "Frontend",
            skills_backend: "Backend & DB",
            skills_tools: "Tools & Skills",
            skills_teamwork: "Teamwork",
            skills_com: "Communication",
            exp_title: "Work Experience",
            exp_silicon_title: "Back-End Developer",
            exp_silicon_desc: "Active participation in the design and development of REST APIs using Node.js and Express. Application of backend architectures and modular routing patterns. Daily work with Git and GitHub under collaborative workflows and issue resolution in Jira.",
            exp_wallbit_title: "Internal Technical Support",
            exp_wallbit_desc: "Resolution of first-level technical and operational queries for users via chat and email. Identity validation and application of anti-fraud security protocols. Agile work with Trello/Jira and gain insight into the operation of digital financial products and UX.",
            contact_title: "Let's Talk",
            contact_intro: "Are you looking to add a developer with initiative, passion, and solid foundations to your team? Do not hesitate to contact me! I am open to job proposals or internships."
        }
    };

    /* ==================== NAVEGACIÓN POR PESTAÑAS (TABS) ==================== */
    const navItems = document.querySelectorAll('.sidebar__nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Inicializar visualización de pestañas en base al estado de la clase
    tabContents.forEach(tab => {
        if (tab.classList.contains('is-active')) {
            tab.style.display = 'block';
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
        
        if (activeTab) {
            activeTab.style.opacity = '0';
            activeTab.style.transform = 'translateY(15px)';
            activeTab.classList.remove('is-active');
            
            setTimeout(() => {
                activeTab.style.display = 'none';
                targetTab.style.display = 'block';
                targetTab.offsetHeight; // force reflow
                
                targetTab.classList.add('is-active');
                targetTab.style.opacity = '1';
                targetTab.style.transform = 'translateY(0)';
            }, 250);
        } else {
            targetTab.style.display = 'block';
            targetTab.offsetHeight;
            targetTab.classList.add('is-active');
            targetTab.style.opacity = '1';
            targetTab.style.transform = 'translateY(0)';
        }
        
        navItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('is-active');
            } else {
                item.classList.remove('is-active');
            }
        });
        
        targetTab.scrollTop = 0;
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    const goToProjectsBtn = document.getElementById('go-to-projects');
    const goToContactBtn = document.getElementById('go-to-contact');

    if (goToProjectsBtn) {
        goToProjectsBtn.addEventListener('click', () => switchTab('proyectos'));
    }
    if (goToContactBtn) {
        goToContactBtn.addEventListener('click', () => switchTab('contacto'));
    }

    /* ==================== SELECTOR DE IDIOMA (ES / EN) ==================== */
    const langToggleBtn = document.getElementById('lang-toggle');
    let currentLang = localStorage.getItem('language') || 'es';

    const applyLanguage = (lang) => {
        const translateElements = document.querySelectorAll('[data-translate]');
        translateElements.forEach(el => {
            const key = el.getAttribute('data-translate');
            if (translations[lang] && translations[lang][key]) {
                el.innerHTML = translations[lang][key];
            }
        });

        // Actualizar interfaz del botón
        const textSpan = langToggleBtn.querySelector('.theme-btn__text');
        const box = langToggleBtn.querySelector('.theme-btn__box');
        
        if (lang === 'es') {
            textSpan.textContent = 'ES';
            langToggleBtn.classList.remove('is-selected');
        } else {
            textSpan.textContent = 'EN';
            langToggleBtn.classList.add('is-selected');
        }
        
        localStorage.setItem('language', lang);
    };

    langToggleBtn.addEventListener('click', () => {
        currentLang = currentLang === 'es' ? 'en' : 'es';
        applyLanguage(currentLang);
    });

    // Aplicar idioma inicial
    applyLanguage(currentLang);

    /* ==================== SELECTOR DE TEMA (LIGHT / DARK) ==================== */
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    
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