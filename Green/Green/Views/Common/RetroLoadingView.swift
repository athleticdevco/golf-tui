import SwiftUI

struct RetroLoadingView: View {
    let message: String
    @Environment(ThemeManager.self) private var theme

    init(_ message: String = "LOADING...") {
        self.message = message
    }

    private let frames = ["|", "/", "\u{2500}", "\\"]

    var body: some View {
        VStack(spacing: 16) {
            TimelineView(.periodic(from: .now, by: 0.15)) { timeline in
                let index = Int(timeline.date.timeIntervalSinceReferenceDate / 0.15) % frames.count
                Text(frames[index])
                    .font(.mono(.title, weight: .bold))
                    .foregroundStyle(theme.terminalGreen)
            }

            Text(message)
                .font(.mono(.caption, weight: .medium))
                .foregroundStyle(theme.terminalGreen.opacity(0.8))

            // Animated dots bar
            TimelineView(.periodic(from: .now, by: 0.3)) { timeline in
                let count = (Int(timeline.date.timeIntervalSinceReferenceDate / 0.3) % 4) + 1
                Text("[" + String(repeating: "\u{2588}", count: count) + String(repeating: "\u{2591}", count: 4 - count) + "]")
                    .font(.mono(.caption2))
                    .foregroundStyle(theme.terminalDimGreen)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(theme.terminalBg)
    }
}
