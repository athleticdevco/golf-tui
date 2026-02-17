import Foundation

struct FavoritePlayer: Identifiable, Hashable, Codable {
    let id: String      // ESPN player ID
    let name: String    // Display name
    var dateAdded: Date // For ordering (newest first)
}
