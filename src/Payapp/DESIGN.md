# Design System Specification: The Digital Financial Editorial

## 1. Overview & Creative North Star

This design system is built to transform the mundane task of bill management into a high-end, editorial experience. The **Creative North Star** for this system is **"The Luminous Ledger."** 

Rather than following the rigid, boxy constraints of traditional fintech, this system treats the dashboard as a living document. We prioritize clarity through "breathing room" (generous whitespace) and trust through sophisticated tonal depth. We move away from generic templates by using **intentional asymmetry**—such as off-grid header placements and overlapping card elements—to create a signature look that feels curated rather than generated.

## 2. Colors: Chromatic Depth

The palette is anchored by a deep, authoritative purple, balanced against a spectrum of "weighted whites" to create a sense of architectural layers.

*   **Primary Narrative:** The `primary` (#650cd9) and `primary_container` (#7E3AF2) are your "hero" moments. Use these for high-intent actions and critical status indicators.
*   **The "No-Line" Rule:** To achieve a premium feel, **1px solid borders are strictly prohibited** for sectioning content. Boundaries must be defined solely through background color shifts. For example, a main content area using `surface` (#fef7ff) should be separated from a sidebar using `surface_container_low` (#f9f1ff).
*   **Surface Hierarchy & Nesting:** Treat the UI as a series of stacked sheets of fine paper. 
    *   **Base:** `surface`
    *   **Sectioning:** `surface_container`
    *   **Interactive Elements/Cards:** `surface_container_lowest` (#ffffff) to provide a "lifted" appearance against the off-white background.
*   **The "Glass & Gradient" Rule:** Use subtle linear gradients (from `primary` to `primary_container`) on large CTA surfaces to add "soul" and dimension. For floating navigation or modal overlays, apply **Glassmorphism**: use `surface` at 80% opacity with a `20px` backdrop-blur to maintain context of the underlying data.

## 3. Typography: Editorial Authority

We utilize a dual-font strategy to balance character with precision.

*   **The Storyteller (Manrope):** All `display` and `headline` tokens utilize **Manrope**. Its wider apertures and geometric construction feel modern and premium. Use `display-lg` for account balances to make financial data feel like a headline.
*   **The Truth-Teller (Inter):** All `title`, `body`, and `label` tokens utilize **Inter**. Inter’s high x-height and technical clarity ensure that complex bill details and transaction histories remain legible at any scale.
*   **Hierarchy Tip:** Use `label-md` in all-caps with `0.05em` letter-spacing for category tags to create a sophisticated, magazine-style metadata look.

## 4. Elevation & Depth: Tonal Layering

In this system, depth is a feeling, not a drop-shadow.

*   **The Layering Principle:** Physicality is achieved by "stacking" tones. Place a `surface_container_lowest` card on top of a `surface_container` background. The contrast is enough to define the shape without the "dirtiness" of a heavy shadow.
*   **Ambient Shadows:** When an element must "float" (e.g., a payment confirmation modal), use an **Ambient Shadow**. Use the `on_surface` color at 6% opacity with a `32px` blur and `8px` Y-offset. This mimics natural light rather than digital "glow."
*   **The "Ghost Border":** If a container requires more definition for accessibility (e.g., an input field), use a "Ghost Border." Apply `outline_variant` at 20% opacity. Never use 100% opaque outlines.
*   **Rounding Scale:** 
    *   Use `md` (0.75rem) for standard components (inputs, buttons).
    *   Use `xl` (1.5rem) for main dashboard containers and large promotional banners to soften the overall aesthetic.

## 5. Components: Precision Elements

### Buttons
*   **Primary:** Solid `primary_container` with `on_primary_container` text. Use `rounded-lg` (1rem).
*   **Secondary:** `surface_container_highest` background. No border.
*   **Tertiary:** Text-only using `primary` color, strictly for low-priority actions like "Learn More."

### Input Fields
*   Background should be `surface_container_lowest`. 
*   Use a `sm` (0.25rem) corner radius for a more technical, "financial" feel compared to the rounded buttons.
*   **Active State:** Instead of a thick border, use a 2px `primary` bottom-bar or a subtle glow using `surface_tint`.

### Cards & Lists
*   **Forbidden:** Divider lines between list items.
*   **Execution:** Separate transaction items using `8px` of vertical white space or by alternating background tones between `surface` and `surface_container_low`.
*   **The "Poppins" Card:** For the main "Points" display, use the `primary_container` color with a subtle radial highlight in the top-right corner to draw the eye.

### Chips
*   Use `secondary_container` with `on_secondary_container` for status chips (e.g., "Paid," "Pending"). They should be `rounded-full` to contrast against the more rectangular cards.

## 6. Do's and Don'ts

### Do
*   **DO** use white space as a functional element. If a screen feels cluttered, increase the padding between sections using the `xl` spacing scale.
*   **DO** overlap elements. Let a "Total Balance" display slightly overlap the transition between two background colors to create visual interest.
*   **DO** use `tertiary_fixed` (#ffdcc6) for "Alert" or "Warning" moments; its warm tone provides a sophisticated alternative to "Standard Error Red."

### Don't
*   **DON'T** use pure black (#000000) for text. Always use `on_surface` (#1d1a24) to maintain the "ink on paper" editorial feel.
*   **DON'T** use default browser focus states. Design custom, soft-glow focus rings that utilize `primary_fixed_dim`.
*   **DON'T** use 1px dividers to separate the sidebar. Use a tonal shift from `surface` to `surface_container_high`.