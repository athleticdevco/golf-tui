import Foundation

// MARK: - ESPN Response Types

private struct ESPNOverviewResponse: Decodable {
    let statistics: ESPNOverviewStats?
    let seasonRankings: ESPNSeasonRankings?
    let recentTournaments: [ESPNRecentTournament]?
}

private struct ESPNOverviewStats: Decodable {
    let labels: [String]?
    let names: [String]?
    let splits: [ESPNStatsSplit]?
}

private struct ESPNStatsSplit: Decodable {
    let displayName: String?
    let stats: [String]?
}

private struct ESPNSeasonRankings: Decodable {
    let displayName: String?
    let categories: [ESPNRankingCategory]?
}

private struct ESPNRankingCategory: Decodable {
    let name: String
    let displayName: String
    let abbreviation: String
    let value: Double?
    let displayValue: String?
    let rank: Int?
    let rankDisplayValue: String?
}

private struct ESPNRecentTournament: Decodable {
    let name: String
    let eventsStats: [ESPNEventStat]?
}

private struct ESPNEventStat: Decodable {
    let id: String
    let name: String
    let shortName: String?
    let date: String
    let competitions: [ESPNEventCompetition]?
}

private struct ESPNEventCompetition: Decodable {
    let competitors: [ESPNEventCompetitor]?
}

private struct ESPNEventCompetitor: Decodable {
    let score: ESPNCompScore?
    let status: ESPNCompStatus?
}

private struct ESPNCompScore: Decodable {
    let displayValue: String?
}

private struct ESPNCompStatus: Decodable {
    let position: ESPNCompPosition?
    let displayValue: String?
}

private struct ESPNCompPosition: Decodable {
    let displayName: String?
}

private struct ESPNScoreboardResponse: Decodable {
    let events: [ESPNScoreboardEvent]?
}

private struct ESPNScoreboardEvent: Decodable {
    let id: String
    let name: String
    let shortName: String?
    let date: String
    let competitions: [ESPNScoreboardCompetition]?
}

private struct ESPNScoreboardCompetition: Decodable {
    let competitors: [ESPNScoreboardCompetitor]?
}

private struct ESPNScoreboardCompetitor: Decodable {
    let id: String
    let athlete: ESPNScoreboardAthlete?
    let score: ESPNScoreValue?
    let order: Int?
    let status: ESPNCompStatus?
}

private struct ESPNScoreboardAthlete: Decodable {
    let id: String?
}

private struct ESPNScoreValue: Decodable {
    let numericValue: Double?
    let displayValue: String?

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let num = try? container.decode(Double.self) {
            self.numericValue = num
            self.displayValue = nil
        } else if let str = try? container.decode(String.self) {
            self.numericValue = Double(str)
            self.displayValue = str
        } else if let obj = try? decoder.container(keyedBy: CodingKeys.self) {
            self.numericValue = try? obj.decode(Double.self, forKey: .value)
            self.displayValue = try? obj.decode(String.self, forKey: .displayValue)
        } else {
            self.numericValue = nil
            self.displayValue = nil
        }
    }

    private enum CodingKeys: String, CodingKey {
        case value, displayValue
    }
}

private struct ESPNSeasonStats: Decodable {
    let splits: ESPNSeasonSplits?
}

private struct ESPNSeasonSplits: Decodable {
    let categories: [ESPNSeasonCategory]?
}

private struct ESPNSeasonCategory: Decodable {
    let name: String
    let stats: [ESPNSeasonStat]?
}

private struct ESPNSeasonStat: Decodable {
    let name: String
    let displayValue: String?
}

private struct ESPNEventLogResponse: Decodable {
    let events: ESPNEventLogEvents?
}

private struct ESPNEventLogEvents: Decodable {
    let items: [ESPNEventLogItem]?
}

private struct ESPNEventLogItem: Decodable {
    let event: ESPNRef?
    let competitor: ESPNRef?
    let played: Bool?
    let league: String?
}

private struct ESPNRef: Decodable {
    let ref: String?

    enum CodingKeys: String, CodingKey {
        case ref = "$ref"
    }
}

private struct ESPNSearchResponse: Decodable {
    let items: [ESPNSearchItem]?
}

private struct ESPNSearchItem: Decodable {
    let id: String?
    let displayName: String?
    let sport: String?
    let citizenshipCountry: ESPNCountry?
}

private struct ESPNCountry: Decodable {
    let name: String?
}

private struct ESPNEventInfo: Decodable {
    let name: String?
    let shortName: String?
    let date: String?
}

