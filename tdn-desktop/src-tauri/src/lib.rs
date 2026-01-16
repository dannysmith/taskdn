//! Tauri application library entry point.
//!
//! This module serves as the main entry point for the Tauri application.
//! Command implementations are organized in the `commands` module,
//! and shared types are in the `types` module.

mod bindings;
mod commands;
mod types;
mod utils;
pub mod vault;

use std::error::Error;
use tauri::{App, AppHandle, Manager, RunEvent, WindowEvent};
use vault::VaultManager;

// Re-export only what's needed externally
pub use types::DEFAULT_QUICK_PANE_SHORTCUT;

/// Application entry point. Sets up all plugins and initializes the app.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = bindings::generate_bindings();

    export_bindings_if_dev();

    configure_plugins(tauri::Builder::default())
        .manage(VaultManager::new())
        .setup(|app| setup_app(app))
        .invoke_handler(builder.invoke_handler())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(handle_run_event);
}

/// Export TypeScript bindings in debug builds when not bundled.
///
/// Bundled apps run from a different directory and can't write to source,
/// so we only export when we can find the target file path.
#[cfg(debug_assertions)]
fn export_bindings_if_dev() {
    if std::env::var("TAURI_ENV").ok().as_deref() != Some("production") {
        if let Ok(cwd) = std::env::current_dir() {
            if cwd.join("../src/lib/bindings.ts").exists()
                || cwd.join("src/lib/bindings.ts").exists()
            {
                bindings::export_ts_bindings();
            }
        }
    }
}

#[cfg(not(debug_assertions))]
fn export_bindings_if_dev() {
    // No-op in release builds
}

/// Configure all Tauri plugins.
///
/// Plugins are registered in a specific order - single instance must be first.
fn configure_plugins(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    let mut builder = builder;

    // Single instance plugin must be registered FIRST
    // When user tries to open a second instance, focus the existing window instead
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }));
    }

    // Deep link plugin for taskdn:// URL scheme
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_deep_link::init());
    }

    // Window state plugin - saves/restores window position and size
    // Note: quick-pane is denylisted because it's an NSPanel and calling is_maximized() on it crashes
    // See: https://github.com/tauri-apps/plugins-workspace/issues/1546
    #[cfg(desktop)]
    {
        builder = builder.plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(tauri_plugin_window_state::StateFlags::all())
                .with_denylist(&["quick-pane"])
                .build(),
        );
    }

    // Updater plugin for in-app updates
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder = builder
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(configure_log_plugin());

    // macOS: Add NSPanel plugin for native panel behavior
    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_nspanel::init());
    }

    builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
}

/// Configure the logging plugin with appropriate levels and targets.
fn configure_log_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri_plugin_log::Builder::new()
        // Use Debug level in development, Info in production
        .level(if cfg!(debug_assertions) {
            log::LevelFilter::Debug
        } else {
            log::LevelFilter::Info
        })
        // Prevent log files from growing indefinitely
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
        .max_file_size(5_000_000) // 5MB max before rotation
        .targets([
            // Always log to stdout for development
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
            // Log to webview console for development
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
            // Log to system logs on macOS (appears in Console.app)
            #[cfg(target_os = "macos")]
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: None }),
        ])
        .build()
}

/// Initialize the application during setup.
///
/// This handles global shortcut registration, quick pane creation, and vault initialization.
fn setup_app(app: &mut App) -> Result<(), Box<dyn Error>> {
    log::info!("Application starting up");
    log::debug!(
        "App handle initialized for package: {}",
        app.package_info().name
    );

    setup_global_shortcuts(app)?;
    setup_quick_pane(app)?;
    setup_vault(app);

    // NOTE: Application menu is built from JavaScript for i18n support
    // See src/lib/menu.ts for the menu implementation

    Ok(())
}

