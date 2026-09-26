/**
 * EMBEDX Official Web Application Controller (app.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileNav();
  initScrollReveal();
  initLightbox();
  initProjectFilters();
  initDomainSearch();
  initResourceFilters();
  initModals();
});

/* 1. Header & Navigation */
function initNavbar() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Highlight active page
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/* 2. Mobile Drawer Navigation */
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const drawer = document.querySelector('.mobile-nav-drawer');
  const backdrop = document.querySelector('.mobile-nav-backdrop');

  if (!toggle || !drawer) return;

  function toggleMenu() {
    toggle.classList.toggle('open');
    drawer.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('open');
    document.body.style.overflow = drawer.classList.contains('open') ? 'hidden' : '';
  }

  toggle.addEventListener('click', toggleMenu);
  if (backdrop) backdrop.addEventListener('click', toggleMenu);

  drawer.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (drawer.classList.contains('open')) toggleMenu();
    });
  });
}

/* 3. Scroll Reveal Animations */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal');
  if (!revealElements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

/* 4. Global Lightbox */
function initLightbox() {
  let lightbox = document.getElementById('globalLightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'globalLightbox';
    lightbox.className = 'lightbox-modal';
    lightbox.innerHTML = `
      <button class="modal-close-btn" style="position: fixed; top: 1.5rem; right: 1.5rem; background: rgba(255,255,255,0.2); color: #fff;" onclick="closeLightbox()">&times;</button>
      <img id="lightboxImage" class="lightbox-content" src="" alt="Enlarged view" />
      <div id="lightboxCaption" class="lightbox-caption"></div>
    `;
    document.body.appendChild(lightbox);
  }

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.id === 'globalLightbox') {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeAllModals();
    }
  });
}

function openLightbox(src, caption) {
  const lightbox = document.getElementById('globalLightbox');
  const img = document.getElementById('lightboxImage');
  const cap = document.getElementById('lightboxCaption');
  if (lightbox && img) {
    img.src = src;
    cap.textContent = caption || '';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeLightbox() {
  const lightbox = document.getElementById('globalLightbox');
  if (lightbox) {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/* 5. Project Filtering & Search */
function initProjectFilters() {
  const searchInput = document.getElementById('projectSearchInput');
  const filterButtons = document.querySelectorAll('.project-filter-btn');
  const projectCards = document.querySelectorAll('.project-card-item');

  if (!projectCards.length) return;

  function filterProjects() {
    const query = (searchInput?.value || '').toLowerCase().trim();
    const activeCategory = document.querySelector('.project-filter-btn.active')?.dataset.filter || 'all';

    projectCards.forEach(card => {
      const title = (card.dataset.title || '').toLowerCase();
      const category = (card.dataset.category || '').toLowerCase();
      const tech = (card.dataset.tech || '').toLowerCase();

      const matchesSearch = !query || title.includes(query) || tech.includes(query) || category.includes(query);
      const matchesCategory = activeCategory === 'all' || category === activeCategory.toLowerCase();

      if (matchesSearch && matchesCategory) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });

    // Check empty state
    const visibleCount = Array.from(projectCards).filter(c => c.style.display !== 'none').length;
    const emptyState = document.getElementById('projectsEmptyState');
    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', filterProjects);
  }

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterProjects();
    });
  });
}

/* 6. Domain Filtering & Search */
function initDomainSearch() {
  const searchInput = document.getElementById('domainSearchInput');
  const domainCards = document.querySelectorAll('.domain-card-item');

  if (!domainCards.length || !searchInput) return;

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    domainCards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? 'flex' : 'none';
    });
  });
}

/* 7. Resource Filtering */
function initResourceFilters() {
  const filterBtns = document.querySelectorAll('.resource-filter-btn');
  const resourceCards = document.querySelectorAll('.resource-card-item');

  if (!resourceCards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.category || 'all';

      resourceCards.forEach(card => {
        const itemCat = card.dataset.category || '';
        if (cat === 'all' || itemCat.toLowerCase() === cat.toLowerCase()) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* 8. Generic Modals */
function initModals() {
  document.querySelectorAll('[data-modal-target]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = trigger.getAttribute('data-modal-target');
      const modal = document.getElementById(targetId);
      if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
    const closeBtn = modal.querySelector('.modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
  });
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
  document.body.style.overflow = '';
}
