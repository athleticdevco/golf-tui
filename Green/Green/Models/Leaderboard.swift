import Foundation

struct Leaderboard {
    let tournament: Tournament
    let entries: [LeaderboardEntry]
    let round: Int
    var isPlayoff: Bool = false
    let lastUpdated: String
}
