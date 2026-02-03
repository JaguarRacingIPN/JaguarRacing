export function initHeroSlider() {
    const wrapper = document.querySelector('.slideshow-wrapper');
    if (!wrapper) return;

    const slides = wrapper.querySelectorAll('.bg-slide');
    if (slides.length <= 1) return;

    let currentIndex = 0;
    const intervalTime = 3000; 
    let interval;

    function startSlider() {
        interval = setInterval(() => {
            if (!document.contains(wrapper)) {
                clearInterval(interval);
                return;
            }
            slides[currentIndex].classList.remove('active');

            currentIndex = (currentIndex + 1) % slides.length;

            slides[currentIndex].classList.add('active');

        }, intervalTime);
    }

    startSlider();

    return function cleanup() {
        if (interval) clearInterval(interval);
    };
}