# Task: Clean Code Review

conduct a full systematic review of this entire code base looking for anywhere where we can make the code cleaner. This probably includes things like:

- Rust best practices
- React/TS best practices
- Long functions we can make shorter by splitting them out into multiple functions or methods. 
- Functions with high cycolomatic complexity wehre we could do the same.
- Variables, functions, classes, props etc Which we can rename to be more descriptive, or generally better named.
- Modules, files, or areas of code which have multiple responsibilities and shouldn't do.
- Any circular dependencies where they're absolutely not necessary. 
- File structure and file naming. 
- Good comments in the helpful places and no leftover nonsense comments anywhere else. 

Now there's no need to stick at all to these rules because they don't necessarily all apply in this code base and we shouldn't be dogmatic here, But you should make sure you're familiar with the principles of clean code. Here's a summary: https://gist.githubusercontent.com/wojteklu/73c6914cc446146b8b533c0988cf8d29/raw/c7a44d774fc3b09a0d5f0f58888550ba0ac694b9/clean_code.md
