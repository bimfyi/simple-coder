# Simple Coder

Simple Coder is a small, terminal-based coding assistant that demonstrates how AI “agents” can reason about and edit code locally. It streams responses, logs tool usage, and operates strictly relative to your current working directory.

It is intentionally minimal and intended for learning via a super basic example of how combining a prompt with a set of tools can be used to enable more "agentic" behavior — not production use.

## What It Does

- Chat in your terminal; the assistant can inspect and change files in the current project.
- Uses the AI SDK (`ai`) with OpenAI (`@ai-sdk/openai`) and a simple system prompt.
- Streams tokens smoothly and prints structured tool-call/results to the console.

## Tools Exposed to the AI

- listFiles: Lists files/folders in a directory with basic metadata. Ideal for discovery.
- readFile: Reads a file as lines (with optional line range), preserving EOL info.
- editFile: Applies line-based edits and returns a unified diff, lines changed, and totals.

All tools resolve paths relative to `process.cwd()` — i.e., whatever directory you run the CLI from.

## Local Setup

```bash
# Using pnpm (recommended)
pnpm install

# Optional: format/lint/typecheck
pnpm format && pnpm lint && pnpm typecheck
```

Create a `.env` either in this repo (for local dev) or in any target project you will run `scoder` from:

```bash
OPENAI_API_KEY=sk-...
```

By default the app uses OpenAI via the AI SDK. You can tweak the model/provider in `src/index.ts` / `src/providers.ts` if desired.

## Use As a Local CLI (No Publish)

This package ships a CLI named `scoder`. Two ways to use it anywhere on your machine without publishing:

1) Global link (best for development)

```bash
# In this repo
pnpm build
pnpm link -g

# Now, from any other project directory
cd /path/to/another/project
echo "OPENAI_API_KEY=sk-..." > .env
scoder
```

2) Global install from a local tarball

```bash
# In this repo
pnpm build
pnpm pack   # creates something like bim-bimfyi-simple-coder-1.0.0.tgz
pnpm add -g ./bim-bimfyi-simple-coder-*.tgz

# Use it anywhere
cd /path/to/another/project
echo "OPENAI_API_KEY=sk-..." > .env
scoder
```

Tips

- Ensure your global pnpm bin is on PATH: `echo $(pnpm bin -g)`.
- The assistant edits files relative to the directory you run it from.
- For quick personal use, you can also alias the built script:
  `alias scoder='node /absolute/path/to/simple-coder/dist/index.js'` (after `pnpm build`).

## Development

```bash
pnpm dev      # run with tsx watch
pnpm build    # type-check and emit to dist/
pnpm start    # run built app from dist/
```

## Scripts

- `pnpm dev`: Start development server with hot reload
- `pnpm build`: Compile TypeScript to JavaScript
- `pnpm start`: Run the compiled application
- `pnpm lint`: Lint and auto-fix code issues
- `pnpm format`: Format code with Biome
- `pnpm check`: Run all checks without auto-fixing
- `pnpm typecheck`: Run TypeScript type checking

## License

MIT — see [LICENSE](LICENSE).
