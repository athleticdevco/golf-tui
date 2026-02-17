import SwiftUI

struct FlagView: View {
    let countryCode: String?

    var body: some View {
        Text(FlagMap.flag(for: countryCode))
            .font(.caption)
    }
}
