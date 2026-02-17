import Foundation

// MARK: - ESPN Response Types

private struct ESPNLeaderboardResponse: Decodable {
    let events: [ESPNEvent]?
}

private struct ESPNEvent: Decodable {
    let id: String
    let name: String
    let shortName: String?
    let date: String
    let endDate: String?
    let competitions: [ESPNCompetition]?
    let status: ESPNEventStatus?
}

private struct ESPNEventStatus: Decodable {
    let type: ESPNStatusType?
}

private struct ESPNStatusType: Decodable {
    let state: String?
}

private struct ESPNCompetition: Decodable {
    let id: String
    let purse: Double?
    let venue: ESPNVenue?
    let status: ESPNCompetitionStatus?
    let competitors: [ESPNCompetitor]?
}

private struct ESPNVenue: Decodable {
    let fullName: String?
    let address: ESPNAddress?
}

private struct ESPNAddress: Decodable {
    let city: String?
    let state: String?
    let country: String?
}

private struct ESPNCompetitionStatus: Decodable {
    let period: Int?
}

private struct ESPNCompetitor: Decodable {
    let id: String
    let order: Int?
    let athlete: ESPNAthlete?
    let status: ESPNCompetitorStatus?
    let score: ESPNScore?
    let statistics: [ESPNStatistic]?
    let linescores: [ESPNLinescore]?
}

private struct ESPNScore: Decodable {
    let value: Double?
    let displayValue: String?

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let num = try? container.decode(Double.self) {
            self.value = num
            self.displayValue = nil
        } else if let str = try? container.decode(String.self) {
            self.value = Double(str)
            self.displayValue = str
        } else {
            self.value = nil
            self.displayValue = nil
        }
    }
}

private struct ESPNAthlete: Decodable {
    let id: String?
    let fullName: String?
    let displayName: String?
    let shortName: String?
    let flag: ESPNFlag?
    let citizenship: String?
    let amateur: Bool?
    let headshot: ESPNHeadshot?
}

private struct ESPNFlag: Decodable {
    let href: String?
    let alt: String?
}

private struct ESPNHeadshot: Decodable {
    let href: String?
}

private struct ESPNCompetitorStatus: Decodable {
    let position: ESPNPosition?
    let thru: Int?
    let displayValue: String?
}

private struct ESPNPosition: Decodable {
    let id: String?
    let displayName: String?
}

private struct ESPNStatistic: Decodable {
    let name: String
    let displayValue: String?
    let value: Double?
}

private struct ESPNLinescore: Decodable {
    let value: Double?
    let displayValue: String?
    let period: Int?
    let linescores: [ESPNHoleLinescore]?
}

private struct ESPNHoleLinescore: Decodable {
    let period: Int?
}

// MARK: - Service

struct LeaderboardService {
    private let client = APIClient.shared

    func fetchLeaderboard(tour: Tour) async throws -> Leaderboard {
        let response: ESPNLeaderboardResponse = try await client.request(
            url: ESPNAPI.scoreboard(tour: tour),
            ttl: CacheTTL.liveScores
        )
        guard let leaderboard = parseResponse(response, tour: tour) else {
            throw LeaderboardError.noData
        }
        return leaderboard
    }

    func fetchEventLeaderboard(eventId: String, eventName: String, eventDate: String, tour: Tour) async throws -> Leaderboard {
        let dateStr = String(eventDate.prefix(10)).replacingOccurrences(of: "-", with: "")
        let response: ESPNLeaderboardResponse = try await client.request(
            url: ESPNAPI.scoreboard(tour: tour, dates: dateStr),
            ttl: CacheTTL.liveScores
        )

        guard let events = response.events, !events.isEmpty else {
            throw LeaderboardError.eventNotFound(eventId)
        }
        let event = events.first(where: { $0.id == eventId }) ?? events[0]
        guard let leaderboard = parseEvent(event, tour: tour) else {
            throw LeaderboardError.noData
        }
        return leaderboard
    }

    // MARK: - Parsing

    private func parseResponse(_ response: ESPNLeaderboardResponse, tour: Tour) -> Leaderboard? {
        guard let events = response.events, let event = events.first else { return nil }
        return parseEvent(event, tour: tour)
    }