private struct ESPNScoreInfo: Decodable {
    let displayValue: String?
}

private struct ESPNStatusInfo: Decodable {
    let position: ESPNCompPosition?
}

// MARK: - Service

struct PlayerService {
    private let client = APIClient.shared

    // MARK: - Player Profile

    func fetchPlayerProfile(playerId: String, playerName: String?, tour: Tour) async throws -> PlayerProfile {
        // Fetch overview + season history in parallel
        // Note: We use the overview's recentTournaments for results rather than
        // scanning 50+ weekly scoreboards, which is too slow on mobile.
        async let overviewData = client.requestRaw(
            url: ESPNAPI.playerOverview(tour: tour, playerId: playerId),
            ttl: CacheTTL.statCategories
        )
        async let seasonHistory = fetchSeasonHistory(playerId: playerId, tour: tour)

        let data = try await overviewData
        let overview = try JSONDecoder().decode(ESPNOverviewResponse.self, from: data)
        let history = await seasonHistory

        // Extract tour-specific stats
        let tourStats = overview.statistics?.splits?.first {
            $0.displayName?.uppercased().contains(tour.espnStatsName) == true
        }
        let statLabels = overview.statistics?.labels ?? []
        let statValues = tourStats?.stats ?? []

        let getStatValue: (String) -> String? = { label in
            guard let idx = statLabels.firstIndex(of: label), idx < statValues.count else { return nil }
            return statValues[idx]
        }

        // Extract rankings
        let rankingCategories = overview.seasonRankings?.categories ?? []
        let findRanking: (String) -> ESPNRankingCategory? = { name in
            rankingCategories.first {
                $0.name.lowercased().contains(name) || $0.abbreviation.lowercased().contains(name)
            }
        }

        let rankings: [RankingMetric] = rankingCategories
            .filter { $0.displayValue != nil }
            .map {
                RankingMetric(
                    name: $0.name,
                    displayName: $0.displayName,
                    abbreviation: $0.abbreviation,
                    displayValue: $0.displayValue!,
                    rank: $0.rank
                )
            }

        // Extract recent tournaments from overview (all tour sections)
        var allResults: [TournamentResult] = []
        for tourData in overview.recentTournaments ?? [] {
            for event in tourData.eventsStats ?? [] {
                let competitor = event.competitions?.first?.competitors?.first
                let position = competitor?.status?.position?.displayName ?? competitor?.status?.displayValue ?? "-"
                let score = competitor?.score?.displayValue ?? "-"
                allResults.append(TournamentResult(
                    tournamentId: event.id,
                    tournamentName: event.shortName ?? event.name,
                    date: event.date,
                    position: position,
                    score: score
                ))
            }
        }

        // Sort by date descending and take most recent 10
        let dateFormatter = ISO8601DateFormatter()
        allResults.sort {
            (dateFormatter.date(from: $0.date) ?? .distantPast) >
            (dateFormatter.date(from: $1.date) ?? .distantPast)
        }
        let recentResults = Array(allResults.prefix(10))

        // Build stat helpers
        let makeStat: (String) -> PlayerStat? = { abbrev in
            guard let cat = findRanking(abbrev), let dv = cat.displayValue else { return nil }
            return PlayerStat(value: dv, rank: cat.rank)
        }

        let earningsCat = findRanking("amount") ?? findRanking("earnings")

        return PlayerProfile(
            player: Player(id: playerId, name: playerName ?? "Player \(playerId)"),
            earnings: earningsCat?.displayValue ?? getStatValue("EARNINGS"),
            wins: getStatValue("WINS").flatMap { Int($0) },
            topTens: getStatValue("TOP10").flatMap { Int($0) },
            cutsMade: getStatValue("CUTS").flatMap { Int($0) },
            events: getStatValue("EVENTS").flatMap { Int($0) },
            scoringAvg: getStatValue("AVG").map { PlayerStat(value: $0) },
            drivingDistance: makeStat("yds/drv"),
            drivingAccuracy: makeStat("drv acc"),
            greensInReg: makeStat("greenshit"),
            puttsPerGir: makeStat("pp gir"),
            birdiesPerRound: makeStat("bird/rnd"),
            sandSaves: makeStat("saves"),
            recentResults: recentResults,
            rankings: rankings,
            seasonHistory: history
        )
    }

    // MARK: - Recent Tournament Results

