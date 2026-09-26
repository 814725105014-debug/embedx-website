// EMBEDX Official Technical Domains & Ecosystem Data
const domainsData = [
  {
    id: "embedded-systems",
    name: "Embedded Systems",
    icon: "fa-microchip",
    badge: "Core Architecture",
    description: "Design and deployment of specialized computing hardware and firmware engineered for deterministic, real-time operation in modern intelligent devices.",
    coreFocus: ["Embedded Hardware Design", "Real-Time System Architectures", "Memory Mapping & Optimization", "Firmware-Silicon Interfacing"],
    technologies: ["ARM Cortex", "AVR", "STM32", "Embedded C", "Bare-Metal Firmware"],
    tools: ["Keil µVision", "STM32CubeIDE", "Arduino IDE", "Proteus"],
    careerPaths: ["Embedded Systems Engineer", "Firmware Developer", "Hardware Design Engineer"]
  },
  {
    id: "embedded-software",
    name: "Embedded Software & RTOS",
    icon: "fa-code",
    badge: "Low-Level Programming",
    description: "Low-level system programming, hardware abstraction layers (HAL), peripheral device drivers, and real-time operating system task scheduling.",
    coreFocus: ["C / C++ Low-Level Systems", "Device Drivers & HAL", "RTOS Multi-Tasking & Semaphores", "Interrupt Service Routines (ISRs)"],
    technologies: ["FreeRTOS", "Embedded C++", "POSIX", "RTOS Queues", "Watchdog Timers"],
    tools: ["Keil µVision", "Eclipse", "STM32CubeIDE", "GDB Debugger"],
    careerPaths: ["Embedded Software Engineer", "RTOS Developer", "System Integration Engineer"]
  },
  {
    id: "microcontrollers",
    name: "Microcontrollers & Microprocessors",
    icon: "fa-memory",
    badge: "Silicon Platforms",
    description: "Hands-on mastery of 8-bit, 16-bit, and 32-bit computing platforms powering consumer, medical, automotive, and industrial electronics.",
    coreFocus: ["8051 & AVR Architecture", "ARM Cortex-M Series", "PIC Microcontrollers", "High-Performance SoCs & SBCs"],
    technologies: ["8051", "AVR ATmega", "ARM Cortex-M0/M3/M4", "PIC16/18", "Raspberry Pi", "ESP32"],
    tools: ["Keil µVision", "MPLAB X", "Arduino IDE", "AVR Studio"],
    careerPaths: ["Silicon Application Engineer", "Microcontroller Programmer", "R&D Engineer"]
  },
  {
    id: "iot-edge-computing",
    name: "IoT & Edge Computing",
    icon: "fa-network-wired",
    badge: "Connected Intelligence",
    description: "Interconnecting physical edge sensor nodes to the cloud through lightweight telemetric protocols, edge processing, and telemetry dashboards.",
    coreFocus: ["Cloud Telemetry & MQTT/HTTP", "Edge Data Filtering", "Sensor-to-Cloud Pipelines", "Low-Power Node Optimization"],
    technologies: ["MQTT", "CoAP", "HTTP/REST", "Node-RED", "ThingSpeak", "AWS IoT Core", "Azure IoT"],
    tools: ["Node-RED", "Postman", "ESP-IDF", "AWS IoT Console"],
    careerPaths: ["IoT Solutions Engineer", "Cloud Telemetry Architect", "Edge Computing Engineer"]
  },
  {
    id: "robotics-automation",
    name: "Robotics & Automation",
    icon: "fa-robot",
    badge: "Autonomous Motion",
    description: "Kinematics, precision motion control, differential mobile rovers, robotic manipulators, and automated electromechanical actuation.",
    coreFocus: ["Robotic Kinematics & Mechanics", "Motor Drives & PWM Control", "Autonomous Path Traversal", "Obstacle Mapping & Navigation"],
    technologies: ["DC Geared Motors", "Stepper Drives", "Servo Mechanisms", "Encoders", "IMU Fusion"],
    tools: ["MATLAB / Simulink", "ROS (Robot Operating System)", "SolidWorks", "Proteus"],
    careerPaths: ["Robotics Engineer", "Automation Specialist", "Mechatronics Engineer"]
  },
  {
    id: "sensors-actuators",
    name: "Sensors & Actuators",
    icon: "fa-satellite-dish",
    badge: "Physical Interfacing",
    description: "Instrumentation and signal conditioning for environmental, motion, optical, thermal, and electrical transducers.",
    coreFocus: ["Sensor Signal Conditioning", "Analog-to-Digital Conversion (ADC)", "Actuator Driver Electronics", "Calibration & Noise Filtering"],
    technologies: ["IMU (MPU6050)", "Ultrasonic (HC-SR04)", "Optical Encoders", "PIR / IR Arrays", "Load Cells", "Solenoids"],
    tools: ["Digital Oscilloscope", "Multimeter", "Signal Generator", "LabVIEW"],
    careerPaths: ["Instrumentation Engineer", "Sensor Integration Specialist", "Test Engineer"]
  },
  {
    id: "control-systems",
    name: "Control Systems",
    icon: "fa-sliders",
    badge: "System Dynamics",
    description: "Mathematical modeling, closed-loop feedback design, PID tuning, and state-space control for stable dynamic system response.",
    coreFocus: ["Closed-Loop Feedback Systems", "PID Tuning & Transfer Functions", "State-Space Representation", "System Stability Analysis"],
    technologies: ["PID Controllers", "Lead-Lag Compensators", "Bode & Nyquist Analysis", "State Observers"],
    tools: ["MATLAB / Simulink", "LabVIEW", "Multisim"],
    careerPaths: ["Control Systems Engineer", "System Dynamicist", "Simulation Specialist"]
  },
  {
    id: "plc-industrial-automation",
    name: "PLC & Industrial Automation",
    icon: "fa-industry",
    badge: "Industry 4.0",
    description: "Industrial automation, Programmable Logic Controllers (PLC), SCADA supervision, and Human-Machine Interfaces (HMI) for manufacturing lines.",
    coreFocus: ["Ladder Logic Programming (LD)", "SCADA & HMI Supervision", "Industrial Relay & Sensor Interlocks", "Industrial Fieldbuses & Modbus"],
    technologies: ["Siemens S7", "Allen-Bradley / Rockwell", "Modbus TCP/RTU", "SCADA HMI"],
    tools: ["Siemens TIA Portal", "RSLogix", "OpenPLC", "Node-RED Dashboard"],
    careerPaths: ["PLC / SCADA Engineer", "Industrial Automation Engineer", "Plant Commissioning Engineer"]
  },
  {
    id: "pcb-design",
    name: "PCB Design & Prototyping",
    icon: "fa-layer-group",
    badge: "Hardware Prototyping",
    description: "Schematic capture, multi-layer printed circuit board routing, component footprint creation, DRC verification, and rapid hardware prototyping.",
    coreFocus: ["Schematic Design & DRC", "PCB Trace Routing & Ground Planes", "Component Footprint Library Creation", "Gerber File Generation for Fabrication"],
    technologies: ["SMD & Through-Hole Tech", "Layer Stackups", "Signal Integrity", "Power Planes"],
    tools: ["Altium Designer", "KiCad", "Proteus ARES", "EasyEDA"],
    careerPaths: ["PCB Design Engineer", "Hardware Prototyping Specialist", "DFM / Assembly Engineer"]
  },
  {
    id: "wireless-communication",
    name: "Wireless Communication",
    icon: "fa-wifi",
    badge: "Telemetry & RF",
    description: "RF transceiver integration, short-range wireless meshes, long-range low-power radio communication protocols for telemetry and remote control.",
    coreFocus: ["Short-Range Wireless (BLE, Wi-Fi, ZigBee)", "Long-Range Sub-GHz Telemetry (LoRa, LoRaWAN)", "RF Transceiver SPI/UART Interfacing", "Packet Loss Handling & Encryption"],
    technologies: ["Bluetooth Low Energy (BLE)", "Wi-Fi 802.11", "LoRa / LoRaWAN", "NRF24L01+ RF"],
    tools: ["Wireshark", "RF Spectrum Analyzers", "ESP-NOW Console", "Serial Telemetry Plotter"],
    careerPaths: ["RF Application Engineer", "Wireless Systems Specialist", "Telecommunications Engineer"]
  },
  {
    id: "data-acquisition-analytics",
    name: "Data Acquisition & Analytics",
    icon: "fa-chart-line",
    badge: "Signal Intelligence",
    description: "High-speed measurement, automated test bench instruments, signal processing, and engineering telemetry visualization.",
    coreFocus: ["Multi-Channel DAQ Sampling", "Signal Processing & Filtering (FFT, Digital Filters)", "Automated Instrument Control (VISA/GPIB)", "Real-Time Telemetry Logging"],
    technologies: ["Virtual Instrumentation", "Digital Signal Processing", "Statistical Filtering", "Time-Series Telemetry"],
    tools: ["LabVIEW", "MATLAB", "Python (NumPy / SciPy / Matplotlib)", "ThingSpeak"],
    careerPaths: ["Test & Validation Engineer", "Data Acquisition Specialist", "R&D Instrumentation Engineer"]
  },
  {
    id: "edge-ai",
    name: "AI at the Edge (TinyML)",
    icon: "fa-brain",
    badge: "Embedded Intelligence",
    description: "Quantized machine learning models deployed directly on microcontrollers for on-device voice recognition, anomaly detection, and vision processing.",
    coreFocus: ["TinyML Model Quantization", "On-Device Sensor Anomaly Detection", "Embedded Computer Vision", "Ultra-Low-Power Neural Inference"],
    technologies: ["TensorFlow Lite for Microcontrollers", "Edge Impulse", "CMSIS-NN", "OpenMV"],
    tools: ["Edge Impulse Studio", "Google Colab", "STM32Cube.AI", "OpenMV IDE"],
    careerPaths: ["Edge AI Engineer", "TinyML Developer", "Intelligent Systems Architect"]
  }
];

