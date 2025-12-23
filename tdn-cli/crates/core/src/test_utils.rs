/// Shared test utilities for parser modules
///
/// This module provides common helpers used across task, project, and area tests.

#[cfg(test)]
pub mod helpers {
    use std::io::Write;
    use tempfile::NamedTempFile;

    /// Create a temporary file with the given content.
    /// Used by parser tests to create test fixtures.
    pub fn create_temp_file(content: &str) -> NamedTempFile {
        let mut file = NamedTempFile::new().unwrap();
        file.write_all(content.as_bytes()).unwrap();
        file
    }
}
