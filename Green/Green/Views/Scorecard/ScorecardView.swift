import SwiftUI

struct ScorecardView: View {
    let eventId: String
    let eventDate: String
    let playerId: String
    let playerName: String
    let tour: Tour
    @State private var viewModel = ScorecardViewModel()
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.scorecard == nil {
                LoadingView("Loading scorecard...")
            } else if let error = viewModel.error, viewModel.scorecard == nil {
                ErrorView(error) {
                    await viewModel.load(eventId: eventId, eventDate: eventDate, playerId: playerId, playerName: playerName, tour: tour)
                }
            } else if let scorecard = viewModel.scorecard {
                scorecardContent(scorecard)
            } else {
                ErrorView("Could not load scorecard") {
                    await viewModel.load(eventId: eventId, eventDate: eventDate, playerId: playerId, playerName: playerName, tour: tour)
                }
            }
        }
        .background(theme.terminalBg)
        .navigationTitle("Scorecard")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink(value: NavigationDestination.playerProfile(
                    playerId: playerId, playerName: playerName
                )) {
                    Label("Profile", systemImage: "person.circle")
                }
            }
        }
        .task {
            await viewModel.load(eventId: eventId, eventDate: eventDate, playerId: playerId, playerName: playerName, tour: tour)
            viewModel.startAutoRefresh(eventId: eventId, eventDate: eventDate, playerId: playerId, playerName: playerName, tour: tour)
        }
        .onDisappear {
            viewModel.stopAutoRefresh()
        }
    }

    @ViewBuilder
    private func scorecardContent(_ scorecard: PlayerScorecard) -> some View {
        ScrollView {
            VStack(spacing: 16) {
                // Player + Event info
                VStack(spacing: 4) {
                    Text(scorecard.playerName.uppercased())
                        .font(.pixel(10))
                        .foregroundStyle(theme.terminalGreen)
                    Text(scorecard.eventName)
                        .font(.mono(.caption))
                        .foregroundStyle(theme.terminalDim)
                }
                .padding(.horizontal)

                // Round picker — terminal button style
                if !scorecard.rounds.isEmpty {
                    HStack(spacing: 0) {
                        ForEach(scorecard.rounds, id: \.round) { round in
                            Button {
                                withAnimation(.easeInOut(duration: 0.15)) {
                                    viewModel.selectedRound = round.round
                                }
                            } label: {
                                Text("R\(round.round)")
                                    .font(.mono(.caption, weight: .bold))
                                    .foregroundStyle(
                                        viewModel.selectedRound == round.round
                                        ? theme.terminalGreen
                                        : theme.terminalDim
                                    )
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(
                                        viewModel.selectedRound == round.round
                                        ? theme.terminalGreen.opacity(0.1)
                                        : Color.clear
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 2)
                                            .stroke(
                                                viewModel.selectedRound == round.round
                                                ? theme.terminalGreen.opacity(0.4)
                                                : theme.terminalDim.opacity(0.2),
                                                lineWidth: 1
                                            )
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Hole grid — full width
                if let round = scorecard.rounds.first(where: { $0.round == viewModel.selectedRound }) {
                    HoleGridView(round: round)
                } else if let first = scorecard.rounds.first {
                    HoleGridView(round: first)
                }
            }
            .padding(.vertical)
        }
        .background(theme.terminalBg)
    }
}
