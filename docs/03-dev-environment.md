# Development Environment Configuration

This document summarizes the development environment setup for the countries-in-year project.

## Installed Dependencies

### Testing Framework

- **vitest** (v4.0.8) - Fast unit test framework
- **@vitest/ui** - Visual UI for test results
- **@vitejs/plugin-react** - React support for Vitest
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Custom DOM matchers
- **@testing-library/user-event** - User interaction simulation
- **jsdom** - DOM implementation for Node.js

### Code Quality

- **prettier** - Code formatter
- **eslint-config-prettier** - Disable ESLint rules that conflict with Prettier
- **eslint-plugin-prettier** - Run Prettier as an ESLint rule

### Project Dependencies (To be installed when needed)

- **dayjs** - Lightweight date manipulation library (2KB, pending)
- **html-to-image** - JPEG export functionality (pending)

## Configuration Files Created

### 1. Vitest Configuration

**File**: `vitest.config.ts`

Features:

- React plugin enabled
- jsdom environment for browser APIs
- Global test utilities
- Test setup file integration
- Code coverage with v8
- Path alias support (`@/` → root)

### 2. Prettier Configuration

**Files**:

- `.prettierrc.json` - Formatter rules
- `.prettierignore` - Ignored paths

Settings:

- No semicolons
- Single quotes for strings
- 2-space indentation
- 80 character line width
- Trailing commas (ES5)
- LF line endings

### 3. Test Setup

**File**: `test/setup.ts`

Provides:

- Auto cleanup after each test
- `window.matchMedia` mock for responsive tests
- localStorage mock for storage tests
- @testing-library/jest-dom matchers

### 4. Example Test

**File**: `test/example.test.ts`

Simple test to verify setup works correctly.

## NPM Scripts Available

### Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
```

### Testing

```bash
npm run test              # Run tests once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

### Code Quality

```bash
npm run lint              # Check code quality
npm run lint:fix          # Auto-fix issues
npm run type-check        # TypeScript checking
npm run format            # Format with Prettier
```

### Combined Checks

```bash
npm run check             # Quick: lint + type-check
npm run check:full        # Full: lint + type-check + test + build
```

## Slash Commands

Available in Claude Code:

- `/check` - Quick quality checks
- `/review` - Comprehensive code review
- `/test` - Run tests in watch mode
- `/fix` - Auto-fix linting/formatting
- `/build` - Verify production build
- `/type-check` - TypeScript type checking

## Hooks Configuration

**File**: `.claude/config.json`

Active hooks:

- **post_edit** - Auto-fixes formatting after edits
- **pre_commit** - Validates before commits
- **post_write** - Formats new files

## Verification Results

All systems verified and working:

### Tests Pass

```
Test Files  1 passed (1)
Tests       3 passed (3)
Duration    628ms
```

### Type Checking Works

```
tsc --noEmit
(No errors)
```

### Build System Ready

Next.js 16 with App Router configured and ready.

## Project Structure

```
countries-in-year/
├── .claude/
│   ├── agents/              # Custom AI subagents
│   ├── commands/            # Slash commands
│   └── config.json          # Hook configuration
├── app/
│   ├── components/          # (to be created)
│   ├── lib/                 # (to be created)
│   ├── layout.tsx
│   └── page.tsx
├── docs/
│   ├── 01-initial-plan.md
│   ├── 02-dev-workflow.md
│   └── 03-dev-environment.md (this file)
├── test/
│   ├── setup.ts
│   └── example.test.ts
├── .prettierrc.json
├── .prettierignore
├── vitest.config.ts
├── package.json
└── tsconfig.json
```

## Next Steps

Now that the development environment is ready, we can proceed with:

1. **Install project dependencies** (dayjs, html-to-image) when needed
2. **Set up project structure** (app/components, app/lib directories)
3. **Begin Phase 1**: TypeScript types, country data, and basic layout
4. **Implement features** following the plan in `01-initial-plan.md`

## Testing the Setup

To verify everything works:

```bash
# 1. Run tests
npm test

# 2. Check types
npm run type-check

# 3. Try slash commands
/check

# 4. Format code
npm run format
```

All systems are ready for development.
