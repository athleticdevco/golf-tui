import Foundation

enum APIError: Error, LocalizedError {
    case httpError(statusCode: Int)
    case invalidURL
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .httpError(let code): return "HTTP error: \(code)"
        case .invalidURL: return "Invalid URL"
        case .decodingError(let err): return "Decoding error: \(err.localizedDescription)"
        case .networkError(let err): return "Network error: \(err.localizedDescription)"
        }
    }
}

actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private var cache: [String: CacheEntry] = [:]

    private struct CacheEntry {
        let data: Data
        let timestamp: Date
    }

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }

    func request<T: Decodable>(
        url: URL,
        ttl: TimeInterval = CacheTTL.liveScores,
        forceRefresh: Bool = false
    ) async throws -> T {
        let key = url.absoluteString

        if !forceRefresh, let cached = cache[key],
           Date().timeIntervalSince(cached.timestamp) < ttl {
            do {
                return try JSONDecoder().decode(T.self, from: cached.data)
            } catch {
                // Cache decode failed, fall through to fetch
            }
        }

        let (data, response) = try await session.data(from: url)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.networkError(URLError(.badServerResponse))
        }

        guard (200...299).contains(http.statusCode) else {
            throw APIError.httpError(statusCode: http.statusCode)
        }

        cache[key] = CacheEntry(data: data, timestamp: Date())

        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    func requestRaw(url: URL, ttl: TimeInterval = CacheTTL.liveScores, forceRefresh: Bool = false) async throws -> Data {
        let key = url.absoluteString

        if !forceRefresh, let cached = cache[key],
           Date().timeIntervalSince(cached.timestamp) < ttl {
            return cached.data
        }

        let (data, response) = try await session.data(from: url)

        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            throw APIError.httpError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        cache[key] = CacheEntry(data: data, timestamp: Date())
        return data
    }

    func clearCache() {
        cache.removeAll()
    }
}
