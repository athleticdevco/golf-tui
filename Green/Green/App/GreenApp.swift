import SwiftUI

@main
struct GreenApp: App {
    @State private var favoritesManager = FavoritesManager()
    @State private var themeManager = ThemeManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(favoritesManager)
                .environment(themeManager)
                .onAppear { applyUIKitAppearances() }
                .onChange(of: themeManager.mode) { _, _ in
                    applyUIKitAppearances()
                    refreshWindows()
                }
        }
    }

    private func refreshWindows() {
        for scene in UIApplication.shared.connectedScenes {
            guard let windowScene = scene as? UIWindowScene else { continue }
            for window in windowScene.windows {
                for view in window.subviews {
                    view.removeFromSuperview()
                    window.addSubview(view)
                }
            }
        }
    }

    private func applyUIKitAppearances() {
        let navAppearance = UINavigationBarAppearance()
        navAppearance.configureWithOpaqueBackground()
        navAppearance.backgroundColor = themeManager.uiTerminalBg
        navAppearance.titleTextAttributes = [
            .foregroundColor: themeManager.uiTerminalGreen,
            .font: UIFont.monospacedSystemFont(ofSize: 16, weight: .bold)
        ]
        navAppearance.largeTitleTextAttributes = [
            .foregroundColor: themeManager.uiTerminalGreen,
            .font: UIFont.monospacedSystemFont(ofSize: 28, weight: .bold)
        ]
        UINavigationBar.appearance().standardAppearance = navAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
        UINavigationBar.appearance().compactAppearance = navAppearance
        UINavigationBar.appearance().tintColor = themeManager.uiTerminalGreen

        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithOpaqueBackground()
        tabAppearance.backgroundColor = themeManager.uiTerminalBg
        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance

        UITableView.appearance().backgroundColor = themeManager.uiTerminalBg
        UITableView.appearance().separatorColor = themeManager.uiBorder
    }
}
