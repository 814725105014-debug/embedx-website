// EMBEDX — starter-managed forms. Existing Firestore forms are never overwritten by seeding.
export const forms = [
  {
    id: "join",
    title: "Club Membership Application",
    description: "Apply to join the EMBEDX community.",
    kind: "join",
    builtin: true,
    status: "open",
    fields: [
      { key: "full_name", label: "Full name", type: "text", required: true },
      { key: "regNo", label: "Register number", type: "text", required: false },
      { key: "department", label: "Department", type: "text", required: true },
      { key: "year", label: "Year of study", type: "select", required: true, options: ["I Year", "II Year", "III Year", "IV Year"] },
      { key: "email", label: "Email address", type: "email", required: true },
      { key: "phone", label: "Phone number", type: "tel", required: true },
      { key: "interests", label: "Areas of technical interest", type: "checkboxes", required: true, options: ["Embedded Systems", "RTOS & Firmware", "Robotics & Motion", "IoT & Cloud", "PCB Design", "PLC & SCADA", "Edge AI / TinyML"] },
      { key: "technical_skills", label: "Technical skills", type: "textarea", required: false },
      { key: "motivation", label: "Why do you want to join EMBEDX?", type: "textarea", required: true },
      { key: "portfolio", label: "Portfolio link", type: "url", required: false },
      { key: "agree", label: "I agree to actively participate in club technical workshops, laboratory sessions, and project sprints.", type: "checkbox", required: true }
    ]
  },
  {
    id: "enquiry",
    title: "General Enquiry",
    description: "Send a question to the EMBEDX team.",
    kind: "enquiry",
    builtin: true,
    status: "open",
    fields: [
      { key: "name", label: "Your name", type: "text", required: true },
      { key: "email", label: "Your email address", type: "email", required: true },
      { key: "subject", label: "Subject", type: "text", required: false },
      { key: "message", label: "Message", type: "textarea", required: true }
    ]
  },

  {
    id: "feedback",
    title: "Event Feedback",
    description: "Tell us how we did and what we can improve.",
    kind: "custom",
    builtin: false,
    status: "open",
    fields: [
      { key: "name", label: "Your name", type: "text", required: false },
      { key: "email", label: "Email address", type: "email", required: false },
      { key: "overall_rating", label: "Overall experience", type: "stars", required: true },
      { key: "favorite_part", label: "What did you enjoy most?", type: "textarea", required: false },
      { key: "improvement", label: "What should we improve?", type: "textarea", required: false }
    ]
  }
];
