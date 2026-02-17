import Foundation

struct TournamentResult: Identifiable, Hashable {
    var id: String { tournamentId }

    let tournamentId: String
    let tournamentName: String
    let date: String
    let position: String
    let score: String
}
