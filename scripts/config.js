/**
 * Configuration management module for Whisper Flow frontend
 * Supports multiple configuration sources with priority order
 */

class WhisperFlowConfig {
    constructor() {
        // Developer-configurable constants (highest priority for code changes)
        this.DEFAULT_SERVER_CONFIG = {
            hostname: 'localhost',
            port: 8181,
            wsPath: '/ws',
            httpPath: '/transcribe_pcm_chunk',
            healthPath: '/health'
        };

        // Current active configuration
        this.currentConfig = null;
        
        // Configuration source tracking
        this.configSource = null;
        
        this.initialize();
    }

    /**
     * Initialize configuration from various sources
     */
    initialize() {
        // Priority order: URL params > localStorage > code constants > defaults
        let config = null;
        let source = null;

        // 1. Check URL parameters first
        const urlConfig = this.getConfigFromURL();
        if (urlConfig) {
            config = urlConfig;
            source = 'url';
        }

        // 2. Check localStorage if no URL config
        if (!config) {
            const localConfig = this.getConfigFromLocalStorage();
            if (localConfig) {
                config = localConfig;
                source = 'localStorage';
            }
        }

        // 3. Use code constants as fallback
        if (!config) {
            config = { ...this.DEFAULT_SERVER_CONFIG };
            source = 'code';
        }

        this.currentConfig = config;
        this.configSource = source;

        console.log(`Configuration initialized from ${source}:`, config);
    }

    /**
     * Get configuration from URL parameters
     */
    getConfigFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const host = urlParams.get('host') || urlParams.get('hostname');
        const port = urlParams.get('port');

        if (host || port) {
            const config = { ...this.DEFAULT_SERVER_CONFIG };
            
            if (host) {
                config.hostname = host;
            }
            
            if (port) {
                const portNum = parseInt(port, 10);
                if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
                    config.port = portNum;
                }
            }

            return config;
        }

        return null;
    }

    /**
     * Get configuration from localStorage
     */
    getConfigFromLocalStorage() {
        try {
            const stored = localStorage.getItem('whisperFlowConfig');
            if (stored) {
                const config = JSON.parse(stored);
                // Validate the stored config
                if (this.validateConfig(config)) {
                    return config;
                }
            }
        } catch (error) {
            console.warn('Failed to load config from localStorage:', error);
        }
        return null;
    }

    /**
     * Save configuration to localStorage
     */
    saveConfigToLocalStorage(config) {
        try {
            localStorage.setItem('whisperFlowConfig', JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('Failed to save config to localStorage:', error);
            return false;
        }
    }

    /**
     * Validate configuration object
     */
    validateConfig(config) {
        return config &&
               typeof config.hostname === 'string' && config.hostname.length > 0 &&
               typeof config.port === 'number' && config.port > 0 && config.port <= 65535 &&
               typeof config.wsPath === 'string' && config.wsPath.length > 0 &&
               typeof config.httpPath === 'string' && config.httpPath.length > 0 &&
               typeof config.healthPath === 'string' && config.healthPath.length > 0;
    }

    /**
     * Get current configuration
     */
    getCurrentConfig() {
        return { ...this.currentConfig };
    }

    /**
     * Get current configuration source
     */
    getConfigSource() {
        return this.configSource;
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig, source = 'user') {
        if (!this.validateConfig(newConfig)) {
            throw new Error('Invalid configuration');
        }

        this.currentConfig = { ...newConfig };
        this.configSource = source;

        // Save to localStorage if it's a user change
        if (source === 'user') {
            this.saveConfigToLocalStorage(newConfig);
        }

        console.log(`Configuration updated from ${source}:`, newConfig);
    }

    /**
     * Reset to code constants
     */
    resetToCodeConstants() {
        this.updateConfig({ ...this.DEFAULT_SERVER_CONFIG }, 'code');
        localStorage.removeItem('whisperFlowConfig');
    }

    /**
     * Build WebSocket URL from current config
     */
    getWebSocketURL() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${this.currentConfig.hostname}:${this.currentConfig.port}${this.currentConfig.wsPath}`;
    }

    /**
     * Build HTTP URL from current config
     */
    getHTTPURL(path) {
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        return `${protocol}//${this.currentConfig.hostname}:${this.currentConfig.port}${path}`;
    }

    /**
     * Get transcription endpoint URL
     */
    getTranscriptionURL() {
        return this.getHTTPURL(this.currentConfig.httpPath);
    }

    /**
     * Get health check endpoint URL
     */
    getHealthURL() {
        return this.getHTTPURL(this.currentConfig.healthPath);
    }

    /**
     * Get configuration summary for display
     */
    getConfigSummary() {
        return {
            hostname: this.currentConfig.hostname,
            port: this.currentConfig.port,
            source: this.configSource,
            wsUrl: this.getWebSocketURL(),
            httpUrl: this.getHTTPURL('')
        };
    }
}

// Create global configuration instance
window.WhisperFlowConfig = new WhisperFlowConfig(); 