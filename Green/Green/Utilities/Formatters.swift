import Foundation

enum Formatters {
    static func formatScore(_ score: Int) -> String {
        if score == 0 { return "E" }
        return score > 0 ? "+\(score)" : "\(score)"
    }

    static func parseScore(_ scoreStr: String?) -> Int {
        guard let str = scoreStr, str != "E" else { return 0 }
        return Int(str) ?? 0
    }

    static func formatDate(_ dateStr: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateStr)
                ?? ISO8601DateFormatter().date(from: dateStr) else {
            // Try simple date format
            let simple = DateFormatter()
            simple.dateFormat = "yyyy-MM-dd'T'HH:mm'Z'"
            guard let d = simple.date(from: dateStr) else { return dateStr }
            let display = DateFormatter()
            display.dateFormat = "MMM d"
            return display.string(from: d)
        }
        let display = DateFormatter()
        display.dateFormat = "MMM d"
        return display.string(from: date)
    }

    static func formatDateRange(start: String, end: String?) -> String {
        let startFormatted = formatDate(start)
        guard let end else { return startFormatted }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let endDate = formatter.date(from: end)
                ?? ISO8601DateFormatter().date(from: end) else {
            return startFormatted
        }

        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "d"
        return "\(startFormatted)-\(dayFormatter.string(from: endDate))"
    }

    static func formatPurse(_ purse: String?) -> String {
        purse ?? ""
    }
}
