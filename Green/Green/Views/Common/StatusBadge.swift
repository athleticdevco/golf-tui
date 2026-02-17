import SwiftUI

struct StatusBadge: View {
    let status: TournamentStatus
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        switch status {
        case .in:
            LiveIndicatorView()
        case .post:
            Text("[FINAL]")
                .font(.mono(.caption2, weight: .bold))
                .foregroundStyle(theme.terminalAmber)
        case .pre:
            Text("[UPCOMING]")
                .font(.mono(.caption2, weight: .medium))
                .foregroundStyle(theme.terminalDim)
        }
    }
}
