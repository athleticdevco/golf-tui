import Foundation

@MainActor
@Observable
class ScorecardViewModel {
    var scorecard: PlayerScorecard?
    var isLoading = false
    var error: String?
    var selectedRound = 1

    private let service = ScorecardService()
    private var autoRefreshTask: Task<Void, Never>?

    func load(eventId: String, eventDate: String, playerId: String, playerName: String, tour: Tour) async {
        isLoading = true
        error = nil
        do {
            scorecard = try await service.fetchPlayerScorecard(
                eventId: eventId, eventDate: eventDate, playerId: playerId, playerName: playerName, tour: tour
            )
        } catch {
            print("[Green] Scorecard error for \(playerId) event \(eventId): \(error)")
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func startAutoRefresh(eventId: String, eventDate: String, playerId: String, playerName: String, tour: Tour) {
        stopAutoRefresh()
        autoRefreshTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(60))
                guard !Task.isCancelled else { break }
                if let updated = try? await service.fetchPlayerScorecard(
                    eventId: eventId, eventDate: eventDate, playerId: playerId, playerName: playerName, tour: tour
                ) {
                    scorecard = updated
                }
            }
        }
    }

    func stopAutoRefresh() {
        autoRefreshTask?.cancel()
        autoRefreshTask = nil
    }
}
