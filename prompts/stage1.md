# Redesign my existing personal website as a desktop operating system

Transform the existing personal website into a polished, interactive **desktop operating system-style portfolio for a software engineer**.

This is a redesign of an existing website, not a request to build an unrelated site from scratch.

## First: inspect the existing project

Before modifying anything:

1. Inspect the existing project structure.
2. Identify the framework, routing system, styling approach, component structure, and dependencies.
3. Identify every existing page/route and its current functionality.
4. Identify existing content, projects, experience, links, resume, social links, and other personal information.
5. Reuse existing content and functionality wherever possible.
6. Do not remove working functionality simply because it doesn't fit the new visual design.
7. Do not invent personal information, companies, projects, metrics, job titles, dates, or links.
8. If the existing site already has good content, preserve it and redesign its presentation.

Then implement the redesign described below.

---

# Core concept

The website should feel like a **personal operating system**.

The visitor is effectively interacting with my computer.

Instead of a conventional portfolio where the page consists of:

- About
- Projects
- Experience
- Blog
- Contact

those sections should feel like applications/files inside an OS.

For example:

- Home → Desktop
- About → About application / `about.txt`
- Projects → Projects folder / file browser
- Experience → `experience.log`
- Resume → `resume.pdf`
- Blog → Blog application
- Contact → Terminal command / contact application
- Skills → `stack.json` or system information
- External links → applications / shortcuts

The OS concept should be immediately recognizable but still feel like a **real, premium personal website**, not a gimmicky fake terminal.

The design should communicate:

**software engineer + systems thinking + personality + craftsmanship**

---

# Visual direction

Use a modern dark desktop UI inspired by:

- macOS
- Linux desktops
- modern code editors
- terminal interfaces
- developer tools
- minimal system dashboards

Do NOT copy any specific operating system's UI exactly.

Create an original visual language.

The interface should feel:

- sophisticated
- technical
- minimal
- slightly playful
- highly intentional
- fast
- polished

Avoid making it look like a generic "hacker" website.

Avoid:

- Matrix rain
- excessive glowing text
- cyberpunk aesthetics
- excessive neon
- fake 3D effects
- excessive gradients
- particle backgrounds
- unnecessary animations
- giant terminal windows everywhere
- fake command output that dominates the content

---

# Color system

Use this exact base palette.

## Background

Primary desktop background:

`#080B0F`

Secondary background:

`#0D1116`

Window surface:

`#11161A`

Elevated surface:

`#151A1F`

Border:

`#232A31`

Strong border:

`#303841`

## Text

Primary:

`#E6E6E6`

Secondary:

`#A1A7AE`

Muted:

`#6B7280`

Disabled:

`#4B5259`

## Accent colors

Primary green:

`#A3E635`

Use this as the main identity color.

Use green for:

- active navigation
- terminal prompt
- selected items
- important metadata
- small highlights
- success states
- active window indicators
- subtle hover states

Secondary blue:

`#60A5FA`

Use blue sparingly for:

- links
- secondary actions
- external links
- informational states

Secondary purple:

`#C084FC`

Use purple very sparingly for:

- special projects
- blog/content
- secondary visual categorization

Do not make the entire website green/purple/blue.

Approximately 85–90% of the interface should remain neutral dark gray/black.

---

# Typography

Use:

### Primary UI / headings

**Geist**

### Body

**Inter**

### Monospace

**Geist Mono**

If the existing project already has a high-quality equivalent font system, use it only if replacing the fonts would create unnecessary complexity. Otherwise install/use the fonts above.

Typography hierarchy:

- Hero/display: Geist, 48–64px, weight 600–700
- Section titles: 24–32px, weight 600
- Window titles: 13–14px
- Body: Inter, 15–17px
- Secondary text: 13–14px
- Terminal/code: Geist Mono, 13–14px
- Tiny system metadata: Geist Mono, 11–12px

Use tight letter spacing on large headings.

Do not use enormous typography that overwhelms the desktop metaphor.

---

# Desktop layout

The homepage should visually resemble a desktop.

Structure:

```text
┌───────────────────────────────────────────────────────┐
│ terenceOS     File   Edit   View   Window   Help   ◉ │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Sidebar                                               │
│  ┌──────┐                                  Projects    │
│  │ Home │                              ┌────────────┐  │
│  │ About│                              │            │  │
│  │      │        ┌─────────────────┐   │   folder   │  │
│  │ Proj │        │                 │   │            │  │
│  │ Exp  │        │    Terminal     │   └────────────┘  │
│  │ Blog │        │                 │                    │
│  │      │        └─────────────────┘                    │
│  └──────┘                                               │
│                                                       │
├───────────────────────────────────────────────────────┤
│                     Terminal  ● ●                      │
└───────────────────────────────────────────────────────┘
```

