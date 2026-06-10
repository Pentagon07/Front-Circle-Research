'use strict';

function getSortedReports() {
  if (typeof REPORTS_DATA === 'undefined') return [];
  return [...REPORTS_DATA].sort((a, b) => new Date(`${b.date}T12:00:00`).getTime() - new Date(`${a.date}T12:00:00`).getTime());
}

function getLatestReport() {
  return getSortedReports()[0] || null;
}

function getCategoryCatalog() {
  if (typeof REPORTS_DATA === 'undefined') return [];

  const iconMap = new Map(
    (typeof CATEGORIES_DATA !== 'undefined' ? CATEGORIES_DATA : []).map(category => [category.name, category.icon])
  );
  const counts = new Map();

  REPORTS_DATA.forEach(report => {
    report.categories.forEach(category => {
      counts.set(category, (counts.get(category) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, icon: iconMap.get(name) || name.slice(0, 3).toUpperCase() }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function formatReportDate(dateStr) {
  const parsed = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function injectAIAuthorNote() {
  if (!document.head.querySelector('meta[name="author"]')) {
    const meta = document.createElement('meta');
    meta.name = 'author';
    meta.content = 'Front Circle Research';
    document.head.appendChild(meta);
  }
}

function syncGlobalFooterYear() {
  document.querySelectorAll('.f-copy').forEach(copy => {
    copy.textContent = copy.textContent.replace('2025', '2026');
  });
}

(function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  const isReportPage = location.pathname.includes('/reports/');
  const root = isReportPage ? '../' : '';
  const page = location.pathname.split('/').pop() || 'index.html';

  document.querySelector('.nav-logo')?.addEventListener('click', () => {
    if (page === 'coming-soon.html') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    location.href = root + 'index.html';
  });

  document.querySelectorAll('.nav-link[data-href]').forEach(link => {
    link.addEventListener('click', () => {
      location.href = link.dataset.href;
    });
  });

  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    if (link.dataset.page === page) link.classList.add('active');
  });
})();

function initHeroMarketCanvas() {
  const hero = document.getElementById('hero');
  const canvas = hero?.querySelector('.hero-market-canvas');
  if (!hero || !canvas) return;

  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smallViewport = window.matchMedia('(max-width: 768px)');
  const candles = Array.from({ length: 32 }, (_, index) => {
    const seed = index * 37.13;
    const base = 0.34 + (Math.sin(seed) + 1) * 0.18;
    return {
      x: (index + 0.5) / 32,
      open: base,
      close: base + Math.sin(seed * 0.37) * 0.16,
      wick: 0.1 + (Math.cos(seed * 0.51) + 1) * 0.06,
      phase: seed
    };
  });
  const bars = Array.from({ length: 18 }, (_, index) => ({
    x: (index + 0.55) / 18,
    height: 0.16 + ((Math.sin(index * 1.7) + 1) * 0.14),
    phase: index * 0.68
  }));

  let width = 0;
  let height = 0;
  let raf = 0;
  let active = false;
  let activity = 0;
  const pointer = { x: 0.72, y: 0.34, tx: 0.72, ty: 0.34 };

  function resize() {
    const rect = hero.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(time = 0) {
    const t = time * 0.001;
    pointer.x += (pointer.tx - pointer.x) * 0.035;
    pointer.y += (pointer.ty - pointer.y) * 0.035;
    activity += ((active ? 1 : 0) - activity) * 0.045;

    ctx.clearRect(0, 0, width, height);

    const glowX = pointer.x * width;
    const glowY = pointer.y * height;
    const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, Math.max(width, height) * 0.42);
    glow.addColorStop(0, `rgba(30,79,194,${(0.08 + activity * 0.05).toFixed(3)})`);
    glow.addColorStop(0.5, 'rgba(30,79,194,0.035)');
    glow.addColorStop(1, 'rgba(30,79,194,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = 'rgba(30,79,194,0.18)';
    ctx.lineWidth = 1;
    for (let x = 24; x < width; x += 74) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - height * 0.38, height);
      ctx.stroke();
    }
    ctx.restore();

    const marketTop = height * 0.12;
    const marketHeight = height * 0.46;
    candles.forEach(candle => {
      const x = candle.x * width;
      const distance = Math.hypot((pointer.x - candle.x) * 1.7, (pointer.y - 0.36) * 1.2);
      const influence = activity * Math.max(0, 1 - distance * 2.8);
      const direction = Math.tanh((0.42 - pointer.y) * 7);
      const drift = Math.sin(t * 0.85 + candle.phase) * 0.014 - influence * direction * 0.038;
      const openY = marketTop + Math.min(0.9, Math.max(0.08, candle.open + drift)) * marketHeight;
      const closeY = marketTop + Math.min(0.9, Math.max(0.08, candle.close + drift - influence * 0.018)) * marketHeight;
      const highY = Math.min(openY, closeY) - candle.wick * marketHeight;
      const lowY = Math.max(openY, closeY) + candle.wick * marketHeight;
      const up = closeY < openY;

      ctx.strokeStyle = up ? 'rgba(30,79,194,0.24)' : 'rgba(168,117,57,0.22)';
      ctx.fillStyle = up ? 'rgba(30,79,194,0.14)' : 'rgba(168,117,57,0.13)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();
      ctx.fillRect(x - 4, Math.min(openY, closeY), 8, Math.max(5, Math.abs(closeY - openY)));
    });

    ctx.save();
    ctx.translate(0, height * 0.65);
    bars.forEach(bar => {
      const x = bar.x * width;
      const dx = (pointer.x - bar.x) * width;
      const repel = activity * Math.max(0, 1 - Math.abs(dx) / 190) * 8;
      const h = (bar.height + Math.sin(t + bar.phase) * 0.018) * height;
      ctx.fillStyle = 'rgba(30,79,194,0.075)';
      ctx.fillRect(x - 8, 108 - h + repel, 16, h);
    });
    ctx.beginPath();
    for (let index = 0; index <= 20; index += 1) {
      const x = (index / 20) * width;
      const normalizedX = index / 20;
      const distance = Math.hypot((pointer.x - normalizedX) * 2.1, (pointer.y - 0.78) * 1.6);
      const repel = activity * Math.max(0, 1 - distance * 3.2) * 9;
      const y = 112 - (Math.sin(index * 0.85 + t * 0.8) * 12 + index * 1.2 + repel);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(30,79,194,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (!reducedMotion.matches && !smallViewport.matches) {
      raf = requestAnimationFrame(draw);
    }
  }

  const handlePointerMove = event => {
    const rect = hero.getBoundingClientRect();
    pointer.tx = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    pointer.ty = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    active = true;
    hero.style.setProperty('--hero-spot-x', `${(pointer.tx * 100).toFixed(2)}%`);
    hero.style.setProperty('--hero-spot-y', `${(pointer.ty * 100).toFixed(2)}%`);
  };

  const handlePointerLeave = () => {
    active = false;
    pointer.tx = 0.72;
    pointer.ty = 0.34;
  };

  resize();
  draw();

  if (!reducedMotion.matches && !smallViewport.matches) {
    hero.addEventListener('pointermove', handlePointerMove, { passive: true });
    hero.addEventListener('pointerleave', handlePointerLeave, { passive: true });
  }

  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    resize();
    draw();
  }, { passive: true });
}

function applyTilt(selector, maxDeg = 6) {
  document.querySelectorAll(selector).forEach(element => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let rect;
    let animationId;

    element.addEventListener('mouseenter', () => {
      rect = element.getBoundingClientRect();
    });

    element.addEventListener('mousemove', event => {
      if (!rect) rect = element.getBoundingClientRect();
      cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(() => {
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        element.style.transform = `perspective(1000px) rotateX(${-y * maxDeg}deg) rotateY(${x * maxDeg}deg) translate3d(0, -2px, 6px)`;
      });
    });

    element.addEventListener('mouseleave', () => {
      cancelAnimationFrame(animationId);
      element.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translate3d(0, 0, 0)';
    });
  });
}

function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach((element, index) => {
    element.style.transitionDelay = `${(index % 5) * 55}ms`;
    observer.observe(element);
  });
}

function initCategorySlider() {
  const grid = document.getElementById('cat-grid');
  if (!grid) return;

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  const syncSliderState = () => {
    const centered = grid.scrollWidth <= grid.clientWidth + 8;
    grid.classList.toggle('is-centered', centered);
    if (centered) grid.scrollLeft = 0;
  };

  grid.addEventListener('mousedown', event => {
    if (grid.classList.contains('is-centered')) return;
    isDown = true;
    grid.classList.add('is-dragging');
    startX = event.pageX - grid.offsetLeft;
    scrollLeft = grid.scrollLeft;
    event.preventDefault();
  });

  document.addEventListener('mouseup', () => {
    isDown = false;
    grid.classList.remove('is-dragging');
  });

  grid.addEventListener('mousemove', event => {
    if (!isDown || grid.classList.contains('is-centered')) return;
    const x = event.pageX - grid.offsetLeft;
    const walk = (x - startX) * 1.6;
    grid.scrollLeft = scrollLeft - walk;
  });

  grid.addEventListener('mouseleave', () => {
    isDown = false;
    grid.classList.remove('is-dragging');
  });

  let touchStart = 0;
  grid.addEventListener('touchstart', event => {
    touchStart = event.touches[0].clientX;
  }, { passive: true });

  grid.addEventListener('touchmove', event => {
    if (grid.classList.contains('is-centered')) return;
    const diff = touchStart - event.touches[0].clientX;
    grid.scrollLeft += diff * 0.8;
    touchStart = event.touches[0].clientX;
  }, { passive: true });

  window.addEventListener('resize', syncSliderState, { passive: true });
  requestAnimationFrame(syncSliderState);
}

function initCalendar(containerId, releaseDates) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  const releaseSet = new Set(releaseDates);
  const latestRelease = [...releaseDates].sort().at(-1);
  let current = new Date();
  const latestNote = document.getElementById('calendar-latest-note');

  if (latestNote && latestRelease) {
    latestNote.textContent = `Blue dates indicate a published report. Latest release: ${formatReportDate(latestRelease)}.`;
  }

  function render() {
    const year = current.getFullYear();
    const month = current.getMonth();
    const today = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    let html = `<div class="cal-header"><span class="cal-month">${monthNames[month]} ${year}</span><div class="cal-nav"><button class="cal-btn" id="cal-prev">‹</button><button class="cal-btn" id="cal-next">›</button></div></div><div class="cal-grid">`;

    dayNames.forEach(day => {
      html += `<div class="cal-day-name">${day}</div>`;
    });

    for (let index = firstDay - 1; index >= 0; index -= 1) {
      html += `<div class="cal-day other-month">${prevDays - index}</div>`;
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const hasReport = releaseSet.has(dateStr);
      const isLatest = dateStr === latestRelease;
      const className = `cal-day${isToday ? ' today' : ''}${hasReport ? ' has-report' : ''}${isLatest ? ' latest-report' : ''}`;
      const title = hasReport ? ` title="${isLatest ? 'Latest published report' : 'Published report'}"` : '';
      html += `<div class="${className}"${hasReport ? ` data-date="${dateStr}"` : ''}${title}>${day}</div>`;
    }

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    for (let index = firstDay + daysInMonth, nextDay = 1; index < totalCells; index += 1, nextDay += 1) {
      html += `<div class="cal-day other-month">${nextDay}</div>`;
    }

    html += '</div>';
    wrap.innerHTML = html;

    wrap.querySelector('#cal-prev')?.addEventListener('click', () => {
      current = new Date(year, month - 1, 1);
      render();
    });

    wrap.querySelector('#cal-next')?.addEventListener('click', () => {
      current = new Date(year, month + 1, 1);
      render();
    });

    wrap.querySelectorAll('.cal-day.has-report').forEach(element => {
      element.addEventListener('click', () => {
        location.href = `reports.html?date=${element.dataset.date}`;
      });
    });
  }

  render();

  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 5, 0);
  setTimeout(() => {
    current = new Date();
    render();
  }, Math.max(1000, nextMidnight.getTime() - now.getTime()));
}

