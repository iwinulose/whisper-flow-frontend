/**
 * UI management module for Whisper Flow frontend
 * Handles DOM updates, user interactions, and visual feedback
 */

class UI {
    constructor() {
        this.elements = {};
        this.initializeElements();
        this.setupEventListeners();
        this.partialBubble = null; // Track the current partial bubble
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            // Configuration elements
            configSection: document.getElementById('configSection'),
            hostnameInput: document.getElementById('hostnameInput'),
            portInput: document.getElementById('portInput'),
            configSource: document.getElementById('configSource'),
            applyConfigButton: document.getElementById('applyConfigButton'),
            resetConfigButton: document.getElementById('resetConfigButton'),
            configToggleButton: document.getElementById('configToggleButton'),
            
            // Status elements
            connectionStatus: document.getElementById('connectionStatus'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            
            // Recording controls
            recordButton: document.getElementById('recordButton'),
            stopButton: document.getElementById('stopButton'),
            
            // Audio level
            audioLevel: document.getElementById('audioLevel'),
            audioLevelText: document.getElementById('audioLevelText'),
            
            // Transcription display
            transcriptionText: document.getElementById('transcriptionText'),
            
            // File upload
            fileDropZone: document.getElementById('fileDropZone'),
            fileInput: document.getElementById('fileInput'),
            uploadButton: document.getElementById('uploadButton'),
            uploadResult: document.getElementById('uploadResult')
        };
    }

    /**
     * Set up event listeners for user interactions
     */
    setupEventListeners() {
        // Configuration controls
        this.elements.configToggleButton.addEventListener('click', () => {
            this.toggleConfigSection();
        });
        
        this.elements.applyConfigButton.addEventListener('click', () => {
            this.onApplyConfigClick();
        });
        
        this.elements.resetConfigButton.addEventListener('click', () => {
            this.onResetConfigClick();
        });
        
        // Recording controls
        this.elements.recordButton.addEventListener('click', () => {
            this.onRecordButtonClick();
        });
        
        this.elements.stopButton.addEventListener('click', () => {
            this.onStopButtonClick();
        });
        
        // File upload
        this.elements.fileInput.addEventListener('change', (event) => {
            this.onFileSelected(event);
        });
        
        this.elements.uploadButton.addEventListener('click', () => {
            this.onUploadButtonClick();
        });
        
        // Drag and drop
        this.elements.fileDropZone.addEventListener('dragover', (event) => {
            event.preventDefault();
            this.elements.fileDropZone.classList.add('dragover');
        });
        
        this.elements.fileDropZone.addEventListener('dragleave', () => {
            this.elements.fileDropZone.classList.remove('dragover');
        });
        
        this.elements.fileDropZone.addEventListener('drop', (event) => {
            event.preventDefault();
            this.elements.fileDropZone.classList.remove('dragover');
            this.onFileDropped(event);
        });
        
        // Click to browse
        this.elements.fileDropZone.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
    }

    /**
     * Update connection status display
     */
    updateConnectionStatus(isConnected, message = null) {
        const indicator = this.elements.statusIndicator;
        const text = this.elements.statusText;
        
        if (isConnected) {
            indicator.className = 'status-indicator connected';
            text.textContent = message || 'Connected to Whisper Flow';
        } else {
            indicator.className = 'status-indicator error';
            text.textContent = message || 'Disconnected from Whisper Flow';
            
            // Auto-expand configuration section on connection failure
            this.showConfigSection();
        }
    }

    /**
     * Update audio level visualization
     */
    updateAudioLevel(level) {
        const percentage = Math.min(level * 100, 100);
        this.elements.audioLevel.style.width = `${percentage}%`;
        
        // Update text based on level
        if (level < 0.1) {
            this.elements.audioLevelText.textContent = 'Audio Level: Low';
        } else if (level < 0.5) {
            this.elements.audioLevelText.textContent = 'Audio Level: Medium';
        } else {
            this.elements.audioLevelText.textContent = 'Audio Level: High';
        }
    }

    /**
     * Show or update the current partial transcription bubble
     */
    showPartialTranscription(text) {
        // If no partial bubble exists, create one
        if (!this.partialBubble) {
            this.partialBubble = document.createElement('div');
            this.partialBubble.className = 'transcription-line partial';
            this.elements.transcriptionText.appendChild(this.partialBubble);
        }
        this.partialBubble.textContent = text;
        // Auto-scroll to bottom
        this.elements.transcriptionText.scrollTop = this.elements.transcriptionText.scrollHeight;
    }