/// Set up global shortcut plugin and register the quick pane shortcut.
#[cfg(desktop)]
fn setup_global_shortcuts(app: &mut App) -> Result<(), Box<dyn Error>> {
    use tauri_plugin_global_shortcut::Builder;

    app.handle().plugin(Builder::new().build())?;

    let saved_shortcut = commands::preferences::load_quick_pane_shortcut(app.handle());
    let shortcut_to_register = saved_shortcut
        .as_deref()
        .unwrap_or(DEFAULT_QUICK_PANE_SHORTCUT);

    log::info!("Registering quick pane shortcut: {shortcut_to_register}");
    commands::quick_pane::register_quick_pane_shortcut(app.handle(), shortcut_to_register)?;

    Ok(())
}

#[cfg(not(desktop))]
fn setup_global_shortcuts(_app: &mut App) -> Result<(), Box<dyn Error>> {
    Ok(())
}

/// Create the quick pane window (hidden initially).
fn setup_quick_pane(app: &mut App) -> Result<(), Box<dyn Error>> {
    if let Err(e) = commands::quick_pane::init_quick_pane(app.handle()) {
        log::error!("Failed to create quick pane: {e}");
        // Non-fatal: app can still run without quick pane
    }
    Ok(())
}

/// Initialize the vault from saved preferences.
fn setup_vault(app: &mut App) {
    if let Some(vault_dirs) = commands::preferences::load_vault_dirs(app.handle()) {
        log::info!(
            "Initializing vault from preferences: tasks={}, projects={}, areas={}",
            vault_dirs.tasks_dir,
            vault_dirs.projects_dir,
            vault_dirs.areas_dir
        );
        let vault_manager = app.state::<VaultManager>();
        let config = vault::VaultConfig::from_dirs(
            vault_dirs.tasks_dir,
            vault_dirs.projects_dir,
            vault_dirs.areas_dir,
            vault_dirs.ignore,
        );
        if let Err(e) = vault_manager.initialize(config, app.handle().clone()) {
            log::error!("Failed to initialize vault: {e:?}");
            // Non-fatal: user can configure paths in preferences
        }
    } else {
        log::info!("Vault not configured - user needs to set directory paths in preferences");
    }
}

/// Handle application run events, particularly window close cleanup.
fn handle_run_event(app_handle: &AppHandle, event: RunEvent) {
    if let RunEvent::WindowEvent {
        label,
        event: WindowEvent::CloseRequested { .. },
        ..
    } = &event
    {
        if label == "main" {
            handle_main_window_close(app_handle);
        }
    }
}

/// Perform cleanup when the main window is closed.
fn handle_main_window_close(app_handle: &AppHandle) {
    log::info!("Main window close requested - performing cleanup");

    save_window_state(app_handle);
    hide_quick_pane(app_handle);
    unregister_global_shortcuts(app_handle);

    log::info!("Cleanup complete, allowing close to proceed");
}

/// Save window state before closing.
#[cfg(desktop)]
fn save_window_state(app_handle: &AppHandle) {
    use tauri_plugin_window_state::{AppHandleExt, StateFlags};

    if let Err(e) = app_handle.save_window_state(StateFlags::all()) {
        log::warn!("Failed to save window state: {e}");
    } else {
        log::info!("Window state saved successfully");
    }
}

#[cfg(not(desktop))]
fn save_window_state(_app_handle: &AppHandle) {}

/// Hide the quick-pane panel before main window closes.
#[cfg(target_os = "macos")]
fn hide_quick_pane(app_handle: &AppHandle) {
    use tauri_nspanel::ManagerExt;

    if let Ok(panel) = app_handle.get_webview_panel("quick-pane") {
        log::debug!("Hiding quick-pane panel before close");
        panel.hide();
    }
}

#[cfg(not(target_os = "macos"))]
fn hide_quick_pane(_app_handle: &AppHandle) {}

/// Unregister all global shortcuts.
#[cfg(desktop)]
fn unregister_global_shortcuts(app_handle: &AppHandle) {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    if let Err(e) = app_handle.global_shortcut().unregister_all() {
        log::warn!("Failed to unregister global shortcuts: {e}");
    } else {
        log::debug!("Global shortcuts unregistered");
    }
}

#[cfg(not(desktop))]
fn unregister_global_shortcuts(_app_handle: &AppHandle) {}
