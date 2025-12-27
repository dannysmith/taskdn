# Task: Clean Code Review

> Comprehensive independent review of all TypeScript/Bun and Rust code in `tdn-cli` for clean code principles, maintainability, and quality.

## Objective

Conduct a thorough code quality audit of the entire `tdn-cli` codebase (both TypeScript and Rust components) to identify areas for improvement in code clarity, maintainability, and adherence to clean code principles.

## Instructions

### 1. Preparation & Exploration

- Use the **Explore subagent** to understand the overall structure of `tdn-cli/`
- Identify all TypeScript/JavaScript files and Rust files
- Get a high-level understanding of the architecture and key modules
- Review any existing architectural documentation in `tdn-cli/docs/`.

### 2. Code Quality Review Areas

For each file/module in the codebase, evaluate:

#### Structure & Organization

- **File structure**: Are files logically organized? Appropriate module boundaries?
- **Separation of concerns**: Is business logic separated from I/O, presentation, and infrastructure?
- **Module cohesion**: Do files/modules have a single, clear responsibility?

#### Functions & Methods

- **Function length**: Are functions concise and focused? (Generally < 30-40 lines)
- **Cyclomatic complexity**: Are there deeply nested conditionals or complex branching logic?
- **Parameter count**: Do functions have too many parameters? (Generally < 4-5)
- **Single responsibility**: Does each function do one thing well?

#### Code Quality

- **Duplication**: Is there repeated code that could be extracted into shared utilities?
- **Redundancy**: Are there unnecessary abstractions, dead code, or unused variables/imports?
- **Naming**: Are variables, functions, and types clearly and consistently named?
- **Magic numbers/strings**: Are there hard-coded values that should be constants?

#### Abstractions & Patterns

- **Appropriate abstraction level**: Are abstractions at the right level (not over- or under-abstracted)?
- **Consistency**: Are similar problems solved in similar ways across the codebase?
- **Language idioms**: Does the code follow TypeScript/Rust best practices and idioms?
- **Error handling**: Is error handling consistent, appropriate, and informative?

#### Readability & Maintainability

- **Comments**: Are comments helpful without being excessive? Do they explain "why" not "what"?
- **Type safety**: Appropriate use of TypeScript types? Rust type system leveraged well?
- **Complexity**: Is the code easy to understand, or does it require significant mental effort?
- **Testing considerations**: Is the code structured in a way that makes it testable?

### 3. Language-Specific Considerations

#### TypeScript Code

- Proper use of TypeScript features (types, interfaces, generics, utility types)
- Async/await patterns used appropriately
- Error handling (try/catch, Result types if used)

#### Rust Code (NAPI-RS bindings)

- Proper memory management and ownership patterns
- Error propagation (Result/Option types)
- FFI safety considerations
- Efficient use of Rust idioms (iterators, pattern matching, etc.)

### 4. Review Approach

1. **Use subagents strategically**:

   - Use **Explore agent** (thoroughness: "very thorough") to map out the codebase structure
   - Consider using **code-refactorer agent** for identifying specific refactoring opportunities in complex modules
   - Use direct file reading for detailed line-by-line review

2. **Prioritize by impact**:

   - Start with core business logic and parser code
   - Review shared utilities and abstractions
   - Then review CLI interface and peripheral code

3. **Document systematically**:
   - For each significant finding, note the file path and line numbers
   - Categorize issues by severity (Critical, Major, Minor, Suggestion)
   - Provide specific, actionable recommendations

### 5. Output Format

Document all findings in the sections below:

#### Findings Summary

- Provide high-level overview of code quality
- Note patterns (good and bad) that appear across the codebase
- Highlight areas of technical debt or concern

#### Detailed Findings

Group findings by category, with format:

```
**[Severity] Category: Brief Description**
- File: `path/to/file.ts:123-145`
- Issue: [Description of the problem]
- Recommendation: [Specific suggestion for improvement]
- Impact: [Why this matters]
```

#### Actions

Prioritized list of recommended refactoring tasks or improvements, formatted as actionable items.

## Notes

- This is a **review only** task - do not make code changes during this task
- Focus on identifying issues and providing actionable recommendations
- Be thorough but pragmatic - not every tiny issue needs to be documented
- Remember the project is in active development
- Reference clean code principles but don't be dogmatic

## Findings Summary

[To be filled during review]

## Detailed Findings

[To be filled during review]

## Actions

[To be filled during review]
