// EMBEDX Official Events Data
const eventsData = [
  {
    id: "embednova",
    title: "EMBEDNOVA",
    subtitle: "A Tech-Powered Event for Innovative Minds",
    tagline: "INNOVATE • INTEGRATE • AUTOMATE",
    type: "Flagship Signature Event",
    featured: true,
    poster: "assets/posters/embednova-event-poster.png",
    logo: "assets/branding/embednova-logo.png",
    date: "Annual Signature Technical Fest",
    venue: "Department of EEE, SRM TRP Engineering College, Tiruchirappalli",
    registrationStatus: "Open / Limited Seats",
    registrationLink: "#register-modal",
    eligibility: "Open to all Engineering Students across all departments and colleges",
    overview: "EMBEDNOVA is the premier signature technology competition hosted by EMBEDX – Embedded Systems & Automation Club, Department of Electrical & Electronics Engineering, SRM TRP Engineering College. Designed to push the boundaries of embedded intelligence, circuit debugging, and industrial automation, EMBEDNOVA brings together brightest engineering minds to solve real-world technical challenges.",
    whyParticipate: [
      { icon: "fa-brain", title: "Sharpen Technical Skills", desc: "Gain deep hands-on mastery in embedded programming, circuit diagnostics, and automation architecture." },
      { icon: "fa-users-gear", title: "Solve Real-World Challenges", desc: "Tackle authentic industry-inspired problem statements under timed competitive settings." },
      { icon: "fa-lightbulb", title: "Collaborate & Innovate", desc: "Team up with passionate fellow engineers, share visionary ideas, and build cross-disciplinary solutions." },
      { icon: "fa-certificate", title: "Official Certification", desc: "Receive prestigious certificates of participation and merit for all recognized contenders." },
      { icon: "fa-trophy", title: "Win Exciting Prizes", desc: "Compete for top honors, awards, trophies, and commendation certificates across all 3 tracks." }
    ],
    tracks: [
      {
        number: "01",
        name: "TECH CHALLENGE",
        tagline: "Test your Embedded Knowledge!",
        motto: "THINK SMART. CODE SMARTER.",
        color: "#2D72D9",
        image: "assets/images/event-tech-challenge.png",
        description: "A fast-paced technical showdown evaluating core understanding of embedded architectures, microcontrollers, low-level logic, and algorithmic execution.",
        topics: [
          "Microcontroller Architecture & MCQs (8051, AVR, ARM Cortex)",
          "Aptitude & Technical Logic Assessment",
          "Low-Level Embedded C/C++ Code Snippets & Bug Hunting",
          "Real-World Embedded Systems Scenarios & Problem Solving",
          "Timing Diagrams, Interrupt Handling & Memory Mapping"
        ],
        format: "Round 1: Rapid-Fire Technical MCQ & Logic Screening. Round 2: Real-World Architecture Design & Pseudo-Firmware Problem Solving.",
        rules: [
          "Individual or 2-member team participation",
          "Calculators and basic technical reference sheets permitted in designated rounds",
          "Strict timed environment with penalty for negative deductions in speed rounds"
        ]
      },
      {
        number: "02",
        name: "CIRCUIT WIZARD",
        tagline: "Build. Debug. Perfect.",
        motto: "DEBUG TODAY, DEPLOY TOMORROW.",
        color: "#146B3A",
        image: "assets/images/event-circuit-wizard.png",
        description: "The ultimate hardware debugging challenge where engineers analyze faulty schematics, diagnose breadboard/PCB defects, select optimal components, and bring dead circuits back to life.",
        topics: [
          "Component Selection & Datasheet Parameter Calculations",
          "Fault Diagnosis in Analog, Digital & Power Electronic Circuits",
          "Fix it Right, Make it Work! Real Breadboard/PCB Troubleshooting",
          "Precision, Logic & Hardware Innovation",
          "Oscilloscope, Multimeter & Logic Analyzer Measurement Techniques"
        ],
        format: "Round 1: Schematic Fault Identification on paper/simulation. Round 2: Live Hardware Debugging & Component Soldering/Wiring Challenge.",
        rules: [
          "Teams of 2 to 3 students",
          "All test equipment (DMM, power supplies, test boards) provided on-site",
          "Circuit must achieve verified output metrics within the allotted time window"
        ]
      },
      {
        number: "03",
        name: "AUTOMATION ARENA",
        tagline: "Automate the Future!",
        motto: "AUTOMATE IDEAS. ELEVATE IMPACT.",
        color: "#F47B20",
        image: "assets/images/event-automation-arena.png",
        description: "A flagship innovation arena where teams design, prototype, and demonstrate smart automation solutions, robotic mechanisms, IoT connected systems, and industrial control systems.",
        topics: [
          "Problem-Statement Based Open Innovation",
          "Design, Develop & Deploy Working Prototypes",
          "Innovative Automation & Smart Robotic Solutions",
          "Sensor-to-Cloud Integration & Actuation Control",
          "Live System Demonstration & Pitch to Jury Panel"
        ],
        format: "Stage 1: Abstract & System Design Architecture Review. Stage 2: Live Working Prototype Demonstration & Evaluation by Academic & Industry Jury.",
        rules: [
          "Teams of 2 to 4 students",
          "Prototypes must feature active embedded/automation hardware",
          "Judged on innovation, technical complexity, feasibility, and presentation"
        ]
      }
    ],
    skillsDeveloped: [
      "Embedded Programming & Firmware Optimization",
      "IoT & Hardware Integration",
      "Circuit Design, Simulation & Debugging",
      "Automation & Closed-Loop Control Systems",
      "Analytical Problem Solving & Technical Logic",
      "Teamwork, Rapid Prototyping & Technical Communication"
    ],
    faqs: [
      {
        q: "Who is eligible to participate in EMBEDNOVA?",
        a: "EMBEDNOVA is open to all undergraduate and postgraduate engineering and polytechnic students from any department (EEE, ECE, CSE, IT, Mech, Mechatronics, AI/DS, etc.)."
      },
      {
        q: "Can a team register for multiple challenge tracks?",
        a: "Yes! Teams can participate in multiple tracks provided their event timings do not overlap. Check the event schedule for track coordination."
      },
      {
        q: "Will hardware kits or components be provided for the competition?",
        a: "For Track 01 (Tech Challenge) and Track 02 (Circuit Wizard), all test components, multimeters, power supplies, and test circuits will be provided by the organizers. For Track 03 (Automation Arena), teams are encouraged to bring their project hardware for demonstration."
      },
      {
        q: "Are certificates provided to all participants?",
        a: "Yes! All verified participants receive official Certificates of Participation, and top-ranking winners in each track receive Merit Certificates, Trophies, and Awards."
      }
    ],
    contactInfo: {
      department: "Department of Electrical and Electronics Engineering",
      institution: "SRM TRP Engineering College",
      location: "SRM Nagar, Samayapuram, Trichy – 621 105",
      phone: "0431-2908050",
      email: "eee@srmtrpr.edu.in",
      website: "www.trpengg.ac.in"
    }
  },
  {
    id: "hands-on-stm32-bootcamp",
    title: "ARM Cortex-M & STM32 Firmware Development Bootcamp",
    subtitle: "Hands-on Workshop Series",
    tagline: "MASTER THE SILICON",
    type: "Technical Workshop",
    featured: false,
    poster: "assets/posters/embedded-domain-poster.png",
    logo: "assets/branding/embedx-logo-emblem.png",
    date: "Upcoming Academic Session",
    venue: "Embedded Systems Lab, Department of EEE",
    registrationStatus: "Coming Soon",
    registrationLink: "#join",
    eligibility: "Open to SRM TRP Engineering College students",
    overview: "A comprehensive deep-dive into STM32 32-bit ARM microcontrollers, peripheral drivers (GPIO, USART, SPI, I2C, Timers, ADC), and FreeRTOS task scheduling.",
    skillsDeveloped: ["ARM Cortex-M Architecture", "STM32CubeIDE", "HAL & Register Level Programming", "RTOS Fundamentals"],
    tracks: []
  },
  {
    id: "industrial-plc-scada-masterclass",
    title: "Industrial PLC & SCADA Automation Masterclass",
    subtitle: "Industry-Ready Automation Training",
    tagline: "PROGRAM THE INDUSTRY",
    type: "Industry Workshop",
    featured: false,
    poster: "assets/posters/embedded-domain-poster.png",
    logo: "assets/branding/embedx-logo-emblem.png",
    date: "Upcoming Academic Session",
    venue: "Automation & Control Systems Laboratory",
    registrationStatus: "Coming Soon",
    registrationLink: "#join",
    eligibility: "Open to SRM TRP Engineering College students",
    overview: "Hands-on training covering PLC ladder logic programming, industrial sensors, relay logic, pneumatic actuators, and SCADA human-machine interface configuration.",
    skillsDeveloped: ["Ladder Diagram Programming", "Industrial Sensors & Actuators", "SCADA Design", "Safety Interlocks"],
    tracks: []
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = eventsData;
}
