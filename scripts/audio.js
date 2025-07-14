/**
 * Audio processing utilities for Whisper Flow frontend
 * Handles microphone access, audio processing, and PCM chunk generation
 */

class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.mediaStream = null;
        this.analyser = null;
        this.scriptProcessor = null;
        this.isRecording = false;
        this.sampleRate = 16000; // Whisper expects 16kHz
        this.chunkSize = 1024; // Audio chunk size - matches server expectation
        this.onAudioChunk = null; // Callback for audio chunks
        this.onAudioLevel = null; // Callback for audio level updates
        this.lastChunkTime = 0; // For timing control
    }

    /**
     * Initialize audio context and request microphone access
     */
    async initialize() {
        try {
            // Create audio context with specific sample rate
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate
            });
            
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.sampleRate,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Create audio source
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Create analyser for audio level visualization
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            // Create script processor for audio processing
            // Note: ScriptProcessor is deprecated but still widely supported
            // For production, consider using AudioWorklet
            this.scriptProcessor = this.audioContext.createScriptProcessor(
                this.chunkSize, 
                1, // input channels
                1  // output channels
            );

            // Connect the audio graph
            source.connect(this.scriptProcessor);
            this.scriptProcessor.connect(this.audioContext.destination);

            // Set up audio processing
            this.setupAudioProcessing();

            console.log(`Audio context initialized with sample rate: ${this.audioContext.sampleRate}`);
            return true;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            throw error;
        }
    }

    /**
     * Set up audio processing callbacks
     */
    setupAudioProcessing() {
        // Process audio chunks
        this.scriptProcessor.onaudioprocess = (event) => {
            if (!this.isRecording) return;

            const inputBuffer = event.inputBuffer;
            const inputData = inputBuffer.getChannelData(0);
            
            // Convert float32 to int16 PCM
            const pcmData = this.convertToPCM(inputData);
            
            // Validate PCM data
            this.validatePCMData(pcmData);
            
            // Control timing - send chunks every ~10ms like the Python example
            const now = Date.now();
            if (now - this.lastChunkTime >= 10) {
                // Send chunk to callback
                if (this.onAudioChunk) {
                    this.onAudioChunk(pcmData);
                }
                this.lastChunkTime = now;
            }
        };

        // Start audio level monitoring
        this.startAudioLevelMonitoring();
    }

    /**
     * Convert float32 audio data to int16 PCM
     * Fixed conversion logic for proper signed 16-bit integers
     */
    convertToPCM(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            // Convert float32 (-1 to 1) to int16 (-32768 to 32767)
            const sample = Math.max(-1, Math.min(1, float32Array[i]));
            // Correct conversion: multiply by 32767 for positive, -32768 for negative
            int16Array[i] = sample >= 0 ? 
                Math.round(sample * 32767) : 
                Math.round(sample * 32768);
        }
        return int16Array.buffer;
    }

    /**
     * Validate PCM data format
     */
    validatePCMData(pcmBuffer) {
        const int16Array = new Int16Array(pcmBuffer);
        
        // Check if we have the expected number of samples
        if (int16Array.length !== this.chunkSize) {
            console.warn(`Unexpected chunk size: ${int16Array.length}, expected: ${this.chunkSize}`);
        }
        
        // Check for valid int16 range
        let min = 32767, max = -32768;
        for (let i = 0; i < int16Array.length; i++) {
            min = Math.min(min, int16Array[i]);
            max = Math.max(max, int16Array[i]);
        }
        
        // Log validation info occasionally
        if (Math.random() < 0.01) { // 1% chance to log
            console.log(`PCM validation - Size: ${int16Array.length}, Range: [${min}, ${max}], Sample rate: ${this.audioContext.sampleRate}`);
        }
    }

    /**
     * Start monitoring audio levels for visualization
     */
    startAudioLevelMonitoring() {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        const updateLevel = () => {
            if (!this.analyser) return;
            
            this.analyser.getByteFrequencyData(dataArray);
            
            // Calculate average level
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const level = average / 255; // Normalize to 0-1
            
            // Send level to callback
            if (this.onAudioLevel) {
                this.onAudioLevel(level);
            }
            
            requestAnimationFrame(updateLevel);
        };
        
        updateLevel();
    }

    /**
     * Start recording audio
     */
    startRecording() {
        if (!this.audioContext || !this.mediaStream) {
            throw new Error('Audio not initialized');
        }
        
        this.isRecording = true;
        this.lastChunkTime = 0;
        console.log('Started recording audio');
    }

    /**
     * Stop recording audio
     */
    stopRecording() {
        this.isRecording = false;
        console.log('Stopped recording audio');
    }

    /**
     * Clean up audio resources
     */
    cleanup() {
        this.isRecording = false;
        
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }
        
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        console.log('Audio resources cleaned up');
    }

    /**
     * Set callback for audio chunks
     */
    setAudioChunkCallback(callback) {
        this.onAudioChunk = callback;
    }

    /**
     * Set callback for audio level updates
     */
    setAudioLevelCallback(callback) {
        this.onAudioLevel = callback;
    }
}

/**
 * File audio processor for handling uploaded audio files
 */
class FileAudioProcessor {
    /**
     * Convert audio file to PCM data
     */
    static async convertFileToPCM(file) {
        return new Promise((resolve, reject) => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target.result;
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    
                    // Get audio data from first channel
                    const audioData = audioBuffer.getChannelData(0);
                    
                    // Resample to 16kHz if needed
                    const resampledData = this.resampleAudio(audioData, audioBuffer.sampleRate, 16000);
                    
                    // Convert to PCM
                    const pcmData = this.convertToPCM(resampledData);
                    
                    audioContext.close();
                    resolve(pcmData);
                } catch (error) {
                    audioContext.close();
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Simple resampling (for production, use a proper resampling library)
     */
    static resampleAudio(audioData, originalSampleRate, targetSampleRate) {
        if (originalSampleRate === targetSampleRate) {
            return audioData;
        }
        
        const ratio = originalSampleRate / targetSampleRate;
        const newLength = Math.round(audioData.length / ratio);
        const resampledData = new Float32Array(newLength);
        
        for (let i = 0; i < newLength; i++) {
            const index = Math.round(i * ratio);
            resampledData[i] = audioData[index] || 0;
        }
        
        return resampledData;
    }

    /**
     * Convert float32 audio data to int16 PCM
     * Fixed conversion logic for proper signed 16-bit integers
     */
    static convertToPCM(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const sample = Math.max(-1, Math.min(1, float32Array[i]));
            // Correct conversion: multiply by 32767 for positive, -32768 for negative
            int16Array[i] = sample >= 0 ? 
                Math.round(sample * 32767) : 
                Math.round(sample * 32768);
        }
        return int16Array.buffer;
    }
}

// Export for use in other modules
window.AudioProcessor = AudioProcessor;
window.FileAudioProcessor = FileAudioProcessor; 