import SwiftUI

struct ErrorView: View {
    let message: String
    let retryAction: (() async -> Void)?
    @Environment(ThemeManager.self) private var theme

    init(_ message: String, retryAction: (() async -> Void)? = nil) {
        self.message = message
        self.retryAction = retryAction
    }

    var body: some View {
        VStack(spacing: 16) {
            Text("[!] ERROR")
                .font(.mono(.title3, weight: .bold))
                .foregroundStyle(theme.terminalRed)

            Text(message)
                .font(.mono(.caption))
                .foregroundStyle(theme.terminalDim)
                .multilineTextAlignment(.center)

            if let retryAction {
                Button {
                    Task { await retryAction() }
                } label: {
                    Text("[ RETRY ]")
                        .font(.mono(.subheadline, weight: .bold))
                        .foregroundStyle(theme.terminalGreen)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 2)
                                .stroke(theme.terminalGreen.opacity(0.6), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
        .background(theme.terminalBg)
    }
}
