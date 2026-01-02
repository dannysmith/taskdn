# Task: Quick Capture Pane LLM Processing

Primarily intended for users who dictate new tasks into the quick capture box.

- The contents of the input field are sent to a local LLM with a short prompt, which returns a properly-structured task for creation in the app.
- The prompt includes:
  - A list of current areas and projects
  - Context about "now"
  - Instructions for lightly cleaning user input, extracting frontmatter fields, and (if the input is long) generating a suitable title
- The raw input text is always included in the body of the task doc.
- The prompt is not user-customizable.
- V1 supports only Apple Intelligence. Installed Ollama models may also be supported.
- There is no intent to ship downloadable LLMs with this product or provide an interface for managing them.
