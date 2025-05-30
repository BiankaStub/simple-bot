// Caspio API configuration
const CASPIO_API_ENDPOINT = "https://c8dzk216.caspio.com";
const CASPIO_CLIENT_ID = "5d9d26cc556a4f55d48db936b5f3a7ea0e16f4fd094b4a7ae1";
const CASPIO_CLIENT_SECRET = "ec3a72ccc3944732826cc68fbf4201961d44043c685e590c80";

// Global variables
let accessToken = null;
let companyInfo = null;
let botSettings = null;
let currentSessionID = null;

// Function to extract UserID and Org_ID from URL or settings
function getUserInfo() {
  // Try to get from URL if available
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
  
  // Get from settings if available, otherwise use defaults
  const settings = window.simpleBotSettings || {};
  
  return {
    UserID: userIdFromUrl || settings.userID || "EOU4ZVLI",
    Org_ID: orgIdFromUrl || settings.orgID || "AlignRight_1912"
  };
}

// Function to get access token
async function getAccessToken() {
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
    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Function to load company information from Caspio
async function loadCompanyInfo(userInfo) {
  try {
    if (!accessToken) {
      accessToken = await getAccessToken();
    }
    
    console.log('Loading company information...');
    
    const response = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Company_Information/records?q.where=UserID='${userInfo.UserID}' AND Org_ID='${userInfo.Org_ID}'`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load company information: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Company information loaded:', data);
    
    if (data.Result && data.Result.length > 0) {
      return data.Result[0];
    } else {
      console.log('No company information found for this user');
      return null;
    }
  } catch (error) {
    console.error('Error loading company information:', error);
    return null;
  }
}

// Function to save company information to Caspio
async function saveCompanyInfo(companyData) {
  try {
    if (!accessToken) {
      accessToken = await getAccessToken();
    }
    
    const userInfo = getUserInfo();
    
    // Create the company info object
    const companyInfo = {
      UserID: userInfo.UserID,
      Org_ID: userInfo.Org_ID,
      CompanyDescription: companyData.companyInfo || "",
      CreatedDate: new Date().toISOString(),
      ModifiedDate: new Date().toISOString()
    };
    
    console.log('Saving company information:', companyInfo);
    
    // First try to get existing company info
    const getResponse = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Company_Information/records?q.where=UserID='${userInfo.UserID}' AND Org_ID='${userInfo.Org_ID}'`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!getResponse.ok) {
      throw new Error(`Failed to check existing company info: ${getResponse.status}`);
    }
    
    const existingInfo = await getResponse.json();
    
    // If records exist, delete them
    if (existingInfo.Result && existingInfo.Result.length > 0) {
      console.log(`Found ${existingInfo.Result.length} existing company info records, deleting them...`);
      
      for (const record of existingInfo.Result) {
        const deleteResponse = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Company_Information/records/${record.PK_ID}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!deleteResponse.ok) {
          console.warn(`Warning: Failed to delete company info record ${record.PK_ID}: ${deleteResponse.status}`);
          // Continue with other records even if one fails
        }
      }
    }
    
    // Create new record
    console.log('Creating new company info record');
    
    const createResponse = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Company_Information/records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(companyInfo)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create company info: ${createResponse.status}`);
    }
    
    console.log('Company information created successfully');
    
    // Save additional company information to a custom table
    await saveAdditionalCompanyInfo(companyData);
    
    return true;
  } catch (error) {
    console.error('Error saving company information:', error);
    return false;
  }
}
// Function to save additional company information to a custom table
async function saveAdditionalCompanyInfo(companyData) {
  try {
    if (!accessToken) {
      accessToken = await getAccessToken();
    }
    
    const userInfo = getUserInfo();
    
    // Check if the table exists, if not create it
    await ensureAdditionalInfoTableExists();
    
    // Create the additional info object
    const additionalInfo = {
      UserID: userInfo.UserID,
      Org_ID: userInfo.Org_ID,
      Services: companyData.companyServices || "",
      FAQ: companyData.companyFAQ || "",
      CreatedDate: new Date().toISOString(),
      ModifiedDate: new Date().toISOString()
    };
    
    console.log('Saving additional company information:', additionalInfo);
    
    // First try to get existing additional info
    const getResponse = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Company_Additional_Info/records?q.where=UserID='${userInfo.UserID}' AND Org_ID='${userInfo.Org_ID}'`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    // If table doesn't exist yet, create it and then create the record
    if (getResponse.status === 404) {
      console.log('Table not found, creating it...');
      await createAdditionalInfoTable();
      
      // Create new record
      const createResponse = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Company_Additional_Info/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(additionalInfo)
      });
      
      if (!createResponse.ok) {
        throw new Error(`Failed to create additional info: ${createResponse.status}`);
      }
      
      console.log('Additional company information created successfully');
      return true;
    }
    
    if (!getResponse.ok) {
      throw new Error(`Failed to check existing additional info: ${getResponse.status}`);
    }
    
    const existingInfo = await getResponse.json();
    
    // If records exist, delete them
    if (existingInfo.Result && existingInfo.Result.length > 0) {
      console.log(`Found ${existingInfo.Result.length} existing additional info records, deleting them...`);
      
      for (const record of existingInfo.Result) {
        const deleteResponse = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Company_Additional_Info/records/${record.PK_ID}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!deleteResponse.ok) {
          console.warn(`Warning: Failed to delete additional info record ${record.PK_ID}: ${deleteResponse.status}`);
          // Continue with other records even if one fails
        }
      }
    }
    
    // Create new record
    console.log('Creating new additional info record');
    
    const createResponse = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Company_Additional_Info/records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(additionalInfo)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create additional info: ${createResponse.status}`);
    }
    
    console.log('Additional company information created successfully');
    
    return true;
  } catch (error) {
    console.error('Error saving additional company information:', error);
    return false;
  }
}

// Function to ensure the additional info table exists
async function ensureAdditionalInfoTableExists() {
  try {
    if (!accessToken) {
      accessToken = await getAccessToken();
    }
    
    // Check if table exists
    const response = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list tables: ${response.status}`);
    }
    
    const tables = await response.json();
    
    // Check if our table is in the list
    if (!tables.Result.includes('AR_CB_Company_Additional_Info')) {
      console.log('Additional info table does not exist, creating it...');
      await createAdditionalInfoTable();
    } else {
      console.log('Additional info table already exists');
    }
    
    return true;
  } catch (error) {
    console.error('Error checking if table exists:', error);
    return false;
  }
}

