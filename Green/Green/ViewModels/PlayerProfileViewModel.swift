import Foundation

@MainActor
@Observable
class PlayerProfileViewModel {
    var profile: PlayerProfile?
    var isLoading = false
    var error: String?

    var seasonResults: SeasonResults?
    var seasonResultsLoading = false

    private let service = PlayerService()

    func load(playerId: String, playerName: String?, tour: Tour) async {
        isLoading = true
        error = nil
        do {
            profile = try await service.fetchPlayerProfile(playerId: playerId, playerName: playerName, tour: tour)
        } catch {
            print("[Green] Player profile error for \(playerId): \(error)")
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func loadSeasonResults(playerId: String, tour: Tour, year: Int) async {
        seasonResultsLoading = true
        seasonResults = await service.fetchSeasonResults(playerId: playerId, tour: tour, year: year)
        seasonResultsLoading = false
    }

    func clear() {
        profile = nil
        seasonResults = nil
        error = nil
    }
}
