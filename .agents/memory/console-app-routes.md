---
name: Console App Routes
description: Decisions and non-obvious gotchas for the /app/* console in Clientum frontend.
---

## Migration decisions (non-derivable)
- TanStack Router → **wouter** (no file-system routing, simpler)
- Supabase → **Replit Auth** (OIDC/PKCE, sessions in PostgreSQL)
- `motion/react` → **framer-motion** (v12+): always import from `"framer-motion"`, not `"motion/react"`

## Layout
- All `/app/*` routes are wrapped in `AppShell` (sidebar + header). New pages just need a route in `App.tsx` + entry in `AppShell.tsx` nav arrays + a `titles` entry.
- Dark navy theme via `@theme` CSS tokens in `artifacts/clientum/src/index.css` (`bg-navy`, `bg-cl-accent`, etc.)
- Tabler Icons via CDN in `artifacts/clientum/index.html` — use `<i className="ti ti-xxx" />`

## Gotchas
- Components used by `CatalogoPanel` (`ImageUploadField`, `CatalogPreview`) must be defined at **module scope BEFORE** `CatalogoPanel`. Using `Record<string, string>` for form props avoids TS incompatibilities.
- framer-motion v12: import from `"framer-motion"` not `"motion/react"`.

**Why:** These decisions diverge from the original reference repo (ok.zip) and are not obvious from reading the code alone.
