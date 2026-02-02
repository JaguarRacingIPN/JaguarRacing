/**
 * @file competenciaTimer.js
 * @description Module responsible for managing countdown timers for Jaguar Racing competitions.
 * It handles delta time calculation, DOM updates, and resource cleanup.
 * @version 2.0.0
 */

/**
 * Initializes the countdown timers for specific competition targets.
 * * This function identifies active timer elements in the DOM based on predefined IDs,
 * calculates the remaining time until the target dates, and updates the text content
 * every second. It returns a cleanup function to stop the interval when the component unmounts.
 * * @returns {Function} A cleanup function to clear the interval (useful for SPA navigation/Astro).
 */
export function initTimer() {
    /**
     * Configuration object for competition dates.
     * Note: JavaScript Date month index is 0-based (0 = January, 8 = September, 10 = November).
     * @type {Object.<string, number>}
     */
    const targets = {
        // Target: Baja SAE Mexico (Nov 20, 2026 - 08:00 AM)
        'timer-mexico': new Date(2026, 10, 20, 8, 0, 0).getTime(),
        
        // Target: All Terrain (Sep 11, 2026 - 08:00 AM)
        'timer-allterrain': new Date(2026, 8, 11, 8, 0, 0).getTime()
    };

    // Filter to track only elements present in the current DOM to minimize overhead
    const activeTimers = Object.keys(targets).filter(id => document.getElementById(id));
    
    // Early exit if no timer elements are found in the current view
    if (activeTimers.length === 0) return () => {};

    /**
     * Calculates the time difference and updates the DOM elements.
     * Executed on every interval tick.
     */
    function updateTimers() {
        const now = Date.now();

        activeTimers.forEach(id => {
            const element = document.getElementById(id);
            if (!element) return;

            const distance = targets[id] - now;

            // Handle competition start/expiration
            if (distance < 0) {
                element.innerText = "¡EN COMPETENCIA!";
                element.style.color = "var(--jaguar-gold, #A67C00)";
                return;
            }

            // Time calculations
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            // Formatting utility for zero-padding
            const fmt = (num) => num.toString().padStart(2, '0');

            element.innerText = `${fmt(days)}d ${fmt(hours)}h ${fmt(minutes)}m ${fmt(seconds)}s`;
        });
    }

    // Initial call to avoid 1-second delay before first render
    updateTimers();
    
    // Start interval
    const timerInterval = setInterval(updateTimers, 1000);

    // Return cleanup closure
    return function cleanup() {
        clearInterval(timerInterval);
    };
}