import { GRAPHQL_ENDPOINT, getToken } from './auth.js';

function getNameFromAttrs(attrs) {
  try {
    const parsed = typeof attrs === "string" ? JSON.parse(attrs) : attrs;
    return parsed.name || parsed.fullname || '';
  } catch {
    return '';
  }
}


export async function fetchProfileData() {
  try {
    const token = getToken();
    console.log("Sending GraphQL query for profile data");
    console.log("Using JWT token:", token ? "Present" : "Missing");
    console.log("Token length:", token ? token.length : 0);
    console.log("Token parts:", token ? token.split('.').length : 0);
    
    if (!token) {
      throw new Error("No JWT token available");
    }
    
    // Ensure token is clean
    const cleanToken = token.trim();
    
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
      body: JSON.stringify({
        query: `
           query {
            user {
              id
              login
              email
              attrs
            }
          
            transaction(where: {type: {_eq: "xp"}}, order_by: {createdAt: desc}) {
              id
              amount
              createdAt
              path
            }
            progress(order_by: {createdAt: desc}) {
              id
              grade
              createdAt
              path
            }
          }
        `,
      }),
    });
    
    console.log("GraphQL response status:", res.status);
    console.log("GraphQL response headers:", res.headers);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("GraphQL HTTP error:", res.status, errorText);
      throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log("GraphQL response data:", data);
    //console.log("🟢 FULL RAW GraphQL JSON:", JSON.stringify(data, null, 2));

    
    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
    }
    
    if (!data.data || !data.data.user) {
      throw new Error("Failed to fetch user data");
    }
    
    const userRaw = data.data.user[0];
    let parsedAttrs = {};

    try {
      parsedAttrs = typeof userRaw.attrs === "string" ? JSON.parse(userRaw.attrs) : userRaw.attrs;
    } catch (e) {
      console.warn("⚠️ Failed to parse attrs:", userRaw.attrs);
    }

    const userData = {
      ...userRaw,
      attrs: parsedAttrs,
      recentTransactions: data.data.transaction || [],
      recentProgress: data.data.progress || []
    };

    
    return userData;
  } catch (e) {
    console.error("GraphQL fetch error:", e);
    throw e;
  }
}

export async function fetchAuditStats() {
  const token = getToken();
  if (!token) throw new Error("No JWT token");

  const query = `
    query {
      up: transaction_aggregate(where: {type: {_eq: "up"}}) {
        aggregate { sum { amount } }
      }
      down: transaction_aggregate(where: {type: {_eq: "down"}}) {
        aggregate { sum { amount } }
      }
    }
  `;

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });

  const result = await res.json();
  return {
    up: result?.data?.up?.aggregate?.sum?.amount || 0,
    down: result?.data?.down?.aggregate?.sum?.amount || 0
  };
}

export async function fetchRecentAudits(auditorId) {
  const query = `
    query RecentAudits($auditorId: Int!) {
      audit(
        where: {
          auditorId: { _eq: $auditorId },
          group: {
            object: {
              type: { _eq: "project" }
            }
          },
          grade: { _is_null: false }
        },
        order_by: { createdAt: desc }
      ) {
        grade
        createdAt
        group {
          object { name }
        }
      }
    }
  `;

  const variables = { auditorId };

  const data = await graphQLRequest(query, variables);
  return data?.data?.audit || [];
}



async function graphQLRequest(query, variables = {}) {
  const token = getToken();
  if (!token) throw new Error("No JWT token");

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.trim()}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();

  if (json.errors) {
    console.error("GraphQL errors:", json.errors);
    throw new Error(json.errors.map(e => e.message).join(", "));
  }

  return json;
}

export async function fetchAuditRatio(userId) {
  const query = `
    query AuditRatio($userId: Int!) {
      up: transaction_aggregate(where: { userId: { _eq: $userId }, type: { _eq: "up" } }) {
        aggregate { sum { amount } }
      }
      down: transaction_aggregate(where: { userId: { _eq: $userId }, type: { _eq: "down" } }) {
        aggregate { sum { amount } }
      }
    }
  `;

  const variables = { userId };
  const data = await graphQLRequest(query, variables);

  const up = data?.data?.up?.aggregate?.sum?.amount || 0;
  const down = data?.data?.down?.aggregate?.sum?.amount || 1; // Avoid divide by zero
  return (up / down).toFixed(2);
}


