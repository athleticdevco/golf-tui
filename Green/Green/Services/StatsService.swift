import Foundation

// MARK: - ESPN Response Types

private struct ESPNStatisticsResponse: Decodable {
    let stats: ESPNStats?
}

private struct ESPNStats: Decodable {
    let categories: [ESPNStatCategory]?
}

private struct ESPNStatCategory: Decodable {
    let name: String
    let displayName: String
    let shortDisplayName: String?
    let abbreviation: String?
    let leaders: [ESPNLeader]?
}

private struct ESPNLeader: Decodable {
    let displayValue: String
    let value: Double
    let athlete: ESPNLeaderAthlete
}

private struct ESPNLeaderAthlete: Decodable {
    let id: String
    let displayName: String
}

// MARK: - Metric Mapping

private let metricToCategory: [String: String] = [
    "officialamount": "officialAmount",
    "cuppoints": "cupPoints",
    "cutsmade": "cutsMade",
    "yardsperdrive": "yardsPerDrive",
    "strokesperhole": "strokesPerHole",
    "driveaccuracypct": "driveAccuracyPct",
    "greensinregputts": "greensInRegPutts",
    "greensinregpct": "greensInRegPct",
    "birdiesperround": "birdiesPerRound",
    "scoringaverage": "scoringAverage",
    "wins": "wins",
    "toptenfinishes": "topTenFinishes",
    "yds/drv": "yardsPerDrive",
    "drv acc": "driveAccuracyPct",
    "greenshit": "greensInRegPct",
    "pp gir": "greensInRegPutts",
    "bird/rnd": "birdiesPerRound",
    "saves": "sandSaves",
    "amount": "officialAmount",
    "earnings": "officialAmount",
]

// MARK: - Service

actor StatsService {
    static let shared = StatsService()

    private var cachedStats: (tour: Tour, data: [StatCategory], timestamp: Date)?

    func fetchAllStatCategories(tour: Tour) async throws -> [StatCategory] {
        if let cached = cachedStats, cached.tour == tour,
           Date().timeIntervalSince(cached.timestamp) < CacheTTL.statCategories {
            return cached.data
        }

        let response: ESPNStatisticsResponse = try await APIClient.shared.request(
            url: ESPNAPI.statistics(tour: tour),
            ttl: CacheTTL.statCategories
        )

        let categories = (response.stats?.categories ?? []).map { cat in
            StatCategory(
                name: cat.name,
                displayName: cat.displayName,
                abbreviation: cat.abbreviation ?? cat.shortDisplayName ?? "",
                leaders: (cat.leaders ?? []).enumerated().map { idx, leader in
                    StatLeader(
                        rank: idx + 1,
                        playerId: leader.athlete.id,
                        playerName: leader.athlete.displayName,
                        value: leader.value,
                        displayValue: leader.displayValue
                    )
                }
            )
        }

        cachedStats = (tour: tour, data: categories, timestamp: Date())
        return categories
    }

    func fetchStatLeaders(tour: Tour, metricName: String) async throws -> (category: StatCategory?, leaders: [StatLeader]) {
        let categories = try await fetchAllStatCategories(tour: tour)

        // Try direct match
        if let category = categories.first(where: { $0.name == metricName }) {
            return (category, category.leaders)
        }

        // Try mapped name
        if let mappedName = metricToCategory[metricName.lowercased()],
           let category = categories.first(where: { $0.name == mappedName }) {
            return (category, category.leaders)
        }

        // Fuzzy match on display name
        let lower = metricName.lowercased()
        if let category = categories.first(where: {
            $0.displayName.lowercased().contains(lower) ||
            lower.contains($0.displayName.lowercased()) ||
            $0.abbreviation.lowercased() == lower
        }) {
            return (category, category.leaders)
        }

        return (nil, [])
    }

    func findPlayerInLeaders(_ leaders: [StatLeader], playerId: String) -> Int {
        leaders.firstIndex(where: { $0.playerId == playerId }) ?? -1
    }
}