    private func parseEvent(_ event: ESPNEvent, tour: Tour) -> Leaderboard? {
        guard let competition = event.competitions?.first else { return nil }

        let statusState = event.status?.type?.state ?? "pre"
        let status: TournamentStatus = statusState == "in" ? .in : statusState == "post" ? .post : .pre

        let tournament = Tournament(
            id: event.id,
            name: event.name,
            shortName: event.shortName,
            date: event.date,
            endDate: event.endDate,
            status: status,
            tour: tour
        )

        let currentRound = competition.status?.period ?? 1
        let isPlayoff = currentRound > 4

        let entries = (competition.competitors ?? [])
            .enumerated()
            .compactMap { index, comp in
                parseCompetitor(comp, index: index, currentRound: currentRound, isPlayoff: isPlayoff, tournamentStatus: statusState)
            }
            .sorted { $0.positionNum < $1.positionNum }

        return Leaderboard(
            tournament: tournament,
            entries: entries,
            round: min(currentRound, 4),
            isPlayoff: isPlayoff,
            lastUpdated: ISO8601DateFormatter().string(from: Date())
        )
    }

    private func parseCompetitor(
        _ comp: ESPNCompetitor,
        index: Int,
        currentRound: Int,
        isPlayoff: Bool,
        tournamentStatus: String
    ) -> LeaderboardEntry? {
        guard let athlete = comp.athlete else { return nil }

        let player = Player(
            id: comp.id,
            name: athlete.displayName ?? athlete.fullName ?? "Unknown",
            firstName: athlete.shortName?.split(separator: " ").first.map(String.init),
            lastName: athlete.shortName?.split(separator: " ").dropFirst().joined(separator: " "),
            country: athlete.flag?.alt,
            countryCode: athlete.flag?.alt,
            amateur: athlete.amateur,
            imageUrl: athlete.headshot?.href
        )

        let positionNum = comp.order ?? (index + 1)
        let positionStr = String(positionNum)

        let allLinescores = (comp.linescores ?? []).filter { $0.period != nil }
        let regulationLinescores = allLinescores.filter { ($0.period ?? 0) <= 4 }
        let playoffLinescores = allLinescores.filter { ($0.period ?? 0) > 4 }
        let playerInPlayoff = isPlayoff && !playoffLinescores.isEmpty

        // Rounds: only regulation (R1-R4)
        let rounds = regulationLinescores.map { $0.displayValue ?? "-" }

        // Score
        let scoreNum: Int
        if playerInPlayoff {
            scoreNum = regulationLinescores.reduce(0) { sum, ls in
                sum + Formatters.parseScore(ls.displayValue)
            }
        } else {
            scoreNum = Int(comp.score?.value ?? 0)
        }
        let scoreStr = Formatters.formatScore(scoreNum)

        // Today / Thru
        let todayStr: String
        let todayNum: Int
        let thruStr: String

        if playerInPlayoff && tournamentStatus == "post" {
            todayStr = "-"
            todayNum = 0
            thruStr = "P"
        } else if playerInPlayoff && tournamentStatus == "in" {
            let playoffLs = playoffLinescores.first
            let playoffHoles = playoffLs?.linescores?.count ?? 0
            todayStr = playoffLs?.displayValue ?? "-"
            todayNum = Formatters.parseScore(todayStr)
            thruStr = playoffHoles > 0 ? "P\(playoffHoles)" : "P"
        } else {
            let effectiveRound = min(currentRound, 4)
            let todayLinescore = regulationLinescores.first { $0.period == effectiveRound }
            todayStr = todayLinescore?.displayValue ?? (rounds.last ?? "-")
            todayNum = Formatters.parseScore(todayStr)

            let currentRoundLinescore = regulationLinescores.first { $0.period == effectiveRound }
            let holesPlayed = currentRoundLinescore?.linescores?.count ?? 0
            thruStr = holesPlayed >= 18 ? "F" : holesPlayed > 0 ? String(holesPlayed) : "-"
        }

        // Status
        var entryStatus: EntryStatus = .active
        let statusVal = (comp.status?.displayValue ?? "").lowercased()
        if statusVal.contains("cut") { entryStatus = .cut }
        else if statusVal.contains("wd") { entryStatus = .wd }
        else if statusVal.contains("dq") { entryStatus = .dq }

        let hasHoleData = regulationLinescores.contains { $0.linescores != nil && !($0.linescores!.isEmpty) }

        return LeaderboardEntry(
            player: player,
            position: positionStr,
            positionNum: positionNum,
            score: scoreStr,
            scoreNum: scoreNum,
            today: todayStr,
            todayNum: todayNum,
            thru: thruStr,
            rounds: rounds,
            status: entryStatus,
            scorecardAvailable: hasHoleData,
            inPlayoff: playerInPlayoff
        )
    }
}

enum LeaderboardError: Error, LocalizedError {
    case noData
    case eventNotFound(String)

    var errorDescription: String? {
        switch self {
        case .noData: return "No tournament data available"
        case .eventNotFound(let id): return "Event \(id) not found"
        }
    }
}
