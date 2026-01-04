# Taskdn Starter Vault

A pre-configured [Obsidian](https://obsidian.md) vault for managing tasks, projects, and areas using the [Taskdn](https://tdn.danny.is) system. Clone this repo to get started with file-based task management.

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/dannysmith/obsidian-taskdn-starter-vault my-tasks
   cd my-tasks
   rm -rf .git README.md
   ```

2. **Open in Obsidian:**
   - Open Obsidian
   - Click "Open folder as vault"
   - Select the cloned folder
   - When prompted, click **Trust** to enable community plugins

3. **Enable required plugins:**
   - Go to **Settings → Core plugins**
   - Enable **Templates**
   - Enable **Bases** (if available in your Obsidian version)
   - Go to **Settings → Files and links**
   - Ensure **Wikilinks** is enabled

4. **Install the Taskdn plugin:**
   - Go to **Settings → Community plugins**
   - Click **Browse** and search for "Taskdn"
   - Install and enable the plugin
   - In plugin settings, set:
     - Tasks directory: `tasks`
     - Exclude patterns: `Overview.md`

## Vault Structure

```
├── areas/           # Life areas (ongoing responsibilities)
│   └── Overview.md  # Bases view of all areas
├── projects/        # Projects (have an end goal)
│   └── Overview.md  # Bases view of all projects
├── tasks/           # Individual tasks
│   ├── Overview.md  # Bases view of all tasks
│   └── archive/     # Completed/dropped tasks
├── templates/       # Templates for new items
│   └── bases/       # Obsidian Bases definitions
├── example-note.md  # Demo of plugin features
└── getting-started.md
```

## Creating New Items

1. Create a new file in the appropriate folder (`tasks/`, `projects/`, or `areas/`)
2. Open the command palette (Cmd/Ctrl + P)
3. Run "Insert template"
4. Select the appropriate template

### Available Templates

- **Task** - Basic task with status, dates, project/area links
- **Project** - Project with status, area link, overview sections
- **Area** - Life area with status and description
- **Trip Project** - Specialized project template for travel planning

## Optional: Folder Notes Plugin

If you use the [Folder Notes](https://github.com/LostPaul/obsidian-folder-notes) plugin, you can make the Overview pages appear when clicking folders:

1. Install Folder Notes from Community plugins
2. In plugin settings, set **Folder note name** to `Overview.md`
3. Now clicking `tasks/`, `projects/`, or `areas/` in the file explorer opens the Overview

## Learn More

- [Taskdn Documentation](https://tdn.danny.is) - Full documentation
- [CLI Guide](https://tdn.danny.is/cli/overview) - Command-line interface
- [Desktop App](https://tdn.danny.is/desktop/overview) - Native task management app
- [Specification](https://tdn.danny.is/reference/specification) - File format details

## License

MIT
