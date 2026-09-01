const header = document.querySelector('header');
const footer = document.querySelector('footer');

header.innerHTML = `
    <nav>
        <a href="/" class="brand-container">
            <img class="brand-logo" src="/assets/logos/logo.png" alt="ScheduleSnap">
            <div class="text-brand"><span class="text-primary">Schedule</span><span class="text-accent">Snap</span></div>
        </a>
        <ul>
            <li><a href="/" class="text-semibold text-primary">Home</a></li>
            <li><a href="/how-it-works" class="text-semibold text-primary">How It Works</a></li>
            <li><a href="/features" class="text-semibold text-primary">Features</a></li>
        </ul>
        <a href="/app/" class="button button-primary">Open App</a>
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
                <div class="text-brand"><span class="text-primary">Schedule</span><span class="text-accent">Snap</span></div>
            </div>
            <div class="footer-description text-sub">
                <p>ScheduleSnap is a free and open-source platform that helps you schedule your tasks and projects.</p>
            </div>
        </div>

        <div class="footer-column">
            <h3 class="text-heading text-primary">About</h3>
            <ul>
                <li><a href="/about" class="text-sub">About</a></li>
                <li><a href="/how-it-works" class="text-sub">How It Works</a></li>
                <li><a href="/features" class="text-sub">Features</a></li>
            </ul>
        </div>

        <div class="footer-column">
            <h3 class="text-heading text-primary">Resources</h3>
            <ul>
                <li><a href="/blog" class="text-sub">Blog</a></li>
                <li><a href="/tutorials" class="text-sub">Tutorials</a></li>
            </ul>
        </div>
    </div>
    <p class="footer-copyright text-sub text-center">Copyright 2026. All rights reserved.</p>
`;