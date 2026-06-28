import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const WEB_CLIENT_ID =
  '965147795870-llhb2jiaaiilfea2ulu8cfbudjalf3fs.apps.googleusercontent.com';
const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

let configured = false;
let lastAuthAt = 0;
/** True if a Google sign-in finished very recently — used to suppress auto-lock on return. */
export function googleAuthRecently() {
  return Date.now() - lastAuthAt < 8000;
}
export function configureGoogle() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    scopes: [DRIVE_APPDATA_SCOPE],
    offlineAccess: true,
  });
  configured = true;
}

/** Normalize the various response shapes to { email, name, photo } or null. */
function toProfile(res) {
  const user = res?.data?.user ?? res?.user ?? null;
  if (!user?.email) return null;
  return { email: user.email, name: user.name ?? null, photo: user.photo ?? null };
}

/** Interactive sign-in. Returns the profile, or null if the user cancelled. */
export async function signIn() {
  configureGoogle();
  lastAuthAt = Date.now();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    return toProfile(res);
  } finally {
    lastAuthAt = Date.now();
  }
}

/** Silent restore on launch. Returns the profile or null. */
export async function restoreSession() {
  configureGoogle();
  try {
    const res = await GoogleSignin.signInSilently();
    return toProfile(res);
  } catch {
    return null;
  }
}

export async function signOutGoogle() {
  configureGoogle();
  try {
    await GoogleSignin.signOut();
  } catch {}
}

/** Fresh OAuth access token for Drive REST calls. */
export async function getAccessToken() {
  configureGoogle();
  const { accessToken } = await GoogleSignin.getTokens();
  return accessToken;
}

export { statusCodes };
