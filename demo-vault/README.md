# Demo Vault

A sample Obsidian vault for manually testing and demoing Taskdn products. Contains realistic task data conforming to the [S1 Core spec](../tdn-specs/S1-core.md).

See [Project Overview](../docs/overview.md) for context on Taskdn.

## Structure

```
demo-vault/
├── areas/           # 10 area files
├── projects/        # 15 project files
├── tasks/           # 55 active task files
│   └── archive/     # 30 completed/dropped tasks
└── README.md
```

## Testing

Use `dummy-demo-vault/` for testing to avoid corrupting this data:

```bash
./scripts/reset-dummy-vault.sh
```
