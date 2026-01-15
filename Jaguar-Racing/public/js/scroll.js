document.addEventListener('astro:page-load', () => {
    // 1. Observer para animaciones de entrada generales (Fade In)
    const fadeElements = document.querySelectorAll('.scroll-animate');
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.1 });

    fadeElements.forEach(el => fadeObserver.observe(el));

    // 2. Observer NUEVO para imágenes (Efecto Zoom/Color al hacer scroll)
    // Seleccionamos las imágenes específicas de Contexto y Baja
    const imageElements = document.querySelectorAll('.context-img, .what-is-image img');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Añade la clase que activa el CSS de color y zoom
                entry.target.classList.add('active-scroll-effect');
            } else {
                // Opcional: Quitarla si sale de pantalla para que se anime de nuevo al volver
                // entry.target.classList.remove('active-scroll-effect'); 
            }
        });
    }, { 
        threshold: 0.3, // Se activa cuando el 30% de la imagen es visible
        rootMargin: "0px 0px -100px 0px" // Ajuste para que se active un poco antes del centro
    });

    imageElements.forEach(img => imageObserver.observe(img));
});