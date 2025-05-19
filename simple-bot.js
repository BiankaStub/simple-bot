/**
 * SimpleBot Embed Script
 * This is a streamlined version of the SimpleBot script for embedding on Webflow sites
 */

// Configuration
const CASPIO_API_ENDPOINT = "https://c8dzk216.caspio.com";
const CASPIO_CLIENT_ID = "5d9d26cc556a4f55d48db936b5f3a7ea0e16f4fd094b4a7ae1";
const CASPIO_CLIENT_SECRET = "ec3a72ccc3944732826cc68fbf4201961d44043c685e590c80";

// Main SimpleBot class
class SimpleBot {
  constructor(config) {
    this.config = {
      userID: "EOU4ZVLI",
      orgID: "AlignRight_1912",
      botName: "Company Assistant",
      welcomeMessage: "Hi, I'm your company assistant. How can I help you today?",
      themeColor: "#27303f",
      secondaryColor: "#7c9fc5",
      fontColor: "#ffffff",
      fontFamily: "Inter, sans-serif",
      botImage: "https://cdn.prod.website-files.com/6737397590223007c3ca096b/681832411965f5e7cf6f46ce_Graident%20Ai%20Robot.jpg",
      chatbotLabel: "Have a question?",
      apiKey: "",
      model: "gpt-4o",
      ...config
    };
    
    this.accessToken = null;
    this.botSettings = null;
    this.sessionID = null;
    
    // Initialize the bot
    this.init();
  }
  
  // Initialize the bot
  async init() {
    try {
      // Load settings from Caspio if available
      await this.loadSettings();
      
      // Create the chatbot elements
      this.createElements();
      
      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('Error initializing SimpleBot:', error);
    }
  }
  
  // Get access token for Caspio API
  async getAccessToken() {
    try {
      console.log('Getting access token...');
      
      const response = await fetch(`${CASPIO_API_ENDPOINT}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          'grant_type': 'client_credentials',
          'client_id': CASPIO_CLIENT_ID,
          'client_secret': CASPIO_CLIENT_SECRET
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status}`);
      }

      const data = await response.json();
      console.log('Access token obtained successfully');
      this.accessToken = data.access_token;
      return data.access_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }
  
