import SwiftUI

struct PixelBorder: ViewModifier {
    @Environment(ThemeManager.self) private var theme
    var title: String? = nil

    func body(content: Content) -> some View {
        VStack(spacing: 0) {
            // Top border with optional title
            HStack(spacing: 0) {
                Text(RetroTheme.boxTL)
                if let title {
                    Text(RetroTheme.boxH)
                    Text(" \(title) ")
                        .font(.pixel(7))
                        .foregroundStyle(theme.terminalGreen)
                    Text(String(repeating: RetroTheme.boxH, count: 1))
                }
                Text(String(repeating: RetroTheme.boxH, count: title == nil ? 20 : 1))
                Spacer()
                Text(RetroTheme.boxTR)
            }
            .font(.mono(.caption2))
            .foregroundStyle(theme.border)
            .lineLimit(1)

            // Content with side borders
            HStack(spacing: 0) {
                Text(RetroTheme.boxV)
                    .font(.mono(.caption2))
                    .foregroundStyle(theme.border)
                content
                    .frame(maxWidth: .infinity)
                Text(RetroTheme.boxV)
                    .font(.mono(.caption2))
                    .foregroundStyle(theme.border)
            }

            // Bottom border
            HStack(spacing: 0) {
                Text(RetroTheme.boxBL)
                Text(String(repeating: RetroTheme.boxH, count: 20))
                Spacer()
                Text(RetroTheme.boxBR)
            }
            .font(.mono(.caption2))
            .foregroundStyle(theme.border)
            .lineLimit(1)
        }
        .background(theme.cardBg)
    }
}

extension View {
    func pixelBorder(title: String? = nil) -> some View {
        modifier(PixelBorder(title: title))
    }
}
