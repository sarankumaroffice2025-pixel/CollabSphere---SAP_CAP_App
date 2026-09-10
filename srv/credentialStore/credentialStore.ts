import https from "node:https";
import fetch from "node-fetch";
import jose from "node-jose";
import * as xsenv from "@sap/xsenv";

interface CredstoreBinding {
  url: string;
  username: string;
  certificate: string;
  key: string;
  encryption: {
    client_private_key: string;
    server_public_key: string;
  };
}

type CredentialKind = "password" | "key";

interface Credential {
  id: string;
  name: string;
  value: string;
  username?: string;
  type: CredentialKind | "keyring";
  [key: string]: unknown;
}

let cachedBinding: CredstoreBinding | undefined;

// Resolves the bound `credstore` service instance from VCAP_SERVICES (CF) or the
// local default-env file loaded by xsenv.loadEnv() in collabSphereModel.ts.
function getBinding(): CredstoreBinding {
  if (cachedBinding) return cachedBinding;
  const { credstore } = xsenv.getServices({
    credstore: { label: "credstore" },
  }) as { credstore: CredstoreBinding };
  cachedBinding = credstore;
  return credstore;
}

// Wraps a base64-encoded DER key/cert body into PEM so node-jose can import it.
function toPem(base64Der: string, label: string): string {
  const body = base64Der.replace(/(.{64})/g, "$1\n").trimEnd();
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`;
}

// The Credential Store instance has payload encryption enabled, so every response
// is a JWE compact string encrypted for the binding's client key.
async function decryptPayload(
  jwe: string,
  binding: CredstoreBinding,
): Promise<Credential> {
  const privateKey = toPem(binding.encryption.client_private_key, "PRIVATE KEY");
  const key = await jose.JWK.asKey(privateKey, "pem");
  const { plaintext } = await jose.JWE.createDecrypt(key).decrypt(jwe);
  return JSON.parse(plaintext.toString("utf8")) as Credential;
}

// Reads a single credential from the given namespace. `kind` selects the API
// path segment (.../credentials/password or .../credentials/key) and must match
// how the credential was created in the cockpit. Throws on any failure — there
// is no fallback, so a missing binding or a failed read stops startup.
export async function readCredential(
  name: string,
  namespace: string,
  kind: CredentialKind = "password",
): Promise<Credential> {
  const binding = getBinding();
  const agent = new https.Agent({
    cert: binding.certificate,
    key: binding.key,
  });
  // mTLS binding: username in the Authorization header, empty password.
  const auth = Buffer.from(`${binding.username}:`).toString("base64");

  const response = await fetch(
    `${binding.url}/${kind}?name=${encodeURIComponent(name)}`,
    {
      method: "GET",
      agent,
      headers: {
        Authorization: `Basic ${auth}`,
        "sapcp-credstore-namespace": namespace,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Credential Store read failed for "${name}" (${kind}) in namespace ` +
        `"${namespace}": ${response.status} ${response.statusText}`,
    );
  }

  return decryptPayload((await response.text()).trim(), binding);
}

// Returns just the secret value. "key" credentials store the value base64-encoded;
// "password" credentials store it verbatim.
export async function readCredentialValue(
  name: string,
  namespace: string,
  kind: CredentialKind = "password",
): Promise<string> {
  const credential = await readCredential(name, namespace, kind);
  return credential.type === "key"
    ? Buffer.from(credential.value, "base64").toString("utf8")
    : credential.value;
}
