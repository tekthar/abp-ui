/**
 * Passkeys in the browser (WebAuthn), in the browser's own JSON both ways, as AbpGuard 0.7.0 speaks it: the options come
 * as `PublicKeyCredentialCreationOptionsJSON` / `PublicKeyCredentialRequestOptionsJSON`, and the answer goes back as the
 * credential's `toJSON()`. Browsers without the JSON methods get the same through base64url here.
 */

type Json = Record<string, unknown>;

/** Whether this browser can use passkeys at all (a secure page with WebAuthn). */
export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && typeof window.PublicKeyCredential === 'function' && !!navigator.credentials;
}

function fromBase64Url(text: string): ArrayBuffer {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return bytes.buffer;
}

function toBase64Url(buffer: ArrayBuffer | null | undefined): string | undefined {
  if (!buffer) return undefined;
  let text = '';
  for (const b of new Uint8Array(buffer)) text += String.fromCharCode(b);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const withIds = (list: unknown) => (Array.isArray(list) ? list.map((c: Json) => ({ ...c, id: fromBase64Url(c.id as string) })) : undefined);

type ParsingCredential = typeof PublicKeyCredential & {
  parseCreationOptionsFromJSON?: (json: Json) => PublicKeyCredentialCreationOptions;
  parseRequestOptionsFromJSON?: (json: Json) => PublicKeyCredentialRequestOptions;
};

function creationOptions(json: Json): PublicKeyCredentialCreationOptions {
  const pkc = PublicKeyCredential as ParsingCredential;
  if (pkc.parseCreationOptionsFromJSON) return pkc.parseCreationOptionsFromJSON(json);
  const user = json.user as Json;
  return {
    ...(json as unknown as PublicKeyCredentialCreationOptions),
    challenge: fromBase64Url(json.challenge as string),
    user: { ...(user as unknown as PublicKeyCredentialUserEntity), id: fromBase64Url(user.id as string) },
    excludeCredentials: withIds(json.excludeCredentials) as PublicKeyCredentialDescriptor[] | undefined,
  };
}

function requestOptions(json: Json): PublicKeyCredentialRequestOptions {
  const pkc = PublicKeyCredential as ParsingCredential;
  if (pkc.parseRequestOptionsFromJSON) return pkc.parseRequestOptionsFromJSON(json);
  return {
    ...(json as unknown as PublicKeyCredentialRequestOptions),
    challenge: fromBase64Url(json.challenge as string),
    allowCredentials: withIds(json.allowCredentials) as PublicKeyCredentialDescriptor[] | undefined,
  };
}

/** The credential as the browser's `toJSON()` gives it, built by hand where the browser has no `toJSON`. */
function credentialJson(credential: PublicKeyCredential): Json {
  const own = credential as PublicKeyCredential & { toJSON?: () => Json };
  if (typeof own.toJSON === 'function') return own.toJSON();
  const r = credential.response as AuthenticatorResponse & Partial<AuthenticatorAttestationResponse> & Partial<AuthenticatorAssertionResponse>;
  const response: Json = { clientDataJSON: toBase64Url(r.clientDataJSON) };
  if (r.attestationObject) {
    response.attestationObject = toBase64Url(r.attestationObject);
    response.transports = r.getTransports?.() ?? [];
    response.authenticatorData = toBase64Url(r.getAuthenticatorData?.());
    response.publicKey = toBase64Url(r.getPublicKey?.() ?? undefined);
    response.publicKeyAlgorithm = r.getPublicKeyAlgorithm?.();
  } else {
    response.authenticatorData = toBase64Url(r.authenticatorData);
    response.signature = toBase64Url(r.signature);
    response.userHandle = toBase64Url(r.userHandle ?? undefined);
  }
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response,
  };
}

/** Makes a passkey on this device from the server's creation options; null when the person cancelled. */
export async function createPasskey(options: Json, signal?: AbortSignal): Promise<Json | null> {
  try {
    const credential = (await navigator.credentials.create({ publicKey: creationOptions(options), signal })) as PublicKeyCredential | null;
    return credential ? credentialJson(credential) : null;
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return null;
    throw e;
  }
}

/** Proves a passkey from the server's request options; null when the person cancelled or had none here. */
export async function getPasskey(options: Json, signal?: AbortSignal): Promise<Json | null> {
  try {
    const credential = (await navigator.credentials.get({ publicKey: requestOptions(options), signal })) as PublicKeyCredential | null;
    return credential ? credentialJson(credential) : null;
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return null;
    throw e;
  }
}
