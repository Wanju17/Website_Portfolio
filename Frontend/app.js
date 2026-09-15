const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Typing writer

const words = [
  "Scalable Web Apps",
  "Smart Solutions",
  "Modern Interfaces"
];

const textElement = document.getElementById("typewriter-text");

let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;

const typingSpeed = 100;     // Speed while typing a character (ms)
const deletingSpeed = 50;    // Speed while deleting a character (ms)
const pauseEnd = 2500;       // Delay when the full word is typed (ms)
const pauseStart = 400;      // Delay before typing the next word (ms)

function typeLoop() {
  const currentWord = words[wordIndex];

  if (!isDeleting) {
    // Typing forward
    textElement.textContent = currentWord.substring(0, charIndex + 1);
    charIndex++;

    if (charIndex === currentWord.length) {
      isDeleting = true;
      setTimeout(typeLoop, pauseEnd);
      return;
    }
    setTimeout(typeLoop, typingSpeed);
  } else {
    // Deleting backward
    textElement.textContent = currentWord.substring(0, charIndex - 1);
    charIndex--;

    if (charIndex === 0) {
      isDeleting = false;
      // Move to next word in a circle
      wordIndex = (wordIndex + 1) % words.length; 
      setTimeout(typeLoop, pauseStart);
      return;
    }
    setTimeout(typeLoop, deletingSpeed);
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", typeLoop);



// ==========================================
// 1. THEME & MODAL CONTROLS
// ==========================================
const modal = document.getElementById('dm-modal');
const openBtn = document.getElementById('open-dm-btn');
const closeBtn = document.getElementById('close-dm-btn');

const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

// Theme Initializer
const currentTheme = localStorage.getItem('portfolio-theme') || 'dark';
document.documentElement.setAttribute('data-theme', currentTheme);
updateThemeIcon(currentTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const activeTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = activeTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('portfolio-theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    if (!themeIcon) return;
    themeIcon.src = theme === 'dark' ? 'assets/Icons/sun.svg' : 'assets/Icons/moon.svg';
}

if (openBtn) {
    openBtn.addEventListener('click', () => { modal.style.display = 'flex'; });
}
if (closeBtn) {
    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
}
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
});

// ==========================================
// 2. DM FORM SUBMISSION (CREATE MESSAGE)
// ==========================================
const dmForm = document.getElementById('dm-form');
if (dmForm) {
    dmForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const statusText = document.getElementById('form-status');
        const sendBtn = document.getElementById('send-btn');
        
        const payload = {
            name: document.getElementById('sender-name').value,
            email: document.getElementById('sender-email').value,
            message: document.getElementById('sender-message').value
        };

        try {
            sendBtn.innerText = 'Sending...';
            sendBtn.disabled = true;

            const response = await fetch(`${API_BASE_URL}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                statusText.style.color = '#4ade80';
                statusText.innerText = "Message sent successfully!";
                dmForm.reset();
                setTimeout(() => { 
                    if (modal) modal.style.display = 'none'; 
                    statusText.innerText = ''; 
                }, 2000);
            } else {
                throw new Error(result.error || 'Failed to send message.');
            }
        } catch (err) {
            statusText.style.color = '#f87171';
            statusText.innerText = err.message;
        } finally {
            sendBtn.innerText = 'Send Message';
            sendBtn.disabled = false;
        }
    });
}

// ==========================================
// 3. FETCH LIVE PROJECTS FROM FIREBASE
// ==========================================
async function loadLiveProjects() {
    const container = document.getElementById('projects-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/projects`);
        const projects = await response.json();
        
        container.innerHTML = ''; 
        if (!projects || projects.length === 0) {
            container.innerHTML = '<p>No live projects found in Firebase.</p>';
            return;
        }
        
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <h3>${project.title}</h3>
                <small><strong>Tech:</strong> ${project.tech}</small>
                <p>${project.description}</p>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading projects:", error);
    }
}

// ==========================================
// 4. NAVBAR ACTIVE UNDERLINE (SCROLLSPY)
// ==========================================
function initScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    if (sections.length === 0 || navLinks.length === 0) return;

    const observerOptions = {
        root: null,
        rootMargin: '-30% 0px -40% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const currentId = entry.target.getAttribute('id');

                navLinks.forEach((link) => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${currentId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach((section) => observer.observe(section));
}

// ==========================================
// 5. REUSABLE PROJECT CAROUSEL CONTROLLER
// ==========================================
function setupProjectCarousel(carouselElement, autoPlayDelay = 3000) {
    if (!carouselElement) return;

    const slides = carouselElement.querySelectorAll('.carousel-slide');
    const dotsContainer = carouselElement.querySelector('.carousel-dots');
    const prevBtn = carouselElement.querySelector('.carousel-btn.prev');
    const nextBtn = carouselElement.querySelector('.carousel-btn.next');

    if (slides.length === 0) return;

    let currentIndex = 0;
    let autoPlayTimer = null;

    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        slides.forEach((_, idx) => {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (idx === 0) dot.classList.add('active');

            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                renderSlide(idx);
                restartAutoPlay();
            });

            dotsContainer.appendChild(dot);
        });
    }

    const dots = carouselElement.querySelectorAll('.dot');

    function renderSlide(index) {
        if (index < 0) {
            currentIndex = slides.length - 1;
        } else if (index >= slides.length) {
            currentIndex = 0;
        } else {
            currentIndex = index;
        }

        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === currentIndex);
        });

        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });
    }

    function startAutoPlay() {
        stopAutoPlay();
        const parentTab = carouselElement.closest('.tab-content');
        if (parentTab && !parentTab.classList.contains('active')) return;

        autoPlayTimer = setInterval(() => {
            renderSlide(currentIndex + 1);
        }, autoPlayDelay);
    }

    function stopAutoPlay() {
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
        }
    }

    function restartAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            renderSlide(currentIndex - 1);
            restartAutoPlay();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            renderSlide(currentIndex + 1);
            restartAutoPlay();
        });
    }

    carouselElement.addEventListener('mouseenter', stopAutoPlay);
    carouselElement.addEventListener('mouseleave', startAutoPlay);

    carouselElement._startAutoPlay = startAutoPlay;
    carouselElement._stopAutoPlay = stopAutoPlay;

    startAutoPlay();
}

