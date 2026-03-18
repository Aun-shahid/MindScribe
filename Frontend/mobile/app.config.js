const appJson = require('./app.json');

const productionBackendUrl = 'https://mindscribe-backend-production-ca1e.up.railway.app';

module.exports = ({ config }) => {
  const expoConfig = appJson.expo || {};

  return {
    ...expoConfig,
    ...config,
    extra: {
      ...(expoConfig.extra || {}),
      ...(config.extra || {}),
      BACKEND_URL:
        process.env.BACKEND_URL ||
        (expoConfig.extra && expoConfig.extra.BACKEND_URL) ||
        productionBackendUrl,
    },
  };
};
