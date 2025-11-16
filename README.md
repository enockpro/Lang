# Multilingual Video Call Application

A real-time video call application that enables two users to communicate in different languages with instant translation powered by Google's Gemini AI.

## Features

- 🌐 **Real-time Video/Audio Calls** - WebRTC-based peer-to-peer communication
- 🗣️ **Speech Recognition** - Automatic speech-to-text conversion
- 🔄 **Real-time Translation** - Instant translation using Gemini AI
- 🎨 **Modern UI** - Beautiful and responsive interface
- 📱 **Mobile Friendly** - Works on desktop and mobile devices

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Add your Gemini API key to the `.env` file:
```
GEMINI_API_KEY=your_actual_api_key_here
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. **For User 1:**
   - Enter or create a Room ID
   - Select your language
   - Select your partner's language
   - Click "Join Call"

4. **For User 2:**
   - Open the same URL in a different browser/device
   - Enter the same Room ID
   - Select your language (should match User 1's partner language)
   - Select your partner's language (should match User 1's language)
   - Click "Join Call"

5. Once connected:
   - Speak naturally in your language
   - Your speech will be transcribed and translated in real-time
   - Your partner will see the translation in their language

## Supported Languages

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Russian (ru)
- Japanese (ja)
- Korean (ko)
- Chinese (zh)
- Arabic (ar)
- Hindi (hi)

## Controls

- **Mute/Unmute** - Toggle microphone
- **Video On/Off** - Toggle camera
- **End Call** - Leave the call

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express
- **Real-time Communication**: Socket.io, WebRTC
- **Speech Recognition**: Web Speech API
- **Translation**: Google Gemini AI

## Notes

- The application uses WebRTC for peer-to-peer video calls
- Speech recognition requires a modern browser with Web Speech API support
- For best results, use Chrome or Edge browsers
- The translation happens server-side using Gemini API
- Make sure to allow camera and microphone permissions when prompted

## Troubleshooting

- **No translation**: Check that your Gemini API key is correctly set in the `.env` file
- **No video/audio**: Ensure you've granted camera and microphone permissions
- **Connection issues**: Check your firewall settings and ensure WebRTC is not blocked
- **Speech recognition not working**: Try using Chrome or Edge browser

## Deployment

### 🚀 Deploy to Render (Recommended)

Render is the best choice for this application as it fully supports WebSocket connections required for Socket.io.

**Quick Steps:**

1. **Push your code to GitHub**

2. **Go to [render.com](https://render.com)** and create a new Web Service

3. **Connect your GitHub repository**

4. **Configure**:
   - Build Command: `npm install`
   - Start Command: `npm start`

5. **Add Environment Variable**:
   - Key: `GEMINI_API_KEY`
   - Value: `AIzaSyDw96LmFWPxMLM-dm6Z6Tm2CtJhlM0pDjM`

6. **Deploy!**

See `DEPLOYMENT.md` for detailed step-by-step instructions with screenshots and troubleshooting.

### Alternative Platforms

- **Railway** - Also supports WebSocket connections
- **Fly.io** - Good alternative

See `DEPLOYMENT.md` for detailed instructions.

## License

MIT

