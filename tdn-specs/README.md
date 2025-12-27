# The taskdn Protocol Specifications

A set of formal specifications describing the protocol and core behaviors of the system. Tools which implement these will be compatible with each other.

1. **S1: Core (Data Storage)** - The file format specification for tasks, projects, and areas on disk (naming, frontmatter, location, data types). Includes JSON schemas.
2. **S2: Implementation Requirements** - Requirements and guidance for implementations: field conventions, timestamp management, data preservation, file safety, query semantics, and error handling.

**Implement S1 and your files are compatible with other S1-compliant tools. Implement S2 and your implementation behaves predictably and preserves user data.**