    private func fetchRecentTournamentResults(playerId: String, tour: Tour) async -> [TournamentResult] {
        var results: [TournamentResult] = []

        let window = getSeasonWindow(tour: tour)
        let dates = weeksBetween(start: window.start, end: window.end)

        // Fetch scoreboards in parallel with concurrency limit
        await withTaskGroup(of: ESPNScoreboardResponse?.self) { group in
            for date in dates {
                group.addTask {
                    try? await APIClient.shared.request(
                        url: ESPNAPI.scoreboard(tour: tour, dates: date),
                        ttl: CacheTTL.scoreboardLookup
                    )
                }
            }

            for await response in group {
                guard let response else { continue }
                for event in response.events ?? [] {
                    guard !results.contains(where: { $0.tournamentId == event.id }) else { continue }
                    guard let comp = event.competitions?.first else { continue }

                    for c in comp.competitors ?? [] {
                        guard c.id == playerId || c.athlete?.id == playerId else { continue }

                        let scoreNum = c.score?.numericValue ?? 0
                        let scoreStr: String
                        if let dv = c.score?.displayValue {
                            scoreStr = dv
                        } else if scoreNum == 0 {
                            scoreStr = "E"
                        } else {
                            scoreStr = scoreNum > 0 ? "+\(Int(scoreNum))" : "\(Int(scoreNum))"
                        }

                        let position = c.status?.position?.displayName ?? c.status?.displayValue ?? (c.order.map { String($0) } ?? "-")

                        results.append(TournamentResult(
                            tournamentId: event.id,
                            tournamentName: event.shortName ?? event.name,
                            date: event.date,
                            position: position,
                            score: scoreStr
                        ))
                        break
                    }
                }
            }
        }

        results.sort { lhs, rhs in
            (ISO8601DateFormatter().date(from: rhs.date) ?? .distantPast) <
            (ISO8601DateFormatter().date(from: lhs.date) ?? .distantPast)
        }

        return results
    }

    // MARK: - Season Stats

    private func fetchSeasonStats(playerId: String, tour: Tour, year: Int) async -> SeasonSummary? {
        do {
            let data: ESPNSeasonStats = try await client.request(
                url: ESPNAPI.seasonStats(tour: tour, year: year, playerId: playerId),
                ttl: CacheTTL.seasonData
            )

            let stats = data.splits?.categories?.first(where: { $0.name == "general" })?.stats ?? []
            let get: (String) -> String? = { name in stats.first(where: { $0.name == name })?.displayValue }

            let events = Int(get("tournamentsPlayed") ?? "0") ?? 0
            guard events > 0 else { return nil }

            return SeasonSummary(
                year: year,
                events: events,
                wins: Int(get("wins") ?? "0") ?? 0,
                topTens: Int(get("topTenFinishes") ?? "0") ?? 0,
                cutsMade: Int(get("cutsMade") ?? "0") ?? 0,
                earnings: get("amount"),
                scoringAvg: get("scoringAverage")
            )
        } catch {
            return nil
        }
    }

    private func fetchSeasonHistory(playerId: String, tour: Tour) async -> [SeasonSummary] {
        let currentYear = Calendar.current.component(.year, from: Date())
        let years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]

