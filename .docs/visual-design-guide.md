# Harvverse Visual Design Guide

This guide captures the visual language of the current Harvverse app so it can be recreated in another Tailwind project. It focuses on look, feel, color, spacing, interaction, and component styling rather than technical architecture.

## Design Philosophy

Harvverse sits between agritech, fintech, and Web3. The visual system should feel premium, dark, ecological, and trustworthy. The base experience is a deep nocturnal interface with glass surfaces, bright agricultural highlights, and restrained fintech-style information density.

The product has two main personality lanes:

- **Phartmer / investor lane:** energetic, high-growth, yield-oriented. Uses bright crop green as the primary action color.
- **Farmer lane:** grounded, agricultural, physical-world. Uses coffee-brown and earth tones for primary farmer actions.

The UI should avoid generic SaaS whiteness. It should feel like a secure investment terminal for agricultural assets: dark, polished, data-aware, and lightly atmospheric.

## Core Palette

### Base Colors

| Role                          | Hex                   | Tailwind-style usage                     | Notes                                    |
| ----------------------------- | --------------------- | ---------------------------------------- | ---------------------------------------- |
| Deep app background           | `#0a0e27`             | `bg-[#0a0e27]`                           | Main dashboard/app canvas.               |
| Near-black landing background | `#080E04`             | `bg-[#080E04]`                           | Landing hero and stronger brand moments. |
| Navy surface                  | `#1a1f3a`             | `bg-[#1a1f3a]`                           | Cards, popovers, secondary backgrounds.  |
| Muted navy                    | HSL `229 38% 25%`     | `bg-muted`, `border-border`              | Inputs, borders, muted panels.           |
| White text                    | `#ffffff`             | `text-white`                             | Primary text on dark surfaces.           |
| Muted text                    | `#9ca3af` / `#a0aec0` | `text-gray-400`, `text-muted-foreground` | Secondary copy and metadata.             |
| Subtle text                   | `#6b7280`             | `text-gray-500`                          | Tertiary hints, helper labels.           |

### Brand and Role Colors

| Role                   | Hex       | Tailwind-style usage           | Notes                                             |
| ---------------------- | --------- | ------------------------------ | ------------------------------------------------- |
| Player green / primary | `#93d832` | `bg-primary`, `text-[#93d832]` | Main CTA, investor accents, focus rings.          |
| Primary green hover    | `#82c926` | `from-primary to-[#82c926]`    | Button gradient endpoint.                         |
| Secondary teal         | `#67b9c1` | `text-[#67b9c1]`               | Phygital badges, secondary brand accent.          |
| Digital violet         | `#6766c4` | `text-[#6766c4]`               | Digital partnership badges and ambient glow.      |
| Farmer brown           | `#a37241` | `text-[#a37241]`               | Farmer primary, farm location icons, farmer CTAs. |
| Farmer dark brown      | `#5e3c1e` | `to-[#5e3c1e]`                 | Farmer gradients and avatars.                     |
| Farmer hover brown     | `#8f6336` | `hover:bg-[#8f6336]`           | Farmer solid button hover.                        |

### Status and Category Colors

Use translucent backgrounds with vivid text instead of solid fills:

| Meaning                  | Background         | Text              | Border                 |
| ------------------------ | ------------------ | ----------------- | ---------------------- |
| Success / fertility      | `bg-green-500/10`  | `text-green-400`  | `border-green-500/20`  |
| Warning / pending        | `bg-yellow-500/10` | `text-yellow-400` | `border-yellow-500/20` |
| Pest / operational alert | `bg-orange-500/10` | `text-orange-400` | `border-orange-500/20` |
| Disease / information    | `bg-blue-500/10`   | `text-blue-400`   | `border-blue-500/20`   |
| Maintenance              | `bg-purple-500/10` | `text-purple-400` | `border-purple-500/20` |
| Harvest / destructive    | `bg-red-500/10`    | `text-red-400`    | `border-red-500/20`    |
| Beneficiado / water      | `bg-cyan-500/10`   | `text-cyan-400`   | `border-cyan-500/20`   |
| Platform / neutral       | `bg-slate-700/20`  | `text-slate-300`  | `border-slate-600/20`  |

