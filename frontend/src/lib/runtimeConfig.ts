/**
 * Runtime configuration loader for API URLs
 * Loads config.json at runtime to allow configuration without rebuilding
 */

export interface RuntimeConfig {
  apiBaseUrl: string;
  cameraUrl: string;
}

let config: RuntimeConfig | null = null;
let configPromise: Promise<RuntimeConfig> | null = null;

/**
 * Loads the runtime configuration from config.json
 * Caches the result after first load
 */
export async function loadConfig(): Promise<RuntimeConfig> {
  // Check for runtime override first
  const override = getRuntimeConfigOverride();
  if (override) {
    config = override;
    return config;
  }

  // Return cached config if already loaded
  if (config) {
    return config;
  }

  // Return existing promise if already loading
  if (configPromise) {
    return configPromise;
  }

  // Start loading config
  configPromise = (async () => {
    try {
      const response = await fetch('/config.json');
      if (!response.ok) {
        throw new Error(`Failed to load config.json: ${response.status} ${response.statusText}`);
      }
      const loadedConfig = await response.json();
      
      // Validate config structure
      if (!loadedConfig.apiBaseUrl || !loadedConfig.cameraUrl) {
        throw new Error('Invalid config.json: missing required fields (apiBaseUrl, cameraUrl)');
      }

      // Remove trailing slashes
      config = {
        apiBaseUrl: loadedConfig.apiBaseUrl.replace(/\/+$/, ''),
        cameraUrl: loadedConfig.cameraUrl.replace(/\/+$/, '')
      };

      return config;
    } catch (error) {
      console.error('Error loading runtime config:', error);
      // Fallback to default values
      config = {
        apiBaseUrl: 'http://127.0.0.1:8000',
        cameraUrl: 'http://127.0.0.1:8000'
      };
      return config;
    } finally {
      configPromise = null;
    }
  })();

  return configPromise;
}

/**
 * Gets the current config (synchronous)
 * Returns default values if config hasn't been loaded yet
 * Use loadConfig() first to ensure config is loaded
 */
export function getConfig(): RuntimeConfig {
  // Check for runtime override first
  const override = getRuntimeConfigOverride();
  if (override) {
    return override;
  }

  if (config) {
    return config;
  }
  // Return defaults if not loaded yet
  return {
    apiBaseUrl: 'http://127.0.0.1:8000',
    cameraUrl: 'http://127.0.0.1:8000'
  };
}

/**
 * Resets the cached config (useful for testing or reloading)
 */
export function resetConfig(): void {
  config = null;
  configPromise = null;
}

/**
 * Updates the config at runtime and saves to localStorage
 * This allows changing config without rebuilding
 */
export async function updateConfig(newConfig: RuntimeConfig): Promise<void> {
  // Validate config
  if (!newConfig.apiBaseUrl || !newConfig.cameraUrl) {
    throw new Error('Invalid config: missing required fields (apiBaseUrl, cameraUrl)');
  }

  // Remove trailing slashes
  const cleanedConfig: RuntimeConfig = {
    apiBaseUrl: newConfig.apiBaseUrl.replace(/\/+$/, ''),
    cameraUrl: newConfig.cameraUrl.replace(/\/+$/, '')
  };

  // Save to localStorage as runtime override
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('f80-runtime-config-override', JSON.stringify(cleanedConfig));
    } catch (e) {
      console.warn('Failed to save runtime config override to localStorage:', e);
      throw new Error('Failed to save config');
    }
  }

  // Update cached config immediately and clear any pending promise
  config = cleanedConfig;
  configPromise = null; // Clear promise so next loadConfig() call uses the new config
}

/**
 * Gets runtime config override from localStorage if it exists
 */
function getRuntimeConfigOverride(): RuntimeConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem('f80-runtime-config-override');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.apiBaseUrl && parsed.cameraUrl) {
        return {
          apiBaseUrl: parsed.apiBaseUrl.replace(/\/+$/, ''),
          cameraUrl: parsed.cameraUrl.replace(/\/+$/, '')
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load runtime config override from localStorage:', e);
  }

  return null;
}

/**
 * Clears the runtime config override, reverting to config.json
 */
export function clearRuntimeConfigOverride(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('f80-runtime-config-override');
  }
  config = null;
  configPromise = null;
}

