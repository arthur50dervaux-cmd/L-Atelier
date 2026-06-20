import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createScene } from './scene.js';
import { createViewer } from './viewer.js';

gsap.registerPlugin(ScrollTrigger);

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Smooth scroll (Lenis + GSAP ticker) ---------- */
const lenis = new Lenis({ smoothWheel: true, duration: 1.1 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ---------- Loader ---------- */
const loader = document.getElementById('loader');
const loaderProgress = document.getElementById('loader-progress');
let progress = 0;
const loaderInterval = setInterval(() => {
  progress += Math.random() * 18;
  if (progress >= 100) {
    progress = 100;
    clearInterval(loaderInterval);
    loaderProgress.style.width = '100%';
    setTimeout(() => {
      loader.classList.add('hidden');
      playIntro();
    }, 350);
  } else {
    loaderProgress.style.width = `${progress}%`;
  }
}, 160);

/* ---------- 3D scene ---------- */
const canvas = document.getElementById('scene-canvas');
const scene = createScene(canvas);

/* ---------- Custom cursor ---------- */
const cursorDot = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');
let mx = window.innerWidth / 2, my = window.innerHeight / 2;
let rx = mx, ry = my;
window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
function cursorLoop() {
  rx += (mx - rx) * 0.18;
  ry += (my - ry) * 0.18;
  cursorDot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  cursorRing.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
  requestAnimationFrame(cursorLoop);
}
cursorLoop();
document.querySelectorAll('[data-hover]').forEach((el) => {
  el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
});

/* ---------- Nav ---------- */
const nav = document.getElementById('nav');
ScrollTrigger.create({
  start: 80,
  onUpdate: (self) => nav.classList.toggle('scrolled', self.scroll() > 80),
});

const burger = document.getElementById('burger');
const mobileNav = document.getElementById('mobile-nav');
burger.addEventListener('click', () => mobileNav.classList.toggle('open'));
mobileNav.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => mobileNav.classList.remove('open'))
);

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.4 });
    }
  });
});

document.getElementById('to-top').addEventListener('click', () => lenis.scrollTo(0, { duration: 1.4 }));

/* ---------- Cinematic scroll-driven camera ---------- */
const acts = gsap.utils.toArray('.act');
const cinematicTrigger = ScrollTrigger.create({
  trigger: '#cinematic',
  start: 'top top',
  end: 'bottom top',
  scrub: true,
  onUpdate: (self) => {
    scene.setProgress(self.progress);
    const seg = 1 / acts.length;
    acts.forEach((act, i) => {
      const localStart = i * seg;
      const localEnd = localStart + seg;
      const center = (localStart + localEnd) / 2;
      const dist = Math.abs(self.progress - center);
      const visibility = gsap.utils.clamp(0, 1, 1 - dist / (seg * 0.6));
      gsap.to(act, { opacity: visibility, y: 24 * (1 - visibility), duration: 0.2, overwrite: 'auto' });
    });
    const cue = document.querySelector('.scroll-cue');
    if (cue) cue.style.opacity = self.progress < 0.04 ? 1 : 0;
  },
});

/* ---------- Reveal-on-scroll ---------- */
gsap.utils.toArray('.reveal').forEach((el) => {
  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    onEnter: () => el.classList.add('in'),
  });
});

/* ---------- Tilt cards (3D gadget effect) ---------- */
document.querySelectorAll('[data-tilt]').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(card, { rotateY: px * 14, rotateX: -py * 14, duration: 0.4, ease: 'power2.out' });
  });
  card.addEventListener('mouseleave', () => {
    gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power3.out' });
  });
});

/* ---------- Portfolio filters ---------- */
const filterBtns = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');
filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    projectCards.forEach((card) => {
      const match = filter === 'all' || card.dataset.category.includes(filter);
      if (match) {
        card.classList.remove('hide');
        gsap.fromTo(card, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 });
      } else {
        card.classList.add('hide');
      }
    });
  });
});

/* ---------- HD images: apply data-image to cards if provided ---------- */
projectCards.forEach((card) => {
  const img = card.dataset.image;
  if (img) {
    const visual = card.querySelector('.project-visual');
    visual.style.backgroundImage = `url("${img}")`;
    visual.classList.remove('art-sea', 'art-vine', 'art-villa', 'art-cliff', 'art-interior', 'art-domaine');
  }
});