// Skills Structure
const skillsCategories = [
  {
    category: "Programming",
    icon: "fa-code",
    skills: ["Embedded C", "C++", "Arduino", "Python", "Firmware Development", "Register-Level Manipulation"]
  },
  {
    category: "Hardware",
    icon: "fa-microchip",
    skills: ["Microcontrollers (8051, AVR, ARM, PIC)", "Microprocessors", "Sensors & Transducers", "Actuators & Motor Drives", "PCB Design", "Circuit Integration"]
  },
  {
    category: "Systems & Automation",
    icon: "fa-gears",
    skills: ["RTOS & Multi-Tasking", "Device Drivers & HAL", "Control Systems & PID", "PLC Ladder Programming", "SCADA Systems", "HMI Development"]
  },
  {
    category: "Communication & Protocols",
    icon: "fa-tower-broadcast",
    skills: ["Wi-Fi & Bluetooth (BLE)", "LoRa / LoRaWAN", "I2C, SPI, UART, CAN Bus", "MQTT & IoT Protocols", "RF Telemetry"]
  },
  {
    category: "Engineering & Process",
    icon: "fa-clipboard-check",
    skills: ["Circuit Debugging & Fault Diagnosis", "Oscilloscope & Logic Analysis", "System Testing & Validation", "Data Acquisition & Signal Analysis", "Documentation & Project Management"]
  }
];