The exact layout can differ depending on the existing website, but preserve these concepts:

1. OS/system bar
2. Desktop workspace
3. App/file shortcuts
4. Windows
5. Dock/taskbar
6. Persistent navigation

---

# Top system bar

Create a thin system-style bar across the top.

Left:

`terenceOS`

Then:

`File   Edit   View   Window   Help`

Right:

- small status indicators
- optional Wi-Fi/system icons
- current time

Do not overpopulate the bar.

The OS name should function as the website's branding.

Use:

`terenceOS`

or derive the user's existing name/brand if the current website already has one.

The system bar should remain subtle.

---

# Sidebar / application launcher

Create a vertical navigation area or dock containing:

- Home
- About
- Projects
- Experience
- Blog
- Contact

Each item should have a simple line icon.

Suggested icons:

Home → house
About → user
Projects → folder
Experience → briefcase
Blog → document
Contact → mail/terminal

Use a consistent icon set already present in the project if possible.

Do not use emoji as interface icons.

Active item:

- green icon
- subtle green background
- brighter text

Inactive:

- muted gray
- subtle hover state

---

# Desktop shortcuts

Place a few file/application shortcuts on the desktop.

Examples:

```text
📁 projects
📄 resume.pdf
📄 about.txt
🖥 terminal
```

Do not literally use emoji.

Use proper SVG/icon components.

Clicking a shortcut should open the corresponding application/window.

---

# Window system

The central design primitive should be a reusable **Window component**.

Every major content area should be capable of appearing as a window.

A window should contain:

```text
┌─────────────────────────────────────────────┐
│ ● ● ●     projects                    ↗    │
├─────────────────────────────────────────────┤
│                                             │
│                 content                     │
│                                             │
└─────────────────────────────────────────────┘
```

Window controls:

- close
- minimize
- maximize

Use three subtle circular controls.

Do not imitate macOS pixel-for-pixel.

Window title should identify the application:

- `terminal`
- `projects`
- `about`
- `experience`
- `contact`

Windows should have:

- `#11161A` background
- `#232A31` border
- 8px radius
- subtle shadow
- crisp 1px borders

Avoid excessive glassmorphism.

---

# Homepage / Terminal

The homepage should center around a terminal window.

Example interaction:

```text
terence@portfolio:~$ whoami

terence — software engineer

terence@portfolio:~$ cat about.txt

I build systems that are simple, useful, and reliable.

terence@portfolio:~$ ls

about/     projects/     experience/
blog/      contact/      resume.pdf

terence@portfolio:~$
```

The actual content should come from the existing website.

Do not fabricate information.

The terminal should be visually prominent but not consume the entire page.

---

# Terminal interaction

Implement lightweight terminal interactions if practical.

Commands could include:

```text
help
whoami
about
projects
experience
skills
blog
contact
resume
clear
```

Commands should navigate/open the corresponding application.

For example:

```text
$ projects
```

opens the Projects window.

```text
$ about
```

opens About.

```text
$ resume
```

opens the resume.

```text
$ clear
```

clears the visible terminal output.

The terminal does NOT need to implement a real shell.

Keep the implementation simple and reliable.

Typing should feel responsive.

Support:

- Enter
- Up/down command history
- clear
- autocomplete only if easy to implement

Do not spend excessive engineering effort recreating a real shell.

---

# Projects application

Projects should feel like opening:

```text
~/projects
```

Use a file-manager-inspired layout.

Each project is represented as a file/folder/application.

Example:

```text
~/projects

▣ project-one
  Full-stack application
  TypeScript · React · PostgreSQL

▣ project-two
  Distributed system
  Go · Redis · Docker

▣ project-three
  ...
```

Use the actual projects already present on the website.

Project cards should remain visually clean.

Each project should include:

- name
- short description
- technology stack
- relevant links
- GitHub link if available
- live demo if available

Hovering a project can subtly highlight it.

Clicking opens a detailed project window.

---

# About application

Present the existing About content as if the user opened:

```text
~/about/about.txt
```

Use a terminal/editor-inspired presentation, but maintain excellent readability.

Possible structure:

```text
about.txt

NAME
Terence

ROLE
Software Engineer

ABOUT
...

CURRENTLY
...

INTERESTS
...
```

