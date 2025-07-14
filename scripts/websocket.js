/**
 * WebSocket communication module for Whisper Flow frontend
 * Handles real-time connection to the whisper-flow server
 */

class WhisperWebSocket {
    constructor(config = null) {
        // Use provided config or get from global config
        this.config = config || window.WhisperFlowConfig;
        this.serverUrl = this.config.getWebSocketURL();
        this.websocket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        this.onMessage = null;
        this.onConnectionChange = null;
        this.onError = null;
    }

    /**
     * Connect to the WebSocket server
     */
    async connect() {
        try {
            // Update server URL from current config
            this.serverUrl = this.config.getWebSocketURL();
            console.log('Connecting to Whisper Flow server...', this.serverUrl);
            
            this.websocket = new WebSocket(this.serverUrl);
            
            this.websocket.onopen = () => {
                console.log('Connected to Whisper Flow server');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
                
                if (this.onConnectionChange) {
                    this.onConnectionChange(true);
                }
            };
            
            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (this.onMessage) {
                        this.onMessage(data);
                    }
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            
            this.websocket.onclose = (event) => {
                console.log('WebSocket connection closed:', event.code, event.reason);
                this.isConnected = false;
                
                if (this.onConnectionChange) {
                    this.onConnectionChange(false);
                }
                
                // Attempt to reconnect if not a normal closure
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.attemptReconnect();
                }
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                if (this.onError) {
                    this.onError(error);
                }
            };
            
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            throw error;
        }
    }

    /**
     * Attempt to reconnect to the server
     */
    attemptReconnect() {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);
        
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000);
    }

    /**
     * Send audio chunk to the server
     * Fixed to send raw bytes as expected by the server
     */
    sendAudioChunk(audioChunk) {
        if (!this.isConnected || !this.websocket) {
            throw new Error('WebSocket not connected');
        }
        
        if (this.websocket.readyState === WebSocket.OPEN) {
            // Convert ArrayBuffer to Uint8Array for proper binary transmission
            const uint8Array = new Uint8Array(audioChunk);
            this.websocket.send(uint8Array);
        } else {
            throw new Error('WebSocket not in OPEN state');
        }
    }

    /**
     * Send file for transcription
     */
    async sendFileForTranscription(file) {
        try {
            const formData = new FormData();
            formData.append('model_name', 'tiny.en.pt');
            formData.append('files', file);
            
            const response = await fetch(this.config.getTranscriptionURL(), {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to send file for transcription:', error);
            throw error;
        }
    }

    /**
     * Check server health
     */
    async checkHealth() {
        try {
            const response = await fetch(this.config.getHealthURL());
            if (response.ok) {
                const health = await response.text();
                return health;
            } else {
                throw new Error(`Health check failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        if (this.websocket) {
            this.websocket.close(1000, 'Client disconnecting');
            this.websocket = null;
        }
        this.isConnected = false;
        this.reconnectAttempts = 0;
        
        if (this.onConnectionChange) {
            this.onConnectionChange(false);
        }
    }

    /**
     * Set callback for incoming messages
     */
    setMessageCallback(callback) {
        this.onMessage = callback;
    }

    /**
     * Set callback for connection state changes
     */
    setConnectionChangeCallback(callback) {
        this.onConnectionChange = callback;
    }

    /**
     * Set callback for errors
     */
    setErrorCallback(callback) {
        this.onError = callback;
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: this.websocket ? this.websocket.readyState : null,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    /**
     * Update configuration and reconnect
     */
    async updateConfig(newConfig) {
        this.config.updateConfig(newConfig, 'user');
        this.serverUrl = this.config.getWebSocketURL();
        
        // Disconnect current connection if connected
        if (this.isConnected) {
            this.disconnect();
        }
        
        // Reset reconnection attempts
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        
        // Connect with new configuration
        await this.connect();
    }
}

// Export for use in other modules
window.WhisperWebSocket = WhisperWebSocket; 