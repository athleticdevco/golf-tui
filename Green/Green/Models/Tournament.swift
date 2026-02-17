import Foundation

enum TournamentStatus: String, Codable, Hashable {
    case pre
    case `in`
    case post
}

struct Tournament: Identifiable, Hashable {
    let id: String
    let name: String
    var shortName: String?
    let date: String
    var endDate: String?
    var venue: String?
    var location: String?
    var purse: String?
    let status: TournamentStatus
    let tour: Tour
}
