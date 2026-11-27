/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'KetoMeterWidget',
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit'],
  colors: { $accent: '#FF6A13', $widgetBackground: '#141414' },
  entitlements: { 'com.apple.security.application-groups': ['group.com.grindhouseapps.ketometer'] },
};
