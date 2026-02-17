import SwiftUI

struct LeaderboardRowView: View {
    let entry: LeaderboardEntry
    let showRounds: Int
    @Environment(FavoritesManager.self) private var favoritesManager
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        HStack(spacing: 6) {
            // Position
            Text(entry.position)
                .font(.mono(.callout, weight: .bold))
                .foregroundStyle(theme.positionColor(for: entry.position))
                .frame(width: 32, alignment: .trailing)

            // Flag + Name
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    FlagView(countryCode: entry.player.countryCode)
                    Text(entry.player.name)
                        .font(.mono(.subheadline, weight: .medium))
                        .foregroundStyle(theme.terminalGreen.opacity(0.9))
                        .lineLimit(1)
                    if entry.player.amateur == true {
                        Text("(a)")
                            .font(.mono(.caption2))
                            .foregroundStyle(theme.terminalDim)
                    }
                    if entry.inPlayoff {
                        Text("[PO]")
                            .font(.mono(.caption2, weight: .bold))
                            .foregroundStyle(theme.terminalAmber)
                    }
                    if favoritesManager.isFavorite(entry.player.id) {
                        Text("\u{2605}")
                            .font(.mono(.caption2))
                            .foregroundStyle(theme.terminalGold)
                    }
                }

                // Round scores — only show when 2+ rounds give useful breakdown
                if entry.rounds.count >= 2 {
                    HStack(spacing: 6) {
                        ForEach(Array(entry.rounds.enumerated()), id: \.offset) { _, round in
                            Text(round)
                                .font(.mono(.caption2))
                                .foregroundStyle(theme.terminalDim)
                        }
                    }
                }
            }

            Spacer()

            // Score column
            VStack(alignment: .trailing, spacing: 2) {
                ScoreText(score: entry.score, scoreNum: entry.scoreNum)

                HStack(spacing: 4) {
                    if entry.status != .active {
                        Text(entry.status.rawValue.uppercased())
                            .font(.mono(.caption2, weight: .medium))
                            .foregroundStyle(theme.terminalDim)
                    } else {
                        let isFinished = entry.thru == "F" || entry.thru == "18"
                        if isFinished {
                            Text("F")
                                .font(.mono(.caption2, weight: .medium))
                                .foregroundStyle(theme.terminalDim)
                        } else {
                            Text(entry.today)
                                .font(.mono(.caption2))
                                .foregroundStyle(theme.scoreColor(for: entry.todayNum))
                            Text(entry.thru)
                                .font(.mono(.caption2))
                                .foregroundStyle(theme.terminalDim)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 2)
        .listRowBackground(theme.terminalBg)
    }
}
