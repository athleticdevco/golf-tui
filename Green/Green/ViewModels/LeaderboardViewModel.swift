import Foundation

@MainActor
@Observable
class LeaderboardViewModel {
    var leaderboard: Leaderboard?
    var isLoading = false
    var error: String?

    private let service = LeaderboardService()

    func load(tour: Tour) async {
        isLoading = true
        error = nil
        do {
            leaderboard = try await service.fetchLeaderboard(tour: tour)
        } catch {
            print("[Green] Leaderboard error: \(error)")
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func refresh(tour: Tour) async {
        await APIClient.shared.clearCache()
        await load(tour: tour)
    }

    func loadEvent(eventId: String, eventName: String, eventDate: String, tour: Tour) async {
        isLoading = true
        error = nil
        do {
            leaderboard = try await service.fetchEventLeaderboard(
                eventId: eventId, eventName: eventName, eventDate: eventDate, tour: tour
            )
        } catch {
            print("[Green] Event leaderboard error for \(eventId): \(error)")
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
