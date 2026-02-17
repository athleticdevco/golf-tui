import Foundation

struct PlayerStat: Hashable {
    let value: String
    var rank: Int?
}

struct RankingMetric: Identifiable, Hashable {
    var id: String { name }

    let name: String
    let displayName: String
    var abbreviation: String?
    let displayValue: String
    var rank: Int?
}
