import Foundation

@MainActor
@Observable
class FavoritesManager {
    private(set) var favorites: [FavoritePlayer] = []

    private let key = "favoritePlayers"
    private let defaults = UserDefaults.standard

    init() {
        load()
    }

    // MARK: - Public API

    func isFavorite(_ playerId: String) -> Bool {
        favorites.contains { $0.id == playerId }
    }

    func toggle(playerId: String, playerName: String) {
        if let index = favorites.firstIndex(where: { $0.id == playerId }) {
            favorites.remove(at: index)
        } else {
            let fav = FavoritePlayer(id: playerId, name: playerName, dateAdded: .now)
            favorites.insert(fav, at: 0) // newest first
        }
        save()
    }

    func remove(at offsets: IndexSet) {
        favorites.remove(atOffsets: offsets)
        save()
    }

    // MARK: - Persistence

    private func load() {
        guard let data = defaults.data(forKey: key),
              let decoded = try? JSONDecoder().decode([FavoritePlayer].self, from: data) else {
            return
        }
        favorites = decoded
    }

    private func save() {
        if let data = try? JSONEncoder().encode(favorites) {
            defaults.set(data, forKey: key)
        }
    }
}
