document.addEventListener('astro:page-load', () => {
    // 1. Observer para animaciones de entrada generales (Fade In de textos/secciones)
    const fadeElements = document.querySelectorAll('.scroll-animate');
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.1 });

    fadeElements.forEach(el => fadeObserver.observe(el));

    // 2. Observer para IMÁGENES (Efecto Zoom/Color al hacer scroll)
    // CAMBIO: Se agregó '.team-img-fit' para que la foto del equipo también tenga el efecto
    const imageElements = document.querySelectorAll('.mission-img, .what-is-image img, .team-img-fit');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Se activa cuando entra en pantalla
                entry.target.classList.add('active-scroll-effect');
            } else {
                // (Opcional) Si quieres que se quite el efecto al salir:
                entry.target.classList.remove('active-scroll-effect'); 
            }
        });
    }, { 
        // CAMBIO: threshold bajado a 0.15 para que el efecto inicie antes ("scroll más grande")
        threshold: 0.15, 
        rootMargin: "0px 0px -50px 0px" 
    });

    imageElements.forEach(img => imageObserver.observe(img));
});