    /**
     * Finalize the current partial bubble as a green (final) bubble
     * and start a new row for the next utterance
     */
    finalizePartialTranscription() {
        if (this.partialBubble) {
            this.partialBubble.className = 'transcription-line final';
            this.partialBubble = null;
        }
    }

    /**
     * Clear all transcription display and reset state
     */
    clearTranscription() {
        this.elements.transcriptionText.innerHTML = '<p class="placeholder-text">Start recording to see live transcription...</p>';
        this.partialBubble = null;
    }

    /**
     * Update recording button states
     */
    updateRecordingState(isRecording) {
        this.elements.recordButton.disabled = isRecording;
        this.elements.stopButton.disabled = !isRecording;
        
        if (isRecording) {
            this.elements.recordButton.querySelector('.btn-text').textContent = 'Recording...';
            this.elements.recordButton.classList.add('recording');
        } else {
            this.elements.recordButton.querySelector('.btn-text').textContent = 'Start Recording';
            this.elements.recordButton.classList.remove('recording');
        }
    }

    /**
     * Update upload button state
     */
    updateUploadButtonState(hasFile) {
        this.elements.uploadButton.disabled = !hasFile;
    }

    /**
     * Show upload result
     */
    showUploadResult(success, message) {
        const result = this.elements.uploadResult;
        result.className = `upload-result ${success ? 'success' : 'error'}`;
        result.textContent = message;
        result.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            result.style.display = 'none';
        }, 5000);
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create temporary error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Get selected file
     */
    getSelectedFile() {
        return this.elements.fileInput.files[0] || null;
    }

    /**
     * Clear file selection
     */
    clearFileSelection() {
        this.elements.fileInput.value = '';
        this.updateUploadButtonState(false);
    }

    /**
     * Update configuration display
     */
    updateConfigDisplay() {
        const config = window.WhisperFlowConfig.getConfigSummary();
        
        this.elements.hostnameInput.value = config.hostname;
        this.elements.portInput.value = config.port;
        
        // Update source indicator with color coding
        const sourceElement = this.elements.configSource;
        sourceElement.textContent = config.source;
        sourceElement.className = `config-source ${config.source}`;
    }

    /**
     * Get current configuration from form inputs
     */
    getConfigFromForm() {
        const hostname = this.elements.hostnameInput.value.trim();
        const port = parseInt(this.elements.portInput.value, 10);
        
        if (!hostname) {
            throw new Error('Hostname is required');
        }
        
        if (isNaN(port) || port < 1 || port > 65535) {
            throw new Error('Port must be a number between 1 and 65535');
        }
        
        return {
            hostname: hostname,
            port: port,
            wsPath: '/ws',
            httpPath: '/transcribe_pcm_chunk',
            healthPath: '/health'
        };
    }

    /**
     * Show configuration error
     */
    showConfigError(message) {
        this.showError(`Configuration Error: ${message}`);
    }

    /**
     * Show configuration success
     */
    showConfigSuccess(message) {
        this.showSuccess(`Configuration: ${message}`);
    }

    /**
     * Toggle configuration section visibility
     */
    toggleConfigSection() {
        const configSection = this.elements.configSection;
        if (configSection.style.display === 'none') {
            this.showConfigSection();
        } else {
            this.hideConfigSection();
        }
    }

    /**
     * Show configuration section
     */
    showConfigSection() {
        this.elements.configSection.style.display = 'block';
        this.elements.configToggleButton.querySelector('.btn-text').textContent = 'Hide Settings';
        this.elements.configToggleButton.classList.add('active');
    }

    /**
     * Hide configuration section
     */
    hideConfigSection() {
        this.elements.configSection.style.display = 'none';
        this.elements.configToggleButton.querySelector('.btn-text').textContent = 'Settings';
        this.elements.configToggleButton.classList.remove('active');
    }

    // Event handler callbacks (to be set by main app)
    onApplyConfigClick = null;
    onResetConfigClick = null;
    onRecordButtonClick = null;
    onStopButtonClick = null;
    onFileSelected = null;
    onUploadButtonClick = null;
    onFileDropped = null;

    /**
     * Set event handler callbacks
     */
    setEventHandlers(handlers) {
        this.onApplyConfigClick = handlers.onApplyConfigClick;
        this.onResetConfigClick = handlers.onResetConfigClick;
        this.onRecordButtonClick = handlers.onRecordButtonClick;
        this.onStopButtonClick = handlers.onStopButtonClick;
        this.onFileSelected = handlers.onFileSelected;
        this.onUploadButtonClick = handlers.onUploadButtonClick;
        this.onFileDropped = handlers.onFileDropped;
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .btn.recording {
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
        animation: pulse 1s infinite;
    }
`;
document.head.appendChild(style);

// Export for use in other modules
window.UI = UI; 