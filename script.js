// openDesk Edu Landscape - Interactive JavaScript

class LandscapeApp {
  constructor() {
    this.data = null;
    this.currentFilter = 'all';
    this.currentMaturityFilter = 'all';
    this.searchQuery = '';
    this.init();
  }

  async init() {
    await this.loadData();
    this.restoreFromHash();
    this.renderLandscape();
    this.renderCategoryNav();
    this.renderStats();
    this.renderMetadata();
    this.renderAbout();
    this.updateActiveFilters();
    this.setupEventListeners();
    this.initTheme();
    this.updateLastUpdated();
    window.app = this;
  }

  async loadData() {
    try {
      if (window.__LANDSCAPE_DATA) {
        this.data = window.__LANDSCAPE_DATA;
      } else {
        this.data = this.getEmbeddedData();
      }
    } catch (error) {
      console.error('Failed to load landscape data:', error);
    }
  }

  getEmbeddedData() {
    return window.__LANDSCAPE_DATA || { categories: [], metadata: {} };
  }

  renderLandscape() {
    const skeleton = document.getElementById('landscape-skeleton');
    if (skeleton) skeleton.style.display = 'none';
    const container = document.getElementById('landscape');

    const existing = container.querySelectorAll('.category');
    if (existing.length > 0) {
      existing.forEach(el => el.classList.add('filtering'));
      setTimeout(() => {
        container.innerHTML = '';
        this._renderContent(container);
      }, 200);
      return;
    }

    container.innerHTML = '';
    this._renderContent(container);
  }

