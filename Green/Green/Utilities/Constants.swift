import Foundation

enum CacheTTL {
    static let liveScores: TimeInterval = 60          // 1 min
    static let tournaments: TimeInterval = 120         // 2 min
    static let statCategories: TimeInterval = 300      // 5 min
    static let scoreboardLookup: TimeInterval = 1800   // 30 min
    static let seasonData: TimeInterval = 3600         // 1 hr
    static let fullSchedule: TimeInterval = 21600      // 6 hr
}

enum ESPNAPI {
    static let siteBase = "https://site.api.espn.com/apis/site/v2/sports/golf"
    static let webBase = "https://site.web.api.espn.com/apis"
    static let coreBase = "https://sports.core.api.espn.com/v2/sports/golf/leagues"

    static func scoreboard(tour: Tour) -> URL {
        URL(string: "\(siteBase)/\(tour.rawValue)/scoreboard")!
    }

    static func scoreboard(tour: Tour, dates: String) -> URL {
        URL(string: "\(siteBase)/\(tour.rawValue)/scoreboard?dates=\(dates)")!
    }

    static func playerOverview(tour: Tour, playerId: String) -> URL {
        URL(string: "\(webBase)/common/v3/sports/golf/\(tour.rawValue)/athletes/\(playerId)/overview")!
    }

    static func statistics(tour: Tour) -> URL {
        URL(string: "\(webBase)/site/v2/sports/golf/\(tour.rawValue)/statistics")!
    }

    static func seasonStats(tour: Tour, year: Int, playerId: String) -> URL {
        URL(string: "\(coreBase)/\(tour.rawValue)/seasons/\(year)/types/2/athletes/\(playerId)/statistics")!
    }

    static func eventLog(tour: Tour, year: Int, playerId: String) -> URL {
        URL(string: "\(coreBase)/\(tour.rawValue)/seasons/\(year)/athletes/\(playerId)/eventlog")!
    }

    static func playerSearch(query: String) -> URL {
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        return URL(string: "\(webBase)/common/v3/search?query=\(encoded)&limit=10&type=player&sport=golf")!
    }
}
