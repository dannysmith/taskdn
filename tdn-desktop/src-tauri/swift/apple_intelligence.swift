import Dispatch
import Foundation
import FoundationModels

// MARK: - Generable types for structured task parsing

@available(macOS 26.0, *)
@Generable
private struct ParsedTask: Sendable {
    @Guide(description: "A concise task title summarizing the request")
    let title: String

    @Guide(description: "Additional context or notes, empty string if none")
    let body: String

    let status: ParsedStatus

    @Guide(description: "Due date in YYYY-MM-DD format, empty string if none")
    let due: String

    @Guide(description: "Scheduled date in YYYY-MM-DD format, empty string if none")
    let scheduled: String

    @Guide(description: "Defer-until date in YYYY-MM-DD format, empty string if none")
    let deferUntil: String

    @Guide(description: "Exact project name from the available list, empty string if none")
    let project: String

    @Guide(description: "Exact area name from the available list, empty string if none")
    let area: String
}

@available(macOS 26.0, *)
@Generable
private enum ParsedStatus: Sendable {
    case inbox
    case icebox
    case ready
    case inProgress
    case blocked
}

// MARK: - Helpers

private typealias ResponsePointer = UnsafeMutablePointer<AppleLLMResponse>

private func duplicateCString(_ text: String) -> UnsafeMutablePointer<CChar>? {
    return text.withCString { basePointer in
        guard let duplicated = strdup(basePointer) else { return nil }
        return duplicated
    }
}

/// Strip invisible Unicode characters that LLMs sometimes insert.
private func stripInvisibleChars(_ text: String) -> String {
    return text.replacingOccurrences(of: "\u{200B}", with: "")  // zero-width space
        .replacingOccurrences(of: "\u{200C}", with: "")         // zero-width non-joiner
        .replacingOccurrences(of: "\u{200D}", with: "")         // zero-width joiner
        .replacingOccurrences(of: "\u{FEFF}", with: "")         // BOM
}

// MARK: - Convert ParsedStatus to string

@available(macOS 26.0, *)
private func statusToString(_ status: ParsedStatus) -> String {
    switch status {
    case .inbox: return "inbox"
    case .icebox: return "icebox"
    case .ready: return "ready"
    case .inProgress: return "in-progress"
    case .blocked: return "blocked"
    }
}

// MARK: - Convert ParsedTask to JSON string

@available(macOS 26.0, *)
private func parsedTaskToJSON(_ task: ParsedTask) -> String {
    // Build JSON manually to avoid Codable complexity with @Generable
    let fields: [(String, String)] = [
        ("title", task.title),
        ("body", task.body),
        ("status", statusToString(task.status)),
        ("due", task.due),
        ("scheduled", task.scheduled),
        ("deferUntil", task.deferUntil),
        ("project", task.project),
        ("area", task.area),
    ]

    let pairs = fields.map { (key, value) in
        let escaped = value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: "\r", with: "\\r")
            .replacingOccurrences(of: "\t", with: "\\t")
        return "\"\(key)\":\"\(escaped)\""
    }

    return "{\(pairs.joined(separator: ","))}"
}

// MARK: - Public C-callable functions

@_cdecl("is_apple_intelligence_available")
public func isAppleIntelligenceAvailable() -> Int32 {
    guard #available(macOS 26.0, *) else {
        return 0
    }

    let model = SystemLanguageModel.default
    switch model.availability {
    case .available:
        return 1
    case .unavailable:
        return 0
    }
}

@_cdecl("process_text_with_system_prompt_apple")
public func processTextWithSystemPrompt(
    _ systemPrompt: UnsafePointer<CChar>,
    _ userContent: UnsafePointer<CChar>,
    maxTokens: Int32
) -> UnsafeMutablePointer<AppleLLMResponse> {
    let swiftSystemPrompt = String(cString: systemPrompt)
    let swiftUserContent = String(cString: userContent)
    let responsePtr = ResponsePointer.allocate(capacity: 1)
    responsePtr.initialize(to: AppleLLMResponse(response: nil, success: 0, error_message: nil))

    guard #available(macOS 26.0, *) else {
        responsePtr.pointee.error_message = duplicateCString(
            "Apple Intelligence requires macOS 26 or newer."
        )
        return responsePtr
    }

    let model = SystemLanguageModel.default
    guard model.availability == .available else {
        responsePtr.pointee.error_message = duplicateCString(
            "Apple Intelligence is not currently available on this device."
        )
        return responsePtr
    }

    let semaphore = DispatchSemaphore(value: 0)

    final class ResultBox: @unchecked Sendable {
        var response: String?
        var error: String?
    }
    let box = ResultBox()

    Task.detached(priority: .userInitiated) {
        defer { semaphore.signal() }
        do {
            let session = LanguageModelSession(
                model: model,
                instructions: swiftSystemPrompt
            )

            // Try structured output first
            do {
                let structured = try await session.respond(
                    to: swiftUserContent,
                    generating: ParsedTask.self
                )
                let json = parsedTaskToJSON(structured.content)
                box.response = stripInvisibleChars(json)
            } catch {
                // Fall back to plain text response
                let fallback = try await session.respond(to: swiftUserContent)
                box.response = stripInvisibleChars(fallback.content)
            }
        } catch {
            box.error = error.localizedDescription
        }
    }

    semaphore.wait()

    if let response = box.response {
        responsePtr.pointee.response = duplicateCString(response)
        responsePtr.pointee.success = 1
    } else {
        responsePtr.pointee.error_message = duplicateCString(box.error ?? "Unknown error")
    }

    return responsePtr
}

@_cdecl("free_apple_llm_response")
public func freeAppleLLMResponse(_ response: UnsafeMutablePointer<AppleLLMResponse>?) {
    guard let response = response else { return }

    if let responseStr = response.pointee.response {
        free(UnsafeMutablePointer(mutating: responseStr))
    }
    if let errorStr = response.pointee.error_message {
        free(UnsafeMutablePointer(mutating: errorStr))
    }

    response.deallocate()
}