// Function to create the additional info table
async function createAdditionalInfoTable() {
  try {
    if (!accessToken) {
      accessToken = await getAccessToken();
    }
    
    console.log('Creating additional info table...');
    
    // Create the table
    const createTableResponse = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'AR_CB_Company_Additional_Info'
      })
    });
    
    if (!createTableResponse.ok) {
      throw new Error(`Failed to create table: ${createTableResponse.status}`);
    }
    
    console.log('Table created, now adding fields...');
    
    // Define fields
    const fields = [
      { name: 'AdditionalInfoID', dataType: 'AutoNumber', isPrimaryKey: true },
      { name: 'UserID', dataType: 'Text (255)', isRequired: true },
      { name: 'Org_ID', dataType: 'Text (255)', isRequired: true },
      { name: 'Services', dataType: 'Text (64000)', isRequired: false },
      { name: 'FAQ', dataType: 'Text (64000)', isRequired: false },
      { name: 'CreatedDate', dataType: 'Date/Time', isRequired: true },
      { name: 'ModifiedDate', dataType: 'Date/Time', isRequired: true }
    ];
    
    // Add each field
    for (const field of fields) {
      const addFieldResponse = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Company_Additional_Info/fields`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(field)
      });
      
      if (!addFieldResponse.ok) {
        console.error(`Failed to add field ${field.name}: ${addFieldResponse.status}`);
        // Continue with other fields even if one fails
      } else {
        console.log(`Added field ${field.name} successfully`);
      }
    }
    
    console.log('Additional info table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating additional info table:', error);
    return false;
  }
}

// Function to load additional company information
async function loadAdditionalCompanyInfo(userInfo) {
  try {
    if (!accessToken) {
      accessToken = await getAccessToken();
    }
    
    console.log('Loading additional company information...');
    
    const response = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Company_Additional_Info/records?q.where=UserID='${userInfo.UserID}' AND Org_ID='${userInfo.Org_ID}'`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    // If table doesn't exist yet, return null
    if (response.status === 404) {
      console.log('Additional info table does not exist yet');
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to load additional company information: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Additional company information loaded:', data);
    
    if (data.Result && data.Result.length > 0) {
      return data.Result[0];
    } else {
      console.log('No additional company information found for this user');
      return null;
    }
  } catch (error) {
    console.error('Error loading additional company information:', error);
    return null;
  }
}
// Function to save bot settings to Caspio
async function saveBotSettings(settings) {
  try {
    if (!accessToken) {
      accessToken = await getAccessToken();
    }
    
    // Get UserID and Org_ID from hidden fields instead of URL
    const userInfo = {
      UserID: document.getElementById('userID').value,
      Org_ID: document.getElementById('orgID').value
    };
    
    console.log('Saving settings for specific user:', userInfo);
    
    // Generate embed code with GitHub URL
    const embedCode = `<script>
  window.simpleBotSettings = {
    userID: "${userInfo.UserID}",
    orgID: "${userInfo.Org_ID}",
    botName: "${settings.botName || 'Company Assistant'}",
    welcomeMessage: "${settings.welcomeMessage || "Hi, I'm your company assistant. How can I help you today?"}",
    themeColor: "${settings.themeColor || '#27303f'}",
    secondaryColor: "${settings.secondaryColor || '#7c9fc5'}",
    fontColor: "${settings.fontColor || '#ffffff'}",
    fontFamily: "${settings.fontFamily || 'Inter, sans-serif'}",
    botImage: "${settings.botImage || 'https://cdn.prod.website-files.com/6737397590223007c3ca096b/681832411965f5e7cf6f46ce_Graident%20Ai%20Robot.jpg'}",
    chatbotLabel: "${settings.chatbotLabel || 'Have a question?'}"
  };
</script>
<script src="https://cdn.jsdelivr.net/gh/BiankaStub/simple-bot/simple-bot.js"></script>`;
    
    // Create the settings object with all fields in one table using the correct field names
    const botSettings = {
      UserID: userInfo.UserID,
      Org_ID: userInfo.Org_ID,
      BotName: settings.botName || "Company Assistant",
      WelcomeMessage: settings.welcomeMessage || "Hi, I'm your company assistant. How can I help you today?",
      ThemeColor: settings.themeColor || "#27303f",
      SecondaryColor: settings.secondaryColor || "#7c9fc5",
      FontColor: settings.fontColor || "#ffffff",
      FontFamily: settings.fontFamily || "Inter, sans-serif",
      ChatPosition: "right",
      AvatarType: "custom",
      CustomAvatarURL: settings.botImage || "",
      AvatarImagePath: "",
      AutoOpenDelay: 0,
      ShowBranding: 1,
      DisplayOnMobile: 1,
      DisplayOption: "all",
      DisplayPages: "",
      APIKey: settings.apiKey || "",
      ModelType: settings.model || "gpt-4o",
      chatbot_label: settings.chatbotLabel || "Have a question?",
      // Company information fields
      CompanyDescription: settings.companyInfo || "",
      Services: settings.companyServices || "",
      FAQ: settings.companyFAQ || "",
      // Store the embed code
      EmbedCode: embedCode
    };
    
    console.log('Saving bot settings:', botSettings);
    
    // First try to get existing settings
    const getResponse = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Bot_Settings/records?q.where=UserID='${userInfo.UserID}' AND Org_ID='${userInfo.Org_ID}'`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!getResponse.ok) {
      throw new Error(`Failed to check existing settings: ${getResponse.status}`);
    }
    
    const existingSettings = await getResponse.json();
    
    // If records exist, update the record for this specific UserID and Org_ID
    if (existingSettings.Result && existingSettings.Result.length > 0) {
      // Find the record that matches the current UserID and Org_ID
      const matchingRecords = existingSettings.Result.filter(
        record => record.UserID === userInfo.UserID && record.Org_ID === userInfo.Org_ID
      );
      
      if (matchingRecords.length > 0) {
        const record = matchingRecords[0];
        console.log(`Found existing bot settings record with ID: ${record.PK_ID} for UserID: ${userInfo.UserID} and Org_ID: ${userInfo.Org_ID}, updating it...`);
        
        const updateResponse = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Bot_Settings/records?q.where=PK_ID=${record.PK_ID}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(botSettings)
        });
      
      if (!updateResponse.ok) {
        const responseText = await updateResponse.text();
        console.error(`Error updating settings: ${updateResponse.status}`, responseText);
        throw new Error(`Failed to update settings: ${updateResponse.status}`);
      }
      
      console.log('Bot settings updated successfully');
    } else {
      // Create new record if none exists
      console.log('No existing bot settings found, creating new record');
      
      const createResponse = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Bot_Settings/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(botSettings)
      });
      
      if (!createResponse.ok) {
        throw new Error(`Failed to create settings: ${createResponse.status}`);
      }
      
      console.log('Bot settings created successfully');
    }
    
    return true;
  }
  } catch (error) {
    console.error('Error saving bot settings:', error);
    return false;
  }
}

// Function to load bot settings from Caspio
async function loadBotSettings(userInfo) {
  try {
    if (!accessToken) {
      accessToken = await getAccessToken();
    }
    
    console.log('Loading bot settings...');
    
    const response = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Bot_Settings/records?q.where=UserID='${userInfo.UserID}' AND Org_ID='${userInfo.Org_ID}'`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load bot settings: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Bot settings loaded:', data);
    
    if (data.Result && data.Result.length > 0) {
      return data.Result[0];
    } else {
      console.log('No bot settings found for this user');
      return null;
    }
  } catch (error) {
    console.error('Error loading bot settings:', error);
    return null;
  }
}

