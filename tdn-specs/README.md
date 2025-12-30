# The taskdn Protocol Specifications

A set of formal specifications describing the protocol and core behaviors of the system. Tools which implement these will be compatible with each other.

1. **[S1: Core (Data Storage)](./S1-core.md)** - The file format specification for tasks, projects, and areas on disk (naming, frontmatter, location, data types). Includes JSON schemas.
2. **[S2: Implementation Guidance](./S2-implementation-requirements.md)** - Guidance for implementations: field conventions, timestamp management, file safety, query semantics, and error handling.

**Implement S1 and your files are compatible with other S1-compliant tools. Follow S2 guidance and your implementation behaves predictably.**