// Career Roles
const careerRolesData = [
  { title: "Embedded Systems Engineer", icon: "fa-microchip", desc: "Design firmware, board bring-up, and real-time electronic architectures." },
  { title: "Automation Engineer", icon: "fa-robot", desc: "Architect automated assembly, robotic systems, and industrial lines." },
  { title: "Firmware Developer", icon: "fa-code-branch", desc: "Author bare-metal and RTOS device drivers for intelligent hardware." },
  { title: "IoT Solutions Engineer", icon: "fa-wifi", desc: "Connect edge devices to cloud pipelines with telemetry and security." },
  { title: "PCB Design Engineer", icon: "fa-layer-group", desc: "Route high-speed multi-layer printed circuit boards and schematic CAD." },
  { title: "Control Systems Engineer", icon: "fa-sliders", desc: "Model and tune closed-loop feedback algorithms for dynamic machinery." },
  { title: "Robotics Engineer", icon: "fa-person-running", desc: "Build kinematic mechanisms, sensor fusion, and autonomous rovers." },
  { title: "PLC / SCADA Engineer", icon: "fa-industry", desc: "Program industrial plant PLCs, safety logic, and SCADA interfaces." },
  { title: "Hardware Design Engineer", icon: "fa-plug", desc: "Select components, calculate power dissipation, and validate circuits." },
  { title: "Application Engineer", icon: "fa-laptop-code", desc: "Interface silicon vendor solutions with customer engineering systems." },
  { title: "R&D Engineer", icon: "fa-flask", desc: "Pioneer new prototypes and proof-of-concept technologies in lab." },
  { title: "Testing & Validation Engineer", icon: "fa-vial-circle-check", desc: "Execute automated verification, stress testing, and QA benchmarks." }
];

