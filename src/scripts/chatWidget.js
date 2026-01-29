// src/scripts/chatWidget.js

// ============================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================
const CONFIG = {
  MAX_HISTORY: 20,
  DISPLAY_HISTORY: 6,
  FETCH_TIMEOUT: 15000, // 15s - UX optimizado, retry en backend
  TYPING_DELAY: 300,
  STORAGE_KEY: 'jaguar_chat_history',
  USER_ID_KEY: 'jaguar_user_id'
};

// ============================================
// UTILIDADES PURAS (sin side effects)
// ============================================
const Utils = {
  // Client-safe UUID generation
  generateUserId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  },

  // Safe storage con fallback
  safeGetStorage(key, defaultValue = null) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  safeSetStorage(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  // Escape HTML para texto plano
  escapeHtml(text) {
    const htmlEntities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return text.replace(/[&<>"'/]/g, (char) => htmlEntities[char]);
  },

  // Formato de texto con protección XSS (Placeholder Pattern)
  formatText(text) {
    // Regex para detectar URLs y emails
    const linkRegex = /(https?:\/\/[^\s<>"]+)|(\b[a-zA-Z0-9][a-zA-Z0-9._-]*@[a-zA-Z0-9][a-zA-Z0-9._-]*\.[a-zA-Z]{2,}\b)/g;
    
    // Array para almacenar links seguros
    const links = [];
    let placeholderIndex = 0;
    
    // 1. EXTRAER links y reemplazarlos con placeholders
    const textWithPlaceholders = text.replace(linkRegex, (match, url, email) => {
      const placeholder = `__LINK_${placeholderIndex}__`;
      
      if (url) {
        const clean = url.replace(/[.,;!?]$/, '');
        // URL real en href, display text escapado
        links.push(`<a href="${clean}" target="_blank" rel="noopener noreferrer" class="chat-link">${this.escapeHtml(clean)}</a>`);
      } else if (email) {
        const parts = email.split('@');
        if (parts[0].length > 0 && parts[1].length > 2) {
          links.push(`<a href="mailto:${email}" class="chat-link chat-link--email">${this.escapeHtml(email)}</a>`);
        } else {
          // Email inválido, no convertir a link
          return this.escapeHtml(match);
        }
      }
      
      placeholderIndex++;
      return placeholder;
    });
    
    // 2. ESCAPAR el texto restante (sin links)
    const escapedText = this.escapeHtml(textWithPlaceholders);
    
    // 3. RESTAURAR links seguros
    let finalText = escapedText;
    links.forEach((link, index) => {
      finalText = finalText.replace(`__LINK_${index}__`, link);
    });
    
    return finalText;
  },

  // Debounce para prevenir spam
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
};

// ============================================
// CLASE PRINCIPAL (Singleton Pattern)
// ============================================
class ChatWidget {
  constructor() {
    if (ChatWidget.instance) {
      return ChatWidget.instance;
    }

    this.elements = {};
    this.state = {
      isProcessing: false,
      isOpen: false,
      abortController: null
    };

    ChatWidget.instance = this;
  }

  // ------------------------------------
  // INICIALIZACIÓN
  // ------------------------------------
  init() {
    if (!this.cacheElements()) return false;
    if (this.elements.trigger.dataset.initialized === 'true') return false;

    this.loadHistory();
    this.bindEvents();
    this.elements.trigger.dataset.initialized = 'true';

    return true;
  }

  cacheElements() {
    const selectors = {
      trigger: 'chat-trigger',
      closeBtn: 'chat-close-btn',
      chatWindow: 'chat-window',
      chatMessages: 'chat-messages',
      input: 'chat-input',
      sendBtn: 'chat-send-btn',
      suggestions: 'suggestions-container',
      typingIndicator: 'typing-indicator'
    };

    for (const [key, id] of Object.entries(selectors)) {
      this.elements[key] = document.getElementById(id);
    }

    // Validación crítica
    return !!(this.elements.trigger && this.elements.chatWindow && 
              this.elements.chatMessages && this.elements.input);
  }

  // ------------------------------------
  // GESTIÓN DE ESTADO
  // ------------------------------------
  toggleProcessing(disable) {
    this.state.isProcessing = disable;
    
    if (this.elements.input) this.elements.input.disabled = disable;
    if (this.elements.sendBtn) {
      this.elements.sendBtn.disabled = disable;
      this.elements.sendBtn.classList.toggle('chat-input__send--disabled', disable);
    }
    if (this.elements.suggestions) {
      this.elements.suggestions.classList.toggle('disabled', disable);
    }
  }

  toggleChat() {
    this.state.isOpen = !this.state.isOpen;
    
    this.elements.chatWindow.classList.toggle('chat-window--open', this.state.isOpen);
    this.elements.trigger.classList.toggle('chat-trigger--active', this.state.isOpen);

    if (this.state.isOpen) {
      this.onOpen();
    } else {
      this.onClose();
    }
  }

  onOpen() {
    this.renderSuggestions();
    this.scrollToBottom();
    
    // Non-blocking focus
    requestAnimationFrame(() => {
      this.elements.input?.focus();
    });

    // Hide notification badge
    const badge = this.elements.trigger.querySelector('.chat-notification-badge');
    if (badge) badge.style.display = 'none';
  }

  onClose() {
    // Cancelar requests pendientes
    if (this.state.abortController) {
      this.state.abortController.abort();
      this.state.abortController = null;
    }
    this.toggleProcessing(false);
  }

  // ------------------------------------
  // UI RENDERING
  // ------------------------------------
  scrollToBottom() {
    if (!this.elements.chatMessages) return;
    this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
  }

  showTyping(show) {
    if (!this.elements.typingIndicator) return;
    this.elements.typingIndicator.style.display = show ? 'block' : 'none';
    if (show) this.scrollToBottom();
  }

  addMessage(text, isUser, save = false) {
    const div = document.createElement('div');
    div.className = `chat-message ${isUser ? 'chat-message--user' : 'chat-message--bot'}`;
    
    // Placeholder pattern: seguro y funcional
    div.innerHTML = Utils.formatText(text);
    
    this.elements.chatMessages.appendChild(div);
    this.scrollToBottom();

    if (save) {
      this.saveToHistory(text, isUser ? 'user' : 'bot');
    }
  }

  renderSuggestions() {
    if (!this.elements.suggestions) return;

    const suggestions = [
      '¿Cómo unirme?',
      'Patrocinios',
      'Ubicación'
    ];

    this.elements.suggestions.innerHTML = suggestions
      .map(text => `<div class="suggestion-chip" data-text="${text}">${text}</div>`)
      .join('');

    // Event delegation
    this.elements.suggestions.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.sendMessage(chip.dataset.text, false);
      });
    });
  }

  // ------------------------------------
  // HISTORIAL (Session Storage)
  // ------------------------------------
  loadHistory() {
    const history = Utils.safeGetStorage(CONFIG.STORAGE_KEY, []);
    
    if (history.length > 0) {
      history.forEach(msg => {
        const div = document.createElement('div');
        div.className = `chat-message chat-message--${msg.remitente === 'user' ? 'user' : 'bot'}`;
        div.innerHTML = Utils.formatText(msg.texto);
        this.elements.chatMessages.appendChild(div);
      });
    } else {
      // Mensaje de bienvenida
      this.addMessage(
        'Hola, soy el asistente virtual de Jaguar Racing. ¿En qué puedo ayudarte hoy?',
        false,
        false
      );
    }
  }

  saveToHistory(text, sender) {
    const history = Utils.safeGetStorage(CONFIG.STORAGE_KEY, []);
    history.push({ texto: text, remitente: sender });
    
    // Limitar tamaño del historial
    const trimmed = history.slice(-CONFIG.MAX_HISTORY);
    Utils.safeSetStorage(CONFIG.STORAGE_KEY, trimmed);
  }

  getContextMessages() {
    const history = Utils.safeGetStorage(CONFIG.STORAGE_KEY, []);
    return history
      .slice(-CONFIG.DISPLAY_HISTORY)
      .map(m => ({
        role: m.remitente === 'user' ? 'user' : 'assistant',
        content: m.texto
      }));
  }

  // ------------------------------------
  // NETWORK LAYER (timeout, sin retry)
  // ------------------------------------
  async sendMessage(manualText = null, keepFocus = true) {
    if (this.state.isProcessing) return;

    const text = manualText || this.elements.input.value.trim();
    if (!text) return;

    // User ID lazy initialization
    let userId = localStorage.getItem(CONFIG.USER_ID_KEY);
    if (!userId) {
      userId = Utils.generateUserId();
      localStorage.setItem(CONFIG.USER_ID_KEY, userId);
    }

    // UI feedback inmediato
    this.toggleProcessing(true);
    if (!manualText) this.elements.input.value = '';
    
    this.addMessage(text, true, true);
    this.showTyping(true);

    // Crear AbortController para timeout
    this.state.abortController = new AbortController();
    const timeoutId = setTimeout(
      () => this.state.abortController.abort(),
      CONFIG.FETCH_TIMEOUT
    );

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          messages: this.getContextMessages()
        }),
        signal: this.state.abortController.signal
      });

      clearTimeout(timeoutId);
      this.showTyping(false);

      const data = await response.json();

      if (response.status === 429) {
        this.addMessage(
          data.content || 'Demasiadas peticiones. Intenta en unos segundos.',
          false
        );
      } else if (response.ok) {
        this.addMessage(data.content, false, true);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      clearTimeout(timeoutId);
      this.showTyping(false);

      if (error.name === 'AbortError') {
        this.addMessage('La respuesta tardó demasiado. Intenta de nuevo.', false);
      } else {
        this.addMessage('Error de conexión. Verifica tu internet.', false);
      }
    } finally {
      this.state.abortController = null;
      this.toggleProcessing(false);
      
      if (keepFocus && !manualText) {
        requestAnimationFrame(() => this.elements.input?.focus());
      }
    }
  }

  // ------------------------------------
  // EVENT BINDING
  // ------------------------------------
  bindEvents() {
    // Toggle chat
    this.elements.trigger.addEventListener('click', () => this.toggleChat());
    this.elements.closeBtn?.addEventListener('click', () => this.toggleChat());

    // Send message
    const sendHandler = () => this.sendMessage();
    this.elements.sendBtn?.addEventListener('click', sendHandler);
    
    this.elements.input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendHandler();
      }
    });

    // Cleanup on page unload (prevenir memory leaks en SPA)
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  cleanup() {
    if (this.state.abortController) {
      this.state.abortController.abort();
    }
    this.elements = {};
    ChatWidget.instance = null;
  }
}

// ============================================
// EXPORT (para Astro Islands)
// ============================================
export function initChatWidget() {
  // Guard para SSR
  if (typeof window === 'undefined') return;

  // Esperar a que DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const widget = new ChatWidget();
      widget.init();
    });
  } else {
    const widget = new ChatWidget();
    widget.init();
  }
}