# Whisper Flow Frontend

A bare bones, responsive web frontend for the Whisper Flow real-time speech-to-text transcription service.

## Features

- **Real-time microphone transcription**: Live speech-to-text using WebSocket streaming
- **Audio file upload**: Batch transcription of uploaded audio files
- **Modern UI**: Clean, responsive design with smooth animations
- **Connection management**: Automatic reconnection and status indicators
- **Audio visualization**: Real-time audio level monitoring
- **Drag & drop**: Easy file upload with drag and drop support

## Prerequisites

1. **Whisper Flow Server**: Make sure the Whisper Flow server is running on `localhost:8181`
2. **Modern Browser**: Requires a browser with Web Audio API and WebSocket support
3. **Microphone Access**: Browser must have permission to access the microphone

## Getting Started

### 1. Start the Whisper Flow Server

First, ensure the Whisper Flow server is running:

```bash
# From the whisper-flow root directory
./run.sh -run-server
```

The server should be running on `http://localhost:8181`

### 2. Open the Frontend

Simply open `frontend/index.html` in your web browser. You can:

- Double-click the file to open it directly
- Use a local web server (recommended):
  ```bash
  # Using Python 3
  cd frontend
  python3 -m http.server 8080
  # Then open http://localhost:8080 in your browser
  ```

### 3. Allow Microphone Access

When you first open the frontend, your browser will ask for microphone permission. Click "Allow" to enable real-time transcription.

## Usage

### Real-time Recording

1. **Start Recording**: Click the "Start Recording" button
2. **Speak**: Talk into your microphone
3. **View Transcription**: See real-time transcription appear in the display
4. **Stop Recording**: Click "Stop Recording" when finished

The transcription will show:
- **Yellow background**: Partial transcriptions (in progress)
- **Green background**: Final transcriptions (complete)

### File Upload

1. **Select File**: Click the upload area or drag and drop an audio file
2. **Transcribe**: Click "Transcribe File" to process the audio
3. **View Result**: The transcription will appear in the display

Supported audio formats: MP3, WAV, M4A, OGG, and other browser-supported formats.

## Technical Details

### Architecture

The frontend is built with vanilla JavaScript and consists of four main modules:

- **`audio.js`**: Handles microphone access and audio processing
- **`websocket.js`**: Manages WebSocket communication with the server
- **`ui.js`**: Controls DOM updates and user interactions
- **`app.js`**: Main application orchestrator

### Audio Processing

- **Sample Rate**: 16kHz (optimized for Whisper)
- **Format**: 16-bit PCM
- **Channels**: Mono
- **Chunk Size**: 4096 samples

### WebSocket Communication

- **Endpoint**: `ws://localhost:8181/ws`
- **Protocol**: Binary audio chunks
- **Response**: JSON transcription data
- **Reconnection**: Automatic with exponential backoff

## Troubleshooting

### Connection Issues

- Ensure the Whisper Flow server is running on port 8181
- Check browser console for error messages
- Verify firewall settings allow local connections

### Microphone Issues

- Check browser microphone permissions
- Ensure microphone is not being used by another application
- Try refreshing the page and allowing microphone access again

### Audio File Issues

- Ensure the file is a supported audio format
- Check file size (very large files may take time to process)
- Verify the file is not corrupted

## Development

### File Structure

```
frontend/
├── index.html          # Main HTML page
├── styles/
│   └── main.css       # Styling
├── scripts/
│   ├── app.js         # Main application logic
│   ├── audio.js       # Audio processing utilities
│   ├── websocket.js   # WebSocket communication
│   └── ui.js          # UI updates and controls
└── README.md          # This file
```

### Customization

- **Server URL**: Modify the WebSocket URL in `websocket.js` if your server runs on a different port
- **Styling**: Edit `styles/main.css` to customize the appearance
- **Audio Settings**: Adjust sample rate and chunk size in `audio.js` if needed