/* ---------- Project modal ---------- */
const modal = document.getElementById('modal');
const modalTitle = modal.querySelector('.modal-title');
const modalPlace = modal.querySelector('.modal-place');
const modalDesc = modal.querySelector('.modal-desc');
const modalVisual = modal.querySelector('.modal-visual');

projectCards.forEach((card) => {
  card.addEventListener('click', () => {
    modalTitle.textContent = card.dataset.title;
    modalPlace.textContent = `${card.dataset.place} — ${card.dataset.year}`;
    modalDesc.innerHTML = card.dataset.desc;
    const img = card.dataset.image;
    if (img) {
      modalVisual.className = 'modal-visual';
      modalVisual.style.backgroundImage = `url("${img}")`;
    } else {
      modalVisual.className = `modal-visual ${card.querySelector('.project-visual').classList[1] || ''}`;
      modalVisual.style.backgroundImage = '';
    }
    modal.classList.add('open');
  });
});
modal.querySelectorAll('[data-close]').forEach((el) =>
  el.addEventListener('click', () => modal.classList.remove('open'))
);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') modal.classList.remove('open');
});

/* ---------- Stats count-up ---------- */
document.querySelectorAll('.stat-number').forEach((el) => {
  const target = parseInt(el.dataset.count, 10);
  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.to(el, {
        textContent: target,
        duration: 1.6,
        ease: 'power2.out',
        snap: { textContent: 1 },
        onUpdate: () => { el.textContent = Math.round(gsap.getProperty(el, 'textContent')); },
      });
    },
  });
});

/* ---------- Contact form -> mailto ---------- */
document.getElementById('contact-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const subject = encodeURIComponent(`Projet — ${data.get('subject') || 'Demande de contact'}`);
  const body = encodeURIComponent(
    `Nom: ${data.get('name')}\nEmail: ${data.get('email')}\n\n${data.get('message')}`
  );
  window.location.href = `mailto:arthur50dervaux@gmail.com?subject=${subject}&body=${body}`;
});

/* ---------- Intro animation ---------- */
function playIntro() {
  gsap.fromTo('.act-0', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out' });
}

/* ---------- 3D model viewer (Revit / scan) ---------- */
const viewerEl = document.getElementById('model-viewer');
if (viewerEl) {
  const viewer = createViewer(viewerEl);
  viewerEl.querySelector('[data-viewer-rotate]')?.addEventListener('click', viewer.toggleRotate);
  viewerEl.querySelector('[data-viewer-reset]')?.addEventListener('click', viewer.reset);
}

/* ---------- Film lightbox ---------- */
const filmModal = document.getElementById('film-modal');
const filmVideo = filmModal.querySelector('.film-video');

function openFilm(src, poster) {
  // Vérifie que la vidéo existe avant de l'afficher (sinon message d'aide).
  fetch(src, { method: 'HEAD' })
    .then((res) => {
      if (res.ok) {
        filmVideo.src = src;
        if (poster) filmVideo.poster = poster;
        filmModal.classList.add('has-video');
        filmVideo.play().catch(() => {});
      } else {
        filmVideo.removeAttribute('src');
        filmModal.classList.remove('has-video');
      }
    })
    .catch(() => {
      filmVideo.removeAttribute('src');
      filmModal.classList.remove('has-video');
    });
  filmModal.classList.add('open');
}

function closeFilm() {
  filmModal.classList.remove('open');
  filmVideo.pause();
  filmVideo.removeAttribute('src');
  filmVideo.load();
}

document.querySelectorAll('[data-film]').forEach((el) => {
  el.addEventListener('click', () => openFilm(el.dataset.film, el.dataset.poster || ''));
});
filmModal.querySelectorAll('[data-film-close]').forEach((el) => el.addEventListener('click', closeFilm));
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFilm(); });

/* Posters HD optionnels pour les films */
document.querySelectorAll('[data-poster]').forEach((el) => {
  if (!el.dataset.poster) return;
  const target = el.querySelector('.film-poster') || el;
  target.style.backgroundImage = `url("${el.dataset.poster}")`;
});

window.addEventListener('resize', () => scene.resize());
