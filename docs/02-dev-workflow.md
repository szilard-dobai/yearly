# Development Workflow & Quality Automation

This document explains the slash commands, hooks, and quality checks set up for this project.

## Package.json Scripts

### Quality Check Scripts

- **`npm run lint`** - Run ESLint to check for code quality issues
- **`npm run lint:fix`** - Auto-fix ESLint issues
- **`npm run type-check`** - Run TypeScript compiler to check for type errors
- **`npm run test`** - Run Vitest test suite once
- **`npm run test:watch`** - Run Vitest in watch mode
- **`npm run test:coverage`** - Run tests with coverage report
- **`npm run format`** - Format code with Prettier
- **`npm run check`** - Quick checks (lint + type-check)
- **`npm run check:full`** - Full validation (lint + type-check + test + build)

### Standard Scripts

- **`npm run dev`** - Start development server
- **`npm run build`** - Build for production
- **`npm run start`** - Start production server

## Slash Commands

Slash commands are shortcuts that trigger specific workflows when working with Claude Code.

### `/check`

**Purpose**: Run quick quality checks before committing code

**What it does**:

- Runs ESLint
- Runs TypeScript type checking

**When to use**: Before committing changes or when you want a quick validation

**Example**:

```
/check
```

---

### `/review`

**Purpose**: Comprehensive code review

**What it does**:

- Checks TypeScript type safety
- Reviews React best practices
- Checks accessibility (a11y)
- Looks for security issues
- Reviews code quality and performance

**When to use**: After implementing a feature or making significant changes

**Example**:

```
/review
```

---

### `/test`

**Purpose**: Run tests in watch mode

**What it does**:

- Starts Vitest in watch mode for interactive testing

**When to use**: During development when writing or debugging tests

**Example**:

```
/test
```

---

### `/fix`

**Purpose**: Auto-fix code quality issues

**What it does**:

- Runs ESLint with auto-fix
- Runs Prettier to format code

**When to use**: When you have linting or formatting issues to fix quickly

**Example**:

```
/fix
```

---

### `/build`

**Purpose**: Verify production build

**What it does**:

- Runs `npm run build` to create a production build
- Catches build-time errors

**When to use**: Before deploying or when you want to ensure the app builds correctly

**Example**:

```
/build
```

---

### `/type-check`

**Purpose**: Run TypeScript type checking only

**What it does**:

- Runs `tsc --noEmit` to check types without building

**When to use**: When you want to focus on type errors specifically

**Example**:

```
/type-check
```

## Hooks

Hooks automatically run commands at specific points in the development workflow.

### Post-Edit Hook

**Trigger**: After editing files
**Command**: `npm run lint:fix`
**Purpose**: Auto-fix linting and formatting issues immediately after edits
**Timeout**: 30 seconds

This ensures code stays consistently formatted and catches simple issues early.

---

### Pre-Commit Hook

**Trigger**: Before git commits
**Command**: `npm run check`
**Purpose**: Prevent committing code with lint or type errors
**Timeout**: 60 seconds

This acts as a safety net to ensure quality standards before changes are committed.

---

### Post-Write Hook

**Trigger**: After creating new files
**Command**: `npm run lint:fix`
**Purpose**: Format new files according to project standards
**Timeout**: 30 seconds

This ensures new files follow the same formatting conventions from the start.

## Workflow Recommendations

### 1. During Development

```
1. Make changes to code
2. Post-edit hook auto-fixes formatting
3. Use /check periodically to validate
```

### 2. After Implementing a Feature

```
1. Run /test to verify tests pass
2. Run /review for comprehensive code review
3. Fix any issues found
4. Run /check to validate
```

### 3. Before Committing

```
1. Run /check:full (or npm run check:full) to run all checks
2. Pre-commit hook will run automatically
3. Commit if all checks pass
```

### 4. Before Deploying

```
1. Run /build to ensure production build works
2. Run npm run test:coverage to check test coverage
3. Deploy with confidence
```

## Configuration

### Hook Configuration

Hooks are configured in `.claude/config.json`:

```json
{
  "hooks": {
    "post_edit": { ... },
    "pre_commit": { ... },
    "post_write": { ... }
  }
}
```

### Disabling Hooks

To temporarily disable a hook, set `"enabled": false` in the config:

```json
{
  "hooks": {
    "post_edit": {
      "enabled": false,
      ...
    }
  }
}
```

## Troubleshooting

### Hooks Not Running

1. Check that `.claude/config.json` exists
2. Verify hook `"enabled"` is set to `true`
3. Check that the command is valid (e.g., `npm run lint:fix` works in terminal)

### Slow Performance

If hooks are slowing down your workflow:

1. Increase timeout values
2. Disable resource-intensive hooks temporarily
3. Use lighter commands (e.g., `npm run lint` instead of `npm run check:full`)

### False Positives

If hooks are reporting errors incorrectly:

1. Run the command manually to verify: `npm run [command]`
2. Fix configuration issues in eslint or tsconfig
3. Adjust hook commands if needed

## Best Practices

1. **Use `/check` frequently** during development to catch issues early
2. **Run `/review`** after completing features for comprehensive feedback
3. **Let hooks do their job** - they catch common mistakes automatically
4. **Run `/build`** before creating pull requests
5. **Use `/fix`** to quickly resolve formatting issues
6. **Keep dependencies updated** to get latest fixes and improvements

## Next Steps

When setting up CI/CD, mirror these checks in your pipeline:

```yaml
# Example GitHub Actions workflow
- run: npm run lint
- run: npm run type-check
- run: npm run test
- run: npm run build
```

This ensures the same quality standards apply locally and in CI/CD.
