const header = document.querySelector('header');
const footer = document.querySelector('footer');

header.innerHTML = `
    <nav>
        <a href="/" class="brand-container">
            <img class="brand-logo" src="/assets/logos/logo.png" alt="ScheduleSnap">
            <div class="brand-text"><span class="brand-text-primary">Schedule</span><span class="brand-text-secondary">Snap</span></div>
        </a>
        <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/how-it-works">How It Works</a></li>
            <li><a href="/features">Features</a></li>
        </ul>
        <a href="/app/" class="button button-secondary">Open App</a>
    </nav>
`;

const navLinks = document.querySelectorAll('nav ul li a');

function normalizePath(path) {
    let p = path.replace(/\/$/, '') || '/';
    if (p === '/index.html') {
        p = '/';
    }
    if (p.endsWith('/index.html')) {
        p = p.replace('/index.html', '') || '/';
    }
    return p;
}

const currentPath = normalizePath(window.location.pathname);

navLinks.forEach(link => {
    const linkPath = normalizePath(new URL(link.href).pathname);
    if (linkPath === currentPath) {
        link.classList.add('active');
    }
});

footer.innerHTML = `
    <div class="footer-columns">
        <div class="footer-column">
            <div class="brand-container">
                <img class="brand-logo" src="/assets/logos/logo.png" alt="ScheduleSnap">
                <div class="brand-text"><span class="brand-text-primary">Schedule</span><span class="brand-text-secondary">Snap</span></div>
            </div>
            <div class="footer-description">
                <p>ScheduleSnap is a free and open-source platform that helps you schedule your tasks and projects.</p>
            </div>
        </div>

        <div class="footer-column">
            <h3>About</h3>
            <ul>
                <li><a href="/about">About</a></li>
                <li><a href="/how-it-works">How It Works</a></li>
                <li><a href="/features">Features</a></li>
            </ul>
        </div>

        <div class="footer-column">
            <h3>Resources</h3>
            <ul>
                <li><a href="/blog">Blog</a></li>
                <li><a href="/tutorials">Tutorials</a></li>
            </ul>
        </div>
    </div>
    <p class="footer-copyright">Copyright 2026. All rights reserved.</p>
`;