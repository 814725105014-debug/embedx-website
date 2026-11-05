// EMBEDX — apply saved theme before first paint (external file so CSP can forbid inline scripts).
document.documentElement.dataset.theme = localStorage.getItem("embedx-theme") || "dark";
