document.addEventListener('astro:page-load', () => {
    
    // ==========================================
    // 1. Observer GENERAL (Textos / Secciones)
    // ==========================================
    const fadeElements = document.querySelectorAll('.scroll-animate');
    
    const fadeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 1. Activamos la clase
                entry.target.classList.add('is-visible');
                
                // 2. CRÍTICO: Dejamos de observar este elemento
                // Esto libera recursos inmediatamente
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    fadeElements.forEach(el => fadeObserver.observe(el));


    // ==========================================
    // 2. Observer IMÁGENES (Zoom / Efectos)
    // ==========================================
    const imageElements = document.querySelectorAll('.mission-img, .what-is-image img, .team-img-fit');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 1. Activamos el efecto
                entry.target.classList.add('active-scroll-effect');
                
                // 2. CRÍTICO: Dejamos de observar y eliminamos el 'else'
                // Ya no quitamos la clase si sale de pantalla. Se queda así para siempre.
                observer.unobserve(entry.target);
            }
        });
    }, { 
        threshold: 0.15, 
        rootMargin: "0px 0px -50px 0px" 
    });

    imageElements.forEach(img => imageObserver.observe(img));
});