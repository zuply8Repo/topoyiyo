# Content To Social UI Design Guidelines

## Product Context

`content_to_social_ui` is the frontend for YiyoStudio. The app helps users create, review, approve, and manage AI-generated social content across flows like:

- prompt generation
- studio-v2 video generation
- image exploration
- review and approval
- onboarding
- billing and account management

Design work should support a fast, calm, premium SaaS workflow for creators and internal operators. The UI should feel efficient and polished, not playful or over-decorated.

## UI Stack

- Next.js App Router
- React
- Material UI (`@mui/material`) as the main component system
- MUI `sx` prop as the default styling surface
- Geist as the main application font
- Clerk for authentication UI

Do not introduce a second competing design system.

## Visual Direction

- Clean modern SaaS UI
- Editorial but restrained
- Rounded surfaces and pill actions
- Soft borders over heavy shadows
- Strong hierarchy through spacing and typography
- Subtle blur and translucency only where the product already uses it

The onboarding flow intentionally uses a darker, higher-contrast treatment. The rest of the app is primarily light.

## Core Tokens To Preserve

Use the theme before introducing new values.

- Primary: dark neutral ink around `#111827`
- Secondary accent: blue around `#2563EB`
- App background: light slate around `#F8FAFC`
- Paper surfaces: white
- Global shape language: rounded, with major surfaces around 14px radius
- Navigation and action pills: fully rounded when already established

## Component Rules

### Spacing

- Prefer consistent spacing steps
- Reuse existing `sx` spacing patterns before inventing new ones
- Avoid dense layouts unless the feature already requires it

### Typography

- Keep headings bold and compact
- Use body text for support copy, not oversized paragraphs
- Avoid introducing many one-off font sizes

### Buttons

- Preserve existing pill buttons for top-level actions and toggles
- Keep labels sentence case
- Prefer strong primary vs quiet secondary hierarchy

### Cards And Panels

- Prefer subtle borders and clean separation
- Use shadow sparingly
- Keep internal padding generous enough for scanning

### Inputs

- Inputs should remain compact, clear, and easy to scan
- Focus states should be obvious but not loud
- Helper text and error states must stay readable

## State Coverage

Every reusable UI component should be designable in isolation with as many of these states as make sense:

- default
- hover
- focus
- selected
- loading
- empty
- error
- success
- disabled

If a component cannot be previewed in these states without real backend data, add fixtures or examples first.

## UI Isolation Workflow

When working on design:

1. Start in the playground route, not inside a production page.
2. Use mock props, fake content, and demo states.
3. Keep visual experimentation inside isolated wrappers or examples.
4. Only move changes into production usage after the UI is stable.

Recommended file roles:

- `components/_fixtures/`: fake props and mock content
- `components/_examples/`: named visual states
- `components/_playground/`: isolated playground wrappers
- `app/(dev)/ui-playground/page.tsx`: main visual testing route

## Restrictions

- Do not mix UI cleanup with backend, auth, or data-fetching rewrites
- Do not redesign the app into a new aesthetic unless explicitly requested
- Do not replace MUI with another component framework
- Do not depend on live APIs just to preview a component state
- Do not hide missing states behind production-only logic

## Preferred Agent Behavior

When an agent is asked to improve design in `content_to_social_ui`:

1. Read these guidelines first.
2. Prefer isolated component changes over large page rewrites.
3. Add or update fixtures/examples when a component state is hard to preview.
4. Reuse the existing palette, radius, spacing, and typography patterns.
5. Keep design changes scoped unless the user explicitly asks for broader refactoring.
