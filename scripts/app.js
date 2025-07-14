/**
 * Main application module for Whisper Flow frontend
 * Orchestrates all components and manages application state
 */

class WhisperFlowApp {
    constructor() {
        this.ui = null;
        this.audioProcessor = null;
        this.websocket = null;
        this.isRecording = false;
        this.selectedFile = null;
        this.chunkCount = 0; // For debugging
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing Whisper Flow frontend...');
            
            // Initialize UI
            this.ui = new UI();
            
            // Update configuration display
            this.ui.updateConfigDisplay();
            
            // Initialize WebSocket connection
            this.websocket = new WhisperWebSocket();
            
            // Set up WebSocket callbacks
            this.websocket.setMessageCallback(this.handleTranscriptionMessage.bind(this));
            this.websocket.setConnectionChangeCallback(this.handleConnectionChange.bind(this));
            this.websocket.setErrorCallback(this.handleWebSocketError.bind(this));
            
            // Initialize audio processor
            this.audioProcessor = new AudioProcessor();
            
            // Set up audio callbacks
            this.audioProcessor.setAudioChunkCallback(this.handleAudioChunk.bind(this));
            this.audioProcessor.setAudioLevelCallback(this.handleAudioLevel.bind(this));
            
            // Set up UI event handlers
            this.ui.setEventHandlers({
                onApplyConfigClick: this.handleApplyConfigClick.bind(this),
                onResetConfigClick: this.handleResetConfigClick.bind(this),
                onRecordButtonClick: this.handleRecordButtonClick.bind(this),
                onStopButtonClick: this.handleStopButtonClick.bind(this),
                onFileSelected: this.handleFileSelected.bind(this),
                onUploadButtonClick: this.handleUploadButtonClick.bind(this),
                onFileDropped: this.handleFileDropped.bind(this)
            });
            
            // Connect to WebSocket
            try {
                await this.websocket.connect();
            } catch (error) {
                console.error('Initial connection failed:', error);
                // Don't throw here, let the error handlers deal with it
            }
            
            // Initialize audio (request microphone permission)
            await this.initializeAudio();
            
            console.log('Whisper Flow frontend initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.ui.showError('Failed to initialize application: ' + error.message);
        }
    }

    /**
     * Initialize audio system
     */
    async initializeAudio() {
        try {
            await this.audioProcessor.initialize();
            console.log('Audio system initialized');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.ui.showError('Microphone access denied. Please allow microphone access and refresh the page.');
        }
    }

    /**
     * Handle WebSocket transcription messages
     */
    handleTranscriptionMessage(data) {
        try {
            console.log('Received transcription:', data);
            
            if (data.data && data.data.text) {
                const text = data.data.text.trim();
                if (text) {
                    if (data.is_partial) {
                        this.ui.showPartialTranscription(text);
                    } else {
                        this.ui.showPartialTranscription(text); // Show the last text as partial before finalizing
                        this.ui.finalizePartialTranscription();
                    }
                }
            }
        } catch (error) {
            console.error('Error handling transcription message:', error);
        }
    }

    /**
     * Handle WebSocket connection changes
     */
    handleConnectionChange(isConnected) {
        if (isConnected) {
            this.ui.updateConnectionStatus(true, 'Connected to Whisper Flow');
            this.ui.showSuccess('Connected to Whisper Flow server');
            // Hide config section when successfully connected
            this.ui.hideConfigSection();
        } else {
            this.ui.updateConnectionStatus(false, 'Disconnected from Whisper Flow');
            this.ui.showError('Disconnected from Whisper Flow server');
            
            // Stop recording if connection is lost
            if (this.isRecording) {
                this.stopRecording();
            }
        }
    }

    /**
     * Handle WebSocket errors
     */
    handleWebSocketError(error) {
        console.error('WebSocket error:', error);
        this.ui.showError('Connection error: ' + error.message);
        
        // Auto-expand configuration section on connection error
        this.ui.showConfigSection();
    }

    /**
     * Handle audio chunks from microphone
     */
    handleAudioChunk(audioChunk) {
        if (this.isRecording && this.websocket.isConnected) {
            try {
                this.chunkCount++;
                
                // Debug logging (only log every 100th chunk to avoid spam)
                if (this.chunkCount % 100 === 0) {
                    console.log(`Sent ${this.chunkCount} audio chunks, chunk size: ${audioChunk.byteLength} bytes`);
                }
                
                this.websocket.sendAudioChunk(audioChunk);
            } catch (error) {
                console.error('Failed to send audio chunk:', error);
                this.ui.showError('Failed to send audio data');
                this.stopRecording();
            }
        }
    }

