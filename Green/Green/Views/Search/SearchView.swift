import SwiftUI

struct PlayerSearchView: View {
    let tour: Tour
    @State private var viewModel = SearchViewModel()
    @Environment(FavoritesManager.self) private var favoritesManager
    @Environment(ThemeManager.self) private var theme

    private var showingSearch: Bool {
        viewModel.query.count >= 2
    }

    var body: some View {
        List {
            if viewModel.isLoading {
                HStack {
                    Spacer()
                    RetroLoadingView("SEARCHING...")
                        .frame(height: 100)
                    Spacer()
                }
                .listRowBackground(theme.terminalBg)
            } else if showingSearch {
                // Search results
                if viewModel.results.isEmpty {
                    Text("NO PLAYERS FOUND")
                        .font(.mono(.caption, weight: .medium))
                        .foregroundStyle(theme.terminalDim)
                        .frame(maxWidth: .infinity)
                        .listRowBackground(theme.terminalBg)
                } else {
                    ForEach(viewModel.results) { result in
                        NavigationLink(value: NavigationDestination.playerProfile(
                            playerId: result.id,
                            playerName: result.name
                        )) {
                            HStack(spacing: 8) {
                                FlagView(countryCode: result.country)
                                Text(result.name)
                                    .font(.mono(.subheadline, weight: .medium))
                                    .foregroundStyle(theme.terminalGreen.opacity(0.9))
                                if favoritesManager.isFavorite(result.id) {
                                    Text("\u{2605}")
                                        .font(.mono(.caption2))
                                        .foregroundStyle(theme.terminalGold)
                                }
                                Spacer()
                                if let country = result.country {
                                    Text(country)
                                        .font(.mono(.caption2))
                                        .foregroundStyle(theme.terminalDim)
                                }
                            }
                        }
                        .listRowBackground(theme.terminalBg)
                    }
                }
            } else {
                // Favorites section
                if !favoritesManager.favorites.isEmpty {
                    favoritesSection
                }

                // Default rankings
                rankingsSection
            }
        }
        .listStyle(.plain)
        .retroListStyle()
        .searchable(text: $viewModel.query, prompt: "Search players...")
        .onChange(of: viewModel.query) {
            viewModel.search()
        }
        .navigationTitle("Players")
        .task {
            await viewModel.loadRankings(tour: tour)
        }
    }

    // MARK: - Favorites

    @ViewBuilder
    private var favoritesSection: some View {
        Text("\u{2605} FAVORITES")
            .font(.pixel(7))
            .foregroundStyle(theme.terminalGold)
            .listRowBackground(theme.terminalBg)
            .listRowSeparator(.hidden)
            .padding(.top, 8)

        ForEach(favoritesManager.favorites) { fav in
            NavigationLink(value: NavigationDestination.playerProfile(
                playerId: fav.id,
                playerName: fav.name
            )) {
                HStack(spacing: 8) {
                    Text("\u{2605}")
                        .font(.mono(.caption))
                        .foregroundStyle(theme.terminalGold)
                    Text(fav.name)
                        .font(.mono(.subheadline, weight: .medium))
                        .foregroundStyle(theme.terminalGreen.opacity(0.9))
                    Spacer()
                }
            }
            .listRowBackground(theme.terminalBg)
            .swipeActions(edge: .trailing) {
                Button(role: .destructive) {
                    favoritesManager.toggle(playerId: fav.id, playerName: fav.name)
                } label: {
                    Label("Remove", systemImage: "star.slash")
                }
            }
        }

        // Separator between favorites and rankings
        Text(String(repeating: RetroTheme.boxH, count: 40))
            .font(.mono(.caption2))
            .foregroundStyle(theme.border)
            .lineLimit(1)
            .listRowBackground(theme.terminalBg)
            .listRowSeparator(.hidden)
    }

    // MARK: - Rankings

    @ViewBuilder
    private var rankingsSection: some View {
        if viewModel.rankingsLoading {
            HStack {
                Spacer()
                RetroLoadingView("LOADING RANKINGS...")
                    .frame(height: 100)
                Spacer()
            }
            .listRowBackground(theme.terminalBg)
        } else if !viewModel.rankings.isEmpty {
            // Section header
            Text(viewModel.rankingsTitle.uppercased())
                .font(.pixel(7))
                .foregroundStyle(theme.terminalGreen)
                .listRowBackground(theme.terminalBg)
                .listRowSeparator(.hidden)
                .padding(.top, 8)

            ForEach(viewModel.rankings) { leader in
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
                            .font(.mono(.subheadline, weight: .medium))
                            .foregroundStyle(theme.terminalGreen.opacity(0.9))
                            .lineLimit(1)

                        Spacer()

                        Text(leader.displayValue)
                            .font(.mono(.caption, weight: .bold))
                            .foregroundStyle(theme.terminalCyan)
                    }
                }
                .listRowBackground(theme.terminalBg)
            }
        }
    }
}
