const sidebar = document.querySelector("header");

sidebar.innerHTML = `
    <nav>
        <a href="/index.html" class="brand-container">
            <img class="brand-logo" src="/assets/logos/logo.png" alt="ScheduleSnap">
            <div class="brand-text"><span class="brand-text-primary">Schedule</span><span class="brand-text-secondary">Snap</span></div>
        </a>
        <ul>
            <li><a href="/create-event" class="button button-primary">Create New Event</a></li>
            <li><a href="/">Dashboard</a></li>
            <li><a href="/my-events">My Events</a></li>
            <li><a href="/settings">Settings</a></li>
            <li><a href="/help">Help</a></li>
        </ul>
    </nav>
`;

const navLinks = document.querySelectorAll("nav ul li a");

function normalizePath(path) {
  let p = path.replace(/\/$/, "") || "/";
  if (p === "/index.html") {
    p = "/";
  }
  if (p.endsWith("/index.html")) {
    p = p.replace("/index.html", "") || "/";
  }
  return p;
}

const currentPath = normalizePath(window.location.pathname);

navLinks.forEach((link) => {
  const linkPath = normalizePath(new URL(link.href).pathname);
  if (linkPath === currentPath) {
    link.classList.add("active");
  }
});