Do not force all content into fake terminal syntax if that hurts readability.

The metaphor should support the content rather than replace it.

---

# Experience application

Present work experience as:

```text
~/experience/experience.log
```

Use a timeline/log style.

For example:

```text
2026-01 → PRESENT
Senior Software Engineer
Company

2023-01 → 2025-12
Software Engineer
Company
```

Use the existing experience data.

Keep this section easy to scan.

---

# Skills / system information

Present technical skills as if they were system information.

For example:

```text
$ system-info

LANGUAGES
TypeScript   Go   Python   Java

FRAMEWORKS
React       Next.js

INFRASTRUCTURE
AWS         Docker      Kubernetes

DATABASES
PostgreSQL  Redis
```

Use the actual skills from the existing website.

Avoid skill bars such as:

`React █████████░ 90%`

Do not use arbitrary proficiency percentages.

---

# Resume

Treat the resume as a file:

```text
resume.pdf
```

Clicking it should open the existing resume or existing resume link.

Use an appropriate document/file icon.

Do not fake a PDF viewer unless there is already one.

---

# Blog

If the existing website has a blog, present it as:

```text
~/blog
```

Each article should feel like opening a document.

Keep article content readable.

Do not force every article into terminal syntax.

---

# Contact

Make Contact feel like a small system utility.

For example:

```text
contact.json

{
  "email": "...",
  "github": "...",
  "linkedin": "..."
}
```

But render this as a polished UI rather than requiring the user to read raw JSON.

Provide obvious clickable actions.

---

# Dock / taskbar

Add a bottom dock/taskbar showing currently open applications.

For example:

```text
        [ terminal ] [ projects ] [ about ] [ contact ]
```

Open windows should have a subtle active indicator.

The dock should remain compact and unobtrusive.

---

# Interaction model

The site should feel like a lightweight OS.

Implement:

- opening windows
- closing windows
- minimizing windows
- maximizing windows where appropriate
- switching between windows
- active-window state
- navigation from sidebar
- navigation from desktop shortcuts
- navigation from terminal commands

However, prioritize usability.

The site should NEVER make users fight the interface to read the portfolio.

A normal navigation click should immediately get the user to the requested content.

---

# Responsive behavior

This is extremely important.

Do NOT try to reproduce a literal desktop OS on a small phone.

Desktop:

- multiple windows
- desktop shortcuts
- dock
- movable/resizable windows if practical

Mobile:

- treat each window as a full-screen application
- simplify the system bar
- use a bottom navigation/dock
- hide unnecessary desktop decorations
- no tiny draggable windows
- no horizontal overflow
- content remains easily readable

The OS metaphor should adapt rather than break.

---

# Animation

Use subtle animations only.

Good:

- window open: 120–180ms fade + slight scale
- window close: 100–150ms
- hover: 150ms
- dock active indicator
- subtle terminal cursor blink

Avoid:

- bouncing windows
- excessive spring animations
- parallax
- animated backgrounds
- constant glow
- particle effects

The website should feel fast.

---

# Background

Use a very subtle technical grid/noise texture if it improves the design.

Example:

- extremely low-opacity grid
- subtle vignette
- almost invisible texture

It should only become apparent when looking closely.

Do not use an obvious grid.

---

# Accessibility

Maintain or improve accessibility.

Ensure:

- keyboard navigation
- visible focus states
- semantic HTML
- proper button elements
- aria labels where necessary
- sufficient text contrast
- reduced-motion support

The terminal should not be the only way to navigate.

---

# Engineering requirements

Keep the implementation maintainable.

Create reusable components where appropriate:

- `Desktop`
- `SystemBar`
- `Sidebar`
- `Dock`
- `Window`
- `WindowControls`
- `DesktopShortcut`
- `Terminal`
- `FileManager`
- `ProjectWindow`
- `AboutWindow`
- `ExperienceWindow`

Do not duplicate window behavior across pages.

Create a centralized design-token system for:

- colors
- typography
- spacing
- borders
- radius
- shadows
- transitions

Avoid introducing unnecessary dependencies.

Reuse existing libraries already present in the project when reasonable.

---

# Most important design principle

The site should look like:

**"A software engineer designed their personal operating system."**

It should NOT look like:

**"A portfolio template with a terminal theme applied to it."**

The content must remain the hero.

The OS metaphor is the visual language used to organize that content.

After implementation, test every existing route and interaction and make sure nothing important from the existing site was lost.