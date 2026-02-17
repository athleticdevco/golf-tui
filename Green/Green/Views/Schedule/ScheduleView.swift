import SwiftUI

struct ScheduleView: View {
    @State private var viewModel = TournamentListViewModel()
    @Bindable var tourVM: TourSelectionViewModel
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(spacing: 0) {
            TourPicker(selectedTour: $tourVM.selectedTour, activeTours: tourVM.activeTours)
                .padding(.vertical, 8)

            if viewModel.isLoading && viewModel.tournaments.isEmpty {
                LoadingView("Loading schedule...")
            } else if let error = viewModel.error, viewModel.tournaments.isEmpty {
                ErrorView(error) { await viewModel.loadSchedule(tour: tourVM.selectedTour) }
            } else {
                tournamentList
            }
        }
        .background(theme.terminalBg)
        .navigationTitle("Schedule")
        .task(id: tourVM.selectedTour) {
            await viewModel.loadSchedule(tour: tourVM.selectedTour)
        }
    }

    @ViewBuilder
    private var tournamentList: some View {
        List(viewModel.tournaments) { tournament in
            NavigationLink(value: NavigationDestination.eventLeaderboard(
                eventId: tournament.id,
                eventName: tournament.name,
                eventDate: tournament.date
            )) {
                TournamentRowView(tournament: tournament)
            }
            .listRowBackground(theme.terminalBg)
        }
        .listStyle(.plain)
        .retroListStyle()
        .refreshable {
            await viewModel.refresh(tour: tourVM.selectedTour)
        }
    }
}
