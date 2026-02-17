import SwiftUI

struct EventLeaderboardView: View {
    let eventId: String
    let eventName: String
    let eventDate: String
    let tour: Tour
    @State private var viewModel = LeaderboardViewModel()
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.leaderboard == nil {
                LoadingView("Loading leaderboard...")
            } else if let error = viewModel.error, viewModel.leaderboard == nil {
                ErrorView(error) {
                    await viewModel.loadEvent(eventId: eventId, eventName: eventName, eventDate: eventDate, tour: tour)
                }
            } else if let leaderboard = viewModel.leaderboard {
                List {
                    Section {
                        LeaderboardHeaderView(
                            tournament: leaderboard.tournament,
                            round: leaderboard.round,
                            isPlayoff: leaderboard.isPlayoff
                        )
                    }

                    ForEach(leaderboard.entries) { entry in
                        NavigationLink(value: eventLeaderboardDestination(for: entry, tournament: leaderboard.tournament)) {
                            LeaderboardRowView(entry: entry, showRounds: leaderboard.round)
                        }
                    }
                }
                .listStyle(.plain)
                .retroListStyle()
                .refreshable {
                    await viewModel.loadEvent(eventId: eventId, eventName: eventName, eventDate: eventDate, tour: tour)
                }
            } else {
                ErrorView("Could not load event leaderboard") {
                    await viewModel.loadEvent(eventId: eventId, eventName: eventName, eventDate: eventDate, tour: tour)
                }
            }
        }
        .background(theme.terminalBg)
        .navigationTitle(eventName)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadEvent(eventId: eventId, eventName: eventName, eventDate: eventDate, tour: tour)
        }
    }

    private func eventLeaderboardDestination(for entry: LeaderboardEntry, tournament: Tournament) -> NavigationDestination {
        if entry.scorecardAvailable {
            return .scorecard(
                eventId: tournament.id,
                eventDate: tournament.date,
                playerId: entry.player.id,
                playerName: entry.player.name
            )
        } else {
            return .playerProfile(
                playerId: entry.player.id,
                playerName: entry.player.name
            )
        }
    }
}
