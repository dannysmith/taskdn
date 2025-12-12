# @taskdn/sdk

TypeScript SDK providing NAPI-RS bindings to the Taskdn Rust library for Node.js and Bun environments.

## Installation

```bash
bun add @taskdn/sdk
# or
npm install @taskdn/sdk
```

## Usage

```typescript
import { Taskdn } from '@taskdn/sdk';

const sdk = new Taskdn('./tasks', './projects', './areas');
console.log(sdk.tasksDir); // './tasks'
```

## Development

```bash
# Install dependencies
bun install

# Debug build (faster, current platform only)
bun run build:debug

# Release build (optimized)
bun run build

# Run tests
bun test
```

## Architecture

This is a thin wrapper around the Rust SDK (`taskdn-rust`). All business logic lives in Rust - this package only handles type conversion and exposes the API to JavaScript.

See `CLAUDE.md` for development instructions.
