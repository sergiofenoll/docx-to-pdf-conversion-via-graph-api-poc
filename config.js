import "isomorphic-fetch"; // Needed for microsoft-graph-client to work
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { ClientSecretCredential } from "@azure/identity";

// Env vars
export const USER_ID = process.env.USER_ID;
const TENANT_ID = process.env.TENANT_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
export const GRAPH_CLIENT_DEBUG_LOGGING = [true, "true", 1, "1", "yes", "Y", "on"].includes(process.env.GRAPH_CLIENT_DEBUG_LOGGING) || true;

if ([USER_ID, TENANT_ID, CLIENT_ID, CLIENT_SECRET].some((envVar) => envVar === undefined)) {
  console.warn(
    "Required environment variables were not set. Execution cannot proceed, logging variables and exiting."
  );
  console.warn(`USER_ID: "${USER_ID}"`);
  console.warn(`TENANT_ID: "${TENANT_ID}"`);
  console.warn(`CLIENT_ID: "${CLIENT_ID}"`);
  console.warn(`CLIENT_SECRET: "${CLIENT_SECRET}"`);
  process.exit(1);
}

const credential = new ClientSecretCredential(
  TENANT_ID,
  CLIENT_ID,
  CLIENT_SECRET
);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default'],
});
export const MS_GRAPH_CLIENT = Client.initWithMiddleware({
  debugLogging: GRAPH_CLIENT_DEBUG_LOGGING,
  authProvider,
});
