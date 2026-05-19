## 2024-05-23 - Accessibility of icon-only buttons
**Learning:** Core layout components like `Sidebar` and `Topbar` rely on multiple icon-only buttons (e.g. mobile menu toggle, collapse sidebar, logout, notifications). Without accessible names, these are not navigable by screen readers.
**Action:** Always verify icon-only buttons have an `aria-label` attribute (and optionally a `title` for visual tooltips) for better accessibility and general UX.
