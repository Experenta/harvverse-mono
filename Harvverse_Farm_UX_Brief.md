# HARVVERSE.FARM — UX DESIGN BRIEF
## Content Specifications for Designer
**Versión:** 1.0 | Mayo 2026
**Scope:** harvverse.farm — Home · Open Farms · About
**Brand colors:**
- Dark background: `#0F1A24`
- Green (primary): `#93D832`
- White: `#FFFFFF`
- Teal: `#67B9C1`
- Amber: `#F4A261`
- Dark green card: `#1E3A2F`
- Gray text: `#8A9BAC`

---

## NAVIGATION — GLOBAL (todas las páginas)

```
[ψ harvverse]    Home · Open Farms · Investors ↗ · About    [ Register Your Farm ]
```

- Logo: izquierda
- Links: centro
- CTA button: derecha — color `#93D832`, texto oscuro, siempre visible
- "Investors ↗" abre harvverse.com en nueva pestaña
- Mobile: hamburger. CTA sticky en bottom bar.

---

## PAGE 1 — HOME

---

### SECTION 1 · HERO — Full screen, above the fold

**Imagen de fondo:**
Split composition 60/40:
- Izquierda 60%: fotografía real de finca cafetalera hondureña — plantas de café en primer plano, lago Yojoa y montañas al fondo, cielo dramático. Overlay gradiente `#0F1A24` al 70% cubriendo desde el borde izquierdo hasta el centro.
- Derecha 40%: screenshot de la plataforma mostrando polígono GPS satelital verde + Risk Score 90/100 + badge "EUDR compliant". Overlay `#0F1A24` al 30% para que se vea la interfaz.
- Línea divisoria vertical: 2px color `#93D832`

**Contenido — columna izquierda:**

```
EYEBROW (11px, verde #93D832, letter-spacing 3px, uppercase):
OPEN FARMS BY HARVVERSE

HEADLINE (48px desktop / 32px mobile, blanco, bold):
Your Farm.
Verified by Satellite.
Visible to the World.

SUBHEADLINE (18px, blanco suave #C8E6B0):
Register free. Get your EUDR Compliance Score
powered by ESA Copernicus satellites.
Join the global directory of verified farms.

─────────────────────────────────────────

DOS CTAs EN FILA:

[ Register Your Farm — Free ]     [ Join as Digital Partner ]
  Botón relleno verde `#93D832`     Botón outline blanco
  Texto oscuro `#0F1A24`            Texto blanco
  → crea usuario farmer             → va a waiting list

─────────────────────────────────────────

