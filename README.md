# Slotly — Scheduling SaaS

A scheduling platform for general users. Built with Next.js 14 App Router, TypeScript, and vanilla CSS.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (hot reload) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type check |

## Project Structure

```
src/
  app/
    layout.tsx        # Root layout — fonts, metadata, global styles
    page.tsx          # Landing page (assembles all sections)
    globals.css       # Design tokens + global resets
  components/
    ui/               # Generic reusable primitives (Button, etc.)
    sections/         # Landing page sections (Nav, Hero, Features, etc.)
```

## Milestones

- [x] **Milestone 1** — Project foundation + Landing page
- [ ] Milestone 2 — Authentication + User dashboard
- [ ] Milestone 3 — Booking page + Availability management
- [ ] Milestone 4 — Guest booking flow
