/**
 * Landing page — assembles all sections in order.
 *
 * This is a pure Server Component for the "/" route.
 * Nav is the only Client Component (mobile menu interactivity).
 * All other sections are Server Components.
 *
 * Section order:
 *  1. Nav (sticky, fixed)
 *  2. Hero
 *  3. Features
 *  4. How it works
 *  5. About
 *  6. CTA
 *  7. Footer
 */

import Nav from '@/components/sections/Nav';
import Hero from '@/components/sections/Hero';
import Features from '@/components/sections/Features';
import HowItWorks from '@/components/sections/HowItWorks';
import About from '@/components/sections/About';
import CTA from '@/components/sections/CTA';
import Footer from '@/components/sections/Footer';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <>
      {/*
       * Skip-to-content link for keyboard / screen reader users.
       * Shown only on :focus-visible via CSS; no JS needed, stays Server Component.
       */}
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>

      <Nav />

      <main id="main-content">
        <Hero />
        <Features />
        <HowItWorks />
        <About />
        <CTA />
      </main>

      <Footer />
    </>
  );
}
