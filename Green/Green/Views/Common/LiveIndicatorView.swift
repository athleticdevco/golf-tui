import SwiftUI

struct LiveIndicatorView: View {
    @State private var isAnimating = false
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        HStack(spacing: 4) {
            Text("\u{25CF}")
                .font(.caption2)
                .foregroundStyle(theme.terminalGreen)
                .opacity(isAnimating ? 1.0 : 0.2)
                .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isAnimating)
            Text("LIVE")
                .font(.mono(.caption2, weight: .bold))
                .foregroundStyle(theme.terminalGreen)
        }
        .onAppear { isAnimating = true }
    }
}
