let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-relevant", "additions");
    document.body.appendChild(container);
  }
  return container;
}

/**
 * @param {string} message
 * @param {{ type?: "success" | "error" | "info", duration?: number }} [options]
 */
export function showToast(message, { type = "success", duration = 3500 } = {}) {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.textContent = message;

  getContainer().appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  const dismiss = () => {
    toast.classList.remove("toast--visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  };

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return dismiss;
}
