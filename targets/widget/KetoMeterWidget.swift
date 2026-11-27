import WidgetKit
import SwiftUI

// Snapshot written by the app (src/widgets.ts) into the App Group.
struct Snapshot: Codable {
  var stage: Int
  var value: Int
  var remaining: Double
  var hoursToFatBurn: Double?
  var goalPct: Double?
  var proteinG: Int
  var proteinTargetG: Int
  var netCarbsG: Int
  var netCarbBudgetG: Int
  var updatedAt: Double

  static let placeholder = Snapshot(stage: 1, value: 212, remaining: 0.53, hoursToFatBurn: 10, goalPct: 9.9, proteinG: 62, proteinTargetG: 160, netCarbsG: 6, netCarbBudgetG: 25, updatedAt: 0)

  static func load() -> Snapshot {
    guard let json = UserDefaults(suiteName: "group.com.grindhouseapps.ketometer")?.string(forKey: "snapshot"),
          let data = json.data(using: .utf8),
          let s = try? JSONDecoder().decode(Snapshot.self, from: data) else { return .placeholder }
    return s
  }
}

let ember = Color(red: 1, green: 0.416, blue: 0.075)
let glow = Color(red: 1, green: 0.627, blue: 0.282)
let ash = Color(red: 0.18, green: 0.18, blue: 0.18)
let smoke = Color(red: 0.604, green: 0.604, blue: 0.604)
let bone = Color(red: 0.949, green: 0.941, blue: 0.925)
let charcoal = Color(red: 0.078, green: 0.078, blue: 0.078)

struct Entry: TimelineEntry { let date: Date; let snap: Snapshot }

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Entry { Entry(date: .now, snap: .placeholder) }
  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) { completion(Entry(date: .now, snap: .load())) }
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    // The app reloads widgets on every sync and log; refresh every 30 min as a fallback.
    completion(Timeline(entries: [Entry(date: .now, snap: .load())], policy: .after(.now.addingTimeInterval(1800))))
  }
}

struct FlameShape: Shape {
  func path(in r: CGRect) -> Path {
    let sx = r.width / 200, sy = r.height / 240
    func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: r.minX + x * sx, y: r.minY + y * sy) }
    var path = Path()
    path.move(to: p(100, 232))
    path.addCurve(to: p(24, 162), control1: p(54, 232), control2: p(24, 202))
    path.addCurve(to: p(58, 96), control1: p(24, 132), control2: p(40, 112))
    path.addCurve(to: p(80, 134), control1: p(60, 116), control2: p(68, 128))
    path.addCurve(to: p(116, 10), control1: p(74, 100), control2: p(86, 58))
    path.addCurve(to: p(176, 160), control1: p(128, 56), control2: p(176, 92))
    path.addCurve(to: p(100, 232), control1: p(176, 202), control2: p(146, 232))
    path.closeSubpath()
    return path
  }
}

struct TickGauge: View {
  let remaining: Double
  var ticks = 40
  var body: some View {
    GeometryReader { g in
      let size = min(g.size.width, g.size.height)
      let c = CGPoint(x: g.size.width / 2, y: g.size.height / 2)
      let lit = Int((remaining.clamped * Double(ticks)).rounded())
      ZStack {
        ForEach(0..<ticks, id: \.self) { i in
          let a = (135.0 + Double(i) * 270.0 / Double(ticks - 1)) * .pi / 180
          Path { p in
            p.move(to: CGPoint(x: c.x + size * 0.40 * cos(a), y: c.y + size * 0.40 * sin(a)))
            p.addLine(to: CGPoint(x: c.x + size * 0.48 * cos(a), y: c.y + size * 0.48 * sin(a)))
          }
          .stroke(i < lit ? ember : ash, style: StrokeStyle(lineWidth: max(2, size * 0.022), lineCap: .round))
        }
      }
    }
  }
}

extension Double { var clamped: Double { Swift.min(1, Swift.max(0, self)) } }

func etaText(_ s: Snapshot) -> String {
  if s.stage == 2 { return "In fat burn" }
  guard let h = s.hoursToFatBurn else { return "Keep fasting" }
  return h < 1 ? "Fat burn in <1 h" : "Fat burn in ~\(Int(h.rounded())) h"
}

struct KetoMeterWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: Entry
  var s: Snapshot { entry.snap }
  var label: String { s.stage == 1 ? "kcal to fat burn" : "kcal of fat to \(String(format: "%.1f", s.goalPct ?? 0))%" }

  var gaugeCore: some View {
    ZStack {
      TickGauge(remaining: s.remaining)
      VStack(spacing: 0) {
        FlameShape().fill(ember).frame(width: 18, height: 22).opacity(s.stage == 2 ? 1 : 0.35)
        Text(s.value.formatted()).font(.system(size: 22, weight: .light)).foregroundStyle(bone).minimumScaleFactor(0.6)
      }
    }
  }

  var body: some View {
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        TickGauge(remaining: s.remaining, ticks: 24)
        if s.stage == 2 { FlameShape().fill(.primary).frame(width: 14, height: 17) }
        else { Text(s.value >= 1000 ? "\(s.value / 1000)k" : "\(s.value)").font(.system(size: 13, weight: .semibold)) }
      }
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        Text(s.stage == 1 ? "STAGE 1 · GLYCOGEN" : "STAGE 2 · FAT BURN").font(.system(size: 10, weight: .semibold))
        Text("\(s.value.formatted()) \(label)").font(.system(size: 14, weight: .medium)).minimumScaleFactor(0.7)
        Text(etaText(s)).font(.system(size: 11))
      }
    case .systemMedium:
      HStack(spacing: 16) {
        gaugeCore.frame(width: 120, height: 120)
        VStack(alignment: .leading, spacing: 6) {
          Text(s.stage == 1 ? "STAGE 1 · GLYCOGEN" : "STAGE 2 · FAT BURN").font(.system(size: 10, weight: .semibold)).foregroundStyle(s.stage == 1 ? smoke : ember)
          Text(label).font(.system(size: 12)).foregroundStyle(smoke)
          Text(etaText(s)).font(.system(size: 13, weight: .medium)).foregroundStyle(glow)
          bar("Protein", s.proteinG, s.proteinTargetG, ember)
          bar("Net carbs", s.netCarbsG, s.netCarbBudgetG, s.netCarbsG > s.netCarbBudgetG ? ember : glow)
        }
      }
    default:
      VStack(spacing: 4) {
        gaugeCore.frame(height: 100)
        Text(s.stage == 1 ? "TO FAT BURN" : "FAT BURN").font(.system(size: 10, weight: .semibold)).foregroundStyle(s.stage == 1 ? smoke : ember)
      }
    }
  }

  func bar(_ name: String, _ v: Int, _ max: Int, _ color: Color) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text("\(name) \(v)/\(max) g").font(.system(size: 11)).foregroundStyle(bone)
      GeometryReader { g in
        ZStack(alignment: .leading) {
          Capsule().fill(ash)
          Capsule().fill(color).frame(width: g.size.width * (max > 0 ? Double(v) / Double(max) : 0).clamped)
        }
      }.frame(height: 5)
    }
  }
}

struct KetoMeterWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "KetoMeterWidget", provider: Provider()) { entry in
      KetoMeterWidgetView(entry: entry).containerBackground(charcoal, for: .widget)
    }
    .configurationDisplayName("KetoMeter")
    .description("Your fat-burn meter at a glance.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
  }
}
