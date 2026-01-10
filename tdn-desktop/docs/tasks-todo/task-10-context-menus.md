# Task: Context Menus

This task is about ensuring that we have good and correct context menus everywhere in the application when things are right clicked. We'll use native context menus from tauri.

Right-clicking on any task, project, or area anywhere in the app presents a context menu containing at least:

- **Reveal in Finder/Explorer** – Reveals the file on disk in the OS file manager.
- **Open in Default App** – Opens the file in the OS default application.
- **Open in Obsidian** – Opens the file in Obsidian using its URL scheme. Only shown if the file is within an Obsidian vault.
- **Copy Path** – Copies the full file path to the clipboard.
- **Copy Local URL** – Copies the `taskdn://` URL to the clipboard.
- **Copy as Markdown** – Copies the full contents of the file to the clipboard, with the file path appended at the end.

Context menus should include additional items depending on context, but must always include the items above. Context menus should generally allow us to right click on any entity and edit the various fields by clicking.

Right clicking in other areas should work appropriately. For example, right clicking on white space in various areas, right clicking on items in the left sidebar, right clicking in the markdown editor, etcetera.
