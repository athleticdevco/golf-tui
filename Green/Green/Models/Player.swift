import Foundation

struct Player: Identifiable, Hashable {
    let id: String
    let name: String
    var firstName: String?
    var lastName: String?
    var country: String?
    var countryCode: String?
    var amateur: Bool?
    var imageUrl: String?
}
