# The taskdn Protocol Specifications

A set of unambiguous formal specifications describing the protocol and core APIs of the system. Tools which implement these will be compatible with each other.

1. **S1: Core (Data Storage)** - A formal specification for the data files on disk (naming, frontmatter, location, data types) etc. Includes JSON schemas for these.
2. **S2: Interface Design** - A formal specification for the design of interfaces which interact with S1-complient data. Includes guidance on types, data structures, commands language (eg. "verb first"), workflows, input & output formats, query & filter language, sorting, interface modes, error handling etc.
3. **S3: Guidance for Reading & Writing Data** - Guideance for implementations when reading, writing & mutating S1-compliant data on disk.

**All software which implements S1 will be mutually compatible when reading/writing task files on disk.** Implementing S2 will ensure a consistent & predictable external interface.
