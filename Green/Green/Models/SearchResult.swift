import Foundation

struct SearchResult: Identifiable, Hashable {
    let id: String
    let name: String
    var country: String?
}
