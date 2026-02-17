import SwiftUI

struct AsciiHeaderView: View {
    let title: String
    @Environment(ThemeManager.self) private var theme

    init(_ title: String = "GREEN") {
        self.title = title
    }

    var body: some View {
        VStack(spacing: 2) {
            Text("\u{2554}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2557}")
                .font(.mono(.caption2))
                .foregroundStyle(theme.terminalDimGreen)
            Text(title)
                .font(.pixel(14))
                .foregroundStyle(theme.terminalGreen)
                .shadow(color: theme.terminalGreen.opacity(0.4), radius: 4)
            Text("\u{255A}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{2550}\u{255D}")
                .font(.mono(.caption2))
                .foregroundStyle(theme.terminalDimGreen)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }
}
