//! Utility functions for the taskdn library.

/// Generate a filename from a title.
///
/// The algorithm:
/// 1. Convert to lowercase
/// 2. Replace spaces with hyphens
/// 3. Remove special characters (keep alphanumeric and hyphens)
/// 4. Collapse multiple consecutive hyphens
/// 5. Trim leading/trailing hyphens
/// 6. Truncate to max length (default 60 chars before extension)
/// 7. Add .md extension
///
/// # Arguments
/// * `title` - The title to convert
///
/// # Returns
/// A valid filename ending in `.md`
#[must_use]
pub fn generate_filename(title: &str) -> String {
    const MAX_BASE_LENGTH: usize = 60;

    // Lowercase and replace spaces with hyphens
    let mut result: String = title
        .to_lowercase()
        .chars()
        .map(|c| {
            if c == ' ' || c == '_' {
                '-'
            } else if c.is_ascii_alphanumeric() || c == '-' {
                c
            } else {
                // Skip special characters
                '\0'
            }
        })
        .filter(|&c| c != '\0')
        .collect();

    // Collapse multiple hyphens
    while result.contains("--") {
        result = result.replace("--", "-");
    }

    // Trim leading/trailing hyphens
    result = result.trim_matches('-').to_string();

    // Handle empty result
    if result.is_empty() {
        result = "untitled".to_string();
    }

    // Truncate if too long
    if result.len() > MAX_BASE_LENGTH {
        // Try to truncate at a word boundary (hyphen)
        if let Some(pos) = result[..MAX_BASE_LENGTH].rfind('-') {
            if pos > MAX_BASE_LENGTH / 2 {
                result = result[..pos].to_string();
            } else {
                result = result[..MAX_BASE_LENGTH].to_string();
            }
        } else {
            result = result[..MAX_BASE_LENGTH].to_string();
        }
        // Trim trailing hyphen after truncation
        result = result.trim_end_matches('-').to_string();
    }

    format!("{result}.md")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simple_title() {
        assert_eq!(generate_filename("Buy groceries"), "buy-groceries.md");
    }

    #[test]
    fn title_with_special_chars() {
        assert_eq!(
            generate_filename("Fix bug #123 (urgent!)"),
            "fix-bug-123-urgent.md"
        );
    }

    #[test]
    fn title_with_multiple_spaces() {
        assert_eq!(
            generate_filename("Task   with   spaces"),
            "task-with-spaces.md"
        );
    }

    #[test]
    fn title_with_underscores() {
        assert_eq!(generate_filename("some_task_name"), "some-task-name.md");
    }

    #[test]
    fn title_with_mixed_case() {
        assert_eq!(generate_filename("MyImportantTask"), "myimportanttask.md");
    }

    #[test]
    fn title_already_lowercase() {
        assert_eq!(
            generate_filename("already lowercase"),
            "already-lowercase.md"
        );
    }

    #[test]
    fn title_with_leading_trailing_spaces() {
        assert_eq!(generate_filename("  trim me  "), "trim-me.md");
    }

    #[test]
    fn title_with_only_special_chars() {
        assert_eq!(generate_filename("!!!@@@###"), "untitled.md");
    }

    #[test]
    fn empty_title() {
        assert_eq!(generate_filename(""), "untitled.md");
    }

    #[test]
    fn very_long_title() {
        let long_title = "This is a very long task title that should be truncated to a reasonable length for the filename";
        let result = generate_filename(long_title);
        assert!(result.len() <= 64); // 60 + ".md"
        assert!(result.ends_with(".md"));
        assert!(!result.contains("--"));
    }

    #[test]
    fn unicode_characters_removed() {
        assert_eq!(generate_filename("Café résumé"), "caf-rsum.md");
    }

    #[test]
    fn numbers_preserved() {
        assert_eq!(generate_filename("Task 123"), "task-123.md");
    }

    #[test]
    fn hyphens_preserved() {
        assert_eq!(
            generate_filename("pre-existing-name"),
            "pre-existing-name.md"
        );
    }
}
