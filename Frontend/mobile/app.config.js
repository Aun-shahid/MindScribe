const appJson = require('./app.json');
const fs = require('fs');
const path = require('path');

const productionBackendUrl = 'https://mindscribe-backend-production-ca1e.up.railway.app';

const withPlugin = (plugins, pluginName) => {
  if (!Array.isArray(plugins)) {
    return [pluginName];
  }

  const alreadyIncluded = plugins.some((plugin) => {
    if (typeof plugin === 'string') {
      return plugin === pluginName;
    }

    if (Array.isArray(plugin)) {
      return plugin[0] === pluginName;
    }

    return false;
  });

  return alreadyIncluded ? plugins : [...plugins, pluginName];
};

const dedupePlugins = (plugins) => {
  if (!Array.isArray(plugins)) {
    return [];
  }

  const seen = new Set();
  return plugins.filter((plugin) => {
    const key = typeof plugin === 'string' ? plugin : JSON.stringify(plugin);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const getExistingConfigPath = (relativePath) => {
  const absolutePath = path.resolve(__dirname, relativePath);
  return fs.existsSync(absolutePath) ? relativePath : undefined;
};

module.exports = ({ config }) => {
  const expoConfig = appJson.expo || {};
  const androidGoogleServicesFile = getExistingConfigPath('./google-services.json');
  const iosGoogleServiceInfoFile = getExistingConfigPath('./GoogleService-Info.plist');

  const mergedAndroid = {
    ...(expoConfig.android || {}),
    ...(config.android || {}),
  };

  const mergedIos = {
    ...(expoConfig.ios || {}),
    ...(config.ios || {}),
  };

  if (androidGoogleServicesFile) {
    mergedAndroid.googleServicesFile = androidGoogleServicesFile;
  }

  if (iosGoogleServiceInfoFile) {
    mergedIos.googleServicesFile = iosGoogleServiceInfoFile;
  }

  const mergedPlugins = withPlugin(
    dedupePlugins([...(expoConfig.plugins || []), ...(config.plugins || [])]),
    'expo-notifications'
  );

  return {
    ...expoConfig,
    ...config,
    android: mergedAndroid,
    ios: mergedIos,
    plugins: mergedPlugins,
    extra: {
      ...(expoConfig.extra || {}),
      ...(config.extra || {}),
      BACKEND_URL:
        process.env.BACKEND_URL ||
        productionBackendUrl,
    },
  };
};
