/**
 * EMBEDX Dynamic Route & Detail Page Hydration
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const eventId = urlParams.get('id');

  // 1. Hydrate Project Detail Page
  if (document.getElementById('projectDetailContainer') && typeof projectsData !== 'undefined') {
    const targetId = projectId || 'autonomous-mobile-robot';
    const project = projectsData.find(p => p.id === targetId) || projectsData[0];
    renderProjectDetail(project, projectsData);
  }

  // 2. Hydrate Event Detail Page
  if (document.getElementById('eventDetailContainer') && typeof eventsData !== 'undefined') {
    const event = eventsData.find(e => e.id === eventId) || eventsData[0];
    if (event) renderEventDetail(event);
    else {
      const container = document.getElementById('eventDetailContainer');
      if (container) container.innerHTML = '<div class="container text-center"><h1 class="text-navy">Event not found</h1><p>Current event details will be published here.</p><a class="btn btn-primary" href="events.html">Browse Events</a></div>';
    }
  }
});

function renderProjectDetail(p, allProjects) {
  document.title = `${p.title} | EMBEDX Projects | SRM TRP Engineering College`;

  const container = document.getElementById('projectDetailContainer');
  if (!container) return;

  const otherProjects = (allProjects || []).filter(item => item.id !== p.id);

  container.innerHTML = `
    <div class="container">
      <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <a href="projects.html" class="btn btn-sm btn-outline" style="display: inline-flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-arrow-left"></i> Back to Projects
        </a>
        <div style="font-family: var(--font-heading); font-size: 0.88rem; font-weight: 700; color: var(--text-muted);">
          EMBEDX &bull; Department of EEE &bull; SRM TRP Engineering College
        </div>
      </div>

      <div class="grid-2" style="align-items: start; gap: 3.5rem; margin-bottom: 3.5rem;">
        <div>
          <div class="section-eyebrow eyebrow-green" style="margin-bottom: 0.75rem;">${p.category} &bull; ${p.status}</div>
          <h1 class="text-navy" style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin-bottom: 1rem;">${p.title}</h1>
          <p style="font-size: 1.15rem; color: var(--secondary-blue); font-weight: 600; margin-bottom: 1.5rem;">${p.highlight}</p>
          <p style="font-size: 1.05rem; line-height: 1.8; margin-bottom: 2rem;">${p.shortDesc}</p>

          <div style="background: #FFFFFF; border: 1.5px solid var(--border-light); border-radius: var(--radius-md); padding: 1.5rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
            <h4 class="text-navy" style="margin-bottom: 0.75rem;"><i class="fa-solid fa-microchip text-green" style="margin-right: 0.5rem;"></i> Core Technologies</h4>
            <div class="domain-tech-chips">
              ${p.technologies.map(t => `<span class="tech-chip" style="font-size: 0.85rem; padding: 0.3rem 0.75rem;">${t}</span>`).join('')}
            </div>
          </div>

          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <a href="join.html" class="btn btn-green">Contribute to Projects</a>
            <button class="btn btn-outline" onclick="openLightbox('${p.image}', '${p.title}')">
              <i class="fa-solid fa-expand"></i> Expand Image
            </button>
          </div>
        </div>

        <div>
          <div style="background: #FFFFFF; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-lg); text-align: center; overflow: hidden;">
            <img src="${p.image}" alt="${p.title}" style="width: 100%; max-height: 380px; object-fit: contain; border-radius: var(--radius-md); cursor: pointer;" onclick="openLightbox('${p.image}', '${p.title}')" />
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 1rem;">Click photo to view high-resolution technical snapshot</p>
          </div>
        </div>
      </div>

      <!-- Technical Architecture Breakdown -->
      <div style="background: #FFFFFF; border: 1px solid var(--border-card); border-radius: var(--radius-lg); padding: clamp(2rem, 4vw, 3.5rem); box-shadow: var(--shadow-md); margin-bottom: 4rem;">
        <h2 class="text-navy" style="margin-bottom: 2rem; border-bottom: 2px solid var(--border-light); padding-bottom: 1rem;">
          <i class="fa-solid fa-diagram-project text-blue" style="margin-right: 0.5rem;"></i> System Architecture & Specs
        </h2>

        <div class="grid-2" style="gap: 2.5rem; margin-bottom: 3rem;">
          <div>
            <h3 class="text-navy" style="font-size: 1.3rem; margin-bottom: 0.75rem;">Problem Statement</h3>
            <p style="line-height: 1.7;">${p.problemStatement}</p>
          </div>
          <div>
            <h3 class="text-navy" style="font-size: 1.3rem; margin-bottom: 0.75rem;">Proposed Engineering Solution</h3>
            <p style="line-height: 1.7;">${p.proposedSolution}</p>
          </div>
        </div>

        <div style="margin-bottom: 3rem;">
          <h3 class="text-navy" style="font-size: 1.3rem; margin-bottom: 0.75rem;">Working Principle</h3>
          <p style="line-height: 1.7; background: var(--bg-secondary); padding: 1.5rem; border-radius: var(--radius-md); border-left: 4px solid var(--engineering-green);">${p.workingPrinciple}</p>
        </div>

        <div class="grid-2" style="gap: 2.5rem; margin-bottom: 3rem;">
          <div>
            <h3 class="text-navy" style="font-size: 1.3rem; margin-bottom: 1rem;"><i class="fa-solid fa-plug text-orange" style="margin-right: 0.5rem;"></i> Hardware Components</h3>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.6rem;">
              ${p.hardware.map(hw => `<li style="display: flex; align-items: center; gap: 0.6rem;"><i class="fa-solid fa-check-circle text-green"></i> <span>${hw}</span></li>`).join('')}
            </ul>
          </div>
          <div>
            <h3 class="text-navy" style="font-size: 1.3rem; margin-bottom: 1rem;"><i class="fa-solid fa-code text-blue" style="margin-right: 0.5rem;"></i> Software & Algorithms</h3>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.6rem;">
              ${p.software.map(sw => `<li style="display: flex; align-items: center; gap: 0.6rem;"><i class="fa-solid fa-check-circle text-blue"></i> <span>${sw}</span></li>`).join('')}
            </ul>
          </div>
        </div>

        <div style="margin-bottom: 3rem;">
          <h3 class="text-navy" style="font-size: 1.3rem; margin-bottom: 1rem;"><i class="fa-solid fa-trophy text-orange" style="margin-right: 0.5rem;"></i> Verified Outcomes & Milestones</h3>
          <div class="grid-3" style="gap: 1rem;">
            ${p.outcomes.map(out => `
              <div style="background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem;">
                <i class="fa-solid fa-star text-orange" style="margin-bottom: 0.5rem; display: block;"></i>
                <p style="font-size: 0.95rem; font-weight: 500; color: var(--primary-navy); margin: 0;">${out}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Browse Other Projects Switcher -->
        ${otherProjects.length > 0 ? `
          <div style="border-top: 2px solid var(--border-light); padding-top: 2.5rem; margin-top: 2rem;">
            <h3 class="text-navy" style="font-size: 1.3rem; margin-bottom: 1.25rem;">
              <i class="fa-solid fa-layer-group text-blue" style="margin-right: 0.5rem;"></i> Explore Other EMBEDX Projects
            </h3>
            <div class="grid-3" style="gap: 1.25rem;">
              ${otherProjects.slice(0, 3).map(op => `
                <a href="project-detail.html?id=${op.id}" style="text-decoration: none; display: flex; align-items: center; gap: 1rem; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem; transition: transform 0.2s, border-color 0.2s;">
                  <img src="${op.image}" alt="${op.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--radius-sm);" />
                  <div>
                    <h5 class="text-navy" style="font-size: 0.95rem; margin-bottom: 0.2rem;">${op.title}</h5>
                    <span style="font-size: 0.78rem; font-weight: 600; color: var(--engineering-green);">${op.category}</span>
                  </div>
                </a>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderEventDetail(ev) {
  const container = document.getElementById('eventDetailContainer');
  if (!container || !ev) return;
  document.title = `${ev.title} — EMBEDX Events | SRM TRP Engineering College`;
  const description = ev.description || ev.overview || ev.subtitle || "";
  const poster = ev.imageUrl || ev.poster || "";
  container.innerHTML = `
    <div class="container">
      <a href="events.html" class="btn btn-sm btn-outline">Back to Events</a>
      <section class="card" style="margin:2rem 0;padding:clamp(1.5rem,4vw,3rem)">
        <span class="section-eyebrow">${ev.type || "Club event"}</span>
        <h1 class="text-navy">${ev.title || "Event details"}</h1>
        <p class="section-subtitle">${description}</p>
        ${poster ? `<img src="${poster}" alt="${ev.title || "Event"}" style="max-width:100%;max-height:520px;object-fit:contain" />` : ""}
        ${ev.date || ev.eventDate ? `<p><strong>Date:</strong> ${ev.eventDate || ev.date}</p>` : ""}
        ${ev.venue ? `<p><strong>Venue:</strong> ${ev.venue}</p>` : ""}
      </section>
    </div>`;
}
