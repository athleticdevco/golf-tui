import Foundation

@MainActor
@Observable
class TourSelectionViewModel {
    var selectedTour: Tour = .pga
    var activeTours: [Tour] = Tour.allCases
    var isLoading = true

    private let service = LeaderboardService()

    func checkActiveTours() async {
        isLoading = true
        var active: [Tour] = []

        await withTaskGroup(of: (Tour, Bool).self) { group in
            for tour in Tour.allCases {
                group.addTask {
                    let leaderboard = try? await self.service.fetchLeaderboard(tour: tour)
                    return (tour, leaderboard != nil)
                }
            }
            for await (tour, hasData) in group {
                if hasData { active.append(tour) }
            }
        }

        // Maintain original order
        activeTours = Tour.allCases.filter { active.contains($0) }
        if activeTours.isEmpty { activeTours = Tour.allCases }
        if !activeTours.contains(selectedTour) {
            selectedTour = activeTours.first ?? .pga
        }
        isLoading = false
    }
}
