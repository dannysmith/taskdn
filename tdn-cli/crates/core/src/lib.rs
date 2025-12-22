#[macro_use]
extern crate napi_derive;

/// Minimal test function to verify NAPI bindings work
#[napi]
pub fn hello_from_rust() -> String {
    "Hello from Rust!".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hello_works() {
        assert_eq!(hello_from_rust(), "Hello from Rust!");
    }
}
