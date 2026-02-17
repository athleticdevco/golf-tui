import SwiftUI

struct StatLeadersView: View {
    let metricName: String
    let tour: Tour
    @State private var viewModel = StatsViewModel()
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.leaders.isEmpty {
                LoadingView("Loading leaders...")
            } else if let error = viewModel.error, viewModel.leaders.isEmpty {
                ErrorView(error) {
                    await viewModel.loadLeaders(tour: tour, metricName: metricName)
                }
            } else if viewModel.leaders.isEmpty {
                ErrorView("No leaders found for this stat")
            } else {
                List(viewModel.leaders) { leader in
                    NavigationLink(value: NavigationDestination.playerProfile(
                        playerId: leader.playerId,
                        playerName: leader.playerName
                    )) {
                        HStack(spacing: 12) {
                            Text("\(leader.rank)")
                                .font(.mono(.callout, weight: .bold))
                                .foregroundStyle(leader.rank <= 3 ? theme.terminalGold : theme.terminalDim)
                                .frame(width: 28, alignment: .trailing)

                            Text(leader.playerName)
                                .font(.mono(.caption, weight: .medium))
                                .foregroundStyle(theme.terminalGreen.opacity(0.9))
                                .lineLimit(1)

                            Spacer()

                            Text(leader.displayValue)
                                .font(.mono(.subheadline, weight: .bold))
                                .foregroundStyle(theme.terminalCyan)
                        }
                    }
                    .listRowBackground(theme.terminalBg)
                }
                .listStyle(.plain)
                .retroListStyle()
            }
        }
        .background(theme.terminalBg)
        .navigationTitle(viewModel.selectedCategory?.displayName ?? metricName)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadLeaders(tour: tour, metricName: metricName)
        }
    }
}
