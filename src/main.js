import './style.css'
import Lenis from '@studio-freight/lenis'
import gsap from 'gsap'
import { initSmoke } from './smoke.js'

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ===== FUMÉE (WebGL) ===== */
const smokeCanvas = document.getElementById('smoke-canvas')
if (smokeCanvas && !prefersReducedMotion) {
  initSmoke(smokeCanvas)
}

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

/* ===== BURGER MENU ===== */
const burger = document.getElementById('navBurger')
const navLinks = document.getElementById('navLinks')
burger.addEventListener('click', () => navLinks.classList.toggle('open'))
navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => navLinks.classList.remove('open')))

/* ===== TRANSITION "FOND ROUGE QUI GROSSIT" (hero → section suivante) =====
   Rien ne bouge tant qu'on ne scrolle pas : le hero s'affiche normalement.
   Dès le premier scroll, un fond rouge apparaît (centré derrière le
   titre) puis grossit progressivement jusqu'à recouvrir tout l'écran.
   Le titre "B.HAIR.BZ" ne grossit jamais — il garde sa taille normale et
   passe juste au blanc une fois sur le rouge — pendant que le reste du
   texte s'efface. Piloté par le scroll sur la hauteur supplémentaire de
   .hero-pin-wrap (le hero reste épinglé à l'écran pendant ce temps). */
const heroPinWrap = document.querySelector('.hero-pin-wrap')
const heroRevealBg = document.querySelector('.hero-reveal-bg')
const heroTitle = document.getElementById('heroTitle')
const heroFadeOutEls = document.querySelectorAll('.hero-fade-out')

if (heroPinWrap && heroRevealBg) {
  if (prefersReducedMotion) {
    heroRevealBg.style.opacity = '0'
  } else {
    function updateHeroReveal() {
      const rect = heroPinWrap.getBoundingClientRect()
      const scrollableDistance = heroPinWrap.offsetHeight - window.innerHeight
      let progress = scrollableDistance > 0 ? -rect.top / scrollableDistance : 0
      progress = Math.min(Math.max(progress, 0), 1)

      const w = 10 + (window.innerWidth - 10) * progress
      const h = 10 + (window.innerHeight - 10) * progress
      const r = 40 * (1 - progress)

      heroRevealBg.style.width = `${w}px`
      heroRevealBg.style.height = `${h}px`
      heroRevealBg.style.borderRadius = `${r}px`
      heroRevealBg.style.opacity = String(Math.min(progress / 0.08, 1))

      heroTitle.classList.toggle('is-on-red', progress > 0.1)

      const fadeOutOpacity = Math.max(1 - progress / 0.35, 0)
      heroFadeOutEls.forEach((el) => { el.style.opacity = String(fadeOutOpacity) })
    }

    lenis.on('scroll', updateHeroReveal)
    window.addEventListener('resize', updateHeroReveal)
    updateHeroReveal()
  }
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