## Gradients

Gradients are used sparingly and should feel luminous rather than colorful for its own sake.

### Page Background

```tsx
<div className="min-h-screen bg-gradient-to-br from-[#0a0e27] to-[#1a1f3a] text-white" />
```

The global app background can also use:

```css
background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
```

### Hero Text

```tsx
<span className="bg-clip-text text-transparent bg-gradient-to-r from-[#93d832] via-[#67b9c1] to-white">
	Farmers
</span>
```

### Player CTA

```tsx
className =
	"bg-gradient-to-r from-primary to-[#82c926] text-[#0a0e27] font-bold hover:shadow-lg hover:shadow-primary/20";
```

### Farmer CTA

```tsx
className =
	"bg-gradient-to-r from-[#a37241] to-[#5e3c1e] text-white font-bold border border-[#a37241]/50 hover:shadow-lg hover:shadow-[#a37241]/20";
```

### Ambient Glows

Landing/auth pages use large blurred color fields:

```tsx
<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
<div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#a37241]/10 rounded-full blur-[120px]" />
```

Use these as background atmosphere only. Keep them low-opacity (`/10` to `/15`) and heavily blurred (`blur-[100px]` to `blur-[120px]`).

## Typography

The app uses:

- **Inter** for body/UI text.
- **Space Grotesk** for headings.

Recommended import:

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap");
```

Recommended CSS:

```css
body {
	font-family: "Inter", sans-serif;
}

h1,
h2,
h3,
h4,
h5,
h6 {
	font-family: "Space Grotesk", sans-serif;
}
```

Type scale patterns:

- Hero headline: `text-4xl md:text-7xl font-bold leading-tight tracking-tight`
- Page title: `text-3xl` to `text-4xl font-bold`
- Card title: `text-lg` to `text-2xl font-bold`
- Body copy: `text-sm` to `text-lg text-gray-400 leading-relaxed`
- Metadata: `text-xs`, often uppercase or mono in trust/status bars

## Shape and Radius

The project mixes compact shadcn radii with larger custom glass cards.

Use these default radius values:

```ts
borderRadius: {
  lg: ".5625rem", // 9px
  md: ".375rem",  // 6px
  sm: ".1875rem", // 3px
}
```

Practical usage:

- Buttons: `rounded-md` by default, `rounded-xl` for large marketing/auth CTAs.
- Glass cards: `rounded-2xl`.
- Inner stat tiles: `rounded-lg`.
- Badges/pills: `rounded-full` for role/status chips, `rounded-md` for compact shadcn badges.
- Avatars/icon wells: `rounded-full`, `rounded-lg`, or `rounded-xl` depending on context.

## Surfaces and Cards

The dominant card treatment is glassmorphism over a dark background:

```tsx
className =
	"rounded-2xl border backdrop-blur-xl shadow-2xl relative overflow-hidden bg-white/5 border-white/10";
```

Darker variant:

```tsx
className =
	"rounded-2xl border backdrop-blur-xl shadow-2xl relative overflow-hidden bg-black/20 border-white/5";
```

Add a subtle top shine layer:

```tsx
<div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
```

Card guidance:

- Use `bg-white/5 border-white/10` for main cards.
- Use `bg-black/20 border-white/5` for farmer/admin detail cards or denser dashboards.
- Use `bg-black/40 border-white/5` for nested metric tiles inside a card.
- Hover cards can add soft glow: `hover:shadow-[0_0_30px_rgba(147,216,50,0.1)]`.
- Image cards should crop with `h-40 overflow-hidden`, `object-cover`, and `group-hover:scale-105 transition-transform duration-500`.

## Buttons

Button structure is compact, icon-friendly, and medium weight:

```tsx
className =
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
```

Sizes:

- Default: `min-h-9 px-4 py-2`
- Small: `min-h-8 px-3 text-xs`
- Large: `min-h-10 px-8`
- Icon: `h-9 w-9`

### Primary Player Button

```tsx
<Button className="bg-primary hover:bg-primary/90 text-[#0a0e27] font-bold">
	Explore Farms
