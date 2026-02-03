/**
 * @file header.js
 * @description Manages navigation behavior including scroll effects, 
 * active link states, and mobile menu interactions.
 */

// ============================================
// UTILITIES
// ============================================

/**
 * Normalizes a URL path by removing trailing slashes (except for root).
 * @param {string} path - The URL path to normalize.
 * @returns {string} The normalized path.
 */
const normalizePath = (path) => path === '/' ? path : path.replace(/\/$/, '');

// ============================================
// SCROLL LOGIC
// ============================================

/**
 * Handles the scroll event to toggle the navbar styling.
 * Defined externally to maintain a stable reference for addEventListener.
 */
const handleScroll = () => {
  const navbar = document.getElementById('main-navbar');
  if (!navbar) return;

  if (window.scrollY > 50) {
    navbar.classList.add("main-navbar--scrolled");
  } else {
    navbar.classList.remove("main-navbar--scrolled");
  }
};

// ============================================
// ACTIVE STATE LOGIC
// ============================================

/**
 * Updates the visual state of navigation links based on the current URL.
 */
export function updateActiveLinks() {
  const currentPath = normalizePath(window.location.pathname);
  const links = document.querySelectorAll('.nav-link, .mobile-nav__link');

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    const linkPath = normalizePath(href);
    const isActive = linkPath === currentPath;

    // Toggle specific classes based on the link type
    if (link.classList.contains('nav-link')) {
      link.classList.toggle('nav-link--active', isActive);
    }
    
    if (link.classList.contains('mobile-nav__link')) {
      link.classList.toggle('mobile-nav__link--active', isActive);
    }
  });
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initializes all header event listeners.
 * Safe to call multiple times (idempotent).
 */
export function initHeaderListeners() {
  const navbar = document.getElementById('main-navbar');
  if (!navbar) return;

  // 1. Setup Scroll Listener (Debounced by browser via passive flag)
  // Remove existing listener first to prevent duplication on re-renders
  window.removeEventListener('scroll', handleScroll);
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  // Initial check in case page is already scrolled on load
  handleScroll();

  // 2. Prevent double initialization for the Mobile Menu
  if (navbar.dataset.initialized === "true") return;

  const sidebar = document.getElementById('mobile-nav');
  const overlay = document.getElementById('mobile-overlay');
  const toggleTriggers = document.querySelectorAll('#nav-toggle, #close-nav, #mobile-overlay');

  const toggleMenu = () => {
    if (!sidebar || !overlay) return;
    
    const isOpen = sidebar.classList.toggle('mobile-nav--open');
    overlay.classList.toggle('mobile-overlay--active');
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  toggleTriggers.forEach(btn => {
    btn?.addEventListener('click', toggleMenu);
  });

  // Mark as initialized
  navbar.dataset.initialized = "true";
}