import SwiftUI

struct PlayerProfileView: View {
    let playerId: String
    let playerName: String
    let tour: Tour
    @State private var viewModel = PlayerProfileViewModel()
    @Environment(FavoritesManager.self) private var favoritesManager
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.profile == nil {
                LoadingView("Loading profile...")
            } else if let error = viewModel.error, viewModel.profile == nil {
                ErrorView(error) {
                    await viewModel.load(playerId: playerId, playerName: playerName, tour: tour)
                }
            } else if let profile = viewModel.profile {
                profileContent(profile)
            } else {
                ErrorView("Could not load player profile") {
                    await viewModel.load(playerId: playerId, playerName: playerName, tour: tour)
                }
            }
        }
        .background(theme.terminalBg)
        .navigationTitle(playerName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    favoritesManager.toggle(playerId: playerId, playerName: playerName)
                } label: {
                    Image(systemName: favoritesManager.isFavorite(playerId) ? "star.fill" : "star")
                        .foregroundStyle(
                            favoritesManager.isFavorite(playerId)
                                ? theme.terminalGold
                                : theme.terminalDim
                        )
                }
            }
        }
        .task {
            await viewModel.load(playerId: playerId, playerName: playerName, tour: tour)
        }
    }

    @ViewBuilder
    private func profileContent(_ profile: PlayerProfile) -> some View {
        ScrollView {
            VStack(spacing: 16) {
                // Player name header
                Text(profile.player.name.uppercased())
                    .font(.pixel(10))
                    .foregroundStyle(theme.terminalGreen)
                    .padding(.top, 8)

                // Season summary
                seasonSummarySection(profile)

                // Performance stats
                if !profile.rankings.isEmpty {
                    performanceSection(profile)
                }

                // Recent results
                if !profile.recentResults.isEmpty {
                    recentResultsSection(profile)
                }

                // Season history
                if !profile.seasonHistory.isEmpty {
                    seasonHistorySection(profile)
                }
            }
            .padding()
        }
        .background(theme.terminalBg)
    }

    @ViewBuilder
    private func seasonSummarySection(_ profile: PlayerProfile) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SEASON SUMMARY")
                .font(.pixel(7))
                .foregroundStyle(theme.terminalGreen)

            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 12) {
                statChip("EVTS", value: profile.events.map { String($0) })
                statChip("CUTS", value: profile.cutsMade.map { String($0) })
                statChip("WINS", value: profile.wins.map { String($0) })
                statChip("T10", value: profile.topTens.map { String($0) })
            }

            if let earnings = profile.earnings {
                HStack {
                    Text("EARNINGS")
                        .font(.mono(.caption2, weight: .bold))
                        .foregroundStyle(theme.terminalDim)
                    Spacer()
                    Text(earnings)
                        .font(.mono(.subheadline, weight: .bold))
                        .foregroundStyle(theme.terminalGreen)
                }
                .padding(.horizontal, 4)
            }
        }
        .terminalCard()
    }

    @ViewBuilder
    private func statChip(_ label: String, value: String?) -> some View {
        VStack(spacing: 4) {
            Text(value ?? "-")
                .font(.mono(.title3, weight: .bold))
                .foregroundStyle(theme.terminalGreen)
            Text(label)
                .font(.mono(.caption2, weight: .medium))
                .foregroundStyle(theme.terminalDim)
        }
    }

    @ViewBuilder
    private func performanceSection(_ profile: PlayerProfile) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("PERFORMANCE")
                .font(.pixel(7))
                .foregroundStyle(theme.terminalGreen)

            let validRankings = profile.rankings.filter { r in
                let v = r.displayValue.trimmingCharacters(in: .whitespaces)
                return !v.isEmpty && v != "--" && v != "-" && v.lowercased() != "n/a"
            }

            ForEach(validRankings) { metric in
                NavigationLink(value: NavigationDestination.statLeaders(metricName: metric.name)) {
                    HStack {
                        Text(metric.displayName)
                            .font(.mono(.caption, weight: .regular))
                            .foregroundStyle(theme.terminalGreen.opacity(0.8))
                        Spacer()
                        Text(metric.displayValue)
                            .font(.mono(.caption, weight: .bold))
                            .foregroundStyle(theme.terminalCyan)
                        if let rank = metric.rank {
                            Text("#\(rank)")
                                .font(.mono(.caption2, weight: .bold))
                                .foregroundStyle(theme.terminalDim)
                        }
                    }
                }

                if metric.id != validRankings.last?.id {
                    Text(String(repeating: RetroTheme.boxH, count: 40))
                        .font(.mono(.caption2))
                        .foregroundStyle(theme.border)
                        .lineLimit(1)
                }
            }
        }
        .terminalCard()
    }

    @ViewBuilder
    private func recentResultsSection(_ profile: PlayerProfile) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("RECENT RESULTS")
                .font(.pixel(7))
                .foregroundStyle(theme.terminalGreen)

            ForEach(profile.recentResults) { result in
                NavigationLink(value: NavigationDestination.eventLeaderboard(
                    eventId: result.tournamentId,
                    eventName: result.tournamentName,
                    eventDate: result.date
                )) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(result.tournamentName)
                                .font(.mono(.caption, weight: .medium))
                                .foregroundStyle(theme.terminalGreen.opacity(0.8))
                                .lineLimit(1)
                            Text(Formatters.formatDate(result.date))
                                .font(.mono(.caption2))
                                .foregroundStyle(theme.terminalDim)
                        }
                        Spacer()
                        Text(result.position)
                            .font(.mono(.callout, weight: .bold))
                            .foregroundStyle(theme.positionColor(for: result.position))
                        Text(result.score)
                            .font(.mono(.caption2))
                            .foregroundStyle(theme.terminalDim)
                    }
                }

                if result.id != profile.recentResults.last?.id {
                    Text(String(repeating: RetroTheme.boxH, count: 40))
                        .font(.mono(.caption2))
                        .foregroundStyle(theme.border)
                        .lineLimit(1)
                }
            }
        }
        .terminalCard()
    }

    @ViewBuilder
    private func seasonHistorySection(_ profile: PlayerProfile) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SEASON HISTORY")
                .font(.pixel(7))
                .foregroundStyle(theme.terminalGreen)

            ForEach(profile.seasonHistory) { season in
                NavigationLink(value: NavigationDestination.seasonResults(
                    playerId: profile.player.id,
                    year: season.year
                )) {
                    HStack {
                        Text(String(season.year))
                            .font(.mono(.subheadline, weight: .bold))
                            .foregroundStyle(theme.terminalGreen)

                        Spacer()

                        HStack(spacing: 12) {
                            miniStat("Evts", value: season.events)
                            miniStat("W", value: season.wins)
                            miniStat("T10", value: season.topTens)
                            if let avg = season.scoringAvg {
                                VStack(spacing: 1) {
                                    Text(avg)
                                        .font(.mono(.caption, weight: .medium))
                                        .foregroundStyle(theme.terminalCyan)
                                    Text("Avg")
                                        .font(.mono(.caption2))
                                        .foregroundStyle(theme.terminalDim)
                                }
                            }
                        }

                        Text(">")
                            .font(.mono(.caption2))
                            .foregroundStyle(theme.terminalDim)
                    }
                }

                if season.id != profile.seasonHistory.last?.id {
                    Text(String(repeating: RetroTheme.boxH, count: 40))
                        .font(.mono(.caption2))
                        .foregroundStyle(theme.border)
                        .lineLimit(1)
                }
            }
        }
        .terminalCard()
    }

    @ViewBuilder
    private func miniStat(_ label: String, value: Int) -> some View {
        VStack(spacing: 1) {
            Text("\(value)")
                .font(.mono(.caption, weight: .bold))
                .foregroundStyle(theme.terminalGreen)
            Text(label)
                .font(.mono(.caption2))
                .foregroundStyle(theme.terminalDim)
        }
    }
}
