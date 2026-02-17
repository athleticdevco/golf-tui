import Foundation

enum NavigationDestination: Hashable {
    case playerProfile(playerId: String, playerName: String)
    case scorecard(eventId: String, eventDate: String, playerId: String, playerName: String)
    case eventLeaderboard(eventId: String, eventName: String, eventDate: String)
    case seasonResults(playerId: String, year: Int)
    case statLeaders(metricName: String)
}
