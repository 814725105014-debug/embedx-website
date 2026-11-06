// EMBEDX — apply saved theme before first paint (external file so CSP can forbid inline scripts).
try {
  document.documentElement.dataset.theme = localStorage.getItem("embedx-theme") || "dark";
} catch {
  document.documentElement.dataset.theme = "dark";
}
