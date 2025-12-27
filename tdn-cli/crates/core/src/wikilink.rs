//! WikiLink parsing utilities for extracting reference names.
//!
//! WikiLinks follow Obsidian syntax:
//! - Basic: `[[Page Name]]`
//! - With display text: `[[Page Name|Display Text]]`
//! - With heading: `[[Page Name#Heading]]`
//! - Combined: `[[Page Name#Heading|Display Text]]`

/// Extract the target name from a wikilink reference.
///
/// Returns None if the input is not a wikilink (e.g., a path).
///
/// # Examples
///
/// - `[[Simple Name]]` → Some("Simple Name")
/// - `[[Name|Alias]]` → Some("Name")
/// - `[[Name#Heading]]` → Some("Name")
/// - `[[Name#Heading|Alias]]` → Some("Name")
/// - `./relative/path.md` → None
/// - `path.md` → None
///
/// Marked as dead_code because it's pub(crate) and only used by vault_index module.
/// The Rust compiler doesn't always detect cross-module usage within the same crate.
#[allow(dead_code)]
pub(crate) fn extract_wikilink_name(reference: &str) -> Option<&str> {
    // Must start with [[ and end with ]]
    let trimmed = reference.trim();
    if !trimmed.starts_with("[[") || !trimmed.ends_with("]]") {
        return None;
    }

    // Extract content between [[ and ]]
    let inner = &trimmed[2..trimmed.len() - 2];
    let inner = inner.trim();

    // Empty wikilink is invalid
    if inner.is_empty() {
        return None;
    }

    // Handle alias (take everything before |)
    let before_alias = match inner.find('|') {
        Some(pos) => &inner[..pos],
        None => inner,
    };

    // Handle heading (take everything before #)
    let name = match before_alias.find('#') {
        Some(pos) => &before_alias[..pos],
        None => before_alias,
    };

    let name = name.trim();

    // Empty name after stripping is invalid
    if name.is_empty() {
        return None;
    }

    Some(name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_wikilink() {
        assert_eq!(
            extract_wikilink_name("[[Simple Name]]"),
            Some("Simple Name")
        );
    }

    #[test]
    fn wikilink_with_alias() {
        assert_eq!(extract_wikilink_name("[[Name|Alias]]"), Some("Name"));
    }

    #[test]
    fn wikilink_with_heading() {
        assert_eq!(extract_wikilink_name("[[Name#Heading]]"), Some("Name"));
    }

    #[test]
    fn wikilink_with_heading_and_alias() {
        assert_eq!(
            extract_wikilink_name("[[Name#Heading|Alias]]"),
            Some("Name")
        );
    }

    #[test]
    fn relative_path_is_not_wikilink() {
        assert_eq!(extract_wikilink_name("./projects/file.md"), None);
    }

    #[test]
    fn filename_is_not_wikilink() {
        assert_eq!(extract_wikilink_name("file.md"), None);
    }

    #[test]
    fn empty_wikilink() {
        assert_eq!(extract_wikilink_name("[[]]"), None);
    }

    #[test]
    fn whitespace_handling() {
        assert_eq!(
            extract_wikilink_name("[[ Spaced Name ]]"),
            Some("Spaced Name")
        );
    }

    #[test]
    fn whitespace_only_wikilink() {
        assert_eq!(extract_wikilink_name("[[   ]]"), None);
    }

    #[test]
    fn heading_only_wikilink() {
        // [[#Heading]] has no page name, just a heading reference
        assert_eq!(extract_wikilink_name("[[#Heading]]"), None);
    }

    #[test]
    fn alias_only_wikilink() {
        // [[|Alias]] has no page name, just an alias
        assert_eq!(extract_wikilink_name("[[|Alias]]"), None);
    }

    #[test]
    fn complex_name_with_spaces() {
        assert_eq!(
            extract_wikilink_name("[[Q1 2025 Planning]]"),
            Some("Q1 2025 Planning")
        );
    }

    #[test]
    fn wikilink_with_outer_whitespace() {
        assert_eq!(extract_wikilink_name("  [[Name]]  "), Some("Name"));
    }

    #[test]
    fn not_a_wikilink_missing_closing() {
        assert_eq!(extract_wikilink_name("[[Name"), None);
    }

    #[test]
    fn not_a_wikilink_missing_opening() {
        assert_eq!(extract_wikilink_name("Name]]"), None);
    }

    #[test]
    fn single_brackets_not_wikilink() {
        assert_eq!(extract_wikilink_name("[Name]"), None);
    }
}
