import SwiftUI

struct HoleGridView: View {
    let round: RoundScorecard
    @Environment(ThemeManager.self) private var theme

    private var front9: [HoleScore] { round.holes.filter { $0.holeNumber <= 9 } }
    private var back9: [HoleScore] { round.holes.filter { $0.holeNumber > 9 } }

    var body: some View {
        VStack(spacing: 16) {
            nineHoleSection(title: "OUT", holes: front9, startHole: 1)
            nineHoleSection(title: "IN", holes: back9, startHole: 10)

            if round.totalStrokes != nil || round.toPar != nil {
                totalRow
                    .padding(.horizontal, 8)
            }
        }
    }

    // MARK: - Nine Hole Grid

    @ViewBuilder
    private func nineHoleSection(title: String, holes: [HoleScore], startHole: Int) -> some View {
        let columns = 11 // label + 9 holes + total
        VStack(spacing: 0) {
            // Row 1: Hole numbers
            gridRow(columns: columns) { col in
                if col == 0 {
                    cellText("HOLE", color: theme.terminalDim, bold: true)
                } else if col <= 9 {
                    cellText("\(startHole + col - 1)", color: theme.terminalDim, bold: true)
                } else {
                    cellText(title, color: theme.terminalGreen, bold: true)
                }
            }

            divider()

            // Row 2: Par
            gridRow(columns: columns) { col in
                if col == 0 {
                    cellText("PAR", color: theme.terminalDim, bold: true)
                } else if col <= 9 {
                    let hole = holes.first { $0.holeNumber == startHole + col - 1 }
                    cellText(hole.map { "\($0.par)" } ?? "-", color: theme.terminalDim)
                } else {
                    let parTotal = holes.reduce(0) { $0 + $1.par }
                    cellText(holes.isEmpty ? "-" : "\(parTotal)", color: theme.terminalDim)
                }
            }

            divider()

            // Row 3: Scores
            gridRow(columns: columns) { col in
                if col == 0 {
                    cellText("", color: .clear)
                } else if col <= 9 {
                    let hole = holes.first { $0.holeNumber == startHole + col - 1 }
                    if let hole {
                        cellText("\(hole.strokes)", color: theme.holeScoreColor(for: hole.toPar), bold: true)
                    } else {
                        cellText("-", color: theme.terminalDim)
                    }
                } else {
                    let total = holes.reduce(0) { $0 + $1.strokes }
                    cellText(holes.isEmpty ? "-" : "\(total)", color: theme.terminalGreen, bold: true)
                }
            }
        }
        .overlay(
            Rectangle()
                .stroke(theme.border, lineWidth: 1)
        )
        .background(theme.cardBg)
        .padding(.horizontal, 8)
    }

    // MARK: - Grid Components

    @ViewBuilder
    private func gridRow(columns: Int, @ViewBuilder content: @escaping (Int) -> some View) -> some View {
        HStack(spacing: 0) {
            ForEach(0..<columns, id: \.self) { col in
                if col > 0 {
                    Rectangle()
                        .fill(theme.border)
                        .frame(width: 1)
                }
                content(col)
                    .frame(maxWidth: col == 0 ? nil : .infinity)
                    .frame(width: col == 0 ? 48 : nil)
            }
        }
        .frame(height: 24)
    }

    @ViewBuilder
    private func cellText(_ text: String, color: Color, bold: Bool = false) -> some View {
        Text(text)
            .font(.mono(.caption2, weight: bold ? .bold : .regular))
            .foregroundStyle(color)
            .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private func divider() -> some View {
        Rectangle()
            .fill(theme.border)
            .frame(height: 1)
    }

    // MARK: - Total Row

    @ViewBuilder
    private var totalRow: some View {
        HStack {
            Text("TOTAL")
                .font(.mono(.subheadline, weight: .bold))
                .foregroundStyle(theme.terminalGreen)
            Spacer()
            if let strokes = round.totalStrokes {
                Text("\(strokes)")
                    .font(.mono(.title3, weight: .bold))
                    .foregroundStyle(theme.terminalGreen)
            }
            if let toPar = round.toPar {
                ScoreText(score: Formatters.formatScore(toPar), scoreNum: toPar)
                    .font(.mono(.title3))
            }
        }
        .padding(12)
        .background(theme.cardBg)
        .overlay(
            Rectangle()
                .stroke(theme.border, lineWidth: 1)
        )
    }
}
