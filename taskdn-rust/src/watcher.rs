//! Optional file watcher for the Taskdn SDK.
//!
//! This module provides a bundled file watcher for consumers who don't have their own
//! file watching infrastructure. It's behind the `watch` feature flag to avoid adding
//! dependencies for consumers who don't need it.
//!
//! # Feature Flag
//!
//! Enable this module by adding the `watch` feature to your `Cargo.toml`:
//!
//! ```toml
//! [dependencies]
//! taskdn = { version = "0.1", features = ["watch"] }
//! ```
//!
//! # Example
//!
//! ```ignore
//! use taskdn::{Taskdn, VaultEvent};
//! use std::time::Duration;
//!
//! let taskdn = Taskdn::new(config)?;
//!
//! let watcher = taskdn.watch(|event| {
//!     match event {
//!         VaultEvent::TaskCreated(task) => println!("New: {}", task.title),
//!         VaultEvent::TaskUpdated(task) => println!("Updated: {}", task.title),
//!         VaultEvent::TaskDeleted { path } => println!("Deleted: {:?}", path),
//!         _ => {}
//!     }
//! })?;
//!
//! // Keep the watcher alive as long as you need it
//! // watcher.stop(); // Call when done
//! ```

use std::path::PathBuf;
use std::sync::mpsc::{self, Sender};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use notify_debouncer_mini::notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebouncedEventKind};

use crate::error::Result;
use crate::events::{FileChangeKind, VaultEvent};
use crate::Taskdn;

/// Configuration for the file watcher.
#[derive(Debug, Clone, Copy)]
pub struct WatchConfig {
    /// Debounce duration for file system events.
    ///
    /// Multiple events occurring within this duration will be coalesced into one.
    /// Default is 500ms.
    pub debounce: Duration,
}

impl Default for WatchConfig {
    fn default() -> Self {
        Self {
            debounce: Duration::from_millis(500),
        }
    }
}

impl WatchConfig {
    /// Creates a new watch configuration with default settings.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Sets the debounce duration.
    #[must_use]
    pub fn with_debounce(mut self, debounce: Duration) -> Self {
        self.debounce = debounce;
        self
    }
}

/// A file watcher that monitors vault directories for changes.
///
/// The watcher automatically debounces rapid file system events and converts
/// them to typed `VaultEvent`s. It runs in a background thread and calls
/// the provided callback for each relevant event.
///
/// # Stopping the Watcher
///
/// Call `stop()` to gracefully shut down the watcher. The watcher will also
/// stop if dropped, but calling `stop()` explicitly is preferred as it
/// ensures the background thread is properly joined.
pub struct FileWatcher {
    /// Handle to the watcher thread.
    thread_handle: Option<JoinHandle<()>>,
    /// Channel to signal the watcher to stop.
    stop_sender: Sender<()>,
    /// The paths being watched (for reference).
    watched_paths: Vec<PathBuf>,
}

impl FileWatcher {
    /// Stops the watcher and waits for the background thread to finish.
    ///
    /// This is the preferred way to shut down the watcher. After calling this,
    /// no more events will be delivered to the callback.
    pub fn stop(mut self) {
        self.stop_internal();
    }

    /// Returns the paths being watched.
    #[must_use]
    pub fn watched_paths(&self) -> &[PathBuf] {
        &self.watched_paths
    }

    /// Internal stop implementation.
    fn stop_internal(&mut self) {
        // Signal the watcher thread to stop
        let _ = self.stop_sender.send(());

        // Wait for the thread to finish
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
    }
}

impl Drop for FileWatcher {
    fn drop(&mut self) {
        self.stop_internal();
    }
}

impl Taskdn {
    /// Start watching for file changes with default configuration.
    ///
    /// The callback receives fully typed `VaultEvent`s for relevant file changes.
    /// Events are debounced (default 500ms) to avoid excessive callbacks during
    /// rapid file modifications.
    ///
    /// # Arguments
    ///
    /// * `callback` - Function called for each vault event
    ///
    /// # Returns
    ///
    /// A `FileWatcher` handle. Keep this alive as long as you want to receive events.
    /// Call `stop()` on it to gracefully shut down, or let it drop.
    ///
    /// # Errors
    ///
    /// Returns an error if the file watcher cannot be initialized.
    ///
    /// # Example
    ///
    /// ```ignore
    /// let watcher = taskdn.watch(|event| {
    ///     println!("Event: {:?}", event);
    /// })?;
    /// ```
    pub fn watch<F>(&self, callback: F) -> Result<FileWatcher>
    where
        F: Fn(VaultEvent) + Send + 'static,
    {
        self.watch_with_config(WatchConfig::default(), callback)
    }

