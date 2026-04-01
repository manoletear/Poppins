# Análisis Landing Page POPPINS

**URL original:** https://manoletear.github.io/Poppins/
**Fecha de respaldo:** 2026-03-25
**Stack:** React + Vite + Tailwind CSS v4.1.3 + Framer Motion + Lucide React + shadcn/ui

---

## Estructura de Secciones (9 secciones)

| # | Sección | ID | Descripción |
|---|---------|-----|-------------|
| 1 | **Navbar** | — | Fijo, glassmorphism al scroll. Links: Inicio, Solución, Cómo Funciona, Seguridad + CTA "Comenzar" |
| 2 | **Hero** | `#hero` | H1 + subtítulo + tarjeta animada de contrato + 2 CTAs |
| 3 | **Pain Points** | — | 3 problemas en grid con iconos animados |
| 4 | **Solución** | `#solucion` | 3 tabs: Contrato Inteligente, Liquidaciones y Pagos, Cumplimiento Automático |
| 5 | **IA / CoE** | — | Diagrama orbital: Head of AI, Legal & Ethics, Data Pod, UX Squad |
| 6 | **Testimonios** | — | Carousel con 3 testimonios (Carolina, María, Rodrigo) |
| 7 | **Cómo Funciona** | `#como-funciona` | 3 pasos: Perfil → Firma Digital → Pago Automático |
| 8 | **Seguridad** | `#seguridad` | Integraciones: SII, PreviRed, Dirección del Trabajo |
| 9 | **CTA Final / Footer** | — | Cierre con CTA principal + copyright |

---

## Paleta de Colores

| Color | Hex | Uso |
|-------|-----|-----|
| Navy Oscuro | `#2D2D90` | Texto principal, headings, fondo sección seguridad |
| Navy Profundo | `#1B1B2F` | Texto cuerpo, descripciones |
| Rosa Intenso | `#F46BC1` | CTAs, acentos, iconos, highlights |
| Rosa Claro | `#FFD6EC` | Fondos secundarios, bordes, cards |
| Lavanda | `#EFE8FF` | Fondos de sección, cards |
| Blanco | `#FFFFFF` | Texto sobre fondo oscuro, cards |
| Verde | `#22C55E` | Checkmarks de éxito, indicadores de progreso |

### Gradientes
- **Hero BG:** `linear-gradient(180deg, #2D2D90 0%, #EFE8FF 50%, #FFD6EC 100%)`
- **Centro IA:** `linear-gradient(135deg, #2D2D90 0%, #F46BC1 100%)`
- **CTA Final BG:** `linear-gradient(180deg, #EFE8FF 0%, #FFD6EC 100%)`

---

## Tipografía

- **Fuente:** System font stack (ui-sans-serif, system-ui, sans-serif)
- **Sin fuentes custom cargadas**
- **Tamaño base:** 16px
- **Border radius base:** 10px (0.625rem)

---

## Contenido Textual Completo

### Hero
- **H1:** "Formaliza a tu trabajadora en minutos. POPPINS™ se encarga del resto."
- **Subtítulo:** "Crea contratos, liquida sueldos, paga cotizaciones y cumple la ley chilena — todo desde una app simple, segura y humana."
- **Tarjeta animada:** Muestra progreso → "Contrato firmado digitalmente y registrado en la Dirección del Trabajo."
- **CTA 1:** "Crear mi Contrato Gratis"
- **CTA 2:** "Ver cómo funciona →"

### Pain Points
- **H2:** "Cuando hacer las cosas bien parece imposible"
- **Subtítulo:** "En Chile, 3 de cada 4 relaciones laborales domésticas son informales. No por falta de voluntad, sino por falta de simplicidad."
- **Card 1:** "Horas perdidas en trámites y planillas" / "El tiempo que podrías dedicar a tu familia"
- **Card 2:** "Errores en pagos, cotizaciones o vacaciones" / "Cálculos complejos que generan incertidumbre"
- **Card 3:** "Miedo a multas o sanciones" / "La preocupación constante de no estar cumpliendo"

