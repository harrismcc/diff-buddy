# Agent Guidelines

## Commands
- Build: `pnpm build`
- Lint: `pnpm lint` (Biome)
- Format: `pnpm format` (Biome)
- Test: `pnpm test` (Vitest)
- Dev: `pnpm dev` (Vite dev server on port 3000)
- Single test: `pnpm test <filename>` (e.g., `pnpm test Button.test.tsx`)

**Important:** Never run any linting or formatting commands automatically. Only run typecheck or build commands if explicitly requested by the user.

## Code Style
- Use Biome for formatting and linting
- Indent with tabs
- Double quotes for strings
- Import organization: auto-organize with Biome
- Path aliases: `@/*` maps to `./src/*`
- TypeScript strict mode enabled
- No unused locals/parameters

## Component Guidelines
- Use shadcn components: `pnpx shadcn@latest add <component>`
- Utility function: `cn()` for class merging (clsx + tailwind-merge)
- Follow existing component patterns in src/components/