</Button>
```

Use for investor actions, catalog opening, and positive platform actions.

### Player Gradient Button

```tsx
<Button className="w-full bg-gradient-to-r from-primary to-[#82c926] text-[#0a0e27] font-bold h-11 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300">
	Submit Registration Request
</Button>
```

Use on auth and high-emphasis conversion forms.

### Farmer Button

```tsx
<Button className="bg-[#a37241] hover:bg-[#8f6336] text-white font-bold">
	Upload Documents
</Button>
```

Gradient farmer version:

```tsx
<Button className="bg-gradient-to-r from-[#a37241] to-[#5e3c1e] text-white font-bold border border-[#a37241]/50">
	Submit Registration Request
</Button>
```

### Outline Button

```tsx
<Button
	variant="outline"
	className="border-[#93d832]/40 text-[#93d832] hover:bg-[#93d832]/10 hover:border-[#93d832] rounded-xl"
>
	View Details
</Button>
```

Farmer outline:

```tsx
className = "border-[#a37241]/50 text-[#a37241] hover:bg-[#a37241]/10";
```

### Ghost Navigation Button

```tsx
className =
	"w-full justify-start text-gray-400 hover:text-white hover:bg-white/5";
```

Active investor navigation:

```tsx
className =
	"w-full justify-start text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary";
```

Active farmer navigation:

```tsx
className =
	"w-full justify-start text-[#a37241] bg-[#a37241]/10 hover:bg-[#a37241]/20 hover:text-[#a37241]";
