const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'GCC_WARN_INHIBIT_ALL_WARNINGS';
const SNIPPET = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['GCC_WARN_INHIBIT_ALL_WARNINGS'] = 'YES'
        bc.build_settings['SWIFT_SUPPRESS_WARNINGS'] = 'YES'
      end
    end
`;

function withSilencePodWarnings(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let src = await fs.promises.readFile(podfilePath, 'utf8');
      if (!src.includes(MARKER)) {
        src = src.replace(
          /react_native_post_install\(\s*installer,[\s\S]*?\)\n/,
          (match) => `${match}${SNIPPET}`,
        );
        await fs.promises.writeFile(podfilePath, src);
      }
      return cfg;
    },
  ]);
}

module.exports = withSilencePodWarnings;
