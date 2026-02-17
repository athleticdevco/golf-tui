import Foundation

// MARK: - ESPN Response Types

private struct ESPNScoreboardResponse: Decodable {
    let events: [ESPNEvent]?
    let season: ESPNSeason?
}

private struct ESPNSeason: Decodable {
    let year: Int
    let type: Int?
}

private struct ESPNEvent: Decodable {
    let id: String
    let name: String
    let shortName: String?
    let date: String
    let endDate: String?
    let status: ESPNEventStatus?
    let competitions: [ESPNCompetition]?
}

private struct ESPNEventStatus: Decodable {
    let type: ESPNStatusType?
}

private struct ESPNStatusType: Decodable {
    let state: String?
    let completed: Bool?
}

private struct ESPNCompetition: Decodable {
    let id: String
    let purse: Double?
    let venue: ESPNVenue?
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

// MARK: - Service

struct TournamentService {
    private let client = APIClient.shared

    func fetchTournaments(tour: Tour) async -> [Tournament] {
        do {
            let response: ESPNScoreboardResponse = try await client.request(
                url: ESPNAPI.scoreboard(tour: tour),
                ttl: CacheTTL.tournaments
            )
            return parseEvents(response.events, tour: tour)
        } catch {
            return []
        }
    }

    func fetchSchedule(tour: Tour) async -> [Tournament] {
        do {
            let year = Calendar.current.component(.year, from: Date())
            let response: ESPNScoreboardResponse = try await client.request(
                url: ESPNAPI.scoreboard(tour: tour, dates: String(year)),
                ttl: CacheTTL.fullSchedule
            )
            return parseEvents(response.events, tour: tour)
        } catch {
            return []
        }
    }

    private func parseEvents(_ events: [ESPNEvent]?, tour: Tour) -> [Tournament] {
        guard let events else { return [] }

        return events.map { event in
            let competition = event.competitions?.first
            let statusState = event.status?.type?.state ?? "pre"
            let status: TournamentStatus = statusState == "in" ? .in : statusState == "post" ? .post : .pre

            let venue = competition?.venue
            var locationParts: [String] = []
            if let city = venue?.address?.city { locationParts.append(city) }
            if let state = venue?.address?.state { locationParts.append(state) }
            if let country = venue?.address?.country, country != "USA" {
                locationParts.append(country)
            }

            let purseStr: String? = {
                guard let purse = competition?.purse, purse > 0 else { return nil }
                return "$\(String(format: "%.1f", purse / 1_000_000))M"
            }()

            return Tournament(
                id: event.id,
                name: event.name,
                shortName: event.shortName,
                date: event.date,
                endDate: event.endDate,
                venue: venue?.fullName,
                location: locationParts.joined(separator: ", "),
                purse: purseStr,
                status: status,
                tour: tour
            )
        }
    }
}
