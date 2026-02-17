import SwiftUI

struct SeasonResultsView: View {
    let playerId: String
    let year: Int
    let tour: Tour
    @State private var viewModel = PlayerProfileViewModel()
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        Group {
            if viewModel.seasonResultsLoading && viewModel.seasonResults == nil {
                LoadingView("Loading season results...")
            } else if let results = viewModel.seasonResults {
                if results.results.isEmpty {
                    VStack(spacing: 12) {
                        Spacer()
                        Text("No tournament results yet for \(String(year))")
                            .font(.mono(.caption, weight: .medium))
                            .foregroundStyle(theme.terminalDim)
                            .multilineTextAlignment(.center)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                    .background(theme.terminalBg)
                } else {
                    resultsList(results)
                }
            } else {
                ErrorView("Could not load season results") {
                    await viewModel.loadSeasonResults(playerId: playerId, tour: tour, year: year)
                }
            }
        }
        .background(theme.terminalBg)
        .navigationTitle("\(String(year)) Season")
        .task {
            await viewModel.loadSeasonResults(playerId: playerId, tour: tour, year: year)
        }
    }

    @ViewBuilder
    private func resultsList(_ results: SeasonResults) -> some View {
        List(results.results) { result in
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
            .listRowBackground(theme.terminalBg)
        }
        .listStyle(.plain)
        .retroListStyle()
    }
}
