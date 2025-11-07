# Agent Guidelines

## Commands
- Build: `pnpm build`
- Lint: `pnpm lint` (Biome)
- Format: `pnpm format` (Biome)
- Test: `pnpm test` (Vitest)
- Dev: `pnpm dev` (Vite dev server on port 3000)
- Single test: `pnpm test <filename>` (e.g., `pnpm test Button.test.tsx`)

## Code Style
- Use Biome for formatting and linting
- Indent with tabs
- Double quotes for strings
- Import organization: auto-organize with Biome
- Path aliases: `@/*` maps to `./src/*`
- TypeScript strict mode enabled
- No unused locals/parameters

## Convex Schema Rules
- Use `v` validator builder from Convex
- System fields: `_id`, `_creationTime` (auto-generated)
- Define tables with `defineTable()` and proper validators
- Add indexes with `.index()` method
- Validators: `v.string()`, `v.number()`, `v.boolean()`, `v.id("tableName")`, `v.optional()`, `v.union()`, `v.object()`, `v.array()`
- Example schema patterns in .cursorrules - follow the structure with proper relationships and indexes

## Component Guidelines
- Use shadcn components: `pnpx shadcn@latest add <component>`
- Utility function: `cn()` for class merging (clsx + tailwind-merge)
- Follow existing component patterns in src/components/