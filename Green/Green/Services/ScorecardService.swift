import Foundation

// MARK: - ESPN Response Types

private struct ESPNLeaderboardResponse: Decodable {
    let events: [ESPNEvent]?
}

private struct ESPNEvent: Decodable {
    let id: String
    let name: String
    let competitions: [ESPNCompetition]?
}

private struct ESPNCompetition: Decodable {
    let competitors: [ESPNCompetitor]?
}

private struct ESPNCompetitor: Decodable {
    let id: String
    let athlete: ESPNAthlete?
    let linescores: [ESPNRoundLinescore]?
}

private struct ESPNAthlete: Decodable {
    let id: String?
    let displayName: String?
}

private struct ESPNRoundLinescore: Decodable {
    let period: Int?
    let value: Double?
    let displayValue: String?
    let linescores: [ESPNHoleLinescore]?
}

private struct ESPNHoleLinescore: Decodable {
    let period: Int?
    let value: Double?
    let scoreType: ESPNScoreType?
}

private struct ESPNScoreType: Decodable {
    let displayValue: String?
}

// MARK: - Errors

enum ScorecardError: Error, LocalizedError {
    case eventNotFound(String)
    case noCompetition
    case playerNotFound(String)
    case noScorecardData

    var errorDescription: String? {
        switch self {
        case .eventNotFound(let id): return "Event \(id) not found"
        case .noCompetition: return "No competition data available"
        case .playerNotFound(let id): return "Player \(id) not found in competition"
        case .noScorecardData: return "No scorecard data available for this player"
        }
    }
}

// MARK: - Service

struct ScorecardService {
    private let client = APIClient.shared

    func fetchPlayerScorecard(eventId: String, eventDate: String, playerId: String, playerName: String, tour: Tour) async throws -> PlayerScorecard {
        // Use date-based scoreboard to find the correct event
        let dateStr = String(eventDate.prefix(10)).replacingOccurrences(of: "-", with: "")
        let response: ESPNLeaderboardResponse = try await client.request(
            url: ESPNAPI.scoreboard(tour: tour, dates: dateStr),
            ttl: CacheTTL.liveScores
        )

        guard let events = response.events, !events.isEmpty else {
            throw ScorecardError.eventNotFound(eventId)
        }

        let event = events.first(where: { $0.id == eventId }) ?? events[0]
        guard let competition = event.competitions?.first else {
            throw ScorecardError.noCompetition
        }

        let competitor = competition.competitors?.first { comp in
            comp.id == playerId || comp.athlete?.id == playerId
        }
        guard let competitor else {
            throw ScorecardError.playerNotFound(playerId)
        }

        var rounds: [RoundScorecard] = []

        for roundData in (competitor.linescores ?? []) {
            guard let period = roundData.period, period <= 4 else { continue }

            let holes: [HoleScore] = (roundData.linescores ?? []).compactMap { hole in
                guard let holeNum = hole.period, let strokesVal = hole.value else { return nil }
                let strokes = Int(strokesVal)
                let toPar = parseToParValue(hole.scoreType?.displayValue)
                let par = strokes - toPar
                return HoleScore(holeNumber: holeNum, strokes: strokes, toPar: toPar, par: par)
            }.sorted { $0.holeNumber < $1.holeNumber }

            let isComplete = holes.count == 18
            let totalStrokes = holes.isEmpty ? nil : holes.reduce(0) { $0 + $1.strokes }
            let totalToPar = holes.isEmpty ? nil : holes.reduce(0) { $0 + $1.toPar }

            rounds.append(RoundScorecard(
                round: period,
                totalStrokes: totalStrokes,
                toPar: totalToPar,
                holes: holes,
                isComplete: isComplete
            ))
        }

        rounds.sort { $0.round < $1.round }

        guard !rounds.isEmpty else {
            throw ScorecardError.noScorecardData
        }

        return PlayerScorecard(
            playerId: playerId,
            playerName: playerName,
            eventId: event.id,
            eventName: event.name,
            rounds: rounds
        )
    }

    private func parseToParValue(_ displayValue: String?) -> Int {
        guard let str = displayValue, str != "E" else { return 0 }
        return Int(str) ?? 0
    }
}