// ==========================================
// 6. UNIFIED TAB SWITCHER & CAROUSEL SYNC
// ==========================================
function initProjectTabsAndCarousels() {
    const carousels = document.querySelectorAll('.project-carousel');
    carousels.forEach((carousel) => {
        setupProjectCarousel(carousel, 3000);
    });

    const projectRepos = {
        'tab-courseconnect': 'https://github.com/Wanju17/FirstStep',
        'tab-canteen': 'https://github.com/Wanju17/PCU-canteen'
    };

    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const githubBtn = document.getElementById('project-github-btn');

    tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const targetTabId = btn.getAttribute('data-tab');

            tabButtons.forEach((b) => b.classList.remove('active'));
            tabContents.forEach((c) => {
                c.classList.remove('active');
                const inactiveCarousel = c.querySelector('.project-carousel');
                if (inactiveCarousel && inactiveCarousel._stopAutoPlay) {
                    inactiveCarousel._stopAutoPlay();
                }
            });

            btn.classList.add('active');
            const targetTab = document.getElementById(targetTabId);
            if (targetTab) {
                targetTab.classList.add('active');
                const activeCarousel = targetTab.querySelector('.project-carousel');
                if (activeCarousel && activeCarousel._startAutoPlay) {
                    activeCarousel._startAutoPlay();
                }
            }

            // Sync dynamic GitHub repo link
            if (githubBtn && projectRepos[targetTabId]) {
                githubBtn.href = projectRepos[targetTabId];
            }
        });
    });
}

// ==========================================
// 7. IMAGE LIGHTBOX (MAXIMUM VIEW)
// ==========================================
function initLightbox() {
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.querySelector('.lightbox-close');

    if (!lightbox || !lightboxImg) return;

    // Attach click listener to all carousel images
    document.querySelectorAll('.carousel-slide img').forEach((img) => {
        img.addEventListener('click', () => {
            lightboxImg.src = img.src;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
}

// ==========================================
// DOM INITIALIZER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initScrollSpy();
    initProjectTabsAndCarousels();
    initLightbox();
    loadLiveProjects();
});