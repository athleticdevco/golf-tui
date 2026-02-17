import SwiftUI

// MARK: - Terminal Constants (non-color)

enum RetroTheme {
    // Score symbols (matching TUI)
    static let underParSymbol = "\u{25BC}"
    static let overParSymbol = "\u{25B2}"
    static let evenParSymbol = "\u{25CF}"

    // Box-drawing characters
    static let boxH = "\u{2500}"
    static let boxV = "\u{2502}"
    static let boxTL = "\u{250C}"
    static let boxTR = "\u{2510}"
    static let boxBL = "\u{2514}"
    static let boxBR = "\u{2518}"
    static let boxML = "\u{251C}"
    static let boxMR = "\u{2524}"
    static let boxTM = "\u{252C}"
    static let boxBM = "\u{2534}"
    static let boxCross = "\u{253C}"
}

// MARK: - Font Helpers

extension Font {
    /// Press Start 2P pixel font at a given size
    static func pixel(_ size: CGFloat) -> Font {
        .custom("PressStart2P-Regular", size: size)
    }

    /// Monospaced system font for data display
    static func mono(_ style: Font.TextStyle = .body, weight: Font.Weight = .regular) -> Font {
        .system(style, design: .monospaced, weight: weight)
    }
}

// MARK: - Terminal-Styled Score Formatting

extension Formatters {
    /// Format score with retro symbols: ▼5, ▲3, ●E
    static func formatRetroScore(_ score: Int) -> String {
        if score < 0 {
            return "\(RetroTheme.underParSymbol)\(abs(score))"
        } else if score > 0 {
            return "\(RetroTheme.overParSymbol)\(score)"
        }
        return "\(RetroTheme.evenParSymbol)E"
    }
}

// MARK: - View Modifiers

struct TerminalBackground: ViewModifier {
    @Environment(ThemeManager.self) private var theme

    func body(content: Content) -> some View {
        content
            .background(theme.terminalBg)
    }
}

struct RetroListStyle: ViewModifier {
    @Environment(ThemeManager.self) private var theme

    func body(content: Content) -> some View {
        content
            .scrollContentBackground(.hidden)
            .background(theme.terminalBg)
    }
}

struct TerminalCard: ViewModifier {
    @Environment(ThemeManager.self) private var theme

    func body(content: Content) -> some View {
        content
            .padding(12)
            .background(theme.cardBg)
            .overlay(
                RoundedRectangle(cornerRadius: 2)
                    .stroke(theme.border, lineWidth: 1)
            )
    }
}

extension View {
    func terminalBackground() -> some View {
        modifier(TerminalBackground())
    }

    func retroListStyle() -> some View {
        modifier(RetroListStyle())
    }

    func terminalCard() -> some View {
        modifier(TerminalCard())
    }
}

// MARK: - String Padding Helpers

extension String {
    /// Left-pad a string with spaces to reach the given length.
    /// Safe replacement for `String(format: "%Ns", ...)` which crashes in Swift.
    func leftPadded(to length: Int) -> String {
        if count >= length { return self }
        return String(repeating: " ", count: length - count) + self
    }
}
