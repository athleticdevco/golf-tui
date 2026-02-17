import Foundation

@MainActor
@Observable
class StatsViewModel {
    var categories: [StatCategory] = []
    var selectedCategory: StatCategory?
    var leaders: [StatLeader] = []
    var isLoading = false
    var error: String?

    func loadCategories(tour: Tour) async {
        isLoading = true
        error = nil
        do {
            categories = try await StatsService.shared.fetchAllStatCategories(tour: tour)
            if categories.isEmpty { error = "No stat categories available" }
        } catch {
            print("[Green] Stats categories error: \(error)")
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func loadLeaders(tour: Tour, metricName: String) async {
        isLoading = true
        error = nil
        do {
            let result = try await StatsService.shared.fetchStatLeaders(tour: tour, metricName: metricName)
            selectedCategory = result.category
            leaders = result.leaders
        } catch {
            print("[Green] Stat leaders error for \(metricName): \(error)")
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
