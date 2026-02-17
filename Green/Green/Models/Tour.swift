import Foundation

enum Tour: String, CaseIterable, Identifiable, Codable, Hashable {
    case pga
    case lpga
    case eur
    case champions = "champions-tour"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .pga: return "PGA Tour"
        case .lpga: return "LPGA Tour"
        case .eur: return "DP World Tour"
        case .champions: return "Champions Tour"
        }
    }

    var shortName: String {
        switch self {
        case .pga: return "PGA"
        case .lpga: return "LPGA"
        case .eur: return "DP World"
        case .champions: return "Champions"
        }
    }

    var espnStatsName: String {
        switch self {
        case .pga: return "PGA TOUR"
        case .lpga: return "LPGA"
        case .eur: return "DP WORLD TOUR"
        case .champions: return "PGA TOUR CHAMPIONS"
        }
    }
}
