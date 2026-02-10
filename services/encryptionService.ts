
// Obscure name for the master key storage to avoid obvious identification
const ENC_KEY_STORAGE = 'sys_secure_integrity_check';

async function getMasterKey(): Promise<CryptoKey> {
  let keyData = localStorage.getItem(ENC_KEY_STORAGE);
  
  if (!keyData) {
    // Generate a new AES-GCM key
    const key = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const exported = await window.crypto.subtle.exportKey("jwk", key);
    localStorage.setItem(ENC_KEY_STORAGE, JSON.stringify(exported));
    return key;
  }
  
  // Import existing key
  try {
    const jwk = JSON.parse(keyData);
    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
  } catch (e) {
    // If key is corrupted, regenerate (will invalidate old encrypted data)
    console.error("Encryption key corrupted, regenerating...");
    localStorage.removeItem(ENC_KEY_STORAGE);
    return getMasterKey();
  }
}

export async function encryptData(plainText: string): Promise<string> {
  if (!plainText) return "";
  try {
    const key = await getMasterKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encoded
    );
    
    // Store as JSON string containing IV and Ciphertext
    const packageData = {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
    
    return JSON.stringify(packageData);
  } catch (e) {
    console.error("Encryption failed", e);
    throw new Error("Failed to encrypt data");
  }
}

export async function decryptData(cipherText: string): Promise<string> {
  if (!cipherText) return "";
  
  try {
    // Attempt to parse. If not JSON, it might be legacy plain text (migration support)
    let parsed;
    try {
      parsed = JSON.parse(cipherText);
    } catch {
      return cipherText; // Return as is if not valid JSON (legacy plaintext)
    }

    if (!parsed.iv || !parsed.data) return cipherText;
    
    const key = await getMasterKey();
    const iv = new Uint8Array(parsed.iv);
    const data = new Uint8Array(parsed.data);
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Decryption failed", e);
    return ""; // Return empty on failure to prevent app crash
  }
}
