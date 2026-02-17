import Foundation

struct PlayerProfile: Identifiable {
    var id: String { player.id }

    let player: Player
    var worldRanking: Int?
    var fedexRank: Int?
    var earnings: String?
    var wins: Int?
    var topTens: Int?
    var cutsMade: Int?
    var events: Int?
    var scoringAvg: PlayerStat?
    var drivingDistance: PlayerStat?
    var drivingAccuracy: PlayerStat?
    var greensInReg: PlayerStat?
    var puttsPerGir: PlayerStat?
    var birdiesPerRound: PlayerStat?
    var sandSaves: PlayerStat?
    var recentResults: [TournamentResult] = []
    var rankings: [RankingMetric] = []
    var seasonHistory: [SeasonSummary] = []
}
