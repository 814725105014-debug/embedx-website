/**
 * EMBEDX Circuit Canvas Animation
 * Renders an animated interactive PCB / Microcontroller node network
 * Microchip -> Sensor -> Controller -> Actuator -> Output
 */

class CircuitBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.pulses = [];
    this.maxNodes = 28;
    this.mouse = { x: null, y: null, radius: 120 };
    
    this.init();
    this.animate();
    
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });
    window.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }

  init() {
    this.resize();
    this.createNodes();
  }

  resize() {
    if (!this.canvas) return;
    this.width = this.canvas.width = this.canvas.parentElement.clientWidth;
    this.height = this.canvas.height = this.canvas.parentElement.clientHeight;
  }

  createNodes() {
    this.nodes = [];
    const count = Math.min(this.maxNodes, Math.floor((this.width * this.height) / 25000) + 12);
    
    for (let i = 0; i < count; i++) {
      this.nodes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() > 0.8 ? 4 : 2.5,
        type: Math.random() > 0.6 ? 'chip' : 'node',
        connections: []
      });
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw Grid Nodes & Traces
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];

      // Update position
      a.x += a.vx;
      a.y += a.vy;

      if (a.x < 0 || a.x > this.width) a.vx *= -1;
      if (a.y < 0 || a.y > this.height) a.vy *= -1;

      // Draw node point
      this.ctx.beginPath();
      this.ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      if (a.type === 'chip') {
        this.ctx.fillStyle = '#146B3A'; // Engineering Green
        this.ctx.strokeStyle = '#2D72D9';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = '#2D72D9'; // Accent Blue
      }
      this.ctx.fill();

      // Connect nearby nodes with right-angle / circuit-style traces
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);

        if (dist < 150) {
          const alpha = 1 - dist / 150;
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(18, 63, 140, ${alpha * 0.22})`;
          this.ctx.lineWidth = 1;

          // Manhattan / 90-degree circuit traces
          const midX = (a.x + b.x) / 2;
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(midX, a.y);
          this.ctx.lineTo(midX, b.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.stroke();

          // Random pulse spawn
          if (Math.random() < 0.0015 && this.pulses.length < 10) {
            this.pulses.push({
              startX: a.x,
              startY: a.y,
              midX: midX,
              endX: b.x,
              endY: b.y,
              progress: 0,
              speed: 0.015 + Math.random() * 0.01
            });
          }
        }
      }
    }

    // Draw active data pulses
    for (let p = this.pulses.length - 1; p >= 0; p--) {
      const pulse = this.pulses[p];
      pulse.progress += pulse.speed;

      let curX, curY;
      if (pulse.progress < 0.5) {
        const t = pulse.progress * 2;
        curX = pulse.startX + (pulse.midX - pulse.startX) * t;
        curY = pulse.startY;
      } else {
        const t = (pulse.progress - 0.5) * 2;
        curX = pulse.midX + (pulse.endX - pulse.midX) * t;
        curY = pulse.startY + (pulse.endY - pulse.startY) * t;
      }

      this.ctx.beginPath();
      this.ctx.arc(curX, curY, 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#F47B20'; // Amber pulse
      this.ctx.shadowColor = '#F47B20';
      this.ctx.shadowBlur = 6;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      if (pulse.progress >= 1) {
        this.pulses.splice(p, 1);
      }
    }
  }

  animate() {
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const canvasEl = document.getElementById('circuitCanvas');
  if (canvasEl) {
    new CircuitBackground('circuitCanvas');
  }
});
