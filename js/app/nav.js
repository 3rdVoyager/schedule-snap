const header = document.querySelector("header");

header.innerHTML = `
    <nav>
        <a href="/app/" class="brand-container">
            <img class="brand-logo" src="/assets/logos/logo.png" alt="ScheduleSnap">
            <div class="text-brand"><span class="text-primary">Schedule</span><span class="text-accent">Snap</span></div>
        </a>
        <ul>
            <li><a href="/app/" class="button button-primary-outline">Dashboard</a></li>
            <li><a href="/app/create/" class="button button-secondary-outline">Create Event</a></li>
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
