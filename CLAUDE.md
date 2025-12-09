# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application using the App Router architecture, React 19, TypeScript, and Tailwind CSS v4. The project name is "countries-in-year" and was bootstrapped with `create-next-app`.

## Development Commands

- **Development server**: `npm run dev` - Starts the Next.js development server at http://localhost:3000
- **Build**: `npm run build` - Creates production build
- **Production server**: `npm run start` - Runs production server
- **Lint**: `npm run lint` - Runs ESLint with Next.js configuration

## Tech Stack

- **Framework**: Next.js 16.0.1 with App Router
- **React**: 19.2.0
- **TypeScript**: v5 with strict mode enabled
- **Styling**: Tailwind CSS v4 with PostCSS
- **Fonts**: Geist Sans and Geist Mono (loaded via next/font/google)

## Project Structure

```
/app                    - Next.js App Router directory
  /page.tsx            - Home page component
  /layout.tsx          - Root layout with font configuration
  /globals.css         - Global styles with Tailwind imports
/public                - Static assets (SVG files)
/next.config.ts        - Next.js configuration
/tsconfig.json         - TypeScript configuration
/eslint.config.mjs     - ESLint configuration (flat config format)
/postcss.config.mjs    - PostCSS configuration for Tailwind
```

## TypeScript Configuration

- **Target**: ES2017
- **Module**: ESNext with bundler resolution
- **JSX**: react-jsx
- **Path alias**: `@/*` maps to root directory
- **Strict mode**: Enabled
- **Compiler**: Includes Next.js plugin for enhanced type checking

## Styling Approach

- Uses Tailwind CSS v4 with the new `@import "tailwindcss"` syntax
- CSS variables for theming (`--background`, `--foreground`)
- Dark mode support via `prefers-color-scheme` media query
- Tailwind theme customization using `@theme inline` directive
- Font variables: `--font-geist-sans` and `--font-geist-mono`
- Do not place any comments unless absolutely necessary to clarify what is going on

## Code Conventions

- **Components**: Use TypeScript with .tsx extension
- **Styling**: Utility-first with Tailwind CSS classes
- **Layout patterns**: App Router uses nested layouts
- **Metadata**: Export `metadata` object from layout.tsx for SEO
- **Fonts**: Loaded and configured in root layout as CSS variables
