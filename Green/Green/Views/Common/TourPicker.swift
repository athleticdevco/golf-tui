import SwiftUI

struct TourPicker: View {
    @Binding var selectedTour: Tour
    let activeTours: [Tour]
    @Environment(ThemeManager.self) private var theme

    var body: some View {
        HStack(spacing: 0) {
            ForEach(activeTours) { tour in
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) {
                        selectedTour = tour
                    }
                } label: {
                    Text(tour.shortName)
                        .font(.mono(.caption, weight: .bold))
                        .foregroundStyle(
                            selectedTour == tour
                            ? theme.terminalGreen
                            : theme.terminalDim
                        )
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(
                            selectedTour == tour
                            ? theme.terminalGreen.opacity(0.1)
                            : Color.clear
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 2)
                                .stroke(
                                    selectedTour == tour
                                    ? theme.terminalGreen.opacity(0.4)
                                    : theme.terminalDim.opacity(0.2),
                                    lineWidth: 1
                                )
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal)
    }
}
