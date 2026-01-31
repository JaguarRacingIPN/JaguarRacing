// src/scripts/header.js

/* =============================================================================
   UTILIDADES
   ============================================================================= */
const normalizePath = (path) => path === '/' ? path : path.replace(/\/$/, '');

/* =============================================================================
   LÓGICA DEL SCROLL (Optimizada para no duplicarse)
   ============================================================================= */
/**
 * Definimos onScroll AFUERA de la función de inicialización.
 * Esto mantiene la referencia en memoria constante.
 * Si Astro re-ejecuta el script, addEventListener detectará que es la misma función
 * y NO añadirá un duplicado.
 */
const onScrollHandler = () => {
    const navbar = document.getElementById('main-navbar');
    // Si no hay navbar en esta página, no hacemos nada (pero no explotamos)
    if (!navbar) return;

    if (window.scrollY > 50) {
        navbar.classList.add("main-navbar--scrolled");
    } else {
        navbar.classList.remove("main-navbar--scrolled");
    }
};

/* =============================================================================
   LÓGICA DE NAVEGACIÓN ACTIVA
   ============================================================================= */
export function updateActiveLinks() {
    const currentPath = normalizePath(window.location.pathname);
    const allLinks = document.querySelectorAll('.nav-link, .mobile-nav__link');

    allLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        const linkPath = normalizePath(href);
        const isActive = linkPath === currentPath;

        if (link.classList.contains('nav-link')) {
            link.classList.toggle('nav-link--active', isActive);
        }
        if (link.classList.contains('mobile-nav__link')) {
            link.classList.toggle('mobile-nav__link--active', isActive);
        }
    });
}

/* =============================================================================
   INICIALIZACIÓN PRINCIPAL
   ============================================================================= */
export function initHeaderListeners() {
    const navbar = document.getElementById('main-navbar');
    if (!navbar) return;

    // 1. SCROLL: Ahora es seguro llamar a esto múltiples veces.
    // El navegador ignorará llamadas repetidas a la misma función referenciada.
    window.removeEventListener('scroll', onScrollHandler); // Limpieza preventiva (opcional pero buena práctica)
    window.addEventListener('scroll', onScrollHandler, { passive: true });
    
    // Ejecutamos una vez para asegurar el estado inicial
    onScrollHandler();

    // 2. MENÚ MÓVIL
    // Aquí sí usamos el check de initialized porque los botones se recrean
    // y no queremos añadir doble click listener al MISMO botón si persiste.
    if (navbar.dataset.initialized === "true") return;

    const sidebar = document.getElementById('mobile-nav');
    const overlay = document.getElementById('mobile-overlay');
    const toggleBtns = document.querySelectorAll('#nav-toggle, #close-nav, #mobile-overlay');

    const toggleMenu = () => {
        if (!sidebar || !overlay) return;
        const isOpen = sidebar.classList.toggle('mobile-nav--open');
        overlay.classList.toggle('mobile-overlay--active');
        document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    toggleBtns.forEach(btn => {
        btn?.addEventListener('click', toggleMenu);
    });

    navbar.dataset.initialized = "true";
}