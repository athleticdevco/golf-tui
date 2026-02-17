import Foundation

@MainActor
@Observable
class TournamentListViewModel {
    var tournaments: [Tournament] = []
    var isLoading = false
    var error: String?

    private let service = TournamentService()

    func loadSchedule(tour: Tour) async {
        isLoading = true
        error = nil
        tournaments = await service.fetchSchedule(tour: tour)
        if tournaments.isEmpty { error = "No tournaments available" }
        isLoading = false
    }

    func refresh(tour: Tour) async {
        await APIClient.shared.clearCache()
        await loadSchedule(tour: tour)
    }
}