    /**
     * Handle audio level updates
     */
    handleAudioLevel(level) {
        this.ui.updateAudioLevel(level);
    }

    /**
     * Handle record button click
     */
    async handleRecordButtonClick() {
        if (!this.websocket.isConnected) {
            this.ui.showError('Not connected to server');
            return;
        }
        
        try {
            this.startRecording();
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.ui.showError('Failed to start recording: ' + error.message);
        }
    }

    /**
     * Handle stop button click
     */
    handleStopButtonClick() {
        this.stopRecording();
    }

    /**
     * Start recording
     */
    startRecording() {
        if (this.isRecording) return;
        
        this.isRecording = true;
        this.chunkCount = 0; // Reset chunk counter
        this.audioProcessor.startRecording();
        this.ui.updateRecordingState(true);
        this.ui.clearTranscription();
        this.ui.showSuccess('Recording started');
        
        console.log('Recording started');
    }

    /**
     * Stop recording
     */
    stopRecording() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        this.audioProcessor.stopRecording();
        this.ui.updateRecordingState(false);
        this.ui.showSuccess('Recording stopped');
        
        console.log(`Recording stopped. Total chunks sent: ${this.chunkCount}`);
    }

    /**
     * Handle file selection
     */
    handleFileSelected(event) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            this.ui.updateUploadButtonState(true);
            this.ui.showSuccess(`File selected: ${file.name}`);
        }
    }

    /**
     * Handle file drop
     */
    handleFileDropped(event) {
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('audio/')) {
                this.selectedFile = file;
                this.ui.updateUploadButtonState(true);
                this.ui.showSuccess(`File dropped: ${file.name}`);
            } else {
                this.ui.showError('Please select an audio file');
            }
        }
    }

    /**
     * Handle apply configuration click
     */
    async handleApplyConfigClick() {
        try {
            // Get configuration from form
            const newConfig = this.ui.getConfigFromForm();
            
            // Update configuration and reconnect
            await this.websocket.updateConfig(newConfig);
            
            // Update UI display
            this.ui.updateConfigDisplay();
            
            this.ui.showConfigSuccess(`Connected to ${newConfig.hostname}:${newConfig.port}`);
            
        } catch (error) {
            console.error('Failed to apply configuration:', error);
            this.ui.showConfigError(error.message);
        }
    }

    /**
     * Handle reset configuration click
     */
    async handleResetConfigClick() {
        try {
            // Reset to code constants
            window.WhisperFlowConfig.resetToCodeConstants();
            
            // Update WebSocket with new config
            await this.websocket.updateConfig(window.WhisperFlowConfig.getCurrentConfig());
            
            // Update UI display
            this.ui.updateConfigDisplay();
            
            this.ui.showConfigSuccess('Reset to default configuration');
            
        } catch (error) {
            console.error('Failed to reset configuration:', error);
            this.ui.showConfigError(error.message);
        }
    }

    /**
     * Handle upload button click
     */
    async handleUploadButtonClick() {
        if (!this.selectedFile) {
            this.ui.showError('No file selected');
            return;
        }
        
        try {
            this.ui.showSuccess('Processing audio file...');
            
            // Convert file to PCM format
            const pcmData = await FileAudioProcessor.convertFileToPCM(this.selectedFile);
            
            // Create a file-like object for the API
            const pcmFile = new File([pcmData], 'audio.pcm', { type: 'application/octet-stream' });
            
            // Send for transcription
            const result = await this.websocket.sendFileForTranscription(pcmFile);
            
            if (result && result.text) {
                this.ui.showUploadResult(true, `Transcription: ${result.text}`);
                this.ui.addTranscriptionLine(result.text, false);
            } else {
                this.ui.showUploadResult(false, 'No transcription result received');
            }
            
        } catch (error) {
            console.error('Failed to process file:', error);
            this.ui.showUploadResult(false, 'Failed to process file: ' + error.message);
        }
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.audioProcessor) {
            this.audioProcessor.cleanup();
        }
        
        if (this.websocket) {
            this.websocket.disconnect();
        }
        
        console.log('Application cleaned up');
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.whisperFlowApp = new WhisperFlowApp();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.whisperFlowApp) {
        window.whisperFlowApp.cleanup();
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.whisperFlowApp && window.whisperFlowApp.isRecording) {
        // Stop recording when page becomes hidden
        window.whisperFlowApp.stopRecording();
    }
}); 