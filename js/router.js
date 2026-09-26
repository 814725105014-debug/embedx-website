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
    const targetId = eventId || 'embednova';
    const event = eventsData.find(e => e.id === targetId) || eventsData[0];
    renderEventDetail(event);
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
  document.title = `${ev.title} — Official Event | EMBEDX`;

  const container = document.getElementById('eventDetailContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="container">
      <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <a href="events.html" class="btn btn-sm btn-outline" style="display: inline-flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-arrow-left"></i> Back to Events
        </a>
        <div style="font-family: var(--font-heading); font-size: 0.88rem; font-weight: 700; color: var(--text-muted);">
          EMBEDX &bull; Department of EEE &bull; SRM TRP Engineering College
        </div>
      </div>

      <!-- Event Hero Banner -->
      <div class="embednova-feature-banner" style="margin-bottom: 3.5rem;">
        <div style="max-width: 800px; position: relative; z-index: 2;">
          <div class="section-eyebrow" style="background: rgba(255,255,255,0.15); color: #FFFFFF; border-color: rgba(255,255,255,0.3); margin-bottom: 1rem;">
            ${ev.type} &bull; ${ev.venue}
          </div>
          <div style="margin-bottom: 1.25rem;">
            <img src="${ev.logo}" alt="${ev.title}" style="max-height: 60px; width: auto;" />
          </div>
          <h2 style="color: #FFFFFF; font-size: clamp(1.8rem, 3.5vw, 2.5rem); margin-bottom: 0.75rem;">${ev.subtitle}</h2>
          <p style="font-family: var(--font-heading); font-size: 1.2rem; font-weight: 700; letter-spacing: 0.12em; color: var(--accent-orange); margin-bottom: 1.5rem;">
            ${ev.tagline}
          </p>
          <p style="color: rgba(255, 255, 255, 0.9); font-size: 1.1rem; line-height: 1.8; margin-bottom: 2rem;">${ev.overview}</p>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <button class="btn btn-orange" onclick="document.getElementById('registerModal').classList.add('open')">
              Register Now <i class="fa-solid fa-arrow-right"></i>
            </button>
            <button class="btn btn-outline-white" onclick="openLightbox('${ev.poster}', '${ev.title} Official Poster')">
              <i class="fa-solid fa-image"></i> View Official Poster
            </button>
          </div>
        </div>
      </div>

      <!-- 3 Distinct Challenge Tracks -->
      <div style="margin-bottom: 4rem;">
        <div class="section-header">
          <div class="section-eyebrow eyebrow-orange">Competitive Categories</div>
          <h2 class="section-title">The 3 EMBEDNOVA Tracks</h2>
          <p class="section-subtitle">Choose your track or compete across multiple disciplines</p>
        </div>

        <div class="grid-3" style="gap: 2rem;">
          ${ev.tracks.map(t => `
            <div style="background: #FFFFFF; border: 2px solid ${t.color}; border-radius: var(--radius-lg); padding: 2rem; box-shadow: var(--shadow-md); display: flex; flex-direction: column;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                <span class="track-number" style="color: ${t.color};">${t.number}</span>
                <span class="section-eyebrow" style="color: ${t.color}; background: rgba(0,0,0,0.04);">${t.tagline}</span>
              </div>
              <h3 class="text-navy" style="font-size: 1.5rem; margin-bottom: 0.5rem;">${t.name}</h3>
              <p style="font-family: var(--font-heading); font-size: 0.88rem; font-weight: 700; color: ${t.color}; letter-spacing: 0.05em; margin-bottom: 1rem;">
                ${t.motto}
              </p>
              <p style="font-size: 0.95rem; line-height: 1.7; margin-bottom: 1.5rem;">${t.description}</p>
              
              <div style="margin-bottom: 1.5rem;">
                <h4 style="font-size: 1rem; color: var(--primary-navy); margin-bottom: 0.5rem;">Key Topics & Focus:</h4>
                <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.88rem;">
                  ${t.topics.map(top => `<li style="display: flex; align-items: flex-start; gap: 0.5rem;"><i class="fa-solid fa-angle-right" style="color: ${t.color}; margin-top: 0.2rem;"></i> <span>${top}</span></li>`).join('')}
                </ul>
              </div>

              <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border-light);">
                <button class="btn btn-sm btn-outline" style="width: 100%; border-color: ${t.color}; color: ${t.color};" onclick="document.getElementById('registerModal').classList.add('open')">
                  Register for Track ${t.number}
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Why Participate & Skills -->
      <div style="background: #FFFFFF; border: 1px solid var(--border-card); border-radius: var(--radius-lg); padding: clamp(2rem, 4vw, 3.5rem); box-shadow: var(--shadow-md); margin-bottom: 4rem;">
        <div class="grid-2" style="gap: 3rem;">
          <div>
            <h3 class="text-navy" style="margin-bottom: 1.5rem;"><i class="fa-solid fa-award text-orange" style="margin-right: 0.5rem;"></i> Why Participate in EMBEDNOVA?</h3>
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              ${ev.whyParticipate.map(w => `
                <div style="display: flex; align-items: flex-start; gap: 1rem;">
                  <div style="width: 44px; height: 44px; border-radius: var(--radius-sm); background: rgba(11, 42, 111, 0.06); color: var(--primary-navy); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0;">
                    <i class="fa-solid ${w.icon}"></i>
                  </div>
                  <div>
                    <h4 style="font-size: 1.1rem; color: var(--primary-navy); margin-bottom: 0.25rem;">${w.title}</h4>
                    <p style="font-size: 0.92rem; margin: 0;">${w.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div>
            <h3 class="text-navy" style="margin-bottom: 1.5rem;"><i class="fa-solid fa-list-check text-green" style="margin-right: 0.5rem;"></i> Skills You Will Demonstrate</h3>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.75rem;">
              ${ev.skillsDeveloped.map(sk => `
                <li style="background: var(--bg-secondary); padding: 0.75rem 1rem; border-radius: var(--radius-md); border-left: 3px solid var(--engineering-green); display: flex; align-items: center; gap: 0.75rem; font-weight: 500; color: var(--primary-navy);">
                  <i class="fa-solid fa-circle-check text-green"></i> ${sk}
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      </div>

      <!-- FAQ Section -->
      <div style="margin-bottom: 4rem;">
        <div class="section-header">
          <div class="section-eyebrow">Queries & Guidelines</div>
          <h2 class="section-title">Frequently Asked Questions</h2>
        </div>

        <div style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem;">
          ${ev.faqs.map(f => `
            <details style="background: #FFFFFF; border: 1.5px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); cursor: pointer;">
              <summary style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 700; color: var(--primary-navy); list-style: none; display: flex; justify-content: space-between; align-items: center;">
                <span>${f.q}</span>
                <i class="fa-solid fa-chevron-down text-blue" style="font-size: 0.9rem;"></i>
              </summary>
              <p style="margin-top: 1rem; color: var(--text-muted); line-height: 1.7; font-size: 0.98rem;">${f.a}</p>
            </details>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