function buildReportCard(report, featured = false) {
  const tags = report.tags.map(tag => `<span class="rl-tag">${tag}</span>`).join('');
  const categories = report.categories.map(category => `<span class="r-category-tag">${category}</span>`).join('');

  if (featured) {
    return `<a class="report-card-featured" href="${report.file}" aria-label="Read ${report.title}">
      <div class="r-meta">${categories}<span class="recent-pill">Most recent</span><span>${report.dateFormatted}</span><span>${report.readTime} read</span></div>
      <h3>${report.title}</h3><p>${report.summary}</p>
      <span class="r-read-link">Read full report <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    </a>`;
  }

  return `<a class="rl-card reveal" href="${report.file}" data-categories='${JSON.stringify(report.categories)}' data-date="${report.date}" data-title="${report.title.toLowerCase()}">
    <div class="rl-meta">${categories}<span class="rl-date">${report.dateFormatted}</span><span class="rl-date">${report.readTime} read</span></div>
    <h3 class="rl-title">${report.title}</h3>
    <p class="rl-summary">${report.summary}</p>
    <div class="rl-footer"><div class="rl-tags">${tags}</div><span class="rl-arrow">→</span></div>
  </a>`;
}

function initReportsPage() {
  const list = document.getElementById('report-list');
  if (!list || typeof REPORTS_DATA === 'undefined') return;

  const sorted = getSortedReports();
  const params = new URLSearchParams(location.search);
  let activeFilter = params.get('cat');
  let activeDate = params.get('date');
  let searchQuery = '';

  const filterList = document.getElementById('filter-list');
  const activeFilterElement = document.getElementById('reports-active-filter');

  if (filterList) {
    filterList.innerHTML = getCategoryCatalog().map(category => `
      <li class="filter-item" data-cat="${category.name}" role="button" tabindex="0">
        ${category.name}
        <span class="filter-badge">${category.count}</span>
      </li>
    `).join('');
  }

  function renderList() {
    const filtered = sorted.filter(report => {
      const matchesCategory = !activeFilter || report.categories.includes(activeFilter);
      const matchesDate = !activeDate || report.date === activeDate;
      const normalizedSearch = searchQuery.toLowerCase();
      const matchesSearch = !normalizedSearch
        || report.title.toLowerCase().includes(normalizedSearch)
        || report.summary.toLowerCase().includes(normalizedSearch)
        || report.tags.some(tag => tag.toLowerCase().includes(normalizedSearch));
      return matchesCategory && matchesDate && matchesSearch;
    });

    list.innerHTML = filtered.length === 0
      ? `<div class="no-results"><div class="no-results-icon">◇</div><p>No reports match your criteria.</p></div>`
      : filtered.map(report => buildReportCard(report)).join('');

    const countElement = document.getElementById('reports-count');
    if (countElement) {
      countElement.textContent = `${filtered.length} report${filtered.length !== 1 ? 's' : ''}`;
    }

    if (activeFilterElement) {
      const labels = [];
      if (activeDate) labels.push(`Date: ${formatReportDate(activeDate)}`);
      if (activeFilter) labels.push(`Category: ${activeFilter}`);
      activeFilterElement.hidden = labels.length === 0;
      activeFilterElement.textContent = labels.join(' · ');
    }

    initScrollReveal();
  }

  document.getElementById('search-input')?.addEventListener('input', event => {
    searchQuery = event.target.value.trim();
    renderList();
  });

  document.querySelectorAll('.filter-item').forEach(item => {
    item.addEventListener('click', () => {
      const category = item.dataset.cat;
      activeFilter = activeFilter === category ? null : category;
      document.querySelectorAll('.filter-item').forEach(filter => filter.classList.remove('active'));
      if (activeFilter) item.classList.add('active');
      renderList();
    });
  });

  document.getElementById('filter-clear')?.addEventListener('click', () => {
    activeFilter = null;
    activeDate = null;
    searchQuery = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.filter-item').forEach(filter => filter.classList.remove('active'));
    history.replaceState(null, '', 'reports.html');
    renderList();
  });

  if (activeFilter) {
    document.querySelector(`.filter-item[data-cat="${activeFilter}"]`)?.classList.add('active');
  }

  renderList();
}

