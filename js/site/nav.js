const header = document.querySelector("header");
const footer = document.querySelector("footer");

header.innerHTML = `
    <nav class="nav-shell">
        <a href="/" class="brand-container">
            <img class="brand-logo" src="/assets/logos/logo.png" alt="ScheduleSnap">
            <div class="text-brand"><span class="text-primary">Schedule</span><span class="text-accent">Snap</span></div>
        </a>
        <div class="nav-actions">
        <button
          title="Toggle navigation menu"
          class="nav-toggle button button-primary-outline button-small"
          type="button"
          id="nav-toggle"
          aria-controls="site-nav"
          aria-expanded="false"
          aria-label="Open menu"
        >
          <span class="nav-burger">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        <ul class="nav-links" id="site-nav">
            <li><a href="/" class="button button-primary-outline button-small nav-link">Home</a></li>
            <li><a href="/how-it-works/" class="button button-primary-outline button-small nav-link">How It Works</a></li>
            <li><a href="/features/" class="button button-primary-outline button-small nav-link">Features</a></li>
            <li><a href="/app/" class="button button-primary button-small nav-cta">Open App</a></li>
        </ul>
        </div>
    </nav>
`;

const navToggle = document.getElementById("nav-toggle");
const navLinks = document.getElementById("site-nav");

function setNavOpen(open) {
  if (!navToggle || !navLinks) {
    return;
  }
  navLinks.classList.toggle("is-open", open);
  navToggle.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    setNavOpen(!navLinks.classList.contains("is-open"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navLinks.classList.contains("is-open")) {
      setNavOpen(false);
    }
  });
}

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

document.querySelectorAll(".nav-link").forEach((link) => {
  const linkPath = normalizePath(new URL(link.href).pathname);
  if (linkPath === currentPath) {
    link.classList.add("active");
  }
});

footer.innerHTML = `
    <div class="footer-shell">
        <div class="footer-columns">
            <div class="footer-column">
                <div class="brand-container">
                    <img class="brand-logo" src="/assets/logos/logo.png" alt="ScheduleSnap">
                    <div class="text-brand"><span class="text-primary">Schedule</span><span class="text-accent">Snap</span></div>
                </div>
                <div class="footer-description">
                    <p>Free, link-based scheduling that finds the best possible time for your group to meet — no accounts required.</p>
                </div>
                <div class="footer-social">
                    <a class="button button-secondary-outline button-small footer-social-btn" href="mailto:joshuacheng.dev@gmail.com" title="Email">
                        <span class="material-symbols-outlined">mail</span>
                    </a>
                    <a class="button button-secondary-outline button-small footer-social-btn" href="https://github.com/3rdVoyager/schedule-snap" title="GitHub" target="_blank" rel="noopener noreferrer">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 .3C5.37.3 0 5.67 0 12.3c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.04.13 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.21.7.82.58C20.56 22.1 24 17.6 24 12.3 24 5.67 18.63.3 12 .3z" />
                        </svg>
                    </a>
                </div>
            </div>

            <div class="footer-column">
                <h3>Explore</h3>
                <ul>
                    <li><a href="/how-it-works/">How It Works</a></li>
                    <li><a href="/features/">Features</a></li>
                    <li><a href="/features/#compare">Compare</a></li>
                </ul>
            </div>

            <div class="footer-column">
                <h3>Product</h3>
                <ul>
                    <li><a href="/app/">Open App</a></li>
                    <li><a href="/app/create/">Create an event</a></li>
                </ul>
            </div>
        </div>
        <p class="footer-copyright">ScheduleSnap — open source under the MIT License.</p>
    </div>
`;
