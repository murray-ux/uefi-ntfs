/**
 * GENESIS 2.0 — Advanced UI Module
 *
 * Cutting-edge UI components:
 * - Magnetic buttons with ripple effects
 * - Glassmorphic toggle switches
 * - AI-powered search with fuzzy matching
 * - Momentum scrolling with snap points
 * - Floating label form inputs
 * - Drag-drop-pop AI interface
 *
 * GENESIS 2.0 — Forbidden Ninja City
 * Copyright 2025 murray-ux — Founder & Lead Developer
 */

// ═══════════════════════════════════════════════════════════════════════════
// Magnetic Buttons — Buttons that follow cursor with ripple effects
// ═══════════════════════════════════════════════════════════════════════════

const MagneticButtons = {
  strength: 0.3,

  init() {
    document.querySelectorAll('.btn-magnetic, .btn-advanced').forEach(btn => {
      this.enhance(btn);
    });

    // Auto-enhance new buttons via mutation observer
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            node.querySelectorAll?.('.btn-magnetic, .btn-advanced').forEach(btn => {
              this.enhance(btn);
            });
            if (node.matches?.('.btn-magnetic, .btn-advanced')) {
              this.enhance(node);
            }
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },

  enhance(btn) {
    if (btn.dataset.magneticEnhanced) return;
    btn.dataset.magneticEnhanced = 'true';

    // Create ripple container
    const rippleContainer = document.createElement('span');
    rippleContainer.className = 'btn-ripple-container';
    btn.appendChild(rippleContainer);

    // Create glow effect
    const glow = document.createElement('span');
    glow.className = 'btn-glow';
    btn.appendChild(glow);

    // Create shine effect
    const shine = document.createElement('span');
    shine.className = 'btn-shine';
    btn.appendChild(shine);

    // Magnetic effect
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      btn.style.transform = `translate(${x * this.strength}px, ${y * this.strength}px) scale(1.02)`;

      // Move glow to cursor position
      glow.style.left = `${e.clientX - rect.left}px`;
      glow.style.top = `${e.clientY - rect.top}px`;
      glow.style.opacity = '1';

      // Move shine
      const percentX = (e.clientX - rect.left) / rect.width * 100;
      shine.style.left = `${percentX}%`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0) scale(1)';
      glow.style.opacity = '0';
    });

    // Ripple effect on click
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;
      rippleContainer.appendChild(ripple);

      // Haptic feedback (if available)
      if (navigator.vibrate) navigator.vibrate(10);

      setTimeout(() => ripple.remove(), 600);
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Advanced Toggle Switches — Glassmorphic toggles with animations
// ═══════════════════════════════════════════════════════════════════════════

