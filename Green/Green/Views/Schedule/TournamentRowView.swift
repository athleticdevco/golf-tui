import SwiftUI

struct TournamentRowView: View {
    let tournament: Tournament
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(tournament.name)
                    .font(.mono(.subheadline, weight: .medium))
                    .foregroundStyle(theme.terminalGreen.opacity(0.9))
                    .lineLimit(2)

                HStack(spacing: 8) {
                    Text(Formatters.formatDateRange(start: tournament.date, end: tournament.endDate))
                        .font(.mono(.caption2))
                        .foregroundStyle(theme.terminalDim)

                    if let venue = tournament.venue {
                        Text(venue)
                            .font(.mono(.caption2))
                            .foregroundStyle(theme.terminalDim)
                            .lineLimit(1)
                    }
                }

                if let location = tournament.location, !location.isEmpty {
                    Text(location)
                        .font(.mono(.caption2))
                        .foregroundStyle(theme.terminalDim.opacity(0.6))
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                StatusBadge(status: tournament.status)
                if let purse = tournament.purse {
                    Text(purse)
                        .font(.mono(.caption2))
                        .foregroundStyle(theme.terminalDim)
                }
            }
        }
        .padding(.vertical, 4)
    }
}