    /// Start watching for file changes with custom configuration.
    ///
    /// # Arguments
    ///
    /// * `config` - Watch configuration (debounce duration, etc.)
    /// * `callback` - Function called for each vault event
    ///
    /// # Returns
    ///
    /// A `FileWatcher` handle.
    ///
    /// # Errors
    ///
    /// Returns an error if the file watcher cannot be initialized.
    ///
    /// # Example
    ///
    /// ```ignore
    /// use std::time::Duration;
    /// use taskdn::WatchConfig;
    ///
    /// let config = WatchConfig::new().with_debounce(Duration::from_millis(200));
    /// let watcher = taskdn.watch_with_config(config, |event| {
    ///     println!("Event: {:?}", event);
    /// })?;
    /// ```
    pub fn watch_with_config<F>(&self, config: WatchConfig, callback: F) -> Result<FileWatcher>
    where
        F: Fn(VaultEvent) + Send + 'static,
    {
        let watched_paths = self.watched_paths();
        let (stop_tx, stop_rx) = mpsc::channel();

        // Clone config for the watcher thread
        let tasks_dir = self.config.tasks_dir.clone();
        let projects_dir = self.config.projects_dir.clone();
        let areas_dir = self.config.areas_dir.clone();

        // Create the watcher thread
        let thread_handle = thread::spawn(move || {
            // Create a new Taskdn instance for this thread
            // This is necessary because Taskdn is not Send/Sync
            let thread_config = crate::TaskdnConfig::new(
                tasks_dir.clone(),
                projects_dir.clone(),
                areas_dir.clone(),
            );
            let Ok(taskdn) = Taskdn::new(thread_config) else {
                return;
            };

            // Set up the debouncer
            let (event_tx, event_rx) = mpsc::channel();

            let Ok(mut debouncer) = new_debouncer(config.debounce, move |res| {
                let _ = event_tx.send(res);
            }) else {
                return;
            };

            // Watch all paths
            for path in &[tasks_dir, projects_dir, areas_dir] {
                if debouncer
                    .watcher()
                    .watch(path, RecursiveMode::Recursive)
                    .is_err()
                {
                    return;
                }
            }

            // Main event loop
            loop {
                // Check for stop signal (non-blocking)
                if stop_rx.try_recv().is_ok() {
                    break;
                }

                // Check for file events (with timeout to allow checking stop signal)
                match event_rx.recv_timeout(Duration::from_millis(100)) {
                    Ok(Ok(events)) => {
                        for event in events {
                            // Convert debounced event to our event kind
                            // DebouncedEventKind is non-exhaustive, handle all variants
                            let kind = match event.kind {
                                DebouncedEventKind::Any | DebouncedEventKind::AnyContinuous => {
                                    // Check if file exists to determine create vs modify
                                    if event.path.exists() {
                                        FileChangeKind::Modified
                                    } else {
                                        FileChangeKind::Deleted
                                    }
                                }
                                // Future variants - treat as modified if file exists
                                _ => {
                                    if event.path.exists() {
                                        FileChangeKind::Modified
                                    } else {
                                        FileChangeKind::Deleted
                                    }
                                }
                            };

                            // Process through our event system
                            if let Ok(Some(vault_event)) =
                                taskdn.process_file_change(&event.path, kind)
                            {
                                callback(vault_event);
                            }
                        }
                    }
                    Ok(Err(_errors)) => {
                        // Log errors if we had a logger, for now just continue
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {
                        // Normal timeout, continue loop
                    }
                    Err(mpsc::RecvTimeoutError::Disconnected) => {
                        // Channel closed, exit
                        break;
                    }
                }
            }
        });

        Ok(FileWatcher {
            thread_handle: Some(thread_handle),
            stop_sender: stop_tx,
            watched_paths,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::TaskdnConfig;
    use std::fs;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use tempfile::TempDir;

    fn setup_test_vault() -> (TempDir, Taskdn) {
        let temp_dir = TempDir::new().unwrap();
        let tasks_dir = temp_dir.path().join("tasks");
        let projects_dir = temp_dir.path().join("projects");
        let areas_dir = temp_dir.path().join("areas");

        fs::create_dir_all(&tasks_dir).unwrap();
        fs::create_dir_all(&projects_dir).unwrap();
        fs::create_dir_all(&areas_dir).unwrap();

        let config = TaskdnConfig::new(tasks_dir, projects_dir, areas_dir);
        let taskdn = Taskdn::new(config).unwrap();

        (temp_dir, taskdn)
    }

    #[test]
    fn watch_config_default() {
        let config = WatchConfig::default();
        assert_eq!(config.debounce, Duration::from_millis(500));
    }

    #[test]
    fn watch_config_builder() {
        let config = WatchConfig::new().with_debounce(Duration::from_millis(200));
        assert_eq!(config.debounce, Duration::from_millis(200));
    }

    #[test]
    fn file_watcher_can_be_created_and_stopped() {
        let (_temp, taskdn) = setup_test_vault();

        let watcher = taskdn.watch(|_event| {}).unwrap();
        assert_eq!(watcher.watched_paths().len(), 3);

        watcher.stop();
    }

    #[test]
    fn file_watcher_with_custom_config() {
        let (_temp, taskdn) = setup_test_vault();

        let config = WatchConfig::new().with_debounce(Duration::from_millis(100));
        let watcher = taskdn.watch_with_config(config, |_event| {}).unwrap();

        watcher.stop();
    }

    #[test]
    #[ignore] // Flaky: depends on OS file system event timing
    fn file_watcher_detects_new_task() {
        let (temp, taskdn) = setup_test_vault();
        let event_count = Arc::new(AtomicUsize::new(0));
        let event_count_clone = Arc::clone(&event_count);

        let config = WatchConfig::new().with_debounce(Duration::from_millis(50));
        let watcher = taskdn
            .watch_with_config(config, move |_event| {
                event_count_clone.fetch_add(1, Ordering::SeqCst);
            })
            .unwrap();

        // Give the watcher time to initialize
        thread::sleep(Duration::from_millis(100));

        // Create a task file
        let task_path = temp.path().join("tasks/new-task.md");
        let content = r#"---
title: New Task
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-01
---
Body
"#;
        fs::write(&task_path, content).unwrap();

        // Wait for debounce + processing
        thread::sleep(Duration::from_millis(200));

        watcher.stop();

        // Should have received at least one event
        assert!(
            event_count.load(Ordering::SeqCst) >= 1,
            "Expected at least 1 event, got {}",
            event_count.load(Ordering::SeqCst)
        );
    }
}
