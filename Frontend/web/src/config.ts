/**
 * Application Configuration
 * Centralized configuration for API endpoints
 */

interface AppConfig {
  backendUrl: string;
  aiServiceUrl: string;
  environment: 'development' | 'production' | 'test';
}

/**
 * Get configuration from environment variables
 */
const getConfig = (): AppConfig => {
  // Vite exposes env vars through import.meta.env
  // All env vars must start with VITE_ to be accessible
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const aiServiceUrl = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8001';
  const environment = (import.meta.env.MODE || 'development') as AppConfig['environment'];

  // Log configuration in development
  if (environment === 'development') {
    console.log('🔧 Config loaded:', {
      backendUrl,
      aiServiceUrl,
      environment,
    });
  }

  return {
    backendUrl,
    aiServiceUrl,
    environment,
  };
};

// Create config instance
export const config = getConfig();

// Export individual values for convenience
export const { backendUrl, aiServiceUrl, environment } = config;

// Export as default
export default config;
