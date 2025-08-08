# Simple Coder

Simple Coder is a terminal-based coding assistant. It is intentionally minimal and unoptimized as its purpose is to serve as a learning resource demonstrating how equipping a model that is good at tool use with a decent-ish prompt & a set of tools can enable "agentic" behavior. As such, it is not published anywhere nor is it recommended for production use.

## What It Does

- Chat in your terminal; the assistant can inspect and change files in the current project.
- Uses the AI SDK (`ai`) with OpenAI (`@ai-sdk/openai`) and a simple system prompt.
- Streams tokens smoothly and prints structured tool-call/results to the console.

## Tools Exposed to the AI

- editFile: Applies line-based edits and returns a unified diff, lines changed, and totals.
- executeCommand: Executes a command in the terminal.
- listFiles: Lists files/folders in a directory with basic metadata. Ideal for discovery.
- readFile: Reads a file as lines (with optional line range), preserving EOL info.

All tools resolve paths relative to `process.cwd()` — i.e., whatever directory you run the CLI from.

## Local Setup

```bash
# Using pnpm (recommended)
pnpm install
```

Set your OpenAI API key using either method:

**Option A: Environment variable (recommended for CLI usage)**
```bash
export OPENAI_API_KEY=sk-...
```

**Option B: .env file (convenient for development)**
```bash
echo "OPENAI_API_KEY=sk-..." > .env
```

By default the app uses OpenAI's `gpt-5` model via the AI SDK. You can tweak the model/provider in `src/index.ts` / `src/providers.ts` if desired.

## Usage as a Local CLI

This package ships a CLI named `scoder`. Two ways to use it anywhere on your machine without publishing:

1) Global link (best for development)

```bash
# In this repo
pnpm build
pnpm link -g

# Now, from any other project directory
cd /path/to/another/project
OPENAI_API_KEY=sk-... scoder
# Or export it for the session:
# export OPENAI_API_KEY=sk-...
# scoder
```

2) Global install from a local tarball

```bash
# In this repo
pnpm build
pnpm pack   # creates something like bim-bimfyi-simple-coder-1.0.0.tgz
pnpm add -g ./bim-bimfyi-simple-coder-*.tgz

# Use it anywhere
cd /path/to/another/project
OPENAI_API_KEY=sk-... scoder
# Or export it for the session:
# export OPENAI_API_KEY=sk-...
# scoder
```

### Tips

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

## Testing

```bash
pnpm test         # run tests with Vitest
pnpm test:ui      # run tests with UI
pnpm test:coverage # run tests with coverage report
```

## Other Scripts

- `pnpm lint`: Lint and auto-fix code issues
- `pnpm format`: Format code with Biome
- `pnpm check`: Run all checks without auto-fixing
- `pnpm typecheck`: Run TypeScript type checking

## License

MIT — see [LICENSE](LICENSE).
