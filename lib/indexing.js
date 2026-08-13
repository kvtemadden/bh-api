const { GoogleAuth } = require("google-auth-library");

const INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";
const INDEXING_ENDPOINT =
  "https://indexing.googleapis.com/v3/urlNotifications:publish";

function getRequiredEnvVar(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getGoogleAuth() {
  return new GoogleAuth({
    credentials: {
      client_email: getRequiredEnvVar("GOOGLE_CLIENT_EMAIL"),
      private_key: getRequiredEnvVar("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    },
    scopes: [INDEXING_SCOPE],
  });
}

async function notifyGoogle(url, type = "URL_UPDATED") {
  const auth = getGoogleAuth();
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();

  const response = await fetch(INDEXING_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url, type }),
  });

  if (!response.ok) {
    throw new Error(`Indexing API ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

module.exports = {
  notifyGoogle,
};
