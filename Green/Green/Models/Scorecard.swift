import Foundation

struct HoleScore: Identifiable, Hashable {
    var id: Int { holeNumber }

    let holeNumber: Int
    let strokes: Int
    let toPar: Int
    let par: Int
}

struct RoundScorecard: Identifiable, Hashable {
    var id: Int { round }

    let round: Int
    let totalStrokes: Int?
    let toPar: Int?
    let holes: [HoleScore]
    let isComplete: Bool
}

struct PlayerScorecard: Identifiable {
    var id: String { "\(playerId)-\(eventId)" }

    let playerId: String
    let playerName: String
    let eventId: String
    let eventName: String
    let rounds: [RoundScorecard]
}