// Industry Ecosystem / Companies relevant to domain
const industryEcosystem = [
  { name: "Siemens", sector: "Industrial Automation & Drives" },
  { name: "Bosch", sector: "Automotive & Embedded Mobility" },
  { name: "Tata / Tata Elxsi", sector: "Embedded Product Design" },
  { name: "Honeywell", sector: "Industrial Automation & Aerospace" },
  { name: "ABB", sector: "Robotics & Power Automation" },
  { name: "Schneider Electric", sector: "Energy Management & Automation" },
  { name: "Rockwell Automation", sector: "Industrial Control & Information" },
  { name: "Texas Instruments", sector: "Semiconductors & Embedded Processing" },
  { name: "NXP Semiconductors", sector: "Automotive & Edge Processing" },
  { name: "Microchip Technology", sector: "Microcontrollers & Mixed-Signal" },
  { name: "L&T Technology Services", sector: "Engineering R&D Services" },
  { name: "Infosys", sector: "Connected Products & IoT" },
  { name: "Wipro", sector: "Engineering & Embedded Solutions" },
  { name: "HCL Technologies", sector: "Hardware & Semiconductor Engineering" },
  { name: "Caterpillar", sector: "Heavy Automation & Autonomous Mining" },
  { name: "Philips", sector: "Healthcare & Connected Medical Devices" },
  { name: "Intel", sector: "Compute & Edge Architectures" },
  { name: "Murata", sector: "Passive Components & Wireless Modules" },
  { name: "Dassault Systèmes", sector: "Industrial Simulation & Digital Twin" }
];

// Tools and Platforms
const toolsAndPlatforms = [
  { name: "Keil µVision", category: "IDE & Toolchain", desc: "Industry-standard ARM and 8051 compiler, simulator, and debugger." },
  { name: "STM32CubeIDE", category: "IDE & Toolchain", desc: "Integrated development platform for STM32 microcontrollers with code generator." },
  { name: "Arduino IDE", category: "Prototyping", desc: "Rapid microcontroller firmware prototyping and sensor interfacing." },
  { name: "Raspberry Pi & Linux", category: "Single Board Computer", desc: "Embedded Linux, edge computing, Python automation, and vision processing." },
  { name: "MATLAB & Simulink", category: "Modeling & Control", desc: "Mathematical simulation, control loop tuning, and dynamic system modeling." },
  { name: "LabVIEW", category: "Virtual Instrumentation", desc: "Graphical system design for test, measurement, and automated data acquisition." },
  { name: "Proteus & Multisim", category: "Circuit Simulation", desc: "Schematic capture, SPICE electronic simulation, and virtual MCU debugging." },
  { name: "Altium Designer & KiCad", category: "PCB Layout", desc: "Professional schematic design and multi-layer PCB layout routing." },
  { name: "Siemens TIA Portal", category: "Industrial Automation", desc: "Integrated engineering framework for SIMATIC controllers and HMI." },
  { name: "Node-RED & ThingSpeak", category: "IoT & Telemetry", desc: "Flow-based visual programming for IoT event wiring and real-time cloud charts." }
];

// Learning Pathways
const learningPathways = [
  { title: "Embedded Systems Essentials", focus: "Firmware Fundamentals", desc: "Microcontroller architecture, register access, timers, and interrupts." },
  { title: "ARM Embedded Systems Mastery", focus: "32-bit Architecture", desc: "Cortex-M register programming, CMSIS, NVIC, DMA, and peripheral drivers." },
  { title: "PLC Programming & SCADA", focus: "Industrial Control", desc: "Ladder logic, timers/counters, interlocking, and HMI supervisory design." },
  { title: "IoT Fundamentals & Cloud Connectivity", focus: "Connected Nodes", desc: "MQTT, HTTP protocols, edge data gathering, and cloud dashboards." },
  { title: "MATLAB & Simulink for Engineers", focus: "Model-Based Design", desc: "Algorithm simulation, feedback loops, and automated code generation." },
  { title: "LabVIEW Core & Virtual Instruments", focus: "Data Acquisition", desc: "DAQ hardware configuration, signal filtering, and test bench control." },
  { title: "Cloud IoT Architectures (AWS / Azure)", focus: "Cloud Integration", desc: "Device shadows, certificate-based authentication, and serverless telemetry." }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { domainsData, skillsCategories, careerRolesData, industryEcosystem, toolsAndPlatforms, learningPathways };
}
