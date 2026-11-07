// Site-wide interaction guard: disable native context menus and clipboard copying silently.
// Text remains selectable inside form controls so users can edit and replace values; paste remains enabled.
(() => {
  const editableTarget = (target) => target instanceof Element
    && !!target.closest('input, textarea, [contenteditable="true"], [role="textbox"]');

  // Suppress the browser's right-click and keyboard-triggered context menu without alerts/toasts.
  document.addEventListener("contextmenu", (event) => event.preventDefault(), true);

  // Prevent selecting page copy while preserving normal text editing in controls.
  document.addEventListener("selectstart", (event) => {
    if (!editableTarget(event.target)) event.preventDefault();
  }, true);
  document.addEventListener("copy", (event) => event.preventDefault(), true);
  document.addEventListener("cut", (event) => event.preventDefault(), true);
  document.addEventListener("dragstart", (event) => event.preventDefault(), true);
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && ["c", "x"].includes(event.key.toLowerCase())) event.preventDefault();
  }, true);
})();