// Function to save a chat message to Caspio
async function saveChatMessage(sessionID, messageType, messageContent, tokensUsed = 0) {
  try {
    if (!accessToken) {
      accessToken = await getAccessToken();
    }
    
    const userInfo = getUserInfo();
    
    // Create the message object
    const message = {
      SessionID: sessionID,
      UserID: userInfo.UserID,
      Org_ID: userInfo.Org_ID,
      MessageType: messageType,
      MessageContent: messageContent,
      Timestamp: new Date().toISOString(),
      TokensUsed: tokensUsed
    };
    
    console.log('Saving chat message:', message);
    
    const response = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Chat_Messages/records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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

// Function to create a new chat session
async function createChatSession() {
  try {
    if (!accessToken) {
      accessToken = await getAccessToken();
    }
    
    const userInfo = getUserInfo();
    
    // Create the session object
    const session = {
      UserID: userInfo.UserID,
      Org_ID: userInfo.Org_ID,
      VisitorIP: "127.0.0.1", // In a real app, you would get the actual IP
      VisitorUserAgent: navigator.userAgent,
      SessionStartTime: new Date().toISOString(),
      PageURL: window.location.href
    };
    
    console.log('Creating chat session:', session);
    
    const response = await fetch(`${CASPIO_API_ENDPOINT}/rest/v2/tables/AR_CB_Chat_Sessions/records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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

// Function to send a message to OpenAI API
async function sendToOpenAI(userMessage, apiKey, model) {
  try {
    console.log('Sending message to OpenAI...');
    
    // Get user info to load bot settings
    const userInfo = getUserInfo();
    const botSettings = await loadBotSettings(userInfo);
    
    // Construct the system message with company information
    let systemMessage = "You are a helpful AI assistant for a company. ";
    
    // Use company information from bot settings
    if (botSettings && botSettings.CompanyDescription) {
      systemMessage += "Here is information about the company: " + botSettings.CompanyDescription + " ";
    }
    
    if (botSettings) {
      if (botSettings.Services) {
        systemMessage += "Services offered: " + botSettings.Services + " ";
      }
      
      if (botSettings.FAQ) {
        systemMessage += "Frequently asked questions: " + botSettings.FAQ + " ";
      }
    }
    
    systemMessage += "Answer user questions based on this information. If you don't know the answer, politely say so and suggest they contact the company directly.";
    
    // Prepare the API request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
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
// Initialize the chatbot
document.addEventListener("DOMContentLoaded", function () {
  // Check if we're on the creator page or the embedded chatbot
  const isCreatorPage = document.querySelector('.creator-container') !== null;
  
  if (isCreatorPage) {
    initializeCreatorPage();
  } else {
    initializeChatbot();
  }
});

// Initialize the creator page
async function initializeCreatorPage() {
  console.log('Initializing creator page...');
  
  // Set up event listeners for the creator form
  const saveBtn = document.getElementById('saveBtn');
  const previewBtn = document.getElementById('previewBtn');
  const copyBtn = document.getElementById('copyBtn');
  
  if (saveBtn) {
    saveBtn.addEventListener('click', async function() {
      try {
        // Get form values
        const botName = document.getElementById('botName').value;
        const welcomeMessage = document.getElementById('welcomeMessage').value;
        const themeColor = document.getElementById('themeColor').value;
        const secondaryColor = document.getElementById('secondaryColor').value;
        const fontColor = document.getElementById('fontColor').value;
        const fontFamily = document.getElementById('fontFamily').value;
        const botImage = document.getElementById('botImage').value;
        const chatbotLabel = document.getElementById('chatbotLabel').value;
        const companyInfo = document.getElementById('companyInfo').value;
        const companyServices = document.getElementById('companyServices').value;
        const companyFAQ = document.getElementById('companyFAQ').value;
        const apiKey = document.getElementById('apiKey').value;
        const model = document.getElementById('model').value;
        
        // Get UserID and Org_ID from hidden fields
        const userID = document.getElementById('userID').value;
        const orgID = document.getElementById('orgID').value;
        
        // Create settings object
        const settingsObj = {
          botName,
          welcomeMessage,
          themeColor,
          secondaryColor,
          fontColor,
          fontFamily,
          botImage,
          chatbotLabel,
          companyInfo,
          companyServices,
          companyFAQ,
          apiKey,
          model
        };
        
        // Generate embed code
        const embedCode = `<script>
  window.simpleBotSettings = {
    userID: "${userID}",
    orgID: "${orgID}",
    botName: "${botName || 'Company Assistant'}",
    welcomeMessage: "${welcomeMessage || "Hi, I'm your company assistant. How can I help you today?"}",
    themeColor: "${themeColor || '#27303f'}",
    secondaryColor: "${secondaryColor || '#7c9fc5'}",
    fontColor: "${fontColor || '#ffffff'}",
    fontFamily: "${fontFamily || 'Inter, sans-serif'}",
    botImage: "${botImage || 'https://cdn.prod.website-files.com/6737397590223007c3ca096b/681832411965f5e7cf6f46ce_Graident%20Ai%20Robot.jpg'}",
    chatbotLabel: "${chatbotLabel || 'Have a question?'}"
  };
</script>
<script src="https://cdn.jsdelivr.net/gh/BiankaStub/simple-bot/simple-bot.js"></script>`;
        
        // Update the embed code display
        updateEmbedCode(settingsObj);
        
        // Update the preview with the saved settings
        document.getElementById('previewBtn').click();
        
        // Send data to make.com webhook
        const webhookUrl = 'https://hook.us1.make.com/iq97f0fgvfzfcd1kh1037vd6nl9visiw';
        
        // Create payload for webhook
        const webhookPayload = {
          userID: userID,
          orgID: orgID,
          BotName: botName,
          WelcomeMessage: welcomeMessage,
          ThemeColor: themeColor,
          SecondaryColor: secondaryColor,
          FontColor: fontColor,
          FontFamily: fontFamily,
          CustomAvatarURL: botImage,
          chatbot_label: chatbotLabel,
          CompanyDescription: companyInfo,
          Services: companyServices,
          FAQ: companyFAQ,
          APIKey: apiKey,
          ModelType: model,
          EmbedCode: embedCode
        };
        
        console.log('Sending data to webhook:', webhookPayload);
        
        // Send data to webhook
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookPayload)
        });
        
        if (!webhookResponse.ok) {
          console.warn('Warning: Failed to send data to webhook:', webhookResponse.status);
          alert('Error saving settings. Please try again.');
        } else {
          console.log('Data sent to webhook successfully');
          // Show success message
          alert('Settings saved successfully!');
        }
      } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings: ' + error.message);
      }
    });
  }
  
  if (previewBtn) {
    previewBtn.addEventListener('click', function() {
      // Update the preview with current settings
      const botName = document.getElementById('botName').value;
      const welcomeMessage = document.getElementById('welcomeMessage').value;
      const themeColor = document.getElementById('themeColor').value;
      const secondaryColor = document.getElementById('secondaryColor').value;
      const fontColor = document.getElementById('fontColor').value;
      const fontFamily = document.getElementById('fontFamily').value;
      const botImage = document.getElementById('botImage').value;
      const chatbotLabel = document.getElementById('chatbotLabel').value;
      
      // Update header bot name
      document.getElementById('header-bot-name').textContent = botName;
      
      // Update bot image
      const botImages = document.querySelectorAll('#chatbot-image');
      botImages.forEach(img => {
        img.src = botImage;
      });
      

      //update chatbot-icon and gpt-logo background color
      document.getElementById('chatbot-icon').style.background = `linear-gradient(to left, #ffffff, #ffffff, ${themeColor}40)`;
      document.getElementById('gpt-logo').style.background = `linear-gradient(to left, #ffffff, #ffffff, ${themeColor}40)`;
     
      // Update chatbot label
      document.getElementById('chatbot-label').textContent = chatbotLabel;
      
      // Update theme color (primary dark color)
      document.getElementById('send-btn').style.backgroundColor = themeColor;
      
      // Update header with font color
      document.getElementById('chatbot-header').style.color = fontColor;
      document.getElementById('chatbot-header').style.background = `linear-gradient(to left, #ffffff, #ffffff, ${themeColor}40)`;
      
      // Update secondary color elements
      document.querySelector('.message.user').style.backgroundColor = secondaryColor;
      document.getElementById('chatbot-label').style.color = secondaryColor;
      
      // Apply font family to the entire chatbot
      document.getElementById('chatbot-container').style.fontFamily = fontFamily;

      //Update Bot_message BG Color
      document.querySelector('.message.bot').style.backgroundColor = themeColor;

      // Add a style element to apply secondary color to various elements
      const styleElement = document.getElementById('dynamic-bot-styles') || document.createElement('style');
      styleElement.id = 'dynamic-bot-styles';
      styleElement.textContent = `
        #send-btn:hover {
          background-color: ${secondaryColor} !important;
        }
        .message.user {
          background-color: ${secondaryColor} !important;
        }
        #chatbot-label {
          color: ${secondaryColor} !important;
        }
        #gpt-logo {
          background-color: ${secondaryColor}40 !important;
        }
        .message.bot {
          background-color: ${themeColor} !important;
        }

      `;
      if (!document.getElementById('dynamic-bot-styles')) {
        document.head.appendChild(styleElement);
      }
      
      // Show the chatbot
      document.getElementById('chatbot-container').classList.remove('hidden');
      document.getElementById('chatbot-icon').classList.add('hidden');
      document.getElementById('chatbot-label').classList.add('hidden');
      
      // Add welcome message if messages container is empty
      const messagesContainer = document.getElementById('chatbot-messages');
      if (messagesContainer.children.length === 0) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'bot');
        messageElement.textContent = welcomeMessage;
        messagesContainer.appendChild(messageElement);
      }
    });
  }
  
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      const embedCode = document.getElementById('embedCode');
      const range = document.createRange();
      range.selectNode(embedCode);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      window.getSelection().removeAllRanges();
      
      // Change button text temporarily
      const originalText = this.textContent;
      this.textContent = 'Copied!';
      
      setTimeout(() => {
        this.textContent = originalText;
      }, 2000);
    });
  }
  
  // Set up preview chatbot
  const chatbotContainer = document.getElementById('chatbot-container');
  const closeBtn = document.getElementById('close-btn');
  const chatbotIcon = document.getElementById('chatbot-icon');
  const chatbotLabel = document.getElementById('chatbot-label');
  
  // Show chatbot when clicking the icon
  chatbotIcon.addEventListener('click', function() {
    chatbotContainer.classList.remove('hidden');
    chatbotIcon.classList.add('hidden');
    chatbotLabel.classList.add('hidden');
    
    // Add welcome message if messages container is empty
    const messagesContainer = document.getElementById('chatbot-messages');
    if (messagesContainer.children.length === 0) {
      const welcomeMessage = document.getElementById('welcomeMessage').value;
      const messageElement = document.createElement('div');
      messageElement.classList.add('message', 'bot');
      messageElement.textContent = welcomeMessage;
      messagesContainer.appendChild(messageElement);
    }
  });
  
  // Hide chatbot when clicking the close button
  closeBtn.addEventListener('click', function() {
    chatbotContainer.classList.add('hidden');
    chatbotIcon.classList.remove('hidden');
    chatbotLabel.classList.remove('hidden');
  });
  
  // Load existing settings from URL parameters if available
  try {
    const userInfo = getUserInfo();
    console.log('Loading settings for:', userInfo);
    
    // Set the hidden UserID and Org_ID fields
    document.getElementById('userID').value = userInfo.UserID;
    document.getElementById('orgID').value = userInfo.Org_ID;
    
    // Load settings from Caspio based on URL parameters
    const settings = await loadBotSettings(userInfo);
    
    if (settings) {
      document.getElementById('botName').value = settings.BotName || 'Company Assistant';
      document.getElementById('welcomeMessage').value = settings.WelcomeMessage || 'Hi, I\'m your company assistant. How can I help you today?';
      document.getElementById('themeColor').value = settings.ThemeColor || '#27303f';
      document.getElementById('botImage').value = settings.CustomAvatarURL || 'https://cdn.prod.website-files.com/6737397590223007c3ca096b/681832411965f5e7cf6f46ce_Graident%20Ai%20Robot.jpg';
      
      // Load new customization options
      if (settings.SecondaryColor) {
        document.getElementById('secondaryColor').value = settings.SecondaryColor;
      }
      
      if (settings.FontColor) {
        document.getElementById('fontColor').value = settings.FontColor;
      }
      
      if (settings.FontFamily) {
        document.getElementById('fontFamily').value = settings.FontFamily;
      }
      
      if (settings.chatbot_label) {
        document.getElementById('chatbotLabel').value = settings.chatbot_label;
      }
      
      // Load API key and model if available
      if (settings.APIKey) {
        document.getElementById('apiKey').value = settings.APIKey;
      }
      
      if (settings.ModelType) {
        document.getElementById('model').value = settings.ModelType;
      }
      
      // Load company information from the same table
      document.getElementById('companyInfo').value = settings.CompanyDescription || '';
      document.getElementById('companyServices').value = settings.Services || '';
      document.getElementById('companyFAQ').value = settings.FAQ || '';
    }
    
    // Update the embed code
    const currentSettings = {
      botName: document.getElementById('botName').value,
      welcomeMessage: document.getElementById('welcomeMessage').value,
      themeColor: document.getElementById('themeColor').value,
      secondaryColor: document.getElementById('secondaryColor').value,
      fontColor: document.getElementById('fontColor').value,
      fontFamily: document.getElementById('fontFamily').value,
      botImage: document.getElementById('botImage').value,
      chatbotLabel: document.getElementById('chatbotLabel').value
    };
    
    updateEmbedCode(currentSettings);
    
    // Automatically update the preview with loaded settings
    // Simulate clicking the preview button to update the preview
    document.getElementById('previewBtn').click();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Function to generate embed code (deprecated - kept for reference)
function generateEmbedCode(settings, userInfo) {
  // This function is no longer used - the embed code is generated directly in saveBotSettings
  // We're keeping it for reference in case it's needed in the future
  
  const welcomeMsg = settings.welcomeMessage || 'Hi, I\'m your company assistant. How can I help you today?';
  const botImg = settings.botImage || 'https://cdn.prod.website-files.com/6737397590223007c3ca096b/681832411965f5e7cf6f46ce_Graident%20Ai%20Robot.jpg';
  const fontFamily = settings.fontFamily || 'Inter, sans-serif';
  const fontColor = settings.fontColor || '#ffffff';
  const chatbotLabel = settings.chatbotLabel || 'Have a question?';
  const secondaryColor = settings.secondaryColor || '#7c9fc5';
  
  return `<script>
  window.simpleBotSettings = {
    userID: "${userInfo.UserID}",
    orgID: "${userInfo.Org_ID}",
    botName: "${settings.botName || 'Company Assistant'}",
    welcomeMessage: "${welcomeMsg}",
    themeColor: "${settings.themeColor || '#27303f'}",
    secondaryColor: "${secondaryColor}",
    fontColor: "${fontColor}",
    fontFamily: "${fontFamily}",
    botImage: "${botImg}",
    chatbotLabel: "${chatbotLabel}"
  };
</script>
<script src="https://cdn.jsdelivr.net/gh/BiankaStub/simple-bot/simple-bot.js"></script>`;
}

// Function to update the embed code in the UI
function updateEmbedCode(settings) {
  const embedCodeElement = document.getElementById('embedCode');
  if (!embedCodeElement) return;
  
  // Get UserID and Org_ID from hidden fields instead of URL
  const userInfo = {
    UserID: document.getElementById('userID').value,
    Org_ID: document.getElementById('orgID').value
  };
  
  // Generate embed code with GitHub URL
const embedCode = `
    <script>
      window.simpleBotSettings = {
        userID: "${userInfo.UserID}",
        orgID: "${userInfo.Org_ID}",
        botName: "${settings.botName || 'Company Assistant'}",
        welcomeMessage: "${settings.welcomeMessage || "Hi, I'm your company assistant. How can I help you today?"}",
        themeColor: "${settings.themeColor || '#27303f'}",
        secondaryColor: "${settings.secondaryColor || '#7c9fc5'}",
        fontColor: "${settings.fontColor || '#ffffff'}",
        fontFamily: "${settings.fontFamily || 'Inter, sans-serif'}",
        botImage: "${settings.botImage || 'https://cdn.prod.website-files.com/6737397590223007c3ca096b/681832411965f5e7cf6f46ce_Graident%20Ai%20Robot.jpg'}",
        chatbotLabel: "${settings.chatbotLabel || 'Have a question?'}"
      };
    </script>
    <script src="https://cdn.jsdelivr.net/gh/BiankaStub/simple-bot/simple-bot.js"></script>
  `;
  
  document.getElementById('chatbot-container').innerHTML = embedCode;
  
  // Convert < and > to &lt; and &gt; for display in HTML
  const displayCode = embedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  embedCodeElement.innerHTML = displayCode;
}

// Initialize the embedded chatbot
async function initializeChatbot() {
  console.log('Initializing embedded chatbot...');
  
  try {
    // Get user info and settings
    const userInfo = getUserInfo();
    const settings = window.simpleBotSettings || {};
    
    // Load bot settings from Caspio if available
    const botSettings = await loadBotSettings(userInfo);
    
    // Merge settings with defaults
    const config = {
      botName: settings.botName || (botSettings ? botSettings.BotName : 'Company Assistant'),
      welcomeMessage: settings.welcomeMessage || (botSettings ? botSettings.WelcomeMessage : 'Hi, I\'m your company assistant. How can I help you today?'),
      themeColor: settings.themeColor || (botSettings ? botSettings.ThemeColor : '#27303f'),
      secondaryColor: settings.secondaryColor || (botSettings ? botSettings.SecondaryColor : '#7c9fc5'),
      fontColor: settings.fontColor || (botSettings ? botSettings.FontColor : '#ffffff'),
      fontFamily: settings.fontFamily || (botSettings ? botSettings.FontFamily : 'Inter, sans-serif'),
      botImage: settings.botImage || (botSettings ? botSettings.CustomAvatarURL : 'https://cdn.prod.website-files.com/6737397590223007c3ca096b/681832411965f5e7cf6f46ce_Graident%20Ai%20Robot.jpg'),
      chatbotLabel: settings.chatbotLabel || (botSettings ? botSettings.chatbot_label : 'Have a question?'),
      apiKey: settings.apiKey || (botSettings ? botSettings.APIKey : ''),
      model: settings.model || (botSettings ? botSettings.ModelType : 'gpt-4o'),
      // Company information from the same table
      companyDescription: botSettings ? botSettings.CompanyDescription : '',
      services: botSettings ? botSettings.Services : '',
      faq: botSettings ? botSettings.FAQ : '',
      // Embed code
      embedCode: botSettings ? botSettings.EmbedCode : ''
    };
    
    // Create the chatbot elements
    createChatbotElements(config);
    
    // Set up event listeners
    setupChatbotEventListeners(config);
    
  } catch (error) {
    console.error('Error initializing chatbot:', error);
  }
}

// Function to create chatbot elements
function createChatbotElements(config) {
  // Create chatbot label
  const chatbotLabel = document.createElement('div');
  chatbotLabel.id = 'chatbot-label';
  chatbotLabel.textContent = config.chatbotLabel || 'Have a question?';
  document.body.appendChild(chatbotLabel);
  
  // Create chatbot icon
  const chatbotIcon = document.createElement('div');
  chatbotIcon.id = 'chatbot-icon';
  chatbotIcon.innerHTML = `<img src="${config.botImage}" alt="${config.botName}" id="chatbot-image" />`;
  document.body.appendChild(chatbotIcon);
  
  // Create chatbot container
  const chatbotContainer = document.createElement('div');
  chatbotContainer.id = 'chatbot-container';
  chatbotContainer.className = 'hidden';
  
  chatbotContainer.innerHTML = `
    <div id="chatbot-header">
      <span style="font-weight: 600">${config.botName}</span>
      <img src="${config.botImage}" alt="${config.botName}" id="chatbot-image" />
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
  document.getElementById('send-btn').style.backgroundColor = config.themeColor;
  document.getElementById('chatbot-header').style.color = config.fontColor;
  document.getElementById('chatbot-header').style.background = `linear-gradient(to left, #ffffff, #ffffff, ${config.themeColor}40)`;
  
  // Apply font family to the entire chatbot
  chatbotContainer.style.fontFamily = config.fontFamily;
  
  // Set up CSS for colors and styling
  const style = document.createElement('style');
  style.id = 'dynamic-bot-styles';
  style.textContent = `
    .message.bot {
      color: ${config.fontColor} !important;
      font-family: ${config.fontFamily} !important;
    }
    .message.user {
      background-color: ${config.secondaryColor} !important;
    }
    #send-btn:hover {
      background-color: ${config.secondaryColor} !important;
    }
    #chatbot-label {
      color: ${config.secondaryColor} !important;
    }
    #gpt-logo, #attribution {
      background-color: ${config.secondaryColor}40 !important;
    }
  `;
  document.head.appendChild(style);
}

// Function to set up chatbot event listeners
function setupChatbotEventListeners(config) {
  const chatbotContainer = document.getElementById('chatbot-container');
  const closeBtn = document.getElementById('close-btn');
  const sendBtn = document.getElementById('send-btn');
  const chatbotInput = document.getElementById('chatbot-input');
  const chatbotMessages = document.getElementById('chatbot-messages');
  const chatbotIcon = document.getElementById('chatbot-icon');
  const chatbotLabel = document.getElementById('chatbot-label');
  
  // Create a chat session when the bot is first opened
  let sessionID = null;
  
  // Show chatbot when clicking the icon
  chatbotIcon.addEventListener('click', async function() {
    chatbotContainer.classList.remove('hidden');
    chatbotIcon.classList.add('hidden');
    chatbotLabel.classList.add('hidden');
    
    // Create a new chat session
    if (!sessionID) {
      sessionID = await createChatSession();
    }
    
    // Add welcome message if messages container is empty
    if (chatbotMessages.children.length === 0) {
      appendMessage('bot', config.welcomeMessage);
      
      // Save welcome message to Caspio
      if (sessionID) {
        saveChatMessage(sessionID, 'bot', config.welcomeMessage);
      }
    }
  });
  
  // Hide chatbot when clicking the close button
  closeBtn.addEventListener('click', function() {
    chatbotContainer.classList.add('hidden');
    chatbotIcon.classList.remove('hidden');
    chatbotLabel.classList.remove('hidden');
  });
  
  // Send message when clicking send button
  sendBtn.addEventListener('click', function() {
    sendMessage();
  });
  
  // Send message when pressing Enter
  chatbotInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Function to send a message
  async function sendMessage() {
    const userMessage = chatbotInput.value.trim();
    if (!userMessage) return;
    
    // Clear input
    chatbotInput.value = '';
    
    // Display user message
    appendMessage('user', userMessage);
    
    // Create a new chat session if needed
    if (!sessionID) {
      sessionID = await createChatSession();
    }
    
    // Save user message to Caspio
    if (sessionID) {
      saveChatMessage(sessionID, 'user', userMessage);
    }
    
    // Show thinking message
    appendMessage('bot', 'Thinking...');
    
    // Get API key from settings or input
    const apiKey = config.apiKey || document.getElementById('apiKey')?.value;
    
    if (!apiKey) {
      // Replace thinking message with error
      replaceThinkingMessage('Please enter an OpenAI API key in the settings.');
      return;
    }
    
    try {
      // Send to OpenAI
      const response = await sendToOpenAI(userMessage, apiKey, config.model);
      
      // Replace thinking message with response
      replaceThinkingMessage(response.message);
      
      // Save bot message to Caspio
      if (sessionID) {
        saveChatMessage(sessionID, 'bot', response.message, response.tokensUsed);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      replaceThinkingMessage('Sorry, I encountered an error. Please try again later.');
    }
  }
  
  // Function to append a message to the chat
  function appendMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.textContent = message;
    chatbotMessages.appendChild(messageElement);
    
    // Scroll to bottom
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }
  
  // Function to replace the thinking message with the actual response
  function replaceThinkingMessage(message) {
    // Find the thinking message
    const thinkingMessage = Array.from(chatbotMessages.children).find(
      el => el.classList.contains('bot') && el.textContent === 'Thinking...'
    );
    
    if (thinkingMessage) {
      thinkingMessage.textContent = message;
    } else {
      // If thinking message not found, just append the message
      appendMessage('bot', message);
    }
    
    // Scroll to bottom
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }
}
