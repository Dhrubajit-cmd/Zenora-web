export const showToast = (message, type = "success") => {
  // Find or create container
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `zenora-toast zenora-toast-${type}`;

  // Add icon
  const icon = document.createElement("div");
  icon.className = "zenora-toast-icon";
  icon.innerHTML = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
  toast.appendChild(icon);

  // Add text
  const text = document.createElement("span");
  text.innerText = message;
  toast.appendChild(text);

  container.appendChild(toast);

  // Trigger animation after append
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  // Remove toast after 3.5 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    }, 400);
  }, 3500);
};

export const toast = {
  success: (msg) => showToast(msg, "success"),
  error: (msg) => showToast(msg, "error"),
  info: (msg) => showToast(msg, "info")
};
