// EMBEDX Learning Hub & Resources Data
const resourcesData = [
  {
    id: "embedded-c-handbook",
    title: "Embedded C & Pointer Architecture Primer",
    category: "Programming",
    level: "Beginner to Intermediate",
    tags: ["Embedded C", "Memory Mapping", "Bitwise Ops", "Registers"],
    desc: "A hands-on guide covering bitwise manipulation, volatile qualifiers, register manipulation, hardware pointers, and deterministic memory management.",
    status: "Available Guide",
    linkText: "Read Summary",
    isDownloadable: false
  },
  {
    id: "arm-cortex-m-cheatsheet",
    title: "ARM Cortex-M Quick Reference & Peripheral Registers",
    category: "Embedded Systems",
    level: "Intermediate",
    tags: ["ARM Cortex-M", "NVIC", "SysTick", "STM32", "HAL"],
    desc: "Essential pinouts, vector tables, interrupt priority configuration, and peripheral register mappings for STM32 and ARM Cortex microcontrollers.",
    status: "Available Guide",
    linkText: "Read Summary",
    isDownloadable: false
  },
  {
    id: "circuit-debugging-guide",
    title: "Hardware Debugging & Fault Diagnosis Handbook",
    category: "Electronics",
    level: "All Levels",
    tags: ["Multimeter", "Oscilloscope", "Fault Diagnosis", "Soldering", "Safety"],
    desc: "Practical debugging methodology for finding short circuits, floating grounds, noisy power rails, and cold solder joints in prototype boards.",
    status: "Available Guide",
    linkText: "Read Summary",
    isDownloadable: false
  },
  {
    id: "freertos-task-notes",
    title: "FreeRTOS Task Scheduling & Semaphore Guide",
    category: "Embedded Systems",
    level: "Advanced",
    tags: ["FreeRTOS", "Mutex", "Queues", "Context Switching"],
    desc: "Architecting deterministic multi-tasking systems: task priorities, binary semaphores, queues, and avoiding priority inversion.",
    status: "Available Guide",
    linkText: "Read Summary",
    isDownloadable: false
  },
  {
    id: "iot-mqtt-esp32",
    title: "ESP32 MQTT & Telemetry Architecture Blueprint",
    category: "IoT",
    level: "Intermediate",
    tags: ["ESP32", "MQTT", "Wi-Fi", "Telemetry", "JSON"],
    desc: "Connecting edge ESP32 microcontrollers to local MQTT brokers and cloud endpoints with automatic reconnection routines.",
    status: "Available Guide",
    linkText: "Read Summary",
    isDownloadable: false
  },
  {
    id: "plc-ladder-cheatsheet",
    title: "Industrial PLC Ladder Logic & Timing Symbols",
    category: "Automation",
    level: "Beginner",
    tags: ["PLC", "Ladder Logic", "Timers", "Counters", "Interlocks"],
    desc: "Standard IEC 61131-3 graphical ladder symbols, latching circuits, timer on/off delays, and industrial safety interlock designs.",
    status: "Available Guide",
    linkText: "Read Summary",
    isDownloadable: false
  },
  {
    id: "pcb-design-rules",
    title: "High-Speed PCB Routing & Ground Plane Rules",
    category: "Electronics",
    level: "Intermediate",
    tags: ["Altium", "KiCad", "Ground Planes", "Decoupling", "EMC"],
    desc: "Decoupling capacitor placement, return path routing, trace width calculations, thermal relief, and DRC verification for reliable PCBs.",
    status: "Available Guide",
    linkText: "Read Summary",
    isDownloadable: false
  },
  {
    id: "embedded-career-roadmap",
    title: "Embedded Systems & Automation Career Roadmap",
    category: "Career",
    level: "All Levels",
    tags: ["Career", "Interviews", "Portfolio", "Industry 4.0", "Core Jobs"],
    desc: "Step-by-step technical roadmap covering foundational knowledge, project milestones, portfolio curation, and technical interview preparation.",
    status: "Available Guide",
    linkText: "Read Summary",
    isDownloadable: false
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = resourcesData;
}