        return await withTaskGroup(of: (Int, SeasonSummary?).self) { group in
            for year in years {
                group.addTask {
                    let summary = await self.fetchSeasonStats(playerId: playerId, tour: tour, year: year)
                    return (year, summary)
                }
            }

            var results: [(Int, SeasonSummary)] = []
            for await (year, summary) in group {
                if let summary { results.append((year, summary)) }
            }
            return results.sorted { $0.0 > $1.0 }.map(\.1)
        }
    }

    // MARK: - Season Results

    func fetchSeasonResults(playerId: String, tour: Tour, year: Int) async -> SeasonResults {
        let empty = SeasonResults(year: year, results: [])

        do {
            let logData = try await client.requestRaw(
                url: ESPNAPI.eventLog(tour: tour, year: year, playerId: playerId),
                ttl: CacheTTL.seasonData
            )
            let log = try JSONDecoder().decode(ESPNEventLogResponse.self, from: logData)

            let items = (log.events?.items ?? []).filter { $0.played != false }
            guard !items.isEmpty else { return empty }

            let eventEntries: [(eventId: String, eventRef: String, compRef: String)] = items.compactMap { item in
                guard let eventRef = item.event?.ref,
                      let compRef = item.competitor?.ref else { return nil }
                let eventId = eventRef.split(separator: "/events/").last?.split(separator: "?").first.map(String.init) ?? ""
                guard !eventId.isEmpty else { return nil }
                return (eventId, eventRef, compRef)
            }

            let results: [TournamentResult] = await withTaskGroup(of: TournamentResult?.self) { group in
                for entry in eventEntries {
                    group.addTask {
                        await self.resolveEventResult(eventRef: entry.eventRef, compRef: entry.compRef, eventId: entry.eventId)
                    }
                }
                var collected: [TournamentResult] = []
                for await result in group {
                    if let result { collected.append(result) }
                }
                return collected
            }

            let sorted = results.sorted {
                (ISO8601DateFormatter().date(from: $1.date) ?? .distantPast) <
                (ISO8601DateFormatter().date(from: $0.date) ?? .distantPast)
            }

            return SeasonResults(year: year, results: sorted)
        } catch {
            return empty
        }
    }

    private func resolveEventResult(eventRef: String, compRef: String, eventId: String) async -> TournamentResult? {
        let scoreUrl = compRef.split(separator: "?").first.map { String($0) + "/score" } ?? ""
        let statusUrl = compRef.split(separator: "?").first.map { String($0) + "/status" } ?? ""

        async let eventInfo: ESPNEventInfo? = fetchJSON(urlString: eventRef)
        async let scoreInfo: ESPNScoreInfo? = fetchJSON(urlString: scoreUrl)
        async let statusInfo: ESPNStatusInfo? = fetchJSON(urlString: statusUrl)

        guard let event = await eventInfo else { return nil }

        return TournamentResult(
            tournamentId: eventId,
            tournamentName: event.shortName ?? event.name ?? "Unknown",
            date: event.date ?? "",
            position: await statusInfo?.position?.displayName ?? "-",
            score: await scoreInfo?.displayValue ?? "-"
        )
    }

    private func fetchJSON<T: Decodable>(urlString: String) async -> T? {
        // ESPN $ref URLs use http:// but iOS ATS requires https://
        let secureUrl = urlString.hasPrefix("http://")
            ? "https://" + urlString.dropFirst(7)
            : urlString
        guard let url = URL(string: secureUrl) else { return nil }
        do {
            return try await client.request(url: url, ttl: CacheTTL.seasonData)
        } catch {
            return nil
        }
    }

    // MARK: - Search

    func searchAllPlayers(query: String) async -> [SearchResult] {
        guard query.count >= 2 else { return [] }

        do {
            let data = try await client.requestRaw(
                url: ESPNAPI.playerSearch(query: query),
                ttl: CacheTTL.statCategories
            )
            let response = try JSONDecoder().decode(ESPNSearchResponse.self, from: data)

            return (response.items ?? [])
                .filter { $0.sport == "golf" }
                .compactMap { item in
                    guard let id = item.id, let name = item.displayName else { return nil }
                    return SearchResult(id: id, name: name, country: item.citizenshipCountry?.name)
                }
        } catch {
            return []
        }
    }

    func searchPlayersInLeaderboard(entries: [LeaderboardEntry], query: String) -> [LeaderboardEntry] {
        let q = query.lowercased().trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return [] }
        return entries.filter {
            $0.player.name.lowercased().contains(q) ||
            ($0.player.country?.lowercased().contains(q) == true)
        }
    }

    // MARK: - Date Helpers

    private func getSeasonWindow(tour: Tour) -> (start: Date, end: Date) {
        let now = Date()
        let cal = Calendar.current

        if tour == .pga {
            let month = cal.component(.month, from: now)
            let year = cal.component(.year, from: now)
            let seasonYear = month >= 9 ? year + 1 : year
            let start = cal.date(from: DateComponents(year: seasonYear - 1, month: 9, day: 1))!
            let end = cal.date(from: DateComponents(year: seasonYear, month: 9, day: 1))!
            return (start, end)
        }

        let year = cal.component(.year, from: now)
        let start = cal.date(from: DateComponents(year: year, month: 1, day: 1))!
        let end = cal.date(from: DateComponents(year: year + 1, month: 1, day: 1))!
        return (start, end)
    }

    private func weeksBetween(start: Date, end: Date) -> [String] {
        var dates: [String] = []
        var cur = mondayOfWeek(start)
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd"

        while cur < end {
            dates.append(formatter.string(from: cur))
            cur = Calendar.current.date(byAdding: .day, value: 7, to: cur)!
        }
        return dates
    }

    private func mondayOfWeek(_ date: Date) -> Date {
        let cal = Calendar.current
        var d = cal.startOfDay(for: date)
        let weekday = cal.component(.weekday, from: d)
        let diff = weekday == 1 ? -6 : (2 - weekday)
        d = cal.date(byAdding: .day, value: diff, to: d)!
        return d
    }
}
