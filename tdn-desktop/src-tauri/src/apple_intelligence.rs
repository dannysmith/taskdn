//! Safe Rust wrapper over the Apple Intelligence Swift FFI bridge.
//!
//! On macOS ARM64, this links to Swift functions that call Apple's
//! FoundationModels framework. On other platforms, these functions
//! are not available and the module is not compiled.

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};

/// C-compatible response structure from Swift.
#[repr(C)]
pub struct AppleLLMResponse {
    pub response: *mut c_char,
    pub success: c_int,
    pub error_message: *mut c_char,
}

extern "C" {
    pub fn is_apple_intelligence_available() -> c_int;
    pub fn process_text_with_system_prompt_apple(
        system_prompt: *const c_char,
        user_content: *const c_char,
        max_tokens: i32,
    ) -> *mut AppleLLMResponse;
    pub fn free_apple_llm_response(response: *mut AppleLLMResponse);
}

/// Check if Apple Intelligence is available on this device.
pub fn check_availability() -> bool {
    unsafe { is_apple_intelligence_available() == 1 }
}

/// Process text with Apple Intelligence using a system prompt and user content.
/// Returns the model's response as a string, or an error message.
pub fn process_text(
    system_prompt: &str,
    user_content: &str,
    max_tokens: i32,
) -> Result<String, String> {
    let system_cstr = CString::new(system_prompt).map_err(|e| e.to_string())?;
    let user_cstr = CString::new(user_content).map_err(|e| e.to_string())?;

    let response_ptr = unsafe {
        process_text_with_system_prompt_apple(system_cstr.as_ptr(), user_cstr.as_ptr(), max_tokens)
    };

    if response_ptr.is_null() {
        return Err("Null response from Apple LLM".to_string());
    }

    let response = unsafe { &*response_ptr };

    let result = if response.success == 1 {
        if response.response.is_null() {
            Ok(String::new())
        } else {
            let c_str = unsafe { CStr::from_ptr(response.response) };
            Ok(c_str.to_string_lossy().into_owned())
        }
    } else {
        let error_msg = if !response.error_message.is_null() {
            let c_str = unsafe { CStr::from_ptr(response.error_message) };
            c_str.to_string_lossy().into_owned()
        } else {
            "Unknown error".to_string()
        };
        Err(error_msg)
    };

    unsafe { free_apple_llm_response(response_ptr) };

    result
}
