// EMBEDX — Learning Hub resources (static content). ES module.
export const resources = [
  {
    id: "embedded-c-handbook",
    title: "Embedded C & Pointer Architecture Primer",
    category: "Programming",
    level: "Beginner to Intermediate",
    tags: ["Bitwise Ops", "Memory Mapping", "Registers"],
    desc: "Hands-on guide covering bitwise manipulation, volatile qualifiers, register manipulation, hardware pointers, and deterministic memory allocation."
  },
  {
    id: "arm-cortex-m-cheatsheet",
    title: "ARM Cortex-M Quick Reference & Registers",
    category: "Embedded Systems",
    level: "Intermediate",
    tags: ["ARM Cortex-M", "NVIC", "SysTick", "HAL"],
    desc: "Essential pinouts, vector tables, interrupt priority configuration (NVIC), and peripheral register mappings for STM32 and Cortex-M MCUs."
  },
  {
    id: "circuit-debugging-guide",
    title: "Hardware Debugging & Fault Diagnosis Handbook",
    category: "Electronics & PCB",
    level: "All Levels",
    tags: ["Multimeter", "Oscilloscope", "Fault Diagnosis"],
    desc: "Methodology for finding short circuits, floating grounds, noisy power rails, and cold solder joints in prototype boards using DMM and oscilloscopes."
  },
  {
    id: "freertos-task-notes",
    title: "FreeRTOS Task Scheduling & Semaphores",
    category: "Embedded Systems",
    level: "Advanced",
    tags: ["FreeRTOS", "Semaphores", "Queues"],
    desc: "Architecting deterministic multi-tasking systems: task priorities, binary semaphores, queues, and avoiding priority inversion."
  },
  {
    id: "iot-mqtt-esp32",
    title: "ESP32 MQTT & Telemetry Architecture Blueprint",
    category: "IoT & Telemetry",
    level: "Intermediate",
    tags: ["ESP32", "MQTT", "JSON Payload"],
    desc: "Connecting edge ESP32 microcontrollers to local MQTT brokers and cloud endpoints with non-blocking Wi-Fi reconnection routines."
  },
  {
    id: "plc-ladder-cheatsheet",
    title: "Industrial PLC Ladder Logic & Timing Symbols",
    category: "PLC Automation",
    level: "Beginner",
    tags: ["Ladder Logic", "IEC 61131-3", "Safety Interlocks"],
    desc: "Standard IEC 61131-3 graphical ladder symbols, latching circuits, timer on/off delays (TON/TOF), and industrial safety interlock designs."
  },
  {
    id: "pcb-design-rules",
    title: "High-Speed PCB Routing & Ground Plane Rules",
    category: "Electronics & PCB",
    level: "Intermediate",
    tags: ["Altium", "KiCad", "Ground Planes", "DRC"],
    desc: "Decoupling capacitor placement, return path routing, trace width calculations, thermal relief, and DRC verification for reliable PCBs."
  },
  {
    id: "embedded-career-roadmap",
    title: "Embedded & Automation Career Roadmap",
    category: "Career Roadmap",
    level: "All Levels",
    tags: ["Career", "Interview Prep", "Portfolio"],
    desc: "Step-by-step roadmap covering foundational knowledge, project milestones, portfolio curation on GitHub, and technical interview preparation."
  }
];

export const resourceCategories = ["All Resources", "Programming", "Embedded Systems", "Electronics & PCB", "IoT & Telemetry", "PLC Automation", "Career Roadmap"];
