import SwiftUI

struct LoadingView: View {
    let message: String

    init(_ message: String = "LOADING...") {
        self.message = message.uppercased()
    }

    var body: some View {
        RetroLoadingView(message)
    }
}
