import SwiftUI

struct ScoreText: View {
    let score: String
    let scoreNum: Int
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        HStack(spacing: 2) {
            // Arrow symbol — dim so it doesn't compete with the number
            Text(symbol)
                .font(.mono(.caption2, weight: .bold))
                .foregroundStyle(theme.terminalDim)

            // Score number — colored by par convention
            Text(displayScore)
                .font(.mono(.callout, weight: scoreNum != 0 ? .bold : .regular))
                .foregroundStyle(theme.scoreColor(for: scoreNum))
        }
    }

    private var symbol: String {
        if scoreNum < 0 { return RetroTheme.underParSymbol }
        if scoreNum > 0 { return RetroTheme.overParSymbol }
        return RetroTheme.evenParSymbol
    }

    private var displayScore: String {
        if scoreNum < 0 { return score.replacingOccurrences(of: "-", with: "") }
        if scoreNum > 0 { return score.replacingOccurrences(of: "+", with: "") }
        return "E"
    }
}

struct HoleScoreView: View {
    let toPar: Int
    let strokes: Int
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        Text(displayText)
            .font(.mono(.callout, weight: .medium))
            .foregroundStyle(theme.holeScoreColor(for: toPar))
            .frame(maxWidth: .infinity)
    }

    private var displayText: String {
        let s = "\(strokes)"
        if toPar <= -2 { return "<<\(s)>>" }  // Eagle+
        if toPar == -1 { return "<\(s)>" }     // Birdie
        if toPar == 1 { return "[\(s)]" }      // Bogey
        if toPar >= 2 { return "[[\(s)]]" }    // Double+
        return s                                // Par
    }
}