### Solución
- **H2:** "Legalidad sin Fricción"
- **Tab 1 - Contrato Inteligente:** Campo autocompletado legal, Validación en tiempo real, Listo para firmar digitalmente
- **Tab 2 - Liquidaciones y Pagos:** Sueldo Base $450.000, AFP (10%) $45.000, Salud (7%) $31.500
- **Tab 3 - Cumplimiento Automático:** Diagrama orbital con AFP, Isapre, SII

### IA con Conciencia Humana
- **H2:** "IA con conciencia humana"
- **Subtítulo:** "Detrás de POPPINS™ hay un sistema cognitivo completo — no un algoritmo."
- **Nodos:** Head of AI, Legal & Ethics Hub, Data Pod, UX Squad

### Testimonios
1. **Carolina** (Ñuñoa): "Antes no sabía si estaba cumpliendo. Hoy POPPINS me avisa todo."
2. **María** (Trabajadora): "Recibo mis liquidaciones en mi correo, todo claro y al día."
3. **Rodrigo** (Las Condes): "Me ahorro horas cada mes. Todo se paga automáticamente y sin errores."

### Cómo Funciona
- **Paso 01:** "Completa el perfil" — "POPPINS genera el contrato legal automáticamente"
- **Paso 02:** "Firma digital segura" — "Sin imprimir, sin moverte. Validación legal instantánea"
- **Paso 03:** "Pago automático y PreviRed" — "Todo listo en un clic. Tu tranquilidad asegurada"
- **CTA:** "Empieza ahora — gratis y legal"

### Seguridad
- **H2:** "Legalidad real. Privacidad real. Tranquilidad real."
- **Integraciones:** SII (Declaraciones automáticas), PreviRed (Imposiciones previsionales), Dirección del Trabajo (Registro de contratos)
- **Footer:** "Infraestructura certificada. Tus datos, solo tuyos."

### CTA Final
- **H2:** "Tu hogar en regla, tu conciencia tranquila"
- **Subtítulo:** "Simplemente legal. Humanamente digital."
- **CTA:** "Formaliza ahora con POPPINS™"
- **Tagline:** "POPPINS™ — Hacerlo Bien Nunca Fue Tan Simple"
- **Copyright:** "© 2025 POPPINS. Cumplimiento legal para el hogar chileno."

---

## Animaciones (Framer Motion)

- Hero: blob rosa pulsante, fade-in escalonado
- Tarjeta contrato: barras de progreso animadas + mensaje de éxito con delay
- Pain points: rotación continua, rebote, escala en hover
- Tabs solución: transiciones fade entre tabs
- Cumplimiento: nodos orbitando (AFP, Isapre, SII)
- CoE: líneas dibujándose al scroll, nodos escalando al entrar al viewport
- Testimonios: carousel con scale/grayscale, ícono de comillas rotando
- Seguridad: glow pulsante, líneas punteadas animadas
- Navbar: transparente → blanco con blur al scroll

---

## Responsive

- **Mobile first** con 2 breakpoints: `sm: 640px`, `md: 768px`
- Navbar: hamburguesa en mobile, links inline en desktop
- Cards: 1 columna mobile → 3 columnas (md:grid-cols-3) desktop
- Flex direction: columna → fila en sm

---

## Assets

| Archivo | Tamaño | Descripción |
|---------|--------|-------------|
| `index.html` | ~0.5 KB | Shell HTML |
| `assets/index-Z8XIpR4j.js` | 310 KB | Bundle React + Framer Motion + Lucide + app |
| `assets/index-CTwfptOR.css` | 23 KB | Tailwind CSS compilado + shadcn/ui tokens |
| `assets/Poppins_icono.png` | 115 KB | Logo POPPINS |

---

## Iconos (Lucide React)

~20+ iconos SVG incluidos: checkmark, flechas, menú, shield, clock, alert, document, calculator, brain, scale/legal, database, users, building, quote, user/profile, pen/signature, credit card.
