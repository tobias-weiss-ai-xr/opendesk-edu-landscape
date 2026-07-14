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
    this.setupEventListeners();
    this.initTheme();
    this.updateLastUpdated();
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
      const totalItems = category.subcategories.reduce((sum, s) => sum + (s.items || []).length, 0);
      categoryEl.innerHTML = `
        <div class="category-header" style="border-left: 4px solid ${category.color}; background: linear-gradient(135deg, ${category.color}22 0%, ${category.color}44 100%)">
          <h2>${category.icon} ${category.name} <span class="count-badge">${totalItems}</span></h2>
          <p>${category.description}</p>
        </div>
      `;

      visibleSubcategories.forEach(sub => {
        const subEl = document.createElement('div');
        subEl.className = 'subcategory';
        subEl.innerHTML = `
          <h3 class="subcategory-title">${sub.name}</h3>
          <div class="items-grid">
            ${sub.items.map(item => this.renderItem(item)).join('')}
          </div>
        `;
        categoryEl.appendChild(subEl);
      });

      container.appendChild(categoryEl);
    });

    if (!hasVisible) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No services match your filters</h3>
        <p>Try adjusting your search query or filter selection.</p>
        <button class="clear-filters-btn" onclick="window.app.clearFilters()">Clear all filters</button>
      </div>`;
    }
  }

  renderItem(item) {
    const tagsHtml = item.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    const logoHtml = item.logo
      ? `<img class="item-logo" src="hosted_logos/${item.logo}" alt="${item.name} logo" loading="lazy">`
      : `<div class="item-logo item-logo-fallback" style="background:hsl(${this.hashCode(item.name) % 360}, 60%, 40%)">${item.name.charAt(0)}</div>`;

    const starsHtml = item.stars ? `<span class="item-stars">⭐ ${item.stars}</span>` : '';
    const langHtml = item.language ? `<span class="item-language">${item.language}</span>` : '';
    const orgHtml = item.organization ? `<span class="item-org" title="${item.organization}">${item.organization}</span>` : '';

    return `
      <a href="${item.url}" target="_blank" rel="noopener" class="item-card">
        <div class="item-header">
          <div class="item-name-row">
            ${logoHtml}
            <div class="item-name">${item.name}</div>
          </div>
          <span class="tier-badge tier-${item.tier}">${item.tier}</span>
        </div>
        <div class="item-description">${item.description}</div>
        <div class="item-tags">${tagsHtml}</div>
        <div class="item-meta">
          <span class="item-license">${item.license}</span>
          <span>${item.maturity}</span>
          ${langHtml}
          ${item.docs_url ? `<a class="item-docs" href="${item.docs_url}" target="_blank" title="Documentation">📖</a>` : ''}
        </div>
        ${orgHtml || starsHtml || item.repository ? `
        <div class="item-footer">
          ${orgHtml}
          ${starsHtml}
          ${item.repository ? `<div class="item-repo" title="${item.repository}">${item.repository.replace('https://github.com/', '')}</div>` : ''}
        </div>` : ''}
      </a>
    `;
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
    document.getElementById('stat-services').textContent = m.total_services;
    document.getElementById('stat-categories').textContent = m.total_categories;
    document.getElementById('stat-count-services').textContent = m.total_services;
    document.getElementById('stat-count-categories').textContent = m.total_categories;
    document.getElementById('stat-count-licenses').textContent = m.license_breakdown.length;
  }

  renderMetadata() {
    this.renderLicenseStats();
    this.renderMaturityStats();
    this.renderTierStats();
  }

  renderLicenseStats() {
    const container = document.getElementById('license-stats');
    container.innerHTML = this.data.metadata.license_breakdown
      .sort((a, b) => b.count - a.count)
      .map(item => `
        <div class="stat-bar">
          <span class="stat-label-sm">${item.license}</span>
          <span class="stat-value">${item.count} services</span>
        </div>
      `).join('');
  }

  renderMaturityStats() {
    const container = document.getElementById('maturity-stats');
    if (!container || !this.data.metadata.maturity_levels) return;
    container.innerHTML = this.data.metadata.maturity_levels
      .sort((a, b) => b.count - a.count)
      .map(item => `
        <div class="stat-bar">
          <span class="stat-label-sm">${item.level.charAt(0).toUpperCase() + item.level.slice(1)}</span>
          <span class="stat-value">${item.count} services</span>
        </div>
      `).join('');
  }

  renderTierStats() {
    const container = document.getElementById('tier-stats');
    container.innerHTML = this.data.metadata.service_tiers
      .map(item => `
        <div class="stat-bar">
          <span class="stat-label-sm">${item.tier.charAt(0).toUpperCase() + item.tier.slice(1)} Tier</span>
          <span class="stat-value">${item.count} services</span>
        </div>
      `).join('');
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
        this.updateHash();
      });
    });

    document.getElementById('landscape').addEventListener('click', (e) => {
      const card = e.target.closest('.item-card');
      if (card && !e.target.closest('.item-docs')) {
        e.preventDefault();
        const name = card.querySelector('.item-name').textContent;
        const item = this.findItem(name);
        if (item) this.showDetailModal(item);
      }
    });

    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
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
  }

  findItem(name) {
    return this.data.categories.flatMap(c => c.subcategories.flatMap(s => s.items))
      .find(i => i.name === name);
  }

  showDetailModal(item) {
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('modal-content');

    const tagsHtml = item.tags.map(t => `<span class="tag">${t}</span>`).join('');
    const logoHtml = item.logo
      ? `<img class="modal-logo" src="hosted_logos/${item.logo}" alt="${item.name}" style="width:64px;height:64px;object-fit:contain;border-radius:8px;">`
      : `<div class="modal-logo modal-logo-fallback" style="background:hsl(${this.hashCode(item.name) % 360}, 60%, 40%);width:64px;height:64px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:1.5rem;font-weight:bold;">${item.name.charAt(0)}</div>`;

    content.innerHTML = `
      <div class="modal-header" style="display:flex;align-items:center;gap:1.25rem;margin-bottom:1.5rem;">
        ${logoHtml}
        <div>
          <h2 style="margin-bottom:0.25rem;">${item.name}</h2>
          <span class="tier-badge tier-${item.tier}">${item.tier} tier</span>
          <span style="margin-left:0.5rem;color:var(--gray);font-size:0.85rem;">${item.maturity}</span>
        </div>
      </div>
      <p style="color:var(--gray);line-height:1.7;margin-bottom:1.25rem;">${item.description}</p>
      <div class="modal-links" style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-bottom:1.5rem;">
        <a href="${item.url}" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:none;">Website ↗</a>
        ${item.repository ? `<a href="${item.repository}" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:none;">Source Code ↗</a>` : ''}
        ${item.docs_url ? `<a href="${item.docs_url}" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:none;">Documentation ↗</a>` : ''}
      </div>
      <div class="modal-details" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.9rem;">
        ${item.license ? `<div><strong>License:</strong> ${item.license}</div>` : ''}
        ${item.language ? `<div><strong>Language:</strong> ${item.language}</div>` : ''}
        ${item.stars ? `<div><strong>Stars:</strong> ⭐ ${item.stars}</div>` : ''}
        ${item.organization ? `<div><strong>Organization:</strong> ${item.organization}</div>` : ''}
        <div><strong>Category:</strong> ${item.category}</div>
        <div><strong>Subcategory:</strong> ${item.subcategory}</div>
      </div>
      <div class="item-tags" style="margin-top:1rem;">${tagsHtml}</div>
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
        return `"${(val || '').replace(/"/g, '""')}"`;
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
    container.innerHTML = this.data.categories.map(cat =>
      `<a href="#${cat.id}" data-category="${cat.id}" title="${cat.description}">${cat.icon} ${cat.name}</a>`
    ).join('');

    container.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(`.category [style*="${link.dataset.category}"]`) ||
          document.querySelector(`#landscape .category`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          container.querySelectorAll('a').forEach(a => a.classList.remove('active'));
          link.classList.add('active');
        }
      });
    });
  }

  restoreFromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    try {
      const state = JSON.parse(decodeURIComponent(hash));
      if (state.search) this.searchQuery = state.search;
      if (state.tier) this.currentFilter = state.tier;
      if (state.maturity) this.currentMaturityFilter = state.maturity;
    } catch (e) { /* ignore invalid hash */ }
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
    document.getElementById('search').value = '';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-filter="all"][data-filter-type="tier"]')?.classList.add('active');
    document.querySelector('[data-filter="all"][data-filter-type="maturity"]')?.classList.add('active');
    this.renderLandscape();
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