  _renderContent(container) {
    let hasVisible = false;
    let visibleCount = 0;
    this.data.categories.forEach(category => {
      const visibleSubcategories = category.subcategories
        .map(sub => ({
          ...sub,
          items: sub.items.filter(item => this.matchesFilter(item))
        }))
        .filter(sub => sub.items.length > 0);

      if (visibleSubcategories.length === 0) return;

      hasVisible = true;
      const categoryEl = document.createElement('div');
      categoryEl.className = 'category';
      categoryEl.id = `cat-${category.id}`;
      const totalItems = category.subcategories.reduce((sum, s) => sum + (s.items || []).length, 0);
      const visibleItems = visibleSubcategories.reduce((sum, s) => sum + s.items.length, 0);
      visibleCount += visibleItems;
      categoryEl.innerHTML = `
        <div class="category-header" style="--cat-color:${category.color}; background: linear-gradient(135deg, ${category.color}18 0%, ${category.color}3D 100%)">
          <div class="category-title-row">
            <span class="category-icon">${category.icon}</span>
            <h2>${this.escapeHtml(category.name)}</h2>
            <span class="count-badge" title="${visibleItems} of ${totalItems} services">${totalItems}</span>
          </div>
          <p>${this.escapeHtml(category.description)}</p>
        </div>
      `;

      visibleSubcategories.forEach(sub => {
        const subEl = document.createElement('div');
        subEl.className = 'subcategory';
        subEl.innerHTML = `
          <h3 class="subcategory-title">${this.escapeHtml(sub.name)}</h3>
          <div class="items-grid">
            ${sub.items.map(item => this.renderItem(item)).join('')}
          </div>
        `;
        categoryEl.appendChild(subEl);
      });

      container.appendChild(categoryEl);
    });

    this.updateResultCount(visibleCount);

    if (!hasVisible) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No services match your filters</h3>
        <p>Try adjusting your search query or filter selection.</p>
        <button class="clear-filters-btn" onclick="window.app.clearFilters()">Clear all filters</button>
      </div>`;
    }
  }

  updateResultCount(visible) {
    const el = document.getElementById('search-results');
    if (!el) return;
    const total = this.data.categories.reduce((s, c) => s + c.subcategories.reduce((x, sub) => x + sub.items.length, 0), 0);
    el.textContent = visible === total ? `${total} services` : `${visible} of ${total} services shown`;
  }

  renderItem(item) {
    const tagsHtml = item.tags.map(tag => `<span class="tag">${this.highlightText(tag)}</span>`).join('');
    const logoHtml = item.logo
      ? `<img class="item-logo" src="hosted_logos/${item.logo}" alt="${this.escapeHtml(item.name)} logo" loading="lazy">`
      : `<div class="item-logo item-logo-fallback" style="background:hsl(${this.hashCode(item.name) % 360}, 60%, 40%)">${this.escapeHtml(item.name.charAt(0))}</div>`;

    const starsHtml = item.stars ? `<span class="item-stars" title="GitHub stars">⭐ ${this.escapeHtml(item.stars)}</span>` : '';
    const langHtml = item.language ? `<span class="item-language">${this.highlightText(item.language)}</span>` : '';
    const orgHtml = item.organization ? `<span class="item-org" title="${this.escapeHtml(item.organization)}">${this.highlightText(item.organization)}</span>` : '';
    const docsHtml = item.docs_url
      ? `<a class="item-docs" href="${item.docs_url}" target="_blank" rel="noopener" title="Documentation">📖</a>`
      : '';

    return `
      <div class="item-card" tabindex="0" role="link" aria-label="View details for ${this.escapeHtml(item.name)}" style="--accent:hsl(${this.hashCode(item.name) % 360}, 70%, 55%)">
        <div class="item-header">
          <div class="item-name-row">
            ${logoHtml}
            <div class="item-name">${this.highlightText(item.name)}</div>
          </div>
          <div class="item-badges">
            <span class="tier-badge tier-${item.tier}" title="Service tier">${item.tier}</span>
            <span class="maturity-badge maturity-${item.maturity}" title="Maturity level">${item.maturity}</span>
          </div>
        </div>
        <div class="item-description">${this.highlightText(item.description)}</div>
        <div class="item-tags">${tagsHtml}</div>
        <div class="item-meta">
          <span class="item-license">${this.escapeHtml(item.license)}</span>
          ${langHtml}
          ${docsHtml}
        </div>
        ${orgHtml || starsHtml || item.repository ? `
        <div class="item-footer">
          ${orgHtml}
          ${starsHtml}
          ${item.repository ? `<div class="item-repo" title="${this.escapeHtml(item.repository)}">${this.escapeHtml(item.repository.replace('https://github.com/', ''))}</div>` : ''}
        </div>` : ''}
      </div>
    `;
  }

  highlightText(text) {
    const escaped = this.escapeHtml(text);
    if (!this.searchQuery) return escaped;
    const q = escaped.trim();
    if (!q) return escaped;
    try {
      const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return escaped.replace(re, '<mark>$1</mark>');
    } catch (e) {
      return escaped;
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }

  renderStats() {
    const m = this.data.metadata;
    this.animateCount('stat-services', m.total_services);
    this.animateCount('stat-categories', m.total_categories);
    this.animateCount('stat-count-services', m.total_services);
    this.animateCount('stat-count-categories', m.total_categories);
    this.animateCount('stat-count-licenses', m.license_breakdown.length);
  }

  animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const duration = 700;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  renderMetadata() {
    this.renderLicenseStats();
    this.renderMaturityStats();
    this.renderTierStats();
  }

  renderLicenseStats() {
    const container = document.getElementById('license-stats');
    const rows = this.data.metadata.license_breakdown.sort((a, b) => b.count - a.count);
    const max = rows[0] ? rows[0].count : 1;
    container.innerHTML = rows.map(item => `
        <div class="stat-bar">
          <div class="stat-bar-main">
            <span class="stat-label-sm">${this.escapeHtml(item.license)}</span>
            <span class="stat-value">${item.count}</span>
          </div>
          <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${Math.round(item.count / max * 100)}%"></div></div>
        </div>
      `).join('');
  }

  renderMaturityStats() {
    const container = document.getElementById('maturity-stats');
    if (!container || !this.data.metadata.maturity_levels) return;
    const rows = this.data.metadata.maturity_levels.sort((a, b) => b.count - a.count);
    const max = rows[0] ? rows[0].count : 1;
    container.innerHTML = rows.map(item => `
        <div class="stat-bar">
          <div class="stat-bar-main">
            <span class="stat-label-sm">${item.level.charAt(0).toUpperCase() + item.level.slice(1)}</span>
            <span class="stat-value">${item.count}</span>
          </div>
          <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${Math.round(item.count / max * 100)}%"></div></div>
        </div>
      `).join('');
  }

  renderAbout() {
    const el = document.getElementById('tier-summary');
    if (!el) return;
    const t = {};
    this.data.categories.flatMap(c => c.subcategories).flatMap(s => s.items)
      .forEach(i => { t[i.tier] = (t[i.tier] || 0) + 1; });
    const tierDefs = {
      critical: 'Foundation services with 99.9% availability targets (e.g., Keycloak, MinIO, email infrastructure)',
      high: 'Important services with 99.5% availability (e.g., LMS, video conferencing, helpdesk)',
      standard: 'Collaboration tools with 99.0% availability (e.g., Kanban, surveys, documentation)',
      low: 'Supporting tools (e.g., stateless diagram editors, lightweight utilities)'
    };
    el.innerHTML = ['critical', 'high', 'standard', 'low'].map(tier =>
      `<li><strong>${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier</strong> (${t[tier] || 0} services): ${tierDefs[tier]}</li>`
    ).join('');
  }

  renderTierStats() {
    const container = document.getElementById('tier-stats');
    const rows = this.data.metadata.service_tiers;
    const total = rows.reduce((s, r) => s + r.count, 0);
    const tierColors = {
      critical: '#ff3b5c',
      high: '#ffaa00',
      standard: '#06ffa5',
      low: '#a0aec0'
    };
    const order = ['critical', 'high', 'standard', 'low'];
    const sorted = order.map(t => rows.find(r => r.tier === t)).filter(Boolean);
    // Conic-gradient donut
    let acc = 0;
    const segments = sorted.map(r => {
      const from = acc;
      acc += r.count / total * 360;
      return `${tierColors[r.tier] || '#888'} ${from}deg ${acc}deg`;
    }).join(', ');
    const donutHtml = `
      <div class="tier-donut-wrap">
        <div class="tier-donut" style="background: conic-gradient(${segments})">
          <div class="tier-donut-hole">
            <strong>${total}</strong>
            <span>services</span>
          </div>
        </div>
        <div class="tier-donut-legend">
          ${sorted.map(r => `
            <span><i style="background:${tierColors[r.tier] || '#888'}"></i>${r.tier.charAt(0).toUpperCase() + r.tier.slice(1)} · ${r.count}</span>
          `).join('')}
        </div>
      </div>
    `;
    container.innerHTML = donutHtml + sorted.map(r => `
        <div class="stat-bar">
          <div class="stat-bar-main">
            <span class="stat-label-sm">${r.tier.charAt(0).toUpperCase() + r.tier.slice(1)} Tier</span>
            <span class="stat-value">${r.count}</span>
          </div>
          <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${Math.round(r.count / total * 100)}%; background:${tierColors[r.tier] || 'var(--primary)'}"></div></div>
        </div>
      `).join('');
  }

  updateActiveFilters() {
    const container = document.getElementById('active-filters');
    if (!container) return;
    const chips = [];
    if (this.currentFilter !== 'all') {
      chips.push(`<button class="filter-chip" data-chip-type="tier" title="Remove tier filter">Tier: ${this.escapeHtml(this.currentFilter)} <span class="chip-x">✕</span></button>`);
    }
    if (this.currentMaturityFilter !== 'all') {
      chips.push(`<button class="filter-chip" data-chip-type="maturity" title="Remove maturity filter">Maturity: ${this.escapeHtml(this.currentMaturityFilter)} <span class="chip-x">✕</span></button>`);
    }
    if (this.searchQuery.trim()) {
      chips.push(`<button class="filter-chip" data-chip-type="search" title="Clear search">“${this.escapeHtml(this.searchQuery.trim())}” <span class="chip-x">✕</span></button>`);
    }
    container.innerHTML = chips.length
      ? chips.join('') + `<button class="filter-chip chip-clear-all" data-chip-type="all">Clear all</button>`
      : '';
    container.classList.toggle('has-filters', chips.length > 0);
    container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const type = chip.dataset.chipType;
        if (type === 'tier') { this.currentFilter = 'all'; this.syncFilterButtons(); }
        if (type === 'maturity') { this.currentMaturityFilter = 'all'; this.syncFilterButtons(); }
        if (type === 'search') { this.searchQuery = ''; const si = document.getElementById('search'); if (si) si.value = ''; }
        if (type === 'all') { this.clearFilters(); return; }
        this.renderLandscape();
        this.updateActiveFilters();
        this.updateHash();
      });
    });
  }

  matchesFilter(item) {
    const tierMatch = this.currentFilter === 'all' || item.tier === this.currentFilter;
    if (!tierMatch) return false;

    const maturityMatch = this.currentMaturityFilter === 'all' || item.maturity === this.currentMaturityFilter;
    if (!maturityMatch) return false;

    if (!this.searchQuery) return true;

    const query = this.searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(query) ||
           item.description.toLowerCase().includes(query) ||
           item.tags.some(tag => tag.toLowerCase().includes(query)) ||
           item.license.toLowerCase().includes(query) ||
           item.subcategory.toLowerCase().includes(query) ||
           (item.language && item.language.toLowerCase().includes(query)) ||
           (item.organization && item.organization.toLowerCase().includes(query));
  }

  setupEventListeners() {
    const searchInput = document.getElementById('search');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderLandscape();
      this.updateActiveFilters();
      this.updateHash();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filterType = e.target.dataset.filterType || 'tier';

        if (filterType === 'tier') {
          document.querySelectorAll('.filter-section').forEach(section => {
            section.querySelectorAll('.filter-btn').forEach(b => {
              if (b.dataset.filterType === 'tier') return;
              b.classList.remove('active');
            });
          });

          document.querySelectorAll('.filter-btn[data-filter-type="maturity"]').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          this.currentFilter = e.target.dataset.filter;
          this.currentMaturityFilter = 'all';
        } else if (filterType === 'maturity') {
          document.querySelectorAll('.filter-section').forEach(section => {
            section.querySelectorAll('.filter-btn').forEach(b => {
              if (b.dataset.filterType === 'maturity') return;
              b.classList.remove('active');
            });
          });

          document.querySelectorAll('.filter-btn[data-filter-type="tier"]').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          this.currentFilter = 'all';
          this.currentMaturityFilter = e.target.dataset.filter;
        }

        this.renderLandscape();
        this.updateActiveFilters();
        this.updateHash();
      });
    });

    document.getElementById('landscape').addEventListener('click', (e) => {
      const card = e.target.closest('.item-card');
      if (card && !e.target.closest('.item-docs')) {
        const name = card.querySelector('.item-name').textContent;
        const item = this.findItem(name);
        if (item) this.showDetailModal(item);
      }
    });

    document.getElementById('landscape').addEventListener('keydown', (e) => {
      const card = e.target.closest('.item-card');
      if (card && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        const name = card.querySelector('.item-name').textContent;
        const item = this.findItem(name);
        if (item) this.showDetailModal(item);
      }
    });

    // Mouse-tracking spotlight on cards
    document.getElementById('landscape').addEventListener('mousemove', (e) => {
      const card = e.target.closest('.item-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });

    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('detail-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search').focus();
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        document.getElementById('search').focus();
      }
    });

    document.getElementById('export-csv').addEventListener('click', () => this.exportData('csv'));
    document.getElementById('export-json').addEventListener('click', () => this.exportData('json'));
    document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
    window.addEventListener('hashchange', () => this.restoreFromHash() || (this.renderLandscape()));

    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
      window.addEventListener('scroll', () => {
        backToTop.classList.toggle('visible', window.scrollY > 600);
      }, { passive: true });
      backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  }

  findItem(name) {
    return this.data.categories.flatMap(c => c.subcategories.flatMap(s => s.items))
      .find(i => i.name === name);
  }

  showDetailModal(item) {
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('modal-content');

    const tagsHtml = item.tags.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join('');
    const logoHtml = item.logo
      ? `<img class="modal-logo" src="hosted_logos/${item.logo}" alt="${this.escapeHtml(item.name)}">`
      : `<div class="modal-logo modal-logo-fallback" style="background:hsl(${this.hashCode(item.name) % 360}, 60%, 40%)">${this.escapeHtml(item.name.charAt(0))}</div>`;

    content.innerHTML = `
      <div class="modal-header">
        ${logoHtml}
        <div>
          <h2>${this.escapeHtml(item.name)}</h2>
          <div class="modal-badges">
            <span class="tier-badge tier-${item.tier}">${item.tier} tier</span>
            <span class="maturity-badge maturity-${item.maturity}">${item.maturity}</span>
          </div>
        </div>
      </div>
      <p class="modal-description">${this.escapeHtml(item.description)}</p>
      <div class="modal-links">
        <a href="${item.url}" target="_blank" rel="noopener">Website ↗</a>
        ${item.repository ? `<a href="${item.repository}" target="_blank" rel="noopener">Source Code ↗</a>` : ''}
        ${item.docs_url ? `<a href="${item.docs_url}" target="_blank" rel="noopener">Documentation ↗</a>` : ''}
      </div>
      <div class="modal-details">
        ${item.license ? `<div><span class="detail-label">License</span>${this.escapeHtml(item.license)}</div>` : ''}
        ${item.language ? `<div><span class="detail-label">Language</span>${this.escapeHtml(item.language)}</div>` : ''}
        ${item.stars ? `<div><span class="detail-label">Stars</span>⭐ ${this.escapeHtml(item.stars)}</div>` : ''}
        ${item.organization ? `<div><span class="detail-label">Organization</span>${this.escapeHtml(item.organization)}</div>` : ''}
        <div><span class="detail-label">Category</span>${this.escapeHtml(item.category)}</div>
        <div><span class="detail-label">Subcategory</span>${this.escapeHtml(item.subcategory)}</div>
      </div>
      <div class="item-tags">${tagsHtml}</div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    document.getElementById('detail-modal').style.display = 'none';
    document.body.style.overflow = '';
  }

  exportData(format) {
    const items = this.data.categories.flatMap(c => c.subcategories.flatMap(s => s.items));
    let content, filename, type;

    if (format === 'csv') {
      const headers = ['name', 'description', 'url', 'repository', 'license', 'category', 'subcategory', 'tier', 'maturity', 'language', 'stars', 'organization', 'tags'];
      const rows = items.map(i => headers.map(h => {
        const val = i[h];
        if (Array.isArray(val)) return `"${val.join(', ')}"`;
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      }).join(','));
      content = [headers.join(','), ...rows].join('\n');
      filename = 'opendesk-edu-landscape.csv';
      type = 'text/csv';
    } else {
      content = JSON.stringify(items, null, 2);
      filename = 'opendesk-edu-landscape.json';
      type = 'application/json';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  renderCategoryNav() {
    const container = document.getElementById('category-nav-items');
    container.innerHTML = this.data.categories.map(cat => {
      const count = cat.subcategories.reduce((s, sub) => s + sub.items.length, 0);
      return `<a href="#cat-${cat.id}" data-category="${cat.id}" title="${this.escapeHtml(cat.description)}">${cat.icon} ${this.escapeHtml(cat.name)} <span class="nav-count">${count}</span></a>`;
    }).join('');

    container.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(`cat-${link.dataset.category}`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          container.querySelectorAll('a').forEach(a => a.classList.remove('active'));
          link.classList.add('active');
          setTimeout(() => link.classList.remove('active'), 1800);
        }
      });
    });

