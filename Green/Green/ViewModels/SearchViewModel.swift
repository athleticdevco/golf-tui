import Foundation

@MainActor
@Observable
class SearchViewModel {
    var query = ""
    var results: [SearchResult] = []
    var isLoading = false

    // Default rankings shown when search is empty
    var rankings: [StatLeader] = []
    var rankingsTitle = ""
    var rankingsLoading = false

    private let service = PlayerService()
    private var searchTask: Task<Void, Never>?

    func search() {
        searchTask?.cancel()

        guard query.count >= 2 else {
            results = []
            return
        }

        let currentQuery = query
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }

            isLoading = true
            let searchResults = await service.searchAllPlayers(query: currentQuery)
            guard !Task.isCancelled else { return }
            results = searchResults
            isLoading = false
        }
    }

    func loadRankings(tour: Tour) async {
        guard rankings.isEmpty else { return }
        rankingsLoading = true
        do {
            let categories = try await StatsService.shared.fetchAllStatCategories(tour: tour)

            // Try FedEx Cup / Cup Points first, then earnings as fallback
            let preferred = ["cupPoints", "officialAmount", "earnings"]
            for name in preferred {
                if let cat = categories.first(where: { $0.name == name }) {
                    rankings = cat.leaders
                    rankingsTitle = cat.displayName
                    break
                }
            }

            // If none matched, use the first category that has leaders
            if rankings.isEmpty, let first = categories.first(where: { !$0.leaders.isEmpty }) {
                rankings = first.leaders
                rankingsTitle = first.displayName
            }
        } catch {
            // Silently fail — search still works
        }
        rankingsLoading = false
    }
}