MICROCOPY bajo los botones (11px, gris #8A9BAC):
No credit card. No certification required. Takes less than 5 minutes.
```

---

### SECTION 2 · SOCIAL PROOF STRIP

**Background:** `#1E3A2F`
**Layout:** 4 columnas separadas por línea vertical `#93D832`

```
COL 1              COL 2              COL 3              COL 4
38,908             7                  0—100              Free
Verified           Satellite          EUDR               Always
producers          variables          Compliance         for every
in our dataset     per farm           Score              farmer
```

Números en verde `#93D832`, tamaño grande (36px). Descripción en blanco suave, 12px.

---

### SECTION 3 · HOW IT WORKS — Para farmers

**Background:** `#F4F7F0` (off-white claro)
**Eyebrow:** "FOR FARMERS"

**Headline:**
```
Three steps to EUDR compliance.
Zero cost.
```

**3 tarjetas en fila (iconos simples, minimalistas):**

```
PASO 1                    PASO 2                    PASO 3
[icono: pin/mapa]         [icono: satélite]         [icono: globo/red]

Register your farm        Get your score            Be discoverable

Upload your GPS           ESA Copernicus            Your farm appears
polygon. Walk your        satellites verify         in the global Open
perimeter, export         your farm. EUDR           Farms directory.
KML, upload.              score in seconds.         Buyers and investors
Takes 5 minutes.          0–100. Automatic.         find you directly.
```

**CTA al final de la sección:**
```
[ Register Your Farm — Free ]
```

---

### SECTION 4 · SPLIT — Para Digital Partners

**Background:** `#0F1A24` (dark)
**Layout:** Split 50/50

**IZQUIERDA — imagen:**
Screenshot del Partner Dashboard mostrando portfolio de fincas con scores y returns. O imagen de café specialty siendo degustado.

**DERECHA — contenido:**

```
EYEBROW (verde, uppercase, tracking):
FOR DIGITAL PARTNERS

HEADLINE (blanco, bold, 36px):
Invest in verified
specialty coffee farms.
Earn 40% of harvest profits.

BODY (blanco suave, 16px):
Global co-investment in real coffee lots.
Satellite-verified farms. Smart contracts
on Base L2 distribute profits automatically.
No debt. No intermediaries. Just results.

BULLETS:
✓ 60% profit to farmer · 40% to you
✓ EUDR-compliant lots only
✓ Satellite risk score per investment
✓ Smart contract automated distribution

CTA (botón outline verde):
[ Join the Digital Partner Waiting List ]
→ va a waiting list form
```

---

### SECTION 5 · WAITING LIST FORM — Digital Partners

**Background:** `#1E3A2F`

**Headline:**
```
Join the waitlist.
Be first when Digital Partner
access opens in your region.
```

**Form fields (layout 2 columnas en desktop, 1 en mobile):**

```
Full name *                    Email *
Country *                      Investment range *
                               [ $3,000–$5,000        ▾ ]
                               [ $5,000–$15,000          ]
                               [ $15,000–$50,000         ]
                               [ $50,000+                ]

How did you hear about us? (opcional — dropdown)
  Prototypes for Humanity / Bloomberg / Social media /
  Referral / Other

[ Join the Waiting List ]
← botón verde ancho completo

Microcopy bajo el botón (11px, gris):
"We'll notify you when Digital Partner access 
opens in your region. No spam. Unsubscribe anytime."
```

---

### SECTION 6 · OPEN FARMS PREVIEW

**Background:** `#F4F7F0`

**Headline:**
```
Farms verified today.
```

**Layout:** Mapa global con puntos verdes en fincas registradas + debajo grid de 3 farm cards (las más recientes o destacadas)

**Farm card:**
```
┌──────────────────────────────┐
│ [foto de la finca]           │
│                              │
│ Finca Zafiro          🌿 90  │
│ Santa Bárbara, Honduras      │
│ 1,300 masl · Parainema       │
│ ✅ EUDR Verified             │
│                              │
│ [ View Farm ]                │
└──────────────────────────────┘
```

**CTA:**
```
[ Explore Open Farms → ]
```

---

### SECTION 7 · PROOF STRIP — Reconocimientos

**Background:** `#0F1A24`
**Layout:** logos/badges en fila horizontal, fondo oscuro

```
Fintech Americas 2025 · Gold Award DeFi
Prototypes for Humanity · Dubai · 3,300+ applicants
Endeavor × IICA AgTech Accelerator 2026
Bloomberg Línea · April 2026
AgriTech Innovation Awards · Málaga 2024
```

Texto pequeño centrado, color `#8A9BAC`. Separado por puntos o líneas verticales sutiles.

---

### SECTION 8 · EUDR URGENCY BANNER

**Background:** `#E63946` (rojo)
**Layout:** una línea, full width

```
⚡  EUDR DEADLINE: DECEMBER 2026  ·  7 months away  ·
~50% of Honduran coffee exports go to the EU  ·
No GPS traceability = no EU market access
[ Register your farm now → ]
```

Texto blanco bold. CTA link verde al final.

---

### SECTION 9 · FOOTER

**Background:** `#0A1218`

```
COLUMNA 1          COLUMNA 2          COLUMNA 3
ψ harvverse        Platform           Company

harvverse.farm     Open Farms         About
                   Register Farm      harvverse.com
                   Investors ↗        Bloomberg Línea ↗

─────────────────────────────────────────────────────

© 2026 Harvverse Inc. · Delaware C-Corp
jorge.lanza@harvverse.com · +504 9992-7212
Built on Base L2 · Satellite data: ESA Copernicus
```

---

## PAGE 2 — OPEN FARMS

---

### SECTION 1 · HERO

**Background:** `#0F1A24`

```
EYEBROW: OPEN FARMS DIRECTORY

HEADLINE (blanco, bold):
Every farm. Satellite-verified.
Publicly accessible. Free.

SUBHEADLINE (blanco suave):
The global EUDR compliance directory
for coffee farmers. Powered by
ESA Copernicus satellite data.

CTA: [ Register Your Farm — Free ]
```

---

### SECTION 2 · MAPA + FILTROS + DIRECTORIO

**Background:** `#F4F7F0`

**Filtros en barra horizontal (top):**
```
Country ▾    Variety ▾    Altitude ▾    Score ▾    Available to invest ☐
```

**Mapa:** full width, puntos verdes por finca, cluster por región. Click en punto → popup con nombre + score + link.

**Grid de farm cards debajo del mapa:**
3 columnas desktop / 2 tablet / 1 mobile

```
FARM CARD:
┌──────────────────────────────────┐
│ [foto]                           │
│                                  │
│ Finca Zafiro              [90]   │
│ Santa Bárbara, Honduras    verde │
│ 1,300 masl · Bourbon             │
│ ✅ EUDR Verified                 │
│ ● Available for co-investment    │
│                                  │
│ [ View Farm ]                    │
└──────────────────────────────────┘

Score badge: círculo colorizado por banda
80–100 verde · 60–79 teal · 40–59 amber
20–39 naranja · 0–19 rojo
```

---

### SECTION 3 · FARM PROFILE PAGE (/farms/:id)

**Layout:** 2 columnas desktop

**COLUMNA IZQUIERDA:**
```
[Foto principal de la finca]
[Galería thumbnails si hay más fotos]

Mapa satelital con polígono GPS verde
```

**COLUMNA DERECHA:**
```
NOMBRE DE FINCA (grande, bold)
País · Departamento/Municipio

[Badge EUDR Verified ✅]  [Score: 90/100]

─────────────────────────

📍 Location:    Santa Bárbara, Honduras
⛰️  Altitude:   1,300 masl
🌿 Variety:     Parainema
📐 Area:        2.4 hectares (auto Copernicus)

─────────────────────────

RISK SCORE BREAKDOWN:

Barra de progreso verde ancha: 90/100

Variables expandibles (acordeón):
▸ NDVI Health Score      ████████░ 18/20
▸ Management Stability   ████████░ 9/10
▸ Annual Precipitation   ████████░ 14/15
▸ Rainfall Seasonality   ████████░ 13/15
▸ Temperature Range      ████████░ 9/10
▸ Deforestation Check ✅  ████████░ 20/20
▸ Soil Moisture Trend    ████████░ 7/10

─────────────────────────

● Available for co-investment

[ Invest in this Farm ]
→ lleva a harvverse.com / waiting list
```

---

### SECTION 4 · CTA STRIP

```
Background: #1E3A2F

"Is this your farm?  Register to claim your profile."

[ Register Your Farm — Free ]
```

---

## PAGE 3 — ABOUT

---

### SECTION 1 · MISSION

**Background:** `#0F1A24`

```
EYEBROW: WHY WE EXIST

HEADLINE (blanco, bold, grande):
500 million smallholder farmers.
No capital. No visibility.
No compliance infrastructure.
We're fixing all three.

BODY (blanco suave):
Harvverse is the platform where EUDR compliance
meets agricultural co-investment. A farmer who
registers their farm gets a satellite-verified
score, global visibility, and access to capital
— without debt, without intermediaries, and
without losing their land.
```

---

### SECTION 2 · PROOF — Late Harvest

**Background:** `#F4F7F0`

```
EYEBROW: PROVEN MODEL

HEADLINE:
This model worked before blockchain existed.
Now it scales globally.

SUBHEADLINE:
Late Harvest: Best of Honduras (2016–2019)
Co-founded with Sasa Sestic — World Barista Champion 2015

4 STATS EN TARJETAS OSCURAS:

400+              $41/lb            $130K+            6
Producers         Peak price        For farmers        Countries
across all        achieved          in 2019 alone      buying
6 coffee          (from $2.50/lb)                      Honduras
regions                                                coffee

BRIDGE LINE (bold, centrado):
"COVID ended the physical program in 2020.
 Harvverse makes it permanent."
```

---

### SECTION 3 · TECHNOLOGY

**Background:** `#0F1A24`

```
EYEBROW: THE TECHNOLOGY

HEADLINE (blanco):
Satellite intelligence meets
blockchain finance.

3 PILARES EN TARJETAS:

PILAR 1                    PILAR 2                    PILAR 3
ESA Copernicus             Base L2                    EUDR
Risk Score                 Smart Contracts            Compliance

7 satellite variables      Automated 60/40            GPS polygon +
verify every farm.         profit distribution.       deforestation
Sentinel-2, Sentinel-1     No intermediary.           check built-in.
SAR, ERA5 Climate.         No manual process.         Every farm.
0–100 score.               Blockchain-verified.       Automatically.
```

---

### SECTION 4 · RECOGNITION

**Background:** `#1E3A2F`

```
HEADLINE: Recognized globally.

AWARDS en tarjetas:

🏆 Fintech Americas 2025
   Gold Award — Most Innovative DeFi

🌍 Prototypes for Humanity — Dubai
   Selected from 3,300+ global applicants

🚀 Endeavor × IICA AgTech Accelerator 2026
   20 spots · 150 applications · 34 countries

📰 Bloomberg Línea — April 2026
   "Lo que los avatares de Roblox le enseñaron
    a un cafetalero sobre cómo financiar el agro"

🏅 AgriTech Innovation Awards Málaga 2024
   Finalist — Best AgriTech Startup
```

---

### SECTION 5 · CTA FINAL

**Background:** `#0F1A24`

```
HEADLINE (blanco, centrado, grande):
This is not a concept.
Smart contracts are deployed.
Farms are onboarding.

DOS CTAs CENTRADOS:
[ Register Your Farm — Free ]    [ Join as Digital Partner ]
```

---

## NOTAS PARA EL DESIGNER

**Tipografía:** Calibri o Inter como fuente base. Títulos bold. Body regular.

**Imágenes disponibles:**
- 5 fotos reales de finca hondureña (café + lago Yojoa) — ya disponibles
- Screenshot plataforma con polígono GPS + Risk Score 90 — disponible
- Mapa de Honduras con puntos — generar con dataset

**Iconografía:** línea minimalista, sin ilustraciones complejas. Verde `#93D832` como color de acento en todos los iconos.

**Responsive:** Mobile-first. Hero CTA debe ser botón grande en mobile, min 48px height. Farm cards: 1 columna en mobile.

**Animaciones (opcionales):** Contador animado en social proof strip. Mapa con puntos apareciendo progresivamente.

**Score badges:** círculos de color según banda — verde/teal/amber/naranja/rojo. Consistentes en cards y en perfil de finca.

---

*Harvverse Inc. · harvverse.farm · jorge.lanza@harvverse.com*