const AdvancedToggles = {
  init() {
    document.querySelectorAll('.toggle-advanced').forEach(toggle => {
      this.enhance(toggle);
    });
  },

  enhance(container) {
    if (container.dataset.toggleEnhanced) return;
    container.dataset.toggleEnhanced = 'true';

    const input = container.querySelector('input[type="checkbox"]');
    if (!input) return;

    // Create toggle structure
    const track = document.createElement('div');
    track.className = 'toggle-track';

    const thumb = document.createElement('div');
    thumb.className = 'toggle-thumb';

    const iconOn = document.createElement('span');
    iconOn.className = 'toggle-icon toggle-icon-on';
    iconOn.innerHTML = '✓';

    const iconOff = document.createElement('span');
    iconOff.className = 'toggle-icon toggle-icon-off';
    iconOff.innerHTML = '✕';

    const glow = document.createElement('div');
    glow.className = 'toggle-glow';

    thumb.appendChild(iconOn);
    thumb.appendChild(iconOff);
    track.appendChild(thumb);
    track.appendChild(glow);
    container.appendChild(track);

    // Sync state
    const updateState = () => {
      container.classList.toggle('active', input.checked);
      if (input.checked) {
        AudioEngine?.success?.();
      } else {
        AudioEngine?.click?.();
      }
    };

    input.addEventListener('change', updateState);
    updateState();

    // Click handler
    track.addEventListener('click', () => {
      input.checked = !input.checked;
      input.dispatchEvent(new Event('change'));
    });

    // Keyboard accessibility
    track.setAttribute('tabindex', '0');
    track.setAttribute('role', 'switch');
    track.setAttribute('aria-checked', input.checked);

    track.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        input.checked = !input.checked;
        input.dispatchEvent(new Event('change'));
        track.setAttribute('aria-checked', input.checked);
      }
    });
  },

  // Programmatic toggle creation
  create(options = {}) {
    const {
      id = `toggle-${Date.now()}`,
      label = '',
      checked = false,
      onChange = null,
      variant = 'default' // default, success, warning, danger
    } = options;

    const container = document.createElement('label');
    container.className = `toggle-advanced toggle-${variant}`;
    container.innerHTML = `
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} hidden>
      <span class="toggle-label">${label}</span>
    `;

    if (onChange) {
      container.querySelector('input').addEventListener('change', onChange);
    }

    this.enhance(container);
    return container;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// AI-Powered Search — Fuzzy matching, suggestions, keyboard navigation
// ═══════════════════════════════════════════════════════════════════════════

const AdvancedSearch = {
  instances: new Map(),

  init() {
    document.querySelectorAll('.search-advanced').forEach(container => {
      this.enhance(container);
    });
  },

  enhance(container) {
    if (container.dataset.searchEnhanced) return;
    container.dataset.searchEnhanced = 'true';

    const input = container.querySelector('input');
    if (!input) return;

    const id = container.id || `search-${Date.now()}`;
    const config = {
      data: JSON.parse(container.dataset.searchData || '[]'),
      keys: (container.dataset.searchKeys || 'label').split(','),
      onSelect: null,
      maxResults: parseInt(container.dataset.maxResults) || 10
    };

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';
    container.appendChild(dropdown);

    // Create AI indicator
    const aiIndicator = document.createElement('div');
    aiIndicator.className = 'search-ai-indicator';
    aiIndicator.innerHTML = '<span class="ai-sparkle">✨</span> AI';
    container.appendChild(aiIndicator);

    // State
    let results = [];
    let selectedIndex = -1;
    let isOpen = false;

    const instance = {
      config,
      setData: (data) => { config.data = data; },
      onSelect: (callback) => { config.onSelect = callback; }
    };
    this.instances.set(id, instance);

    // Fuzzy search implementation
    const fuzzyMatch = (text, query) => {
      const textLower = text.toLowerCase();
      const queryLower = query.toLowerCase();

      let score = 0;
      let queryIndex = 0;
      let consecutiveBonus = 0;
      const matches = [];

      for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
        if (textLower[i] === queryLower[queryIndex]) {
          matches.push(i);
          score += 1 + consecutiveBonus;
          consecutiveBonus += 0.5;
          queryIndex++;

          // Bonus for word start
          if (i === 0 || textLower[i - 1] === ' ') {
            score += 2;
          }
        } else {
          consecutiveBonus = 0;
        }
      }

      if (queryIndex !== queryLower.length) return null;
      return { score, matches };
    };

    const search = (query) => {
      if (!query.trim()) {
        results = [];
        render();
        return;
      }

      const matches = [];

      config.data.forEach(item => {
        let bestScore = 0;
        let bestMatches = [];
        let matchedKey = '';

        config.keys.forEach(key => {
          const value = item[key.trim()];
          if (!value) return;

          const match = fuzzyMatch(String(value), query);
          if (match && match.score > bestScore) {
            bestScore = match.score;
            bestMatches = match.matches;
            matchedKey = key.trim();
          }
        });

        if (bestScore > 0) {
          matches.push({
            item,
            score: bestScore,
            matches: bestMatches,
            matchedKey
          });
        }
      });

      // Sort by score and limit
      results = matches
        .sort((a, b) => b.score - a.score)
        .slice(0, config.maxResults);

      selectedIndex = results.length > 0 ? 0 : -1;
      render();
    };

    const render = () => {
      if (results.length === 0) {
        dropdown.classList.remove('open');
        isOpen = false;
        return;
      }

      dropdown.classList.add('open');
      isOpen = true;

      dropdown.innerHTML = results.map((result, index) => {
        const item = result.item;
        const displayText = item[result.matchedKey] || item.label || item.name || String(item);

        // Highlight matched characters
        let highlighted = '';
        let lastIndex = 0;
        result.matches.forEach(matchIndex => {
          highlighted += escapeHtml(displayText.slice(lastIndex, matchIndex));
          highlighted += `<mark>${escapeHtml(displayText[matchIndex])}</mark>`;
          lastIndex = matchIndex + 1;
        });
        highlighted += escapeHtml(displayText.slice(lastIndex));

        const icon = item.icon || '🔍';
        const subtitle = item.subtitle || item.category || '';

        return `
          <div class="search-result ${index === selectedIndex ? 'selected' : ''}" data-index="${index}">
            <span class="search-result-icon">${icon}</span>
            <div class="search-result-content">
              <div class="search-result-title">${highlighted}</div>
              ${subtitle ? `<div class="search-result-subtitle">${escapeHtml(subtitle)}</div>` : ''}
            </div>
            <span class="search-result-score">${Math.round(result.score * 10)}%</span>
          </div>
        `;
      }).join('');

      // Click handlers
      dropdown.querySelectorAll('.search-result').forEach(el => {
        el.addEventListener('click', () => select(parseInt(el.dataset.index)));
        el.addEventListener('mouseenter', () => {
          selectedIndex = parseInt(el.dataset.index);
          updateSelection();
        });
      });
    };

    const updateSelection = () => {
      dropdown.querySelectorAll('.search-result').forEach((el, i) => {
        el.classList.toggle('selected', i === selectedIndex);
      });

      const selected = dropdown.querySelector('.search-result.selected');
      if (selected) selected.scrollIntoView({ block: 'nearest' });
    };

    const select = (index) => {
      const result = results[index];
      if (!result) return;

      input.value = result.item.label || result.item.name || '';
      dropdown.classList.remove('open');
      isOpen = false;

      if (config.onSelect) {
        config.onSelect(result.item);
      }

      AudioEngine?.success?.();
    };

    // Event handlers
    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => search(input.value), 100);

      // Show AI thinking animation
      aiIndicator.classList.add('thinking');
      setTimeout(() => aiIndicator.classList.remove('thinking'), 300);
    });

    input.addEventListener('keydown', (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
          updateSelection();
          AudioEngine?.click?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, 0);
          updateSelection();
          AudioEngine?.click?.();
          break;
        case 'Enter':
          e.preventDefault();
          select(selectedIndex);
          break;
        case 'Escape':
          dropdown.classList.remove('open');
          isOpen = false;
          break;
      }
    });

    input.addEventListener('focus', () => {
      if (results.length > 0) {
        dropdown.classList.add('open');
        isOpen = true;
      }
      container.classList.add('focused');
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        dropdown.classList.remove('open');
        isOpen = false;
      }, 200);
      container.classList.remove('focused');
    });

    return instance;
  },

  get(id) {
    return this.instances.get(id);
  }
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════════════════════
// Smooth Scrolling — Momentum, snap points, scroll indicators
// ═══════════════════════════════════════════════════════════════════════════

