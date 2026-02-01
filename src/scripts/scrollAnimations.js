/**
 * Sistema de animaciones al scroll - Solución 1A Sincronizada
 * Anima contenedores completos con todos sus elementos hijos simultáneamente
 */
export function initScrollAnimations() {
    const observerConfig = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };
    
    const handleIntersection = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    };
    
    const unifiedObserver = new IntersectionObserver(handleIntersection, observerConfig);
    
    const sections = document.querySelectorAll('.scroll-animate');
    
    if (sections.length > 0) {
        sections.forEach(section => unifiedObserver.observe(section));
    } else {
    }
    
    return function cleanup() {
        unifiedObserver.disconnect();
    };
}