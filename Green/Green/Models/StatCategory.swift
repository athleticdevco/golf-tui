import Foundation

struct StatLeader: Identifiable, Hashable {
    var id: String { "\(playerId)-\(rank)" }

    let rank: Int
    let playerId: String
    let playerName: String
    let value: Double
    let displayValue: String
}

struct StatCategory: Identifiable, Hashable {
    var id: String { name }

    let name: String
    let displayName: String
    let abbreviation: String
    let leaders: [StatLeader]
}