```

Button rules:

- Pair text buttons with Lucide icons where helpful.
- Use dark text on green buttons: `text-[#0a0e27]` or `text-[#080E04]`.
- Use white text on brown, orange, red, and dark buttons.
- Keep destructive/logout actions ghost-like: `text-red-400 hover:text-red-300 hover:bg-red-500/10`.

## Badges and Pills

Badges are translucent, bordered, and compact.

Partnership badges:

```tsx
<span className="text-xs px-2 py-1 rounded-full bg-[#93d832]/10 text-[#93d832] border border-[#93d832]/20">
  Physical
</span>

<span className="text-xs px-2 py-1 rounded-full bg-[#6766c4]/10 text-[#6766c4] border border-[#6766c4]/20">
  Digital
</span>

<span className="text-xs px-2 py-1 rounded-full bg-[#67b9c1]/10 text-[#67b9c1] border border-[#67b9c1]/20">
  Phygital
</span>
```

Verified badge:

```tsx
className =
	"absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-[#93d832]/90 text-[#080E04] font-semibold";
```

Pending count:

```tsx
className =
	"flex items-center gap-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded-full";
```

## Forms and Inputs

Inputs should sit quietly inside glass cards:

```tsx
className =
	"bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-primary/20";
```

Farmer form focus:

```tsx
className =
	"bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus:border-[#a37241]/50 focus:ring-[#a37241]/20";
```

Labels:

```tsx
className = "text-white/80";
```

Select dropdowns:

```tsx
<SelectContent className="bg-[#1a1f3a] border-white/10 text-white" />
<SelectItem className="focus:bg-[#a37241]/20 focus:text-white cursor-pointer" />
```

Form composition:

- Center auth forms in `max-w-md`.
- Wrap forms in `GlassCard` with `p-8`.
- Add a small role icon well above the title: `w-12 h-12 rounded-xl bg-primary/20 text-primary`.
- Add a short accent divider under auth titles: `h-1 w-20 bg-primary rounded-full`.

## Layout Patterns

### Auth Pages

```tsx
<div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0e27]">
	<div className="absolute inset-0 bg-gradient-to-br from-[#0a0e27] to-[#1a1f3a]" />
	<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
	<div className="relative z-10 w-full max-w-md">...</div>
</div>
```

### Dashboard Shell

```tsx
<div className="min-h-screen bg-[#0a0e27] text-white flex">
	<aside className="w-64 border-r border-white/5 bg-black/20 backdrop-blur-xl hidden md:flex flex-col" />
	<main className="flex-1 p-8 overflow-y-auto" />
</div>
```

Sidebar details:

- Logo area: `p-6 border-b border-white/5`
- Nav list: `p-4 space-y-2`
- Footer/logout: `p-4 border-t border-white/5`

### Content Grids

- Stats: `grid grid-cols-1 md:grid-cols-3 gap-4` or `gap-6`
- Farm cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Form sections: usually `space-y-6`
- Page max width: `max-w-4xl`, `max-w-6xl`, or `max-w-7xl mx-auto`

## Icons

The app uses Lucide icons. Icons are functional rather than decorative:

- Investor/player: `TrendingUp`, `BarChart3`, `Sprout`
- Farmer: `Tractor`, `Sprout`, `CloudRain`, `Thermometer`, `Droplets`
- Admin: `Users`, `Package`, `BookOpen`, `Settings`
- Navigation/actions: `ArrowRight`, `ArrowLeft`, `LogOut`, `Plus`
- Trust/quality: `ShieldCheck`, `Award`, `Star`

Icon sizing:

- Inline button icons: `w-4 h-4`
- Card/stat icons: `w-5 h-5` to `w-8 h-8`
- Feature/empty state icons: `w-10 h-10`
- Hero selection card icons: `w-8 h-8` inside `w-16 h-16 rounded-2xl`

## Motion and Interaction

Motion is subtle and premium:

- Cards enter with `opacity: 0 -> 1` and `y: 20 -> 0`.
- Auth cards scale from `0.95 -> 1`.
- Hero ambient blobs animate slowly over `20s` to `30s`.
- Image cards scale on hover: `group-hover:scale-105 duration-500`.
- Icon wells can scale on group hover: `group-hover:scale-110 duration-300`.
- Hover glows should be low opacity and color-matched to the active role.

Avoid bouncy or playful animation. Use `easeOut` for entrances and `easeInOut` for ambient loops.

## Tailwind Theme Starter

Use this as a portable base for another Tailwind project:

```ts
theme: {
  extend: {
    borderRadius: {
      lg: ".5625rem",
      md: ".375rem",
      sm: ".1875rem",
    },
    colors: {
      background: "hsl(var(--background) / <alpha-value>)",
      foreground: "hsl(var(--foreground) / <alpha-value>)",
      primary: {
        DEFAULT: "hsl(var(--primary) / <alpha-value>)",
        foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
      },
      secondary: {
        DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
        foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
      },
      muted: {
        DEFAULT: "hsl(var(--muted) / <alpha-value>)",
        foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
      },
      border: "hsl(var(--border) / <alpha-value>)",
      input: "hsl(var(--input) / <alpha-value>)",
      ring: "hsl(var(--ring) / <alpha-value>)",
    },
    fontFamily: {
      sans: ["Inter", "sans-serif"],
      heading: ["Space Grotesk", "sans-serif"],
    },
  },
}
```

```css
:root {
	--background: 231 38% 16%;
	--foreground: 0 0% 100%;
	--primary: 85 68% 52%;
	--primary-foreground: 231 38% 16%;
	--secondary: 185 41% 58%;
	--secondary-foreground: 231 38% 16%;
	--muted: 229 38% 25%;
	--muted-foreground: 215 16% 70%;
	--border: 229 38% 25%;
	--input: 229 38% 25%;
	--ring: 85 68% 52%;
	--farmer-primary: 30 43% 45%;
	--farmer-dark: 28 52% 24%;
}
```

## Do and Do Not

Do:

- Use dark navy/black as the canvas.
- Use translucent cards and borders instead of opaque panels.
- Let green mean investor growth/action and brown mean farmer/agriculture/action.
- Keep secondary text muted and metadata compact.
- Use real farm imagery in cards where possible.
- Use role-colored focus states and CTAs.

Do not:

- Replace the dark system with a light SaaS palette.
- Overuse saturated colors; keep bright colors reserved for actions, badges, and important values.
- Use large opaque white cards.
- Use heavy borders; prefer `white/5`, `white/10`, or role color at `/20`.
- Make every button a gradient; reserve gradients for auth, hero, and high-emphasis actions.
- Add playful animations that weaken the premium fintech feel.
