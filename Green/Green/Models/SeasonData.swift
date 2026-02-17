import Foundation

struct SeasonSummary: Identifiable, Hashable {
    var id: Int { year }

    let year: Int
    let events: Int
    let wins: Int
    let topTens: Int
    let cutsMade: Int
    var earnings: String?
    var scoringAvg: String?
}

struct SeasonResults: Identifiable {
    var id: Int { year }

    let year: Int
    let results: [TournamentResult]
}