    // Scroll-spy: highlight the category currently in view
    if ('IntersectionObserver' in window) {
      const links = container.querySelectorAll('a');
      const spy = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            links.forEach(a => a.classList.toggle('active', a.dataset.category === entry.target.id.replace('cat-', '')));
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
      this.data.categories.forEach(cat => {
        const el = document.getElementById(`cat-${cat.id}`);
        if (el) spy.observe(el);
      });
    }
  }

  restoreFromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    try {
      const state = JSON.parse(decodeURIComponent(hash));
      if (state.search) {
        this.searchQuery = state.search;
        const searchInput = document.getElementById('search');
        if (searchInput) searchInput.value = state.search;
      }
      if (state.tier) this.currentFilter = state.tier;
      if (state.maturity) this.currentMaturityFilter = state.maturity;
      this.syncFilterButtons();
    } catch (e) { /* ignore invalid hash */ }
  }

  syncFilterButtons() {
    document.querySelectorAll('.filter-btn[data-filter-type="tier"]')
      .forEach(b => b.classList.toggle('active', b.dataset.filter === this.currentFilter));
    document.querySelectorAll('.filter-btn[data-filter-type="maturity"]')
      .forEach(b => b.classList.toggle('active', b.dataset.filter === this.currentMaturityFilter));
  }

  updateHash() {
    const state = {};
    if (this.searchQuery) state.search = this.searchQuery;
    if (this.currentFilter !== 'all') state.tier = this.currentFilter;
    if (this.currentMaturityFilter !== 'all') state.maturity = this.currentMaturityFilter;
    const hash = Object.keys(state).length > 0 ? encodeURIComponent(JSON.stringify(state)) : '';
    history.replaceState(null, '', '#' + hash);
  }

  initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.body.classList.add('light-theme');
      const btn = document.getElementById('theme-toggle');
      if (btn) btn.textContent = '☀️';
    }
  }

  clearFilters() {
    this.searchQuery = '';
    this.currentFilter = 'all';
    this.currentMaturityFilter = 'all';
    const searchInput = document.getElementById('search');
    if (searchInput) searchInput.value = '';
    this.syncFilterButtons();
    this.renderLandscape();
    this.updateActiveFilters();
    this.updateHash();
  }

  toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    document.getElementById('theme-toggle').textContent = isLight ? '☀️' : '🌙';
  }

  updateLastUpdated() {
    const el = document.getElementById('last-updated');
    if (el) {
      el.textContent = new Date().toISOString().split('T')[0];
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LandscapeApp();
});
