import { showLoginForm } from './ui.js';

const API_BASE = "https://learn.reboot01.com/api";
const GRAPHQL_ENDPOINT = API_BASE + "/graphql-engine/v1/graphql";
const SIGNIN_ENDPOINT = API_BASE + "/auth/signin";

let jwtToken = null;

// --- Login function ---
async function login(username, password) {
  if (!username || !password) {
    throw new Error("Please enter username/email and password.");
  }

  const credentials = btoa(`${username}:${password}`);

  try {
    const res = await fetch(SIGNIN_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Invalid username or password");
      } else {
        const errorText = await res.text();
        throw new Error(`Login failed: ${res.status} ${res.statusText}`);
      }
    }

    const data = await res.text();
    console.log("Raw login response data:", data);
    
    // Clean the token - remove any quotes, whitespace, or extra characters
    let token = data.trim();
    
    // Remove surrounding quotes if present
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1);
    }
    
    // Remove any extra whitespace
    token = token.trim();
    
    console.log("Cleaned token:", token);
    
    // Validate JWT format
    if (!token || token.split('.').length !== 3) {
      console.error("Invalid JWT token format - expected 3 parts, got:", token.split('.').length);
      throw new Error("Invalid token received from server.");
    }
    
    jwtToken = token;
    console.log("JWT token received:", jwtToken);
    console.log("JWT token length:", jwtToken ? jwtToken.length : 'No token');
    console.log("JWT token parts:", jwtToken ? jwtToken.split('.').length : 'No token');
    
    localStorage.setItem("jwtToken", jwtToken);
    return jwtToken;
  } catch (e) {
    console.error("Login error:", e);
    throw e;
  }
}

// async function login(username, password) {
//   if (!username || !password) {
//     throw new Error("Please enter username/email and password.");
//   }

//   const credentials = btoa(`${username}:${password}`);

//   try {
//     const res = await fetch(SIGNIN_ENDPOINT, {
//       method: "POST",
//       headers: {
//         "Authorization": `Basic ${credentials}`,
//       },
//     });

//     if (!res.ok) {
//       if (res.status === 401) {
//         throw new Error("Invalid username or password");
//       } else if (res.status === 403) {
//         throw new Error("Access forbidden (403). Please check your credentials or account status.");
//       } else {
//         const errorText = await res.text();
//         throw new Error(`Login failed: ${res.status} ${res.statusText}: ${errorText}`);
//       }
//     }

//     const data = await res.text();
//     let token = data.trim();
//     if (token.startsWith('"') && token.endsWith('"')) {
//       token = token.slice(1, -1);
//     }

//     if (!token || token.split('.').length !== 3) {
//       throw new Error("Invalid token received from server.");
//     }

//     jwtToken = token;
//     localStorage.setItem("jwtToken", jwtToken);
//     return jwtToken;
//   } catch (e) {
//     console.error("Login error:", e);
//     throw e;
//   }
// }


function getToken() {
  return jwtToken;
}

function logout() {
  jwtToken = null;
  localStorage.removeItem("jwtToken");
  showLoginForm();
}

// Try auto-login if JWT present
function initializeAuth() {
  const token = localStorage.getItem("jwtToken");
  console.log("Retrieved token from localStorage:", token);
  if (token && token.split('.').length === 3) {
    jwtToken = token;
    return true;
  }
  return false;
}

export { login, logout, initializeAuth, getToken, GRAPHQL_ENDPOINT };
