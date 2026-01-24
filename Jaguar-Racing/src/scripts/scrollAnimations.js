/**
 * src/scripts/scrollAnimations.js
 * Maneja las animaciones de entrada al hacer scroll.
 */

export function initScrollAnimations() {
    // Arrays para guardar referencias y poder desconectar después
    let observers = [];

    // ==========================================
    // 1. Observer GENERAL (Textos / Secciones)
    // ==========================================
    const fadeElements = document.querySelectorAll('.scroll-animate');
    
    if (fadeElements.length > 0) {
        const fadeObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target); // Dejar de mirar este elemento
                }
            });
        }, { threshold: 0.1 });

        fadeElements.forEach(el => fadeObserver.observe(el));
        observers.push(fadeObserver);
    }

    // ==========================================
    // 2. Observer IMÁGENES (Zoom / Efectos)
    // ==========================================
    // Seleccionamos todas las imágenes que requieren efecto
    const imageElements = document.querySelectorAll('.mission-img, .what-is-image img, .team-img-fit');
    
    if (imageElements.length > 0) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active-scroll-effect');
                    observer.unobserve(entry.target); // Animación de una sola vez
                }
            });
        }, { 
            threshold: 0.15, 
            rootMargin: "0px 0px -50px 0px" 
        });

        imageElements.forEach(img => imageObserver.observe(img));
        observers.push(imageObserver);
    }

    console.log("Sistema de Scroll FX iniciado ✨");

    // ==========================================
    // RETURN CLEANUP (Para Astro View Transitions)
    // ==========================================
    return function cleanup() {
        // Matamos todos los observadores activos al cambiar de página
        observers.forEach(obs => obs.disconnect());
        observers = [];
    };
}