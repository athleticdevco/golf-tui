import Foundation

enum EntryStatus: String, Hashable {
    case active
    case cut
    case wd
    case dq
}

struct LeaderboardEntry: Identifiable, Hashable {
    var id: String { player.id }

    let player: Player
    let position: String
    let positionNum: Int
    let score: String
    let scoreNum: Int
    let today: String
    let todayNum: Int
    let thru: String
    let rounds: [String]
    var status: EntryStatus = .active
    var scorecardAvailable: Bool = false
    var inPlayoff: Bool = false
}
