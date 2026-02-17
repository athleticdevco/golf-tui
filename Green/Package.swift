// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Green",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(name: "Green", targets: ["Green"])
    ],
    targets: [
        .target(
            name: "Green",
            path: "Green"
        )
    ]
)