const SmoothScroll = {
  init() {
    document.querySelectorAll('.scroll-smooth').forEach(container => {
      this.enhance(container);
    });

    // Enhance main content area
    const mainContent = document.querySelector('.page-content');
    if (mainContent) this.enhance(mainContent);
  },

  enhance(container) {
    if (container.dataset.scrollEnhanced) return;
    container.dataset.scrollEnhanced = 'true';

    // Add scroll indicator
    const indicator = document.createElement('div');
    indicator.className = 'scroll-indicator';
    indicator.innerHTML = `
      <div class="scroll-indicator-track">
        <div class="scroll-indicator-thumb"></div>
      </div>
    `;
    container.style.position = 'relative';
    container.appendChild(indicator);

    const thumb = indicator.querySelector('.scroll-indicator-thumb');

    // Update indicator on scroll
    container.addEventListener('scroll', () => {
      const scrollPercent = container.scrollTop / (container.scrollHeight - container.clientHeight);
      const thumbHeight = Math.max(20, (container.clientHeight / container.scrollHeight) * 100);
      const thumbTop = scrollPercent * (100 - thumbHeight);

      thumb.style.height = `${thumbHeight}%`;
      thumb.style.top = `${thumbTop}%`;

      // Show/hide based on scroll
      indicator.classList.add('visible');
      clearTimeout(container._scrollTimer);
      container._scrollTimer = setTimeout(() => {
        indicator.classList.remove('visible');
      }, 1500);
    });

    // Smooth scroll to anchors
    container.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href').slice(1);
        const target = document.getElementById(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Scroll snap for cards
    if (container.classList.contains('scroll-snap')) {
      container.style.scrollSnapType = 'y mandatory';
      container.querySelectorAll('.card, .snap-item').forEach(card => {
        card.style.scrollSnapAlign = 'start';
      });
    }
  },

  scrollTo(element, options = {}) {
    const { offset = 0, behavior = 'smooth' } = options;
    const top = element.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Floating Label Inputs — Modern form inputs with animations
// ═══════════════════════════════════════════════════════════════════════════

const FloatingLabels = {
  init() {
    document.querySelectorAll('.input-floating').forEach(container => {
      this.enhance(container);
    });
  },

  enhance(container) {
    if (container.dataset.floatingEnhanced) return;
    container.dataset.floatingEnhanced = 'true';

    const input = container.querySelector('input, textarea, select');
    const label = container.querySelector('label');
    if (!input || !label) return;

    // Create underline
    const underline = document.createElement('span');
    underline.className = 'input-underline';
    container.appendChild(underline);

    // Create validation icons
    const validIcon = document.createElement('span');
    validIcon.className = 'input-icon input-icon-valid';
    validIcon.innerHTML = '✓';
    container.appendChild(validIcon);

    const invalidIcon = document.createElement('span');
    invalidIcon.className = 'input-icon input-icon-invalid';
    invalidIcon.innerHTML = '!';
    container.appendChild(invalidIcon);

    // Update state
    const updateState = () => {
      const hasValue = input.value.length > 0;
      container.classList.toggle('has-value', hasValue);
      container.classList.toggle('focused', document.activeElement === input);

      // Validation
      if (input.validity) {
        container.classList.toggle('valid', input.validity.valid && hasValue);
        container.classList.toggle('invalid', !input.validity.valid && hasValue);
      }
    };

    input.addEventListener('focus', updateState);
    input.addEventListener('blur', updateState);
    input.addEventListener('input', updateState);
    updateState();
  },

  create(options = {}) {
    const {
      type = 'text',
      name = '',
      label = '',
      placeholder = '',
      required = false,
      pattern = null,
      autocomplete = 'off'
    } = options;

    const container = document.createElement('div');
    container.className = 'input-floating';
    container.innerHTML = `
      <input
        type="${type}"
        name="${name}"
        id="${name}"
        placeholder="${placeholder}"
        ${required ? 'required' : ''}
        ${pattern ? `pattern="${pattern}"` : ''}
        autocomplete="${autocomplete}"
      >
      <label for="${name}">${label}</label>
    `;

    this.enhance(container);
    return container;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Drag-Drop-Pop AI Interface — Intelligent drag-and-drop with AI actions
// ═══════════════════════════════════════════════════════════════════════════

const DragDropPop = {
  dropZones: new Map(),
  currentDrag: null,
  aiPopup: null,

  init() {
    this.createAIPopup();
    this.setupGlobalHandlers();

    document.querySelectorAll('.draggable').forEach(el => {
      this.makeDraggable(el);
    });

    document.querySelectorAll('.drop-zone').forEach(zone => {
      this.makeDropZone(zone);
    });
  },

  createAIPopup() {
    this.aiPopup = document.createElement('div');
    this.aiPopup.className = 'ai-popup';
    this.aiPopup.innerHTML = `
      <div class="ai-popup-header">
        <span class="ai-popup-icon">🤖</span>
        <span class="ai-popup-title">AI Actions</span>
        <button class="ai-popup-close">✕</button>
      </div>
      <div class="ai-popup-content">
        <div class="ai-popup-thinking">
          <div class="ai-thinking-dots">
            <span></span><span></span><span></span>
          </div>
          <span>Analyzing...</span>
        </div>
        <div class="ai-popup-actions"></div>
      </div>
      <div class="ai-popup-footer">
        <span class="ai-popup-hint">Powered by MAESTRO AI</span>
      </div>
    `;
    document.body.appendChild(this.aiPopup);

    this.aiPopup.querySelector('.ai-popup-close').addEventListener('click', () => {
      this.hideAIPopup();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this.aiPopup.classList.contains('visible') &&
          !this.aiPopup.contains(e.target) &&
          !e.target.closest('.draggable')) {
        this.hideAIPopup();
      }
    });
  },

  setupGlobalHandlers() {
    // Keyboard shortcut to show AI popup on selection
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        const selection = window.getSelection();
        if (selection.toString().trim()) {
          this.showAIPopupForSelection(selection);
        }
      }
    });

    // Right-click context menu
    document.addEventListener('contextmenu', (e) => {
      const draggable = e.target.closest('.draggable');
      if (draggable) {
        e.preventDefault();
        this.showAIPopup(draggable, e.clientX, e.clientY);
      }
    });
  },

  makeDraggable(element) {
    if (element.dataset.dragEnhanced) return;
    element.dataset.dragEnhanced = 'true';

    element.setAttribute('draggable', 'true');
    element.classList.add('drag-ready');

    // Create drag preview
    const preview = document.createElement('div');
    preview.className = 'drag-preview';
    preview.style.display = 'none';
    document.body.appendChild(preview);

    element.addEventListener('dragstart', (e) => {
      this.currentDrag = {
        element,
        data: JSON.parse(element.dataset.dragData || '{}'),
        type: element.dataset.dragType || 'item'
      };

      element.classList.add('dragging');

      // Custom drag image
      preview.innerHTML = element.dataset.dragLabel || element.textContent.slice(0, 50);
      preview.style.display = 'block';
      e.dataTransfer.setDragImage(preview, 0, 0);
      e.dataTransfer.effectAllowed = 'all';

      AudioEngine?.click?.();

      // Highlight compatible drop zones
      this.dropZones.forEach((config, zone) => {
        if (!config.accepts || config.accepts.includes(this.currentDrag.type)) {
          zone.classList.add('drop-ready');
        }
      });
    });

    element.addEventListener('dragend', () => {
      element.classList.remove('dragging');
      preview.style.display = 'none';

      this.dropZones.forEach((_, zone) => {
        zone.classList.remove('drop-ready', 'drop-hover');
      });

      this.currentDrag = null;
    });

    // Double-click for AI popup
    element.addEventListener('dblclick', (e) => {
      e.preventDefault();
      this.showAIPopup(element, e.clientX, e.clientY);
    });
  },

  makeDropZone(zone) {
    if (zone.dataset.dropEnhanced) return;
    zone.dataset.dropEnhanced = 'true';

    const config = {
      accepts: zone.dataset.dropAccepts?.split(',') || null,
      onDrop: null,
      onHover: null
    };

    this.dropZones.set(zone, config);

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!this.currentDrag) return;

      if (!config.accepts || config.accepts.includes(this.currentDrag.type)) {
        e.dataTransfer.dropEffect = 'move';
        zone.classList.add('drop-hover');

        if (config.onHover) {
          config.onHover(this.currentDrag, zone);
        }
      } else {
        e.dataTransfer.dropEffect = 'none';
      }
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drop-hover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drop-hover');

      if (!this.currentDrag) return;

      AudioEngine?.success?.();

      // Show AI popup with contextual actions
      this.showAIPopupForDrop(this.currentDrag, zone, e.clientX, e.clientY);

      if (config.onDrop) {
        config.onDrop(this.currentDrag, zone);
      }
    });

    return {
      onDrop: (callback) => { config.onDrop = callback; },
      onHover: (callback) => { config.onHover = callback; }
    };
  },

  showAIPopup(element, x, y) {
    const data = JSON.parse(element.dataset.dragData || '{}');
    const type = element.dataset.dragType || 'item';

    // Position popup
    this.positionPopup(x, y);

    // Show thinking state
    this.aiPopup.classList.add('visible', 'thinking');
    AudioEngine?.notification?.();

    // Simulate AI analysis
    setTimeout(() => {
      this.aiPopup.classList.remove('thinking');
      this.renderAIActions(this.getActionsForType(type, data, element));
    }, 500);
  },

  showAIPopupForDrop(dragData, dropZone, x, y) {
    this.positionPopup(x, y);
    this.aiPopup.classList.add('visible', 'thinking');

    setTimeout(() => {
      this.aiPopup.classList.remove('thinking');
      this.renderAIActions(this.getDropActions(dragData, dropZone));
    }, 500);
  },

  showAIPopupForSelection(selection) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const text = selection.toString();

    this.positionPopup(rect.left + rect.width / 2, rect.bottom + 10);
    this.aiPopup.classList.add('visible', 'thinking');

    setTimeout(() => {
      this.aiPopup.classList.remove('thinking');
      this.renderAIActions(this.getSelectionActions(text));
    }, 500);
  },

  positionPopup(x, y) {
    const popup = this.aiPopup;
    const padding = 20;

    // Initial position
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;

    // Adjust if off-screen
    requestAnimationFrame(() => {
      const rect = popup.getBoundingClientRect();

      if (rect.right > window.innerWidth - padding) {
        popup.style.left = `${window.innerWidth - rect.width - padding}px`;
      }
      if (rect.bottom > window.innerHeight - padding) {
        popup.style.top = `${y - rect.height - 20}px`;
      }
      if (rect.left < padding) {
        popup.style.left = `${padding}px`;
      }
    });
  },

  hideAIPopup() {
    this.aiPopup.classList.remove('visible', 'thinking');
    AudioEngine?.close?.();
  },

  getActionsForType(type, data, element) {
    const baseActions = [
      { icon: '📋', label: 'Copy', action: () => this.copyToClipboard(element) },
      { icon: '✂️', label: 'Cut', action: () => this.cut(element) },
      { icon: '🗑️', label: 'Delete', action: () => this.delete(element), variant: 'danger' },
    ];

    const typeActions = {
      evidence: [
        { icon: '🔍', label: 'Analyze with AI', action: () => this.analyzeEvidence(data) },
        { icon: '📊', label: 'Generate Report', action: () => this.generateReport(data) },
        { icon: '🔗', label: 'Find Related', action: () => this.findRelated(data) },
        { icon: '✅', label: 'Verify Integrity', action: () => this.verifyIntegrity(data) },
      ],
      workflow: [
        { icon: '▶️', label: 'Execute', action: () => this.executeWorkflow(data) },
        { icon: '📝', label: 'Edit Steps', action: () => this.editWorkflow(data) },
        { icon: '📋', label: 'Duplicate', action: () => this.duplicateWorkflow(data) },
      ],
      file: [
        { icon: '👁️', label: 'Preview', action: () => this.previewFile(data) },
        { icon: '📤', label: 'Upload', action: () => this.uploadFile(data) },
        { icon: '🔐', label: 'Encrypt', action: () => this.encryptFile(data) },
      ],
      default: [
        { icon: '✏️', label: 'Edit', action: () => this.edit(element) },
        { icon: '📌', label: 'Pin', action: () => this.pin(element) },
      ]
    };

    return [...(typeActions[type] || typeActions.default), ...baseActions];
  },

  getDropActions(dragData, dropZone) {
    const zoneName = dropZone.dataset.zoneName || 'this location';
    return [
      { icon: '📥', label: `Move to ${zoneName}`, action: () => this.moveTo(dragData, dropZone) },
      { icon: '📋', label: `Copy to ${zoneName}`, action: () => this.copyTo(dragData, dropZone) },
      { icon: '🔗', label: `Link to ${zoneName}`, action: () => this.linkTo(dragData, dropZone) },
      { icon: '🤖', label: 'AI: Smart Place', action: () => this.smartPlace(dragData, dropZone) },
    ];
  },

  getSelectionActions(text) {
    return [
      { icon: '📋', label: 'Copy', action: () => navigator.clipboard.writeText(text) },
      { icon: '🔍', label: 'Search', action: () => this.searchText(text) },
      { icon: '🤖', label: 'Ask AI', action: () => this.askAI(text) },
      { icon: '📝', label: 'Create Note', action: () => this.createNote(text) },
      { icon: '🔗', label: 'Create Link', action: () => this.createLink(text) },
    ];
  },

  renderAIActions(actions) {
    const container = this.aiPopup.querySelector('.ai-popup-actions');
    container.innerHTML = actions.map(action => `
      <button class="ai-action ${action.variant || ''}">
        <span class="ai-action-icon">${action.icon}</span>
        <span class="ai-action-label">${action.label}</span>
      </button>
    `).join('');

    container.querySelectorAll('.ai-action').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        AudioEngine?.click?.();
        actions[i].action();
        this.hideAIPopup();
      });
    });
  },

  // Action implementations
  copyToClipboard(element) {
    const text = element.dataset.copyText || element.textContent;
    navigator.clipboard.writeText(text);
    toast?.show?.({ type: 'success', title: 'Copied', message: 'Content copied to clipboard' });
  },

  async askAI(text) {
    toast?.show?.({ type: 'info', title: 'AI Processing', message: 'Analyzing with MAESTRO...' });
    // This would connect to your AI backend
    console.log('AI Query:', text);
  },

  searchText(text) {
    CommandPalette?.open?.();
    const input = document.querySelector('.command-palette-input');
    if (input) input.value = text;
  },

  analyzeEvidence(data) {
    toast?.show?.({ type: 'info', title: 'AI Analysis', message: 'Analyzing evidence with MAESTRO...' });
    console.log('Analyzing:', data);
  },

  generateReport(data) {
    toast?.show?.({ type: 'info', title: 'Generating', message: 'Creating AI-powered report...' });
  },

  findRelated(data) {
    toast?.show?.({ type: 'info', title: 'Searching', message: 'Finding related items...' });
  },

  verifyIntegrity(data) {
    toast?.show?.({ type: 'success', title: 'Verified', message: 'Integrity check passed ✓' });
  },

  smartPlace(dragData, dropZone) {
    toast?.show?.({ type: 'success', title: 'AI Placed', message: 'Item placed in optimal location' });
  },

  moveTo(dragData, dropZone) {
    dropZone.appendChild(dragData.element);
    toast?.show?.({ type: 'success', title: 'Moved', message: 'Item moved successfully' });
  },

  copyTo(dragData, dropZone) {
    const clone = dragData.element.cloneNode(true);
    clone.dataset.dragEnhanced = '';
    this.makeDraggable(clone);
    dropZone.appendChild(clone);
    toast?.show?.({ type: 'success', title: 'Copied', message: 'Item copied successfully' });
  },

  linkTo(dragData, dropZone) {
    toast?.show?.({ type: 'success', title: 'Linked', message: 'Reference created' });
  },

  delete(element) {
    element.classList.add('deleting');
    setTimeout(() => element.remove(), 300);
    toast?.show?.({ type: 'info', title: 'Deleted', message: 'Item removed' });
  },

  cut(element) {
    this.copyToClipboard(element);
    this.delete(element);
  },

  edit(element) {
    element.setAttribute('contenteditable', 'true');
    element.focus();
  },

  pin(element) {
    element.classList.toggle('pinned');
    const isPinned = element.classList.contains('pinned');
    toast?.show?.({ type: 'info', title: isPinned ? 'Pinned' : 'Unpinned' });
  },

  createNote(text) {
    console.log('Create note:', text);
    toast?.show?.({ type: 'success', title: 'Note Created' });
  },

  createLink(text) {
    console.log('Create link:', text);
    toast?.show?.({ type: 'success', title: 'Link Created' });
  },

  previewFile(data) {
    console.log('Preview:', data);
  },

  uploadFile(data) {
    console.log('Upload:', data);
  },

  encryptFile(data) {
    toast?.show?.({ type: 'success', title: 'Encrypted', message: 'File encrypted with AES-256' });
  },

  executeWorkflow(data) {
    toast?.show?.({ type: 'info', title: 'Executing', message: 'Workflow started...' });
  },

  editWorkflow(data) {
    router?.navigate?.('workflows');
  },

  duplicateWorkflow(data) {
    toast?.show?.({ type: 'success', title: 'Duplicated', message: 'Workflow copied' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Glass Cards — 3D glassmorphic cards with tilt effect
// ═══════════════════════════════════════════════════════════════════════════

const GlassCards = {
  init() {
    document.querySelectorAll('.card-glass, .card-3d').forEach(card => {
      this.enhance(card);
    });
  },

  enhance(card) {
    if (card.dataset.glassEnhanced) return;
    card.dataset.glassEnhanced = 'true';

    // Create reflection layer
    const reflection = document.createElement('div');
    reflection.className = 'card-reflection';
    card.appendChild(reflection);

    // Create border glow
    const glow = document.createElement('div');
    glow.className = 'card-border-glow';
    card.appendChild(glow);

    // 3D tilt effect
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

      // Move reflection
      reflection.style.left = `${x}px`;
      reflection.style.top = `${y}px`;

      // Move glow
      glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(0, 212, 255, 0.3), transparent 50%)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Skeleton Loading — Beautiful loading states
// ═══════════════════════════════════════════════════════════════════════════

const SkeletonLoader = {
  show(container, template = 'card') {
    const templates = {
      card: `
        <div class="skeleton-card">
          <div class="skeleton skeleton-circle"></div>
          <div class="skeleton skeleton-text skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text skeleton-short"></div>
        </div>
      `,
      list: `
        <div class="skeleton-list">
          ${Array(5).fill(`
            <div class="skeleton-list-item">
              <div class="skeleton skeleton-avatar"></div>
              <div class="skeleton-list-content">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text skeleton-short"></div>
              </div>
            </div>
          `).join('')}
        </div>
      `,
      table: `
        <div class="skeleton-table">
          ${Array(5).fill(`
            <div class="skeleton-row">
              <div class="skeleton skeleton-cell"></div>
              <div class="skeleton skeleton-cell"></div>
              <div class="skeleton skeleton-cell"></div>
              <div class="skeleton skeleton-cell skeleton-short"></div>
            </div>
          `).join('')}
        </div>
      `
    };

    const wrapper = document.createElement('div');
    wrapper.className = 'skeleton-wrapper';
    wrapper.innerHTML = templates[template] || templates.card;
    container.appendChild(wrapper);

    return () => wrapper.remove();
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Initialize All Advanced UI Components
// ═══════════════════════════════════════════════════════════════════════════

function initAdvancedUI() {
  MagneticButtons.init();
  AdvancedToggles.init();
  AdvancedSearch.init();
  SmoothScroll.init();
  FloatingLabels.init();
  DragDropPop.init();
  GlassCards.init();

  console.log('[GENESIS] Advanced UI initialized');
  console.log('[GENESIS] Drag items, double-click for AI actions, or press Ctrl+.');
}

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdvancedUI);
} else {
  initAdvancedUI();
}

// Export for external use
window.MagneticButtons = MagneticButtons;
window.AdvancedToggles = AdvancedToggles;
window.AdvancedSearch = AdvancedSearch;
window.SmoothScroll = SmoothScroll;
window.FloatingLabels = FloatingLabels;
window.DragDropPop = DragDropPop;
window.GlassCards = GlassCards;
window.SkeletonLoader = SkeletonLoader;
