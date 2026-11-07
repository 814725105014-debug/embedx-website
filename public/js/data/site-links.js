export const DEFAULT_SITE_LINKS = Object.freeze({
  primary: [
    { id: "home", label: "Home", href: "/" },
    { id: "about", label: "About", href: "/pages/about.html" },
    { id: "domains", label: "Domains", href: "/pages/domains.html" },
    { id: "projects", label: "Projects", href: "/pages/projects.html" },
    { id: "events", label: "Events", href: "/pages/events.html" },
    { id: "achievers", label: "Achievers", href: "/pages/achievers.html" },
    { id: "team", label: "Team", href: "/pages/team.html" },
    { id: "resources", label: "Resources", href: "/pages/resources.html" },
    { id: "contact", label: "Contact", href: "/pages/contact.html" }
  ],
  headerJoin: [{ id: "join", label: "Join EMBEDX", href: "/pages/join.html" }],
  footerNavigation: [
    { id: "home", label: "Home", href: "/" },
    { id: "about", label: "About Us", href: "/pages/about.html" },
    { id: "domains", label: "Technical Domains", href: "/pages/domains.html" },
    { id: "projects", label: "Projects Showcase", href: "/pages/projects.html" },
    { id: "events", label: "Events", href: "/pages/events.html" },
    { id: "achievers", label: "Hall of Achievers", href: "/pages/achievers.html" }
  ],
  footerCommunity: [
    { id: "team", label: "Meet the Team", href: "/pages/team.html" },
    { id: "resources", label: "Learning Hub", href: "/pages/resources.html" },
    { id: "join", label: "Join EMBEDX", href: "/pages/join.html" },
    { id: "contact", label: "Contact Department", href: "/pages/contact.html" },
  ]
});

export const SITE_LINK_GROUPS = [
  ["primary", "Header navigation"],
  ["headerJoin", "Header join button"],
  ["footerNavigation", "Footer navigation"],
  ["footerCommunity", "Footer community links"]
];

export function normalizeSiteLinks(value = {}) {
  const result = {};
  for (const [group, defaults] of Object.entries(DEFAULT_SITE_LINKS)) {
    const rows = Array.isArray(value?.[group]) ? value[group] : defaults;
    result[group] = rows.filter((row) => row && typeof row === "object").map((row, index) => ({
      id: String(row.id || `${group}-${index + 1}`).slice(0, 80),
      label: typeof row.label === "string" ? row.label.slice(0, 100) : "",
      href: typeof row.href === "string" ? row.href.slice(0, 500) : ""
    }));
  }
  return result;
}
