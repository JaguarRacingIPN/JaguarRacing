// src/scripts/header.js

/**
 * Normaliza una ruta eliminando la barra final si existe.
 * Ej: "/team/" -> "/team"
 */
const normalizePath = (path) => path === '/' ? path : path.replace(/\/$/, '');

/**
 * Actualiza visualmente qué enlace está activo según la URL actual.
 */
export function updateActiveLinks() {
    const currentPath = normalizePath(window.location.pathname);
    
    // Seleccionamos todos los links de navegación
    const allLinks = document.querySelectorAll('.nav-link, .mobile-nav__link');

    allLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        const linkPath = normalizePath(href);
        // Comprobación simple: ¿Es la ruta exacta?
        const isActive = linkPath === currentPath;

        // Versión Escritorio
        if (link.classList.contains('nav-link')) {
            link.classList.toggle('nav-link--active', isActive);
        }

        // Versión Móvil
        if (link.classList.contains('mobile-nav__link')) {
            link.classList.toggle('mobile-nav__link--active', isActive);
        }
    });
}

/**
 * Inicializa los eventos (Scroll y Menú Móvil).
 * Usa un "flag" (data-initialized) para garantizar que solo se ejecute UNA VEZ,
 * incluso si navegas entre páginas (vital para transition:persist).
 */
export function initHeaderListeners() {
    const navbar = document.getElementById('main-navbar');
    
    // 1. SEGURIDAD: Si no existe o ya fue inicializado, abortamos misión.
    if (!navbar || navbar.dataset.initialized === "true") return;

    // --- A. Lógica de Scroll (Transparente -> Solido) ---
    const onScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add("main-navbar--scrolled");
        } else {
            navbar.classList.remove("main-navbar--scrolled");
        }
    };
    // Ejecutamos una vez al inicio por si recarga la página a mitad del scroll
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // --- B. Lógica del Menú Móvil ---
    const sidebar = document.getElementById('mobile-nav');
    const overlay = document.getElementById('mobile-overlay');
    // Botones que abren o cierran el menú
    const toggleBtns = document.querySelectorAll('#nav-toggle, #close-nav, #mobile-overlay');

    const toggleMenu = () => {
        if (!sidebar || !overlay) return;
        
        const isOpen = sidebar.classList.toggle('mobile-nav--open');
        overlay.classList.toggle('mobile-overlay--active');
        
        // Bloquear el scroll del cuerpo si el menú está abierto
        document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    toggleBtns.forEach(btn => {
        btn?.addEventListener('click', toggleMenu);
    });

    // --- C. Marcar como Inicializado ---
    navbar.dataset.initialized = "true";
    console.log("⚡ Header Events Initialized (Single Instance)");
}