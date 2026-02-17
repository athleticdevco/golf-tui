import SwiftUI

struct ContentView: View {
    @State private var tourVM = TourSelectionViewModel()
    @State private var selectedTab = 0
    @Environment(ThemeManager.self) private var theme
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        TabView(selection: $selectedTab) {
            // Leaderboard Tab
            NavigationStack {
                LeaderboardView(tourVM: tourVM)
                    .navigationDestinations(tour: tourVM.selectedTour)
            }
            .tabItem {
                Label("Board", systemImage: "list.number")
            }
            .tag(0)

            // Schedule Tab
            NavigationStack {
                ScheduleView(tourVM: tourVM)
                    .navigationDestinations(tour: tourVM.selectedTour)
            }
            .tabItem {
                Label("Schedule", systemImage: "calendar")
            }
            .tag(1)

            // Players Tab
            NavigationStack {
                PlayerSearchView(tour: tourVM.selectedTour)
                    .navigationDestinations(tour: tourVM.selectedTour)
            }
            .tabItem {
                Label("Players", systemImage: "person.2")
            }
            .tag(2)

            // Stats Tab
            NavigationStack {
                StatCategoriesView(tourVM: tourVM)
                    .navigationDestinations(tour: tourVM.selectedTour)
            }
            .tabItem {
                Label("Stats", systemImage: "chart.bar")
            }
            .tag(3)
        }
        .tint(theme.terminalGreen)
        .onChange(of: colorScheme, initial: true) { _, newScheme in
            theme.mode = newScheme == .dark ? .dark : .light
        }
        .task {
            await tourVM.checkActiveTours()
        }
    }
}

// MARK: - Shared Navigation Destinations

private struct NavigationDestinationsModifier: ViewModifier {
    let tour: Tour

    func body(content: Content) -> some View {
        content
            .navigationDestination(for: NavigationDestination.self) { destination in
                switch destination {
                case .playerProfile(let playerId, let playerName):
                    PlayerProfileView(playerId: playerId, playerName: playerName, tour: tour)

                case .scorecard(let eventId, let eventDate, let playerId, let playerName):
                    ScorecardView(eventId: eventId, eventDate: eventDate, playerId: playerId, playerName: playerName, tour: tour)

                case .eventLeaderboard(let eventId, let eventName, let eventDate):
                    EventLeaderboardView(eventId: eventId, eventName: eventName, eventDate: eventDate, tour: tour)

                case .seasonResults(let playerId, let year):
                    SeasonResultsView(playerId: playerId, year: year, tour: tour)

                case .statLeaders(let metricName):
                    StatLeadersView(metricName: metricName, tour: tour)
                }
            }
    }
}

extension View {
    func navigationDestinations(tour: Tour) -> some View {
        modifier(NavigationDestinationsModifier(tour: tour))
    }
}
