import SwiftUI

enum ThemeMode: String {
    case dark, light
}

@Observable
final class ThemeManager {
    var mode: ThemeMode = .dark

    // MARK: - Backgrounds

    var terminalBg: Color {
        mode == .dark
            ? Color(red: 0.04, green: 0.06, blue: 0.04)
            : .white
    }

    var cardBg: Color {
        mode == .dark
            ? Color(red: 0.07, green: 0.10, blue: 0.07)
            : Color(white: 0.96)
    }

    var rowBg: Color {
        mode == .dark
            ? Color(red: 0.06, green: 0.08, blue: 0.06)
            : Color(white: 0.97)
    }

    // MARK: - Primary Terminal Colors

    var terminalGreen: Color {
        mode == .dark
            ? Color(red: 0.22, green: 1.0, blue: 0.08)
            : Color(red: 0.08, green: 0.30, blue: 0.08)
    }

    var terminalCyan: Color {
        mode == .dark
            ? Color(red: 0.0, green: 0.90, blue: 1.0)
            : Color(red: 0.0, green: 0.35, blue: 0.45)
    }

    var terminalGold: Color {
        mode == .dark
            ? Color(red: 1.0, green: 0.84, blue: 0.0)
            : Color(red: 0.60, green: 0.45, blue: 0.0)
    }

    var terminalRed: Color {
        mode == .dark
            ? Color(red: 1.0, green: 0.19, blue: 0.19)
            : Color(red: 0.70, green: 0.10, blue: 0.10)
    }

    var terminalAmber: Color {
        mode == .dark
            ? Color(red: 1.0, green: 0.75, blue: 0.0)
            : Color(red: 0.65, green: 0.40, blue: 0.0)
    }

    // MARK: - Dim / Secondary

    var terminalDim: Color {
        mode == .dark
            ? Color(white: 0.35)
            : Color(white: 0.45)
    }

    var terminalDimGreen: Color {
        mode == .dark
            ? Color(red: 0.15, green: 0.35, blue: 0.15)
            : Color(red: 0.55, green: 0.65, blue: 0.55)
    }

    var border: Color {
        mode == .dark
            ? Color(red: 0.18, green: 0.35, blue: 0.18)
            : Color(red: 0.45, green: 0.55, blue: 0.45)
    }

    // MARK: - Score Colors

    func scoreColor(for score: Int) -> Color {
        if score < 0 { return terminalRed }
        if score > 0 { return terminalGreen }
        return terminalDim
    }

    func positionColor(for position: String) -> Color {
        if position == "1" || position == "T1" { return terminalGold }
        if position.hasPrefix("T") || (Int(position) ?? 100) <= 10 { return terminalCyan }
        return terminalGreen.opacity(0.85)
    }

    func holeScoreColor(for toPar: Int) -> Color {
        if toPar <= -2 { return terminalGold }
        if toPar == -1 { return terminalGreen }
        if toPar == 1 { return terminalAmber }
        if toPar >= 2 { return terminalRed }
        return terminalDim
    }

    // MARK: - UIKit Colors

    var uiTerminalBg: UIColor { UIColor(terminalBg) }
    var uiTerminalGreen: UIColor { UIColor(terminalGreen) }
    var uiBorder: UIColor { UIColor(border) }
}
