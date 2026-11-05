// EMBEDX — Technical domains & tools (static content). ES module.
export const domains = [
  {
    id: "embedded-systems",
    kicker: "Silicon & Architecture",
    title: "Embedded Systems",
    desc: "Design and deployment of specialized computing hardware and firmware engineered for deterministic, real-time operation in modern intelligent devices.",
    focus: "Embedded Hardware Design, Real-Time System Architectures, Memory Optimization.",
    tags: ["ARM Cortex", "STM32", "AVR", "Keil µVision", "Bare-Metal"]
  },
  {
    id: "embedded-software-rtos",
    kicker: "Low-Level Systems",
    title: "Embedded Software & RTOS",
    desc: "Low-level system programming, hardware abstraction layers (HAL), peripheral device drivers, and real-time operating system task scheduling.",
    focus: "C/C++ Low-Level Systems, Device Drivers, RTOS Multi-Tasking & Semaphores, ISR Timing.",
    tags: ["Embedded C", "FreeRTOS", "Device Drivers", "POSIX", "GDB"]
  },
  {
    id: "microcontrollers",
    kicker: "Silicon Platforms",
    title: "Microcontrollers & Processors",
    desc: "Hands-on mastery of 8-bit, 16-bit, and 32-bit computing platforms powering consumer, medical, automotive, and industrial electronics.",
    focus: "8051, AVR ATmega, ARM Cortex-M0/M3/M4, PIC16/18, Raspberry Pi, ESP32.",
    tags: ["8051", "AVR", "ARM Cortex-M", "PIC", "ESP32"]
  },
  {
    id: "iot-edge",
    kicker: "Connected Nodes",
    title: "IoT & Edge Computing",
    desc: "Interconnecting physical edge sensor nodes to cloud backends through lightweight telemetry protocols and dashboards.",
    focus: "Cloud Telemetry (MQTT/HTTP), Edge Data Preprocessing, Sensor Pipelines.",
    tags: ["MQTT", "CoAP", "Node-RED", "AWS IoT", "ThingSpeak"]
  },
  {
    id: "robotics-automation",
    kicker: "Autonomous Motion",
    title: "Robotics & Automation",
    desc: "Kinematics, precision motion control, differential mobile rovers, robotic manipulators, and automated actuation.",
    focus: "Kinematics, Motor Drivers, PWM Control, Autonomous Path Planning & Obstacle Mapping.",
    tags: ["Differential Drive", "PID Control", "Encoders", "Servos", "Transducers"]
  },
  {
    id: "sensors-actuators",
    kicker: "Sensors & Actuators",
    title: "Sensors & Actuators",
    desc: "Instrumentation, signal conditioning, analog-to-digital conversion, and driver circuits for electromechanical actuators.",
    focus: "IMU Motion Sensing, Optical Probes, Ultrasonic Ranging, Solenoids & Relays.",
    tags: ["MPU6050 IMU", "HC-SR04", "ADC Sampling", "Load Cells"]
  },
  {
    id: "control-systems",
    kicker: "System Dynamics",
    title: "Control Systems",
    desc: "Mathematical modeling, closed-loop feedback design, PID tuning, and state-space control for stable dynamic responses.",
    focus: "Closed-Loop Feedback, PID Tuning, State Observers, Bode & Stability Analysis.",
    tags: ["MATLAB", "Simulink", "PID Tuning", "State-Space"]
  },
  {
    id: "plc-industrial",
    kicker: "Industry 4.0",
    title: "PLC & Industrial Automation",
    desc: "Industrial automation, Programmable Logic Controllers (PLC), SCADA supervision, and HMI for manufacturing lines.",
    focus: "Ladder Logic (LD), SCADA & HMI Supervision, Relay Interlocks, Modbus TCP/RTU.",
    tags: ["Siemens S7", "Allen-Bradley", "SCADA", "TIA Portal"]
  },
  {
    id: "pcb-design",
    kicker: "Hardware Prototyping",
    title: "PCB Design & Prototyping",
    desc: "Schematic capture, multi-layer printed circuit board routing, component footprint creation, DRC and Gerber generation.",
    focus: "Schematic Capture, Trace Routing, Ground Planes, Signal Integrity, DFM.",
    tags: ["Altium Designer", "KiCad", "Proteus", "Gerber CAD"]
  },
  {
    id: "wireless",
    kicker: "Telemetry & RF",
    title: "Wireless Communication",
    desc: "RF transceiver integration, short-range wireless meshes, and long-range low-power radio communication protocols.",
    focus: "Bluetooth Low Energy (BLE), Wi-Fi 802.11, LoRa / LoRaWAN, NRF24L01+ RF Telemetry.",
    tags: ["LoRaWAN", "BLE 5.0", "Wi-Fi", "NRF24L01"]
  },
  {
    id: "daq-analytics",
    kicker: "Instrumentation",
    title: "Data Acquisition & Analytics",
    desc: "High-speed measurement, automated test bench instruments, signal processing, and engineering telemetry logging.",
    focus: "Multi-Channel DAQ, Digital Signal Processing (FFT), Virtual Instruments.",
    tags: ["LabVIEW", "MATLAB", "VISA/GPIB", "Signal Processing"]
  },
  {
    id: "tinyml",
    kicker: "Embedded AI",
    title: "AI at the Edge (TinyML)",
    desc: "Quantized machine learning models deployed directly on microcontrollers for on-device voice, anomaly detection, and vision.",
    focus: "TinyML Quantization, On-Device Anomaly Detection, Embedded Vision, Neural Acceleration.",
    tags: ["TensorFlow Lite", "Edge Impulse", "CMSIS-NN", "OpenMV"]
  }
];

export const tools = [
  { name: "Keil µVision", desc: "Industry-standard ARM & 8051 compiler and simulator." },
  { name: "STM32CubeIDE", desc: "Comprehensive C/C++ development platform for STM32 MCUs." },
  { name: "Arduino IDE", desc: "Rapid prototyping and multi-board firmware flashing." },
  { name: "Raspberry Pi & Linux", desc: "Embedded Linux, Python automation, and edge telemetry." },
  { name: "MATLAB / Simulink", desc: "Mathematical modeling, dynamic simulation, and PID tuning." },
  { name: "LabVIEW", desc: "Virtual instrumentation and automated data acquisition." },
  { name: "Proteus & Multisim", desc: "SPICE electronic circuit simulation and MCU co-simulation." },
  { name: "Altium & KiCad", desc: "Professional schematic capture and multi-layer PCB layout." }
];

export const careers = [
  { title: "Embedded Systems Engineer", desc: "Firmware development, board bring-up, and real-time processing architectures." },
  { title: "Automation Engineer", desc: "Automated manufacturing, robotic workcells, and assembly line orchestration." },
  { title: "Firmware Developer", desc: "Low-level C/C++, device drivers, and real-time operating systems." },
  { title: "IoT Solutions Engineer", desc: "Edge-to-cloud connectivity, telemetry pipelines, and smart infrastructure." }
];
