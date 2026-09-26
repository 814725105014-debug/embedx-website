// EMBEDX Official Achievements & Hall of Fame Data
const achievementsData = [
  {
    id: "national-level-innovation-2026",
    title: "National Level Innovation 2026",
    project: "Autonomous Mobile Robot",
    category: "Robotics & Embedded Systems",
    year: "2026",
    level: "National Level",
    image: "assets/projects/autonomous-mobile-robot.png",
    description: "The EMBEDX student engineering team successfully represented SRM TRP Engineering College with their custom-built Autonomous Mobile Robot at the prestigious National Level Innovation 2026.",
    highlights: [
      "Designed and fabricated custom chassis with dual ultrasonic/IR obstacle avoidance",
      "Achieved sub-50ms reactive navigation in unmapped environments",
      "Demonstrated closed-loop motor control and autonomous path-following"
    ],
    team: "EMBEDX Robotics Project Team",
    institution: "Department of EEE, SRM TRP Engineering College",
    badgeText: "National Representation",
    badgeType: "national"
  },
  {
    id: "niral-thiruvizha-2026",
    title: "Niral Thiruvizha 2026",
    project: "Smart Dustbin for Efficient Waste Segregation",
    category: "Smart Systems & Automation",
    year: "2026",
    level: "State / Regional Level",
    image: "assets/projects/smart-dustbin.png",
    description: "Presented the automated Smart Dustbin solution for intelligent municipal waste segregation and clean campus management at Niral Thiruvizha 2026.",
    highlights: [
      "Touchless hygiene lid actuation with multi-compartment segregation logic",
      "Real-time ultrasonic bin fill-level telemetry and status indication",
      "Praised by jury for practical social impact and sustainable technology alignment"
    ],
    team: "EMBEDX Smart Systems Team",
    institution: "Department of EEE, SRM TRP Engineering College",
    badgeText: "Innovation Showcase",
    badgeType: "state"
  },
  {
    id: "gesture-interface-demonstration-2026",
    title: "Intelligent Human-Machine Interface Demonstration",
    project: "Gesture Recognition Robotic System",
    category: "Mechatronics & Wireless",
    year: "2026",
    level: "Institutional & Technical Symposia",
    image: "assets/projects/gesture-recognition.png",
    description: "Demonstrated advanced 6-axis IMU wireless teleoperation for robotics control in hazardous and sterile medical environments.",
    highlights: [
      "Low-latency 2.4GHz RF communication glove with sub-20ms lag",
      "Complementary filter algorithm for gyro drift suppression",
      "Exhibited during department tech expositions and IEEE events"
    ],
    team: "EMBEDX Mechatronics Division",
    institution: "Department of EEE, SRM TRP Engineering College",
    badgeText: "Technical Commendation",
    badgeType: "expo"
  },
  {
    id: "medibot-healthcare-innovation-2026",
    title: "Healthcare Tech Innovation",
    project: "MEDIBOT – Smart Medicine Reminder & Dispenser",
    category: "Healthcare Embedded Systems",
    year: "2026",
    level: "Department Innovation Drive",
    image: "assets/projects/medibot.png",
    description: "Pioneered an intelligent medication scheduler and motorized dispenser bot tailored for elderly care and prescription adherence.",
    highlights: [
      "RTC battery-backed scheduling with zero time-drift",
      "Optical beam-break verification of pill extraction",
      "Audio-visual multi-sensory notification module"
    ],
    team: "EMBEDX Healthcare Systems Division",
    institution: "Department of EEE, SRM TRP Engineering College",
    badgeText: "Social Innovation",
    badgeType: "healthcare"
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = achievementsData;
}