  // Load settings from Caspio
  async loadSettings() {
    try {
      if (!this.accessToken) {
        this.accessToken = await this.getAccessToken();
      }
      
      console.log('Loading bot settings...');
      
      const response = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Bot_Settings/records?q.where=UserID='${this.config.userID}' AND Org_ID='${this.config.orgID}'`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load bot settings: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Bot settings loaded:', data);
      
      if (data.Result && data.Result.length > 0) {
        this.botSettings = data.Result[0];
        
        // Update config with settings from Caspio
        this.config.botName = this.botSettings.BotName || this.config.botName;
        this.config.welcomeMessage = this.botSettings.WelcomeMessage || this.config.welcomeMessage;
        this.config.themeColor = this.botSettings.ThemeColor || this.config.themeColor;
        this.config.secondaryColor = this.botSettings.SecondaryColor || this.config.secondaryColor;
        this.config.fontColor = this.botSettings.FontColor || this.config.fontColor;
        this.config.fontFamily = this.botSettings.FontFamily || this.config.fontFamily;
        this.config.botImage = this.botSettings.CustomAvatarURL || this.config.botImage;
        this.config.chatbotLabel = this.botSettings.chatbot_label || this.config.chatbotLabel;
        this.config.apiKey = this.botSettings.APIKey || this.config.apiKey;
        this.config.model = this.botSettings.ModelType || this.config.model;
        
        console.log('Settings loaded from Caspio');
      } else {
        console.log('No bot settings found, using defaults');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  // Create chatbot elements
  createElements() {
    // Add CSS
    this.addStyles();
    
    // Create chatbot label
    const chatbotLabel = document.createElement('div');
    chatbotLabel.id = 'chatbot-label';
    chatbotLabel.textContent = this.config.chatbotLabel;
    document.body.appendChild(chatbotLabel);
    
    // Create chatbot icon
    const chatbotIcon = document.createElement('div');
    chatbotIcon.id = 'chatbot-icon';
    chatbotIcon.innerHTML = `<img src="${this.config.botImage}" alt="${this.config.botName}" id="chatbot-image" />`;
    document.body.appendChild(chatbotIcon);
    
    // Create chatbot container
    const chatbotContainer = document.createElement('div');
    chatbotContainer.id = 'chatbot-container';
    chatbotContainer.className = 'hidden';
    
    chatbotContainer.innerHTML = `
      <div id="chatbot-header">
        <span style="font-weight: 600">${this.config.botName}</span>
        <img src="${this.config.botImage}" alt="${this.config.botName}" id="chatbot-image" />
        <button id="close-btn">&times;</button>
      </div>
      <div id="chatbot-body">
        <div id="chatbot-messages"></div>
      </div>
      <div id="chatbot-input-container">
        <input type="text" id="chatbot-input" placeholder="Type a message..." />
        <button id="send-btn">Send</button>
      </div>
      <div id="gpt-logo">
        
            <p style="font-size: 12px !important">
             <img
              src="https://cdn.prod.website-files.com/68209fabebd29d5902d28361/682ac17d92514d91b42ccb7e_Black%20on%20Transparent.png"
              alt="Align Right Logo"
            />  <strong>Powered by SimpleBot | By Align Right</strong></p>
            </p>
      </div>
    `;
    
    document.body.appendChild(chatbotContainer);
    
    // Apply theme color, font color, and font family
    document.getElementById('send-btn').style.backgroundColor = this.config.themeColor;
    document.getElementById('chatbot-header').style.color = this.config.fontColor;
    document.getElementById('chatbot-header').style.background = `linear-gradient(to left, #ffffff, #ffffff, ${this.config.themeColor}40)`;
    
    // Apply font family to the entire chatbot
    chatbotContainer.style.fontFamily = this.config.fontFamily;
  }
  
  // Add styles to the page
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Floating Chat Icon */
      #chatbot-icon {
        position: fixed;
        bottom: 20px;
        right: 60px;
        width: 60px !important;
        height: 60px !important;
        background: linear-gradient(to bottom, #ffffff, #c8ddfc);
        color: white;
        font-size: 30px !important;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50% !important;
        box-shadow: 0 0 15px rgba(0, 0, 0, 0.4);
        cursor: pointer;
        transition: transform 0.2s, background-color 0.2s;
        z-index: 9999; /* Ensures the icon stays on top of other elements */
      }

      #chatbot-icon:hover {
        background-color: ${this.config.themeColor};
        transform: scale(1.1);
      }

      /* Chatbot Container */
      #chatbot-container {
        position: fixed;
        bottom: 10px;
        right: 20px;
        width: 350px;
        height: 450px;
        background-color: #ffffff;
        border-radius: 15px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.6);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 9999; /* Ensures the chatbot stays on top of all other content */
      }

      /* Hide Chatbot Initially */
      .hidden {
        display: none !important;
      }

      /* Chatbot Header */
      #chatbot-header {
        background: linear-gradient(to left, #ffffff, #ffffff, ${this.config.themeColor}40);
        color: ${this.config.fontColor};
        padding: 15px;
        border-top-left-radius: 15px;
        border-top-right-radius: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 18px !important;
      }

      /* Image Styling for the Bot */
      #chatbot-image {
        width: 50px !important; /* Adjust the size of the image */
        height: 50px !important; /* Ensure the image is a square */
        margin: 0 10px !important; /* Space between the text and the button */
        border-radius: 50% !important;
      }

      #close-btn {
        background: none;
        border: none;
        color: ${this.config.themeColor};
        font-size: 20px;
        font-weight: bolder;
        cursor: pointer;
      }

      /* Chatbot Body */
      #chatbot-body {
        flex: 1;
        padding: 10px;
        overflow-y: auto;
      }

      /* Chatbot Messages */
      #chatbot-messages {
        display: flex;
        flex-direction: column;
      }

      .message {
        margin-bottom: 15px;
        padding: 12px;
        border-radius: 8px;
        max-width: 85%;
      }

      .message.user {
        background-color: ${this.config.secondaryColor};
        color: #27303f;
        align-self: flex-end;
        font-size: 14px !important;
      }

      .message.bot {
        background-color: ${this.config.themeColor};
        color: white;
        align-self: flex-start;
        font-size: 14px !important;
      }

      /* Input Section */
      #chatbot-input-container {
        display: flex;
        padding: 10px;
        border-top: 0px solid ${this.config.themeColor};
        background-color: #ffffff;
        color: #000;
      }

      #chatbot-input {
        flex: 1;
        padding: 10px;
        border: 1px solid #000000;
        border-radius: 10px;
        background-color: #ffffff;
        color: #000;
        font-size: 14px !important;
      }

      #send-btn {
        margin-left: 10px;
        padding: 10px 15px;
        background-color: ${this.config.themeColor};
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px !important;
      }

      #send-btn:hover {
        background-color: ${this.config.secondaryColor};
      }

      /* Attribution and Logo Styling */
      #gpt-logo {
        display: flex; /* Align items horizontally */
        align-items: center; /* Vertically align logo and text */
        justify-content: center; /* Center the content horizontally */
        margin-top: 2px; /* Adjust space at the top */
        line-height: 14.4px !important; /* Reduce line height */
        background: linear-gradient(to left,${this.config.secondaryColor}, #ffffff, #ffffff, ${this.config.secondaryColor});
        font-size: 12px; /* Reduce font size */
        padding-top: 2px; /* Remove bottom margin */
        margin-bottom: 0px; /* Remove bottom margin */
        color: #000000; /* White text */
      }

      #gpt-logo img {
        width: 25px !important; /* Set logo size */
        margin-left: 5px !important; /* Space between logo and text */
      }

      #chatbot-label {
        font-weight: bold;
        position: fixed;
        bottom: 90px; /* Adjust depending on icon position */
        right:20px; /* Adjust to match your chatbot icon */
        background-color: #ffffff;
        color: ${this.config.secondaryColor};
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 14px !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        transition: opacity 0.3s ease;
      }

      #chatbot-label.hidden {
        opacity: 0;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Set up event listeners
  setupEventListeners() {
    const chatbotContainer = document.getElementById('chatbot-container');
    const closeBtn = document.getElementById('close-btn');
    const sendBtn = document.getElementById('send-btn');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotIcon = document.getElementById('chatbot-icon');
    const chatbotLabel = document.getElementById('chatbot-label');
    
    // Show chatbot when clicking the icon
    chatbotIcon.addEventListener('click', async () => {
      chatbotContainer.classList.remove('hidden');
      chatbotIcon.classList.add('hidden');
      chatbotLabel.classList.add('hidden');
      
      // Create a new chat session
      if (!this.sessionID) {
        this.sessionID = await this.createChatSession();
      }
      
      // Add welcome message if messages container is empty
      if (chatbotMessages.children.length === 0) {
        this.appendMessage('bot', this.config.welcomeMessage);
        
        // Save welcome message to Caspio
        if (this.sessionID) {
          this.saveChatMessage(this.sessionID, 'bot', this.config.welcomeMessage);
        }
      }
    });
    
    // Hide chatbot when clicking the close button
    closeBtn.addEventListener('click', () => {
      chatbotContainer.classList.add('hidden');
      chatbotIcon.classList.remove('hidden');
      chatbotLabel.classList.remove('hidden');
    });
    
    // Send message when clicking send button
    sendBtn.addEventListener('click', () => {
      this.sendMessage();
    });
    
    // Send message when pressing Enter
    chatbotInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
  }
  
  // Create a new chat session
  async createChatSession() {
    try {
      if (!this.accessToken) {
        this.accessToken = await this.getAccessToken();
      }
      
      // Create the session object
      const session = {
        UserID: this.config.userID,
        Org_ID: this.config.orgID,
        VisitorIP: "127.0.0.1", // In a real app, you would get the actual IP
        VisitorUserAgent: navigator.userAgent,
        SessionStartTime: new Date().toISOString(),
        PageURL: window.location.href
      };
      
      console.log('Creating chat session:', session);
      
      const response = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Chat_Sessions/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(session)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create chat session: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Chat session created successfully:', data);
      
      return data.SessionID;
    } catch (error) {
      console.error('Error creating chat session:', error);
      return null;
    }
  }
  
  // Save a chat message to Caspio
  async saveChatMessage(sessionID, messageType, messageContent, tokensUsed = 0) {
    try {
      if (!this.accessToken) {
        this.accessToken = await this.getAccessToken();
      }
      
      // Create the message object
      const message = {
        SessionID: sessionID,
        UserID: this.config.userID,
        Org_ID: this.config.orgID,
        MessageType: messageType,
        MessageContent: messageContent,
        Timestamp: new Date().toISOString(),
        TokensUsed: tokensUsed
      };
      
      console.log('Saving chat message:', message);
      
      const response = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Chat_Messages/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save chat message: ${response.status}`);
      }
      
      console.log('Chat message saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving chat message:', error);
      return false;
    }
  }
  
  // Send a message to OpenAI
  async sendToOpenAI(userMessage) {
    try {
      console.log('Sending message to OpenAI...');
      
      // Construct the system message with company information
      let systemMessage = "You are a helpful AI assistant for a company. ";
      
      if (this.botSettings) {
        if (this.botSettings.CompanyDescription) {
          systemMessage += "Here is information about the company: " + this.botSettings.CompanyDescription + " ";
        }
        
        if (this.botSettings.Services) {
          systemMessage += "Services offered: " + this.botSettings.Services + " ";
        }
        
        if (this.botSettings.FAQ) {
          systemMessage += "Frequently asked questions: " + this.botSettings.FAQ + " ";
        }
      }
      
      systemMessage += "Answer user questions based on this information. If you don't know the answer, politely say so and suggest they contact the company directly.";
      
      // Prepare the API request
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.status}`);
      }
      
      const data = await response.json();
      console.log('OpenAI response:', data);
      
      return {
        message: data.choices[0].message.content,
        tokensUsed: data.usage.total_tokens
      };
    } catch (error) {
      console.error('Error sending message to OpenAI:', error);
      return {
        message: "I'm sorry, I encountered an error processing your request. Please try again later.",
        tokensUsed: 0
      };
    }
  }
  
  // Send a message
  async sendMessage() {
    const chatbotInput = document.getElementById('chatbot-input');
    const userMessage = chatbotInput.value.trim();
    if (!userMessage) return;
    
    // Clear input
    chatbotInput.value = '';
    
    // Display user message
    this.appendMessage('user', userMessage);
    
    // Create a new chat session if needed
    if (!this.sessionID) {
      this.sessionID = await this.createChatSession();
    }
    
    // Save user message to Caspio
    if (this.sessionID) {
      this.saveChatMessage(this.sessionID, 'user', userMessage);
    }
    
    // Show thinking message
    this.appendMessage('bot', 'Thinking...');
    
    // Check if API key is available
    if (!this.config.apiKey) {
      // Replace thinking message with error
      this.replaceThinkingMessage('No API key available. Please contact the site administrator.');
      return;
    }
    
    try {
      // Send to OpenAI
      const response = await this.sendToOpenAI(userMessage);
      
      // Replace thinking message with response
      this.replaceThinkingMessage(response.message);
      
      // Save bot message to Caspio
      if (this.sessionID) {
        this.saveChatMessage(this.sessionID, 'bot', response.message, response.tokensUsed);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.replaceThinkingMessage('Sorry, I encountered an error. Please try again later.');
    }
  }
  
  // Append a message to the chat
  appendMessage(sender, message) {
    const chatbotMessages = document.getElementById('chatbot-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.textContent = message;
    chatbotMessages.appendChild(messageElement);
    
    // Scroll to bottom
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }
  
  // Replace the thinking message with the actual response
  replaceThinkingMessage(message) {
    const chatbotMessages = document.getElementById('chatbot-messages');
    // Find the thinking message
    const thinkingMessage = Array.from(chatbotMessages.children).find(
      el => el.classList.contains('bot') && el.textContent === 'Thinking...'
    );
    
    if (thinkingMessage) {
      thinkingMessage.textContent = message;
    } else {
      // If thinking message not found, just append the message
      this.appendMessage('bot', message);
    }
    
    // Scroll to bottom
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }
}

// Initialize the bot when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Get settings from window.simpleBotSettings or URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for UserID and Org_ID in URL (case insensitive)
  let userIdFromUrl = null;
  let orgIdFromUrl = null;
  
  // Iterate through all URL parameters to find UserID and Org_ID regardless of case
  for (const [key, value] of urlParams.entries()) {
    if (key.toLowerCase() === 'userid') {
      userIdFromUrl = value;
    } else if (key.toLowerCase() === 'org_id') {
      orgIdFromUrl = value;
    }
  }
  
  // Get settings from window.simpleBotSettings
  const settings = window.simpleBotSettings || {};
  
  // Create the bot with merged settings
  new SimpleBot({
    userID: userIdFromUrl || settings.userID || "EOU4ZVLI",
    orgID: orgIdFromUrl || settings.orgID || "AlignRight_1912",
    botName: settings.botName,
    welcomeMessage: settings.welcomeMessage,
    themeColor: settings.themeColor,
    secondaryColor: settings.secondaryColor,
    fontColor: settings.fontColor,
    fontFamily: settings.fontFamily,
    botImage: settings.botImage,
    chatbotLabel: settings.chatbotLabel,
    apiKey: settings.apiKey,
    model: settings.model
  });
});