function initCategories() {
  const grid = document.getElementById('cat-grid');
  if (!grid || typeof REPORTS_DATA === 'undefined') return;

  grid.innerHTML = getCategoryCatalog().map(category => `
    <a class="cat-card" href="reports.html?cat=${encodeURIComponent(category.name)}" aria-label="Browse ${category.name} reports">
      <span class="cat-icon">${category.icon}</span>
      <div class="cat-name">${category.name}</div>
      <div class="cat-count">${category.count} reports</div>
    </a>
  `).join('');

}

function initRecentReport() {
  const wrap = document.getElementById('recent-report-card');
  if (!wrap || typeof REPORTS_DATA === 'undefined') return;

  const latest = getLatestReport();
  if (!latest) return;

  wrap.innerHTML = buildReportCard(latest, true);
}

function initHeroLatest() {
  const latest = getLatestReport();
  const title = document.getElementById('hero-latest-title');
  const summary = document.getElementById('hero-latest-summary');
  const link = document.getElementById('hero-latest-link');

  if (!latest || !title || !summary || !link) return;

  title.textContent = latest.title;
  summary.textContent = latest.summary;
  link.href = latest.file;

  const card = link.closest('.hero-institutional-panel');
  if (card && !card.dataset.boundReportLink) {
    card.dataset.boundReportLink = 'true';
    card.setAttribute('role', 'link');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Open latest report: ${latest.title}`);
    card.addEventListener('click', event => {
      if (event.target.closest('a')) return;
      location.href = latest.file;
    });
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        location.href = latest.file;
      }
    });
  }
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = form.querySelector('[name="name"]')?.value?.trim() || '';
    const email = form.querySelector('[name="email"]')?.value?.trim() || '';
    const subject = form.querySelector('[name="subject"]')?.value?.trim() || 'Contact';
    const message = form.querySelector('[name="message"]')?.value?.trim() || '';

    window.location.href = `mailto:4ubm9w835@mozmail.com?subject=${encodeURIComponent(`${subject} - ${name}`)}&body=${encodeURIComponent(`${message}\n\nFrom: ${name}\nEmail: ${email}`)}`;

    const success = document.getElementById('contact-success');
    if (success) {
      form.style.display = 'none';
      success.classList.add('show');
    }
  });
}

function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    const email = form.querySelector('[name="email"]')?.value?.trim() || '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address.');
      return;
    }

    window.location.href = `mailto:4ubm9w835@mozmail.com?subject=${encodeURIComponent('Newsletter Subscription Request')}&body=${encodeURIComponent(`Please add this address to the newsletter list:\n\n${email}`)}`;
    form.style.display = 'none';
    document.getElementById('newsletter-success')?.classList.add('show');
  });
}

function initAboutTilt() {
  applyTilt('.team-card', 3);
  applyTilt('.value-card', 3);
}

async function initPDFViewer(pdfUrl) {
  const wrap = document.getElementById('pdf-canvas-wrap');
  if (!wrap) return;

  if (!pdfUrl) {
    wrap.innerHTML = `
      <div class="pdf-placeholder-box">
        <div class="pdf-placeholder-icon">
          <div class="pdf-placeholder-line" style="width:68%;"></div>
          <div class="pdf-placeholder-line" style="width:85%;"></div>
          <div class="pdf-placeholder-line" style="width:72%;"></div>
          <div class="pdf-placeholder-line" style="width:85%;"></div>
          <div class="pdf-placeholder-line" style="width:60%;"></div>
          <div class="pdf-placeholder-line" style="width:80%;"></div>
          <div style="width:50%;height:14px;border-radius:3px;background:var(--blue-pale);margin-top:6px;"></div>
        </div>
        <p style="font-size:0.8rem;max-width:320px;line-height:1.6;">
          To enable the PDF preview, place your PDF in the <code style="background:var(--off-white);padding:2px 6px;border-radius:4px;font-size:0.75rem;">reports/</code> folder and set <code style="background:var(--off-white);padding:2px 6px;border-radius:4px;font-size:0.75rem;">PDF_URL</code> in the page script.
        </p>
      </div>`;

    document.querySelectorAll('.pdf-nav-btn').forEach(button => {
      button.style.display = 'none';
    });

    const badge = document.querySelector('.pdf-toolbar-badge');
    if (badge) badge.textContent = 'No PDF loaded';
    return;
  }

  const badge = document.querySelector('.pdf-toolbar-badge');
  const pageInfo = document.querySelector('.pdf-page-info');
  const prevButton = document.getElementById('pdf-prev');
  const nextButton = document.getElementById('pdf-next');

  if (badge) badge.textContent = 'Full PDF view';
  if (pageInfo) pageInfo.textContent = 'Embedded';
  if (prevButton) prevButton.style.display = 'none';
  if (nextButton) nextButton.style.display = 'none';

  wrap.innerHTML = `
    <iframe
      class="pdf-frame"
      src="${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH"
      title="Embedded PDF preview"
      loading="lazy"
      referrerpolicy="no-referrer"
    ></iframe>
  `;
}

window.showToast = function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(11,24,50,0.92)',
    color: '#fff',
    padding: '10px 22px',
    borderRadius: '8px',
    fontSize: '0.78rem',
    zIndex: '9999',
    backdropFilter: 'blur(10px)',
    transition: 'opacity 0.4s',
    pointerEvents: 'none'
  });

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 2600);
};

function initReportProtection() {
  const reportPage = document.getElementById('report-page');
  const article = document.querySelector('.report-article');
  if (!reportPage || !article) return;

  const attributionNotice = 'Protected report. Cite Front Circle Research and link to the original report.';

  const blockClipboard = event => {
    if (!article.contains(event.target)) return;
    event.preventDefault();
    if (event.clipboardData) {
      event.clipboardData.setData('text/plain', attributionNotice);
    }
    showToast('Copying is disabled on report pages. Please cite Front Circle Research if you reference this work.');
  };

  document.addEventListener('copy', blockClipboard);
  document.addEventListener('cut', blockClipboard);

  ['selectstart', 'dragstart', 'contextmenu'].forEach(eventName => {
    article.addEventListener(eventName, event => {
      event.preventDefault();
    });
  });

  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (!['a', 'c', 'p', 's', 'x'].includes(event.key.toLowerCase())) return;

    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    if (anchorNode && article.contains(anchorNode)) {
      event.preventDefault();
      showToast('Report text is protected. Use the request form for access and cite the author when referencing it.');
    }
  });
}

window.initReportPage = function initReportPage(PDF_URL) {
  initReportProtection();

  window.addEventListener('scroll', () => {
    document.getElementById('nav')?.classList.toggle('scrolled', window.scrollY > 20);
    const doc = document.documentElement;
    const pct = (doc.scrollTop / (doc.scrollHeight - doc.clientHeight)) * 100;
    const topFill = document.getElementById('top-progress-fill');
    const progressFill = document.getElementById('progress-fill');
    if (topFill) topFill.style.width = `${pct}%`;
    if (progressFill) progressFill.style.width = `${pct}%`;
  }, { passive: true });

  document.querySelectorAll('.nav-link[data-href]').forEach(link => {
    link.addEventListener('click', () => {
      location.href = link.dataset.href;
    });
  });

  document.querySelector('.nav-logo')?.addEventListener('click', () => {
    location.href = '../index.html';
  });

  document.querySelector('.report-header-back')?.addEventListener('click', () => {
    if (document.referrer) {
      history.back();
    } else {
      location.href = '../reports.html';
    }
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.09 });

  document.querySelectorAll('.reveal').forEach(element => {
    observer.observe(element);
  });

  initPDFViewer(PDF_URL);

  document.getElementById('request-form')?.addEventListener('submit', event => {
    event.preventDefault();

    const name = document.getElementById('req-name')?.value?.trim();
    const email = document.getElementById('req-email')?.value?.trim();
    const organisation = document.getElementById('req-org')?.value?.trim() || 'N/A';
    const reason = document.getElementById('req-reason')?.value?.trim();
    const title = document.querySelector('.report-title')?.textContent?.trim() || 'Report';

    if (!name || !email || !reason) {
      showToast('Please fill in all required fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address.');
      return;
    }

    const button = event.target.querySelector('.form-submit');
    if (button) {
      button.textContent = 'Submitting…';
      button.disabled = true;
    }

    window.location.href = `mailto:4ubm9w835@mozmail.com?subject=${encodeURIComponent(`Report Request: ${title} - ${name}`)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\nOrganisation: ${organisation}\nReason: ${reason}`)}`;

    setTimeout(() => {
      event.target.innerHTML = `
        <div style="text-align:center;padding:40px 20px;">
          <div style="width:52px;height:52px;border-radius:50%;background:var(--blue-pale);border:1.5px solid var(--blue-border);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:1.3rem;color:var(--blue-royal);">◉</div>
          <h4 style="font-family:'Cormorant Garamond',serif;font-size:1.3rem;margin-bottom:10px;">Request Received</h4>
          <p style="font-size:0.85rem;color:var(--text-muted);max-width:380px;margin:0 auto;">
            Thank you, <strong>${name.split(' ')[0]}</strong>. We'll review and respond to <strong>${email}</strong> within 1-2 business days.
          </p>
        </div>`;
    }, 1400);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  injectAIAuthorNote();
  syncGlobalFooterYear();
  initScrollReveal();
  initContactForm();
  initNewsletter();
  initAboutTilt();
  initHeroLatest();

  if (document.getElementById('report-list')) initReportsPage();
  if (document.getElementById('recent-report-card')) initRecentReport();
  if (document.getElementById('cat-grid')) initCategories();
  if (document.getElementById('calendar-wrap')) initCalendar('calendar-wrap', typeof RELEASE_DATES !== 'undefined' ? RELEASE_DATES : []);
  if (document.getElementById('hero')) initHeroMarketCanvas();
});
