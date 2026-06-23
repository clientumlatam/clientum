---
name: Wouter Link nesting
description: In wouter, Link renders as an <a> element — never wrap <a> inside Link or you get nested anchors and hydration warnings.
---

## Rule
Use `className` and `style` props directly on `<Link>` — never put `<a>` children inside `<Link>`.

**Why:** wouter's `Link` renders as `<a>` natively. Adding another `<a>` inside creates invalid HTML, a browser warning ("In HTML, <a> cannot be a descendant of <a>"), and hydration errors.

**How to apply:**
- Bad: `<Link href="/x"><a className="...">text</a></Link>`
- Good: `<Link href="/x" className="...">text</Link>`
