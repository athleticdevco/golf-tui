import SwiftUI

struct StatCategoriesView: View {
    @State private var viewModel = StatsViewModel()
    @Bindable var tourVM: TourSelectionViewModel
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        VStack(spacing: 0) {
            TourPicker(selectedTour: $tourVM.selectedTour, activeTours: tourVM.activeTours)
                .padding(.vertical, 8)

            if viewModel.isLoading && viewModel.categories.isEmpty {
                LoadingView("Loading stats...")
            } else if let error = viewModel.error, viewModel.categories.isEmpty {
                ErrorView(error) { await viewModel.loadCategories(tour: tourVM.selectedTour) }
            } else {
                List(viewModel.categories) { category in
                    NavigationLink(value: NavigationDestination.statLeaders(metricName: category.name)) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(category.displayName)
                                    .font(.mono(.subheadline, weight: .medium))
                                    .foregroundStyle(theme.terminalGreen.opacity(0.9))
                                if !category.abbreviation.isEmpty {
                                    Text(category.abbreviation)
                                        .font(.mono(.caption2))
                                        .foregroundStyle(theme.terminalDim)
                                }
                            }
                            Spacer()
                            if let leader = category.leaders.first {
                                VStack(alignment: .trailing, spacing: 2) {
                                    Text(leader.playerName)
                                        .font(.mono(.caption2))
                                        .foregroundStyle(theme.terminalDim)
                                        .lineLimit(1)
                                    Text(leader.displayValue)
                                        .font(.mono(.caption2, weight: .bold))
                                        .foregroundStyle(theme.terminalCyan)
                                }
                            }
                        }
                    }
                    .listRowBackground(theme.terminalBg)
                }
                .listStyle(.plain)
                .retroListStyle()
            }
        }
        .background(theme.terminalBg)
        .navigationTitle("Stats")
        .task(id: tourVM.selectedTour) {
            await viewModel.loadCategories(tour: tourVM.selectedTour)
        }
    }
}
