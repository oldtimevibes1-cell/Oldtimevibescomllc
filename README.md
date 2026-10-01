# Gemini Application

A simple chat interface using Google's Gemini AI with real-time streaming responses using Gemini 2.5 Flash Lite model.

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Get a Gemini API key:**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the generated API key

3. **Set up environment variables:**

   - Copy `env.example` to `.env`
   - Add your Gemini API key to the `.env` file:
     ```
     GEMINI_API_KEY=your_actual_api_key_here
     ```

4. **Run the application:**

   ```bash
   npm run dev
   ```

   The application will automatically:

   - Start the server and open the chat interface in your browser
   - Check if your API key is configured
   - Show setup instructions if the API key is missing
   - Allow you to configure the API key and restart the server

## FAQs & Debugging

### 1. I do not see browser in my workspace

Studio will automatically open the app in a new browser tab. If not, you can use the following steps to open the simple browser

1. From VS Code command pallette(`Ctrl/Cmd + Shift + P`), run **Studio Manager: SimpleBrowser Default URL** command. This will open the app in a new browser tab.

2. Your app runs on hosted env which can be accessed using host id, port provided in file **.vscode/.studio/studio-env.json**. Use values to create the URL as follows:
   `https://<STUDIO_HOST_ID>-3000.<STUDIO_DOMAIN>`

### 2. API Key Setup

**The browser shows setup instructions instead of the chat:**

- This means your API key is not configured
- Follow the step-by-step instructions shown in the browser
- Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Add it to your `.env` file: `GEMINI_API_KEY=your_actual_api_key_here`
- Restart the server and click "Check Again"

**403 Forbidden or "Invalid API key" error in the chat:**

- Your API key may be expired or invalid
- Get a new API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Update your `.env` file with the new key
- Restart the application

**The chat interface shows API key error messages:**

- The application will automatically detect API key issues
- Follow the instructions in the error message
- Click the provided link to get a new API key

## API Reference

The application uses the [Google Generative AI SDK](https://github.com/googleapis/js-genai) with the Gemini 2.5 Flash Lite model for fast, efficient responses.

## Project Structure

```
ai-gemini-js/
├── src/
│   └── app.ts          # Express server with Socket.IO
├── public/
│   └── index.html      # Chat interface
├── package.json        # Dependencies and scripts
├── env.example         # Environment variables template
└── README.md           # This file
```
