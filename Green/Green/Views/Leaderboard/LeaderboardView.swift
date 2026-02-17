import SwiftUI

struct LeaderboardView: View {
    @State private var viewModel = LeaderboardViewModel()
    @Bindable var tourVM: TourSelectionViewModel
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(spacing: 0) {
            TourPicker(selectedTour: $tourVM.selectedTour, activeTours: tourVM.activeTours)
                .padding(.vertical, 8)

            if viewModel.isLoading && viewModel.leaderboard == nil {
                LoadingView("Loading leaderboard...")
            } else if let error = viewModel.error, viewModel.leaderboard == nil {
                ErrorView(error) { await viewModel.load(tour: tourVM.selectedTour) }
            } else if let leaderboard = viewModel.leaderboard {
                leaderboardContent(leaderboard)
            }
        }
        .background(theme.terminalBg)
        .navigationTitle("Leaderboard")
        .task(id: tourVM.selectedTour) {
            await viewModel.load(tour: tourVM.selectedTour)
        }
    }

    @ViewBuilder
    private func leaderboardContent(_ leaderboard: Leaderboard) -> some View {
        List {
            Section {
                LeaderboardHeaderView(
                    tournament: leaderboard.tournament,
                    round: leaderboard.round,
                    isPlayoff: leaderboard.isPlayoff
                )
            }

            let activeEntries = leaderboard.entries.filter { $0.status == .active }
            let cutEntries = leaderboard.entries.filter { $0.status != .active }

            if !activeEntries.isEmpty {
                Section {
                    ForEach(activeEntries) { entry in
                        NavigationLink(value: leaderboardDestination(for: entry, tournament: leaderboard.tournament)) {
                            LeaderboardRowView(entry: entry, showRounds: leaderboard.round)
                        }
                    }
                }
            }

            if !cutEntries.isEmpty {
                Section {
                    HStack {
                        Text("\u{2500}\u{2500}\u{2500} CUT / WD / DQ \u{2500}\u{2500}\u{2500}")
                            .font(.mono(.caption2, weight: .bold))
                            .foregroundStyle(theme.terminalDim)
                        Spacer()
                    }
                    .listRowBackground(theme.terminalBg)

                    ForEach(cutEntries) { entry in
                        NavigationLink(value: leaderboardDestination(for: entry, tournament: leaderboard.tournament)) {
                            LeaderboardRowView(entry: entry, showRounds: leaderboard.round)
                        }
                    }
                }
            }
        }
        .listStyle(.plain)
        .retroListStyle()
        .refreshable {
            await viewModel.refresh(tour: tourVM.selectedTour)
        }
    }

    private func leaderboardDestination(for entry: LeaderboardEntry, tournament: Tournament) -> NavigationDestination {
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
