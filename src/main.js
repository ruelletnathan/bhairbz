import './style.css'
import Lenis from '@studio-freight/lenis'
import gsap from 'gsap'
import { initSmoke } from './smoke.js'

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ===== FUMÉE (WebGL) ===== */
const smokeCanvas = document.getElementById('smoke-canvas')
const smoke = smokeCanvas && !prefersReducedMotion ? initSmoke(smokeCanvas) : null

/* ===== ENSEIGNE NÉON ===== */
const neonWrap = document.querySelector('.neon-wrap')
if (neonWrap) {
  if (prefersReducedMotion) {
    neonWrap.classList.add('is-on')
  } else {
    requestAnimationFrame(() => neonWrap.classList.add('is-on'))
  }
}

/* ===== LENIS SMOOTH SCROLL ===== */
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, duration: 1.1 })
function raf(time) { lenis.raf(time); requestAnimationFrame(raf) }
requestAnimationFrame(raf)

/* ===== ANCHOR NAV =====
   Les liens du menu utilisaient le comportement natif de saut d'ancre, qui
   entre en conflit avec le scroll virtuel de Lenis (à-coups au clic).
   On intercepte les clics pour laisser Lenis piloter tout le scroll. */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'))
    if (!target) return
    e.preventDefault()
    lenis.scrollTo(target, { offset: -64, duration: 1.3 })
  })
})

/* ===== REVEAL OBSERVER ===== */
const revealEls = document.querySelectorAll('.reveal')
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible') })
}, { threshold: 0.12 })
revealEls.forEach((el) => observer.observe(el))

/* ===== MENTIONS LÉGALES ===== */
const legalToggle = document.getElementById('legalToggle')
const legalContent = document.getElementById('legalContent')
if (legalToggle && legalContent) {
  legalToggle.addEventListener('click', () => {
    const isHidden = legalContent.hasAttribute('hidden')
    if (isHidden) {
      legalContent.removeAttribute('hidden')
      legalToggle.setAttribute('aria-expanded', 'true')
    } else {
      legalContent.setAttribute('hidden', '')
      legalToggle.setAttribute('aria-expanded', 'false')
    }
  })
}

/* ===== BURGER MENU ===== */
const burger = document.getElementById('navBurger')
const navLinks = document.getElementById('navLinks')
burger.addEventListener('click', () => navLinks.classList.toggle('open'))
navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => navLinks.classList.remove('open')))

/* ===== PAUSE DE LA FUMÉE HORS ÉCRAN =====
   Inutile de faire tourner le WebGL quand le hero n'est plus visible. */
const heroSection = document.getElementById('hero')
if (smoke && heroSection) {
  new IntersectionObserver(([entry]) => smoke.setPaused(!entry.isIntersecting)).observe(heroSection)
}

/* ===== HERO ENTRANCE ===== */
const heroEntranceTargets = ['#heroTitle', '.hero-tagline', '.hero-lead', '.hero-actions', '.hero-stats-bar']

if (prefersReducedMotion) {
  gsap.set(heroEntranceTargets, { opacity: 1 })
} else {
  gsap.set(heroEntranceTargets, { opacity: 0, y: 24 })
  gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.9 }, delay: 0.4 })
    .to('#heroTitle', { opacity: 1, y: 0 }, 0)
    .to('.hero-tagline', { opacity: 1, y: 0 }, 0.18)
    .to('.hero-lead', { opacity: 1, y: 0 }, 0.32)
    .to('.hero-actions', { opacity: 1, y: 0 }, 0.46)
    .to('.hero-stats-bar', { opacity: 1, y: 0 }, 0.6)
}
