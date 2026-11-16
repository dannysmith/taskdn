# Logging

Simple logging setup for both Rust backend and TypeScript frontend.

## Quick Start

### Rust (Backend)

```rust
log::info!("Application starting up");
log::debug!("Debug info: {}", some_value);
log::warn!("Something unexpected happened");
log::error!("Error occurred: {}", error);
```

### TypeScript (Frontend)

```typescript
import { logger } from '@/lib/logger'

logger.info('User action completed')
logger.debug('Debug data', { userId: 123, action: 'click' })
logger.warn('Performance warning')
logger.error('Request failed', { error: response.error })
```

## Configuration

### Rust Backend

- Uses `tauri-plugin-log` with the standard Rust `log` crate, configured in `configure_log_plugin()` in `src-tauri/src/lib.rs`
- **Development**: Debug level. **Release**: Info level. `tao` and `wry` are held at info in both, because they log every focus change below that
- Every build writes to stdout, the webview console and the log file
- A panic hook (`log_panics()`) logs any Rust panic as an error, with its file and line, before the process dies. Release builds abort on panic and are stripped, so there's no backtrace

### TypeScript Frontend

- **Development**: logs go to the browser console. Dev builds copy `console.*` into the log file, marked `[console]` (`src/lib/agent-bridge/console.ts`), so `bun run app logs` can read them
- **Release**: logs go to the log file through `@tauri-apps/plugin-log`, with any context appended as JSON
- Logger utility at `src/lib/logger.ts`

## Log Levels

| Level   | When to Use            | Dev | Release |
| ------- | ---------------------- | --- | ------- |
| `trace` | Most verbose debugging | ❌  | ❌      |
| `debug` | Development debugging  | ✅  | ❌      |
| `info`  | General information    | ✅  | ✅      |
| `warn`  | Warning conditions     | ✅  | ✅      |
| `error` | Error conditions       | ✅  | ✅      |

## Where Logs Appear

The log file is `<product name>.log` in the app's log folder:

- **macOS:** `~/Library/Logs/is.danny.taskdn-desktop/Taskdn Desktop.log`
- **Windows:** `%LOCALAPPDATA%\is.danny.taskdn-desktop\logs\`
- **Linux:** `~/.local/share/is.danny.taskdn-desktop/logs/`

Dev builds log to their own folder (`is.danny.taskdn-desktop.dev`, or `.dev<n>` for a worktree's slot) as `Taskdn Dev.log`. See [Agent Tooling](./agent-tooling.md#logs).

When the file reaches 5 MB it's renamed with its date and a new one starts; the two most recent old files are kept. The plugin's default (`KeepOne`) deletes the whole file instead, which left the release log nearly empty whenever someone went looking.

## Examples

### Rust Tauri Commands

```rust
#[tauri::command]
async fn save_data(data: MyData) -> Result<(), String> {
    log::info!("Saving data for user: {}", data.user_id);

    match save_to_disk(&data).await {
        Ok(_) => {
            log::info!("Data saved successfully");
            Ok(())
        }
        Err(e) => {
            log::error!("Failed to save data: {}", e);
            Err(format!("Save failed: {}", e))
        }
    }
}
```

### TypeScript React Components

```typescript
import { logger } from '@/lib/logger'

function MyComponent() {
  const handleClick = () => {
    logger.debug('Button clicked', { component: 'MyComponent' })

    try {
      performAction()
      logger.info('Action completed successfully')
    } catch (error) {
      logger.error('Action failed', { error })
    }
  }

  return <button onClick={handleClick}>Click me</button>
}
```

## Best Practices

1. **Use appropriate log levels** - Don't log everything as `info`
2. **Include context** - Add relevant data to help debugging
3. **Log errors with details** - Include error messages and context
4. **Keep messages concise** - But descriptive enough to be useful
5. **Use structured logging** - Include objects/context for complex data

See [error-handling.md](./error-handling.md) for patterns on when to log vs show errors to users.

## Production Considerations

- No sensitive data should be logged (passwords, tokens, etc.): release logs are what users send when reporting a problem
