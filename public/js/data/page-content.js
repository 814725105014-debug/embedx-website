// Editable public copy is always rendered with textContent; never interpret CMS text as HTML.
export const PAGE_CONTENT = {
  global: {
    label: "Shared footer text",
    fields: [
      ["footerNavHeading", "Footer: Navigation heading", "Navigation"],
      ["footerCommunityHeading", "Footer: Community heading", "Community"],
      ["footerConnectHeading", "Footer: Connect heading", "Connect With Us"],
      ["footerConnectDescription", "Footer: Connect description", "Follow departmental technical initiatives, competition updates, and workshop announcements."],
      ["footerTagline", "Footer: Club tagline", "INNOVATE • INTEGRATE • INSPIRE"],
      ["footerCopyright", "Footer: Copyright line", "© 2026 EMBEDX – Embedded Systems and Automation Club • Department of EEE."]
    ]
  },
  home: {
    label: "Home page",
    fields: [
      ["heroEyebrow", "Hero: Eyebrow", "Department of EEE • SRM TRP Engineering College"],
      ["heroTitle", "Hero: Main heading", "Embedded Systems & Automation Club"],
      ["heroDescription", "Hero: Description", "Building practical skills, intelligent embedded systems, robotic mechanisms, and real-world engineering solutions through hands-on innovation."],
      ["heroTechline", "Hero: Technical line", "Embedded C • ARM • RTOS | Robotics & Industrial PLC | Practical Engineering"],
      ["aboutTitle", "About: Heading", "Fostering the Next Generation of Embedded & Automation Engineers"],
      ["aboutDescription", "About: Introduction", "EMBEDX is the official technical club of the Department of Electrical and Electronics Engineering at SRM TRP Engineering College, focusing on Embedded Systems, Automation, IoT, Robotics, Control Systems, Electronics, and emerging smart technologies."],
      ["communityTitle", "Community: Heading", "About Our Community"],
      ["communityDescription", "Community: Description", "We operate as an agile, student-driven engineering powerhouse supported by departmental faculty mentorship, state-of-the-art laboratory infrastructure, and an unwavering commitment to hands-on craftsmanship. The club aims to build technical skills, inspire innovation, and prepare students for real-world engineering challenges."],
      ["journeyTitle", "Journey: Heading", "The EMBEDX Engineering Journey"],
      ["projectsEyebrow", "Projects: Eyebrow", "Hands-On Engineering"],
      ["projectsTitle", "Projects: Heading", "Featured Club Projects"],
      ["projectsDescription", "Projects: Description", "Real embedded prototypes engineered by EMBEDX student teams tackling autonomous mobility, healthcare, waste management, and robotics interfaces."],
      ["achieversEyebrow", "Achievers: Eyebrow", "Competitive Excellence"],
      ["achieversTitle", "Achievers: Heading", "Hall of Achievers"],
      ["achieversDescription", "Achievers: Description", "Celebrating the hard work, competitive representation, and engineering triumphs of EMBEDX club members across national and regional stages."],
      ["eventsEyebrow", "Events: Eyebrow", "Flagship Signature Event"],
      ["eventsTitle", "Events: Heading", "EMBEDNOVA — A Tech-Powered Event for Innovative Minds"],
      ["eventsDescription", "Events: Description", "INNOVATE • INTEGRATE • AUTOMATE. EMBEDNOVA is the premier technical competition by EMBEDX, bringing together engineering students across the state to tackle rapid embedded challenges, circuit troubleshooting, and innovative automation systems."]
    ]
  },
  about: {
    label: "About page",
    fields: [
      ["eyebrow", "Page: Eyebrow", "Institutional Identity & Vision"],
      ["title", "Page: Heading", "About EMBEDX"],
      ["intro", "Page: Introduction", "The premier technical community for Embedded Systems, Automation, Robotics, IoT, and Intelligent Technologies at SRM TRP Engineering College."],
      ["overviewTitle", "Overview: Heading", "Pioneering Practical Technology in the Department of EEE"],
      ["overviewDescription", "Overview: Description", "EMBEDX is the official technical club of the Department of Electrical and Electronics Engineering at SRM TRP Engineering College, Tiruchirappalli. Focusing on Embedded Systems, Automation, IoT, and Smart Technologies, the club aims to build rigorous technical skills, inspire creative problem-solving, and prepare future engineers for high-impact careers in modern technology and manufacturing industries."],
      ["missionTitle", "Mission: Heading", "Our Mission"],
      ["visionTitle", "Vision: Heading", "Our Vision"],
      ["journeyEyebrow", "Journey: Eyebrow", "Methodology"],
      ["journeyTitle", "Journey: Heading", "The 6-Stage EMBEDX Journey"],
      ["journeyDescription", "Journey: Introduction", "A structured progression from fundamentals to tangible engineering impact."]
    ]
  },
  domains: {
    label: "Domains page",
    fields: [
      ["eyebrow", "Page: Eyebrow", "Engineering Curricula & Wings"],
      ["title", "Page: Heading", "What We Work On"],
      ["intro", "Page: Introduction", "Discover the 12 specialized engineering verticals where EMBEDX members build hardware, write optimized firmware, automate machinery, and pioneer connected systems."],
      ["toolsEyebrow", "Tools: Eyebrow", "Toolchains & Software"],
      ["toolsTitle", "Tools: Heading", "Tools & Platforms We Utilize"],
      ["toolsDescription", "Tools: Description", "Industry-standard software suites, IDEs, simulation packages, and hardware platforms used in EMBEDX project sprints."],
      ["careersEyebrow", "Careers: Eyebrow", "Industry & Opportunities"],
      ["careersTitle", "Careers: Heading", "Where EMBEDX Skills Can Lead"]
    ]
  },
  projects: {
    label: "Projects page",
    fields: [
      ["eyebrow", "Page: Eyebrow", "Tangible Engineering"],
      ["title", "Page: Heading", "Projects Showcase"],
      ["intro", "Page: Introduction", "Demonstrating that EMBEDX is project-focused, practical, and solution-driven. Explore student prototypes competing at national hackathons and symposiums."]
    ]
  },
  events: {
    label: "Events page",
    fields: [
      ["eyebrow", "Page: Eyebrow", "Competitions & Tech Fests"],
      ["title", "Page: Heading", "Club Events & Fests"],
      ["intro", "Page: Introduction", "From our flagship technical competition EMBEDNOVA to hands-on silicon workshops and industrial automation bootcamps."]
    ]
  },
  achievers: {
    label: "Achievers page",
    fields: [
      ["eyebrow", "Page: Eyebrow", "Competitive Excellence"],
      ["title", "Page: Heading", "Hall of Achievers"],
      ["intro", "Page: Introduction", "Honoring the practical engineering innovations, symposium triumphs, and national-level representations by EMBEDX student members."]
    ]
  },
  team: {
    label: "Team page",
    fields: [
      ["eyebrow", "Page: Eyebrow", "Leadership & Mentorship"],
      ["title", "Page: Heading", "Meet the EMBEDX Team"],
      ["intro", "Page: Introduction", "Dedicated faculty advisors and passionate student leaders steering the Department of Electrical and Electronics Engineering technical community."]
    ]
  },
  resources: {
    label: "Resources page",
    fields: [
      ["eyebrow", "Page: Eyebrow", "Knowledge Repository"],
      ["title", "Page: Heading", "EMBEDX Learning Hub"],
      ["intro", "Page: Introduction", "Essential reference materials, cheatsheets, register guides, and interview roadmaps curated for student engineering mastery."]
    ]
  },
  join: {
    label: "Join page",
    fields: [
      ["eyebrow", "Page: Eyebrow", "Membership & Recruitment"],
      ["title", "Page: Heading", "BECOME PART OF EMBEDX"],
      ["intro", "Page: Introduction", "Learn. Build. Experiment. Compete. Innovate. Join a vibrant practical technology community where students build real embedded systems, robotic mechanisms, and smart automation solutions."],
      ["eligibilityTitle", "Eligibility: Heading", "Eligibility — Who Can Join EMBEDX?"],
      ["eligibilityDescription", "Eligibility: Description", "Membership is open to enthusiastic engineering students across all years and departments interested in:"],
      ["processTitle", "Selection process: Heading", "Selection Process — How It Works"]
    ]
  },
  contact: {
    label: "Contact page",
    fields: [
      ["eyebrow", "Page: Eyebrow", "Official Communications"],
      ["title", "Page: Heading", "Connect With EMBEDX"],
      ["intro", "Page: Introduction", "Department of Electrical and Electronics Engineering • SRM TRP Engineering College, Tiruchirappalli."],
      ["departmentHeading", "Department card: Heading", "Department Information"],
      ["addressLabel", "Department card: Address label", "Address:"],
      ["address", "Department card: Address", "Department of Electrical and Electronics Engineering, SRM TRP Engineering College (Autonomous), SRM Nagar, Near Samayapuram, Tiruchirappalli – 621 105."],
      ["socialHeading", "Social links: Heading", "Follow EMBEDX social channels:"]
    ]
  }
};

export const PAGE_CONTENT_IDS = Object.keys(PAGE_CONTENT);
export function getPageContentDefaults(page) {
  return Object.fromEntries((PAGE_CONTENT[page]?.fields || []).map(([key, _label, value]) => [key, value]));
}
