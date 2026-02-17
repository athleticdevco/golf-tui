import SwiftUI

struct LeaderboardHeaderView: View {
    let tournament: Tournament
    let round: Int
    let isPlayoff: Bool
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(tournament.name.uppercased())
                    .font(.pixel(8))
                    .foregroundStyle(theme.terminalGreen)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
                Spacer()
                StatusBadge(status: tournament.status)
            }

            if let venue = tournament.venue {
                Text(venue)
                    .font(.mono(.caption, weight: .regular))
                    .foregroundStyle(theme.terminalDim)
            }

            HStack(spacing: 12) {
                Text(Formatters.formatDateRange(start: tournament.date, end: tournament.endDate))
                    .font(.mono(.caption2))
                    .foregroundStyle(theme.terminalDim)

                if let purse = tournament.purse {
                    Text(purse)
                        .font(.mono(.caption2))
                        .foregroundStyle(theme.terminalDim)
                }

                Spacer()

                // Round indicators
                HStack(spacing: 4) {
                    ForEach(1...4, id: \.self) { r in
                        Text("R\(r)")
                            .font(.mono(.caption2, weight: r == round ? .bold : .regular))
                            .foregroundStyle(
                                r == round
                                ? (isPlayoff ? theme.terminalAmber : theme.terminalGreen)
                                : theme.terminalDim
                            )
                    }
                    if isPlayoff {
                        Text("PO")
                            .font(.mono(.caption2, weight: .bold))
                            .foregroundStyle(theme.terminalAmber)
                    }
                }
            }
        }
        .padding(.vertical, 6)
        .listRowBackground(theme.cardBg)
    }
}
