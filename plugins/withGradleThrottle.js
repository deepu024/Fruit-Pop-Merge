/**
 * Config plugin: caps local Gradle parallelism/memory so building on a laptop
 * doesn't freeze the machine. Survives `expo prebuild --clean`. Has no effect on
 * EAS cloud builds beyond slightly slower compiles. Remove it on a beefy machine.
 */
const { withGradleProperties } = require('expo/config-plugins');

const PROPS = {
  'org.gradle.workers.max': '2',
  'org.gradle.parallel': 'false',
  'org.gradle.jvmargs': '-Xmx2048m -XX:MaxMetaspaceSize=512m',
  'kotlin.daemon.jvmargs': '-Xmx1536m',
};

module.exports = function withGradleThrottle(config) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(PROPS)) {
      cfg.modResults = cfg.modResults.filter((item) => !(item.type === 'property' && item.key === key));
      cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
};
