// EMBEDX Official Projects Data
const projectsData = [
  {
    id: "autonomous-mobile-robot",
    title: "Autonomous Mobile Robot",
    category: "Robotics",
    status: "Achieved / Active",
    featured: true,
    highlight: "Represented in National Level Innovation 2026",
    image: "assets/projects/autonomous-mobile-robot.png",
    shortDesc: "An intelligent autonomous rover with differential drive, multi-sensor environmental mapping, and real-time obstacle navigation.",
    problemStatement: "Navigating complex indoor and industrial environments safely without human teleoperation requires robust real-time sensing, obstacle avoidance algorithms, and low-latency motor control.",
    proposedSolution: "Engineered a differential drive mobile robot platform utilizing ultrasonic and infrared sensor arrays, closed-loop PWM motor driver feedback, and microcontroller-based path planning algorithms.",
    workingPrinciple: "Sensors continuously stream distance telemetry to the core controller. The onboard firmware computes spatial clearance and dynamically recalculates motor RPMs to achieve optimal path traversal and collision avoidance.",
    hardware: [
      "Microcontroller Unit (Atmega328P / ARM Cortex-M)",
      "L298N High-Torque Dual H-Bridge Motor Driver",
      "Ultrasonic HC-SR04 Transducers",
      "Infrared Obstacle Detection Array",
      "High-RPM Geared DC Motors with Optical Encoders",
      "Custom Acrylic/Aluminium Chassis Frame",
      "Lithium-Polymer 12V High-Drain Battery Pack"
    ],
    software: [
      "Embedded C / C++",
      "AVR / Arduino Toolchain",
      "Sensor Telemetry Filtering Algorithms",
      "Closed-Loop PID Motion Control"
    ],
    technologies: ["Embedded C", "Robotics", "PID Control", "Sensor Fusion", "Hardware Interfacing"],
    team: "EMBEDX Robotics Division",
    outcomes: [
      "Successfully competed at the National Level Innovation 2026",
      "Achieved sub-50ms reaction time for obstacle avoidance",
      "Demonstrated 99.2% path adherence on predefined test courses"
    ],
    gallery: [
      "assets/projects/autonomous-mobile-robot.png",
      "assets/posters/embedx-club-poster.png"
    ]
  },
  {
    id: "smart-dustbin",
    title: "Smart Dustbin for Waste Segregation",
    category: "Smart Systems",
    status: "Achieved / Active",
    featured: true,
    highlight: "Represented in Niral Thiruvizha 2026",
    image: "assets/projects/smart-dustbin.png",
    shortDesc: "Automated waste management and segregation prototype designed for smart campuses and urban municipal hygiene.",
    problemStatement: "Conventional manual waste sorting is labor-intensive, unhygienic, and inefficient, leading to poor recyclable recovery and overflowing bins in institutional campuses.",
    proposedSolution: "Developed an automated smart disposal system equipped with contactless opening, multi-type material sensing, fill-level telemetry, and automated lid actuation.",
    workingPrinciple: "Proximity sensors detect approaching users to trigger contactless servo lid actuation. Material classification sensors distinguish wet/dry disposal categories, directing items to designated chambers while ultrasonic depth sensors monitor container volume.",
    hardware: [
      "Microcontroller Controller Board",
      "Ultrasonic Bin Depth Sensor",
      "PIR / Optical Approach Sensor",
      "High-Torque Metal Gear Servos",
      "Inductive / Capacitive Moisture Probes",
      "Solar / Li-ion Battery Power Module"
    ],
    software: [
      "Embedded C Firmware",
      "State-Machine Actuation Logic",
      "Threshold Calibration Algorithm"
    ],
    technologies: ["Embedded Systems", "Smart City Tech", "Automation", "Sensors & Actuators"],
    team: "EMBEDX Smart Systems Division",
    outcomes: [
      "Featured and recognized at Niral Thiruvizha 2026",
      "Eliminated physical contact for 100% hygienic waste deposit",
      "Provided real-time capacity monitoring preventing bin overflow"
    ],
    gallery: [
      "assets/projects/smart-dustbin.png",
      "assets/posters/embedx-club-poster.png"
    ]
  },
  {
    id: "gesture-recognition",
    title: "Gesture Recognition Robotic System",
    category: "Robotics",
    status: "Active Prototype",
    featured: true,
    highlight: "Intelligent Human-Machine Interface",
    image: "assets/projects/gesture-recognition.png",
    shortDesc: "A gesture-controlled robotic platform interpreting real-time spatial hand movements to perform precision operations.",
    problemStatement: "Traditional physical controllers (joysticks/keypads) limit intuitive interaction in specialized industrial, medical, or hazardous robotics environments.",
    proposedSolution: "Constructed a wearable IMU sensor glove paired with an RF transceiver that translates angular pitch, roll, and wrist deflection into directional locomotion commands.",
    workingPrinciple: "The 6-axis MPU6050 accelerometer/gyroscope measures pitch and roll on the user's hand. Telemetry packets are transmitted via 2.4GHz RF to the mobile robot, where the MCU decodes vector coordinates and drives motor PWM channels accordingly.",
    hardware: [
      "MPU6050 6-Axis Motion Sensor (Accelerometer + Gyroscope)",
      "NRF24L01+ 2.4GHz Wireless Transceiver Modules",
      "Microcontroller Processing Nodes (Transmitter & Receiver)",
      "Dual Motor H-Bridge Driver",
      "Rechargeable LiPo Power Source"
    ],
    software: [
      "Embedded C / Arduino Framework",
      "Complementary Filter for IMU Drift Correction",
      "RF24 Low-Latency Data Protocol"
    ],
    technologies: ["Wireless RF", "IMU Sensors", "Embedded C", "Robotics", "Human-Machine Interface"],
    team: "EMBEDX Mechatronics Division",
    outcomes: [
      "Achieved sub-20ms wireless control latency",
      "High gesture accuracy across 6 discrete spatial maneuvers",
      "Demonstrated teleoperation capability up to 30 meters line-of-sight"
    ],
    gallery: [
      "assets/projects/gesture-recognition.png",
      "assets/posters/embedx-club-poster.png"
    ]
  },
  {
    id: "medibot",
    title: "MEDIBOT – Smart Medicine Reminder & Dispenser",
    category: "Healthcare",
    status: "Active Prototype",
    featured: true,
    highlight: "Intelligent Healthcare Assistance Bot",
    image: "assets/projects/medibot.png",
    shortDesc: "An intelligent healthcare assistance robot providing automated scheduled medication alerts, multi-slot dispensing, and patient compliance monitoring.",
    problemStatement: "Elderly patients and individuals with chronic conditions frequently miss critical medication times or take incorrect dosages due to complex prescription schedules.",
    proposedSolution: "Engineered MEDIBOT, an automated dispenser featuring real-time clock (RTC) scheduling, compartmentalized motorized carousel dispensing, multi-sensory audiovisual alerts, and confirmation logging.",
    workingPrinciple: "An onboard DS3231 high-precision RTC maintains scheduled prescription timestamps. When dosage time is reached, the MCU activates buzzer/LED alerts, rotates the carousel stepper to the target medicine compartment, and verifies pill extraction via IR beam-break sensing.",
    hardware: [
      "High-Precision DS3231 RTC Module with Battery Backup",
      "Microcontroller Control Board",
      "Precision Stepper Motor & Driver for Compartment Indexing",
      "Optical IR Beam Break Sensor for Dispense Verification",
      "16x2 I2C Character Display / OLED User Interface",
      "High-Decibel Piezo Buzzer and Multi-Color Alert LEDs",
      "Custom 3D-Printed / Acrylic Compartment Casing"
    ],
    software: [
      "Embedded C / C++",
      "I2C Communication Stack for RTC and Display",
      "State-Machine Scheduler & Alarm Manager"
    ],
    technologies: ["Embedded Systems", "Healthcare IoT", "RTC Scheduling", "Actuators", "Sensors"],
    team: "EMBEDX Healthcare Tech Division",
    outcomes: [
      "Automated foolproof dispensing for multi-dosage daily regimens",
      "Integrated audio-visual reminders with zero clock drift",
      "Dispensing verification prevents double-dosing"
    ],
    gallery: [
      "assets/projects/medibot.png",
      "assets/posters/embedx-club-poster.png"
    ]
  },
  {
    id: "smart-energy-meter",
    title: "IoT Smart Energy & Grid Monitor",
    category: "IoT",
    status: "In Development",
    featured: false,
    highlight: "Smart Energy Management & Analytics",
    image: "assets/images/raspberry-pi-board.png",
    shortDesc: "Connected edge telemetry node measuring voltage, current, power factor, and power consumption with cloud analytics.",
    problemStatement: "Lack of sub-metering and real-time load analytics in institutional laboratories leads to energy wastage and unnoticed harmonic distortions.",
    proposedSolution: "Building an isolated AC current/voltage sensing node sending encrypted telemetry to a central dashboard with predictive load analytics.",
    workingPrinciple: "Non-invasive CT sensors and ZMPT101B voltage transformers sample AC waveforms. The MCU calculates RMS power and uploads telemetry via Wi-Fi/MQTT.",
    hardware: ["ESP32 Dual-Core MCU", "SCT-013 Non-Invasive CT Current Sensor", "ZMPT101B Voltage Sensor Module", "OLED Status Display"],
    software: ["FreeRTOS on ESP32", "MQTT Protocol", "ThingSpeak / InfluxDB"],
    technologies: ["IoT", "Cloud Telemetry", "Power Electronics", "FreeRTOS"],
    team: "EMBEDX Energy & IoT Wing",
    outcomes: ["Real-time power profiling", "Alerts on abnormal power surges", "Cloud data visualization"],
    gallery: ["assets/images/raspberry-pi-board.png"]
  },
  {
    id: "industrial-plc-sorting",
    title: "PLC & SCADA Automated Conveyor Sorting Cell",
    category: "Automation",
    status: "Prototype Blueprint",
    featured: false,
    highlight: "Industrial 4.0 Mechatronics Cell",
    image: "assets/images/industrial-automation-factory.png",
    shortDesc: "Industrial manufacturing simulation featuring multi-sensor material classification, pneumatic divert gates, and SCADA monitoring.",
    problemStatement: "High-speed assembly lines require fault-tolerant, deterministic industrial automation with remote HMI supervision.",
    proposedSolution: "Designing an industrial sorting cell controlled via PLC Ladder Logic and integrated with SCADA telemetry.",
    workingPrinciple: "Conveyor optical sensors detect item arrival. Inductive sensors differentiate ferrous vs non-ferrous parts, triggering high-speed pneumatic divert rams.",
    hardware: ["Micro PLC Controller", "Inductive & Capacitive Proximity Sensors", "24V Solenoid Pneumatic Valves", "DC Geared Conveyor Drive"],
    software: ["Ladder Logic (TIA Portal / OpenPLC)", "SCADA / HMI Dashboard (Node-RED)"],
    technologies: ["PLC Programming", "SCADA & HMI", "Industrial Automation", "Pneumatics"],
    team: "EMBEDX Automation Wing",
    outcomes: ["Deterministic sub-second sort cycling", "Full SCADA visualization of production KPIs"],
    gallery: ["assets/images/industrial-automation-factory.png"]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = projectsData;
}
