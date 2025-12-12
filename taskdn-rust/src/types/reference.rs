//! File reference types for `WikiLink`s and path references.

use std::fmt;

/// References to other files, as stored in frontmatter.
///
/// Preserves the original format for round-tripping.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FileReference {
    /// `WikiLink` format: `[[Page Name]]` or `[[Page Name|Display Text]]`
    WikiLink {
        /// The target page name (without brackets).
        target: String,
        /// Optional display text (after the `|`).
        display: Option<String>,
    },
    /// Relative path format: `./projects/foo.md`
    RelativePath(String),
    /// Bare filename format: `foo.md`
    Filename(String),
}

impl FileReference {
    /// Parse a string into a `FileReference`.
    ///
    /// Detection rules:
    /// - `[[...]]` → `WikiLink`
    /// - Starts with `./` or `../` → `RelativePath`
    /// - Otherwise → `Filename`
    #[must_use]
    pub fn parse(s: &str) -> Self {
        let trimmed = s.trim();

        // Check for WikiLink format
        if trimmed.starts_with("[[") && trimmed.ends_with("]]") {
            let inner = &trimmed[2..trimmed.len() - 2];

            // Check for display text separator
            if let Some(pipe_pos) = inner.find('|') {
                let target = inner[..pipe_pos].trim().to_string();
                let display = inner[pipe_pos + 1..].trim().to_string();
                return Self::WikiLink {
                    target,
                    display: Some(display),
                };
            }

            return Self::WikiLink {
                target: inner.trim().to_string(),
                display: None,
            };
        }

        // Check for relative path
        if trimmed.starts_with("./") || trimmed.starts_with("../") {
            return Self::RelativePath(trimmed.to_string());
        }

        // Default to filename
        Self::Filename(trimmed.to_string())
    }

    /// Returns the display name for this reference.
    ///
    /// - `WikiLink` with display text: returns the display text
    /// - `WikiLink` without display text: returns the target
    /// - `RelativePath`/`Filename`: returns the filename without extension
    #[must_use]
    pub fn display_name(&self) -> &str {
        match self {
            Self::WikiLink { target, display } => display.as_deref().unwrap_or(target),
            Self::RelativePath(path) => {
                // Get filename from path, strip extension
                let filename = path.rsplit('/').next().unwrap_or(path);
                filename.strip_suffix(".md").unwrap_or(filename)
            }
            Self::Filename(name) => name.strip_suffix(".md").unwrap_or(name),
        }
    }

    /// Returns the target identifier (page name or filename).
    ///
    /// - `WikiLink`: returns the target
    /// - `RelativePath`: returns the full path
    /// - `Filename`: returns the filename
    #[must_use]
    pub fn target(&self) -> &str {
        match self {
            Self::WikiLink { target, .. } => target,
            Self::RelativePath(path) => path,
            Self::Filename(name) => name,
        }
    }

    /// Creates a `WikiLink` reference.
    #[must_use]
    pub fn wiki_link(target: impl Into<String>) -> Self {
        Self::WikiLink {
            target: target.into(),
            display: None,
        }
    }

    /// Creates a `WikiLink` reference with display text.
    #[must_use]
    pub fn wiki_link_with_display(target: impl Into<String>, display: impl Into<String>) -> Self {
        Self::WikiLink {
            target: target.into(),
            display: Some(display.into()),
        }
    }

    /// Creates a relative path reference.
    #[must_use]
    pub fn relative_path(path: impl Into<String>) -> Self {
        Self::RelativePath(path.into())
    }

    /// Creates a filename reference.
    #[must_use]
    pub fn filename(name: impl Into<String>) -> Self {
        Self::Filename(name.into())
    }
}

impl fmt::Display for FileReference {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::WikiLink { target, display } => {
                if let Some(d) = display {
                    write!(f, "[[{target}|{d}]]")
                } else {
                    write!(f, "[[{target}]]")
                }
            }
            Self::RelativePath(path) => write!(f, "{path}"),
            Self::Filename(name) => write!(f, "{name}"),
        }
    }
}

impl From<&str> for FileReference {
    fn from(s: &str) -> Self {
        Self::parse(s)
    }
}

impl From<String> for FileReference {
    fn from(s: String) -> Self {
        Self::parse(&s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_wikilink_simple() {
        let reference = FileReference::parse("[[My Project]]");
        assert!(matches!(
            reference,
            FileReference::WikiLink { target, display: None } if target == "My Project"
        ));
    }

    #[test]
    fn parse_wikilink_with_display() {
        let reference = FileReference::parse("[[my-project|My Project]]");
        assert!(matches!(
            reference,
            FileReference::WikiLink { target, display: Some(d) }
            if target == "my-project" && d == "My Project"
        ));
    }

    #[test]
    fn parse_relative_path() {
        let reference = FileReference::parse("./projects/foo.md");
        assert!(matches!(
            reference,
            FileReference::RelativePath(p) if p == "./projects/foo.md"
        ));
    }

    #[test]
    fn parse_relative_path_parent() {
        let reference = FileReference::parse("../areas/work.md");
        assert!(matches!(
            reference,
            FileReference::RelativePath(p) if p == "../areas/work.md"
        ));
    }

    #[test]
    fn parse_filename() {
        let reference = FileReference::parse("foo.md");
        assert!(matches!(
            reference,
            FileReference::Filename(n) if n == "foo.md"
        ));
    }

    #[test]
    fn display_name_wikilink_without_display() {
        let reference = FileReference::wiki_link("My Project");
        assert_eq!(reference.display_name(), "My Project");
    }

    #[test]
    fn display_name_wikilink_with_display() {
        let reference = FileReference::wiki_link_with_display("my-project", "My Project");
        assert_eq!(reference.display_name(), "My Project");
    }

    #[test]
    fn display_name_relative_path() {
        let reference = FileReference::relative_path("./projects/my-project.md");
        assert_eq!(reference.display_name(), "my-project");
    }

    #[test]
    fn display_name_filename() {
        let reference = FileReference::filename("my-task.md");
        assert_eq!(reference.display_name(), "my-task");
    }

    #[test]
    fn to_string_preserves_format() {
        let wiki = FileReference::parse("[[My Project]]");
        assert_eq!(wiki.to_string(), "[[My Project]]");

        let wiki_display = FileReference::parse("[[my-project|My Project]]");
        assert_eq!(wiki_display.to_string(), "[[my-project|My Project]]");

        let path = FileReference::parse("./projects/foo.md");
        assert_eq!(path.to_string(), "./projects/foo.md");

        let filename = FileReference::parse("foo.md");
        assert_eq!(filename.to_string(), "foo.md");
    }

    #[test]
    fn from_str_conversion() {
        let reference: FileReference = "[[Test]]".into();
        assert!(matches!(
            reference,
            FileReference::WikiLink { target, display: None } if target == "Test"
        ));
    }

    #[test]
    fn whitespace_handling() {
        let reference = FileReference::parse("  [[  Page Name  ]]  ");
        assert!(matches!(
            reference,
            FileReference::WikiLink { target, display: None } if target == "Page Name"
        ));
    }
}
