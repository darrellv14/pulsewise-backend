#!/usr/bin/env node

/**
 * Small FCM HTTP v1 test sender for PulseWise web/mobile tokens.
 *
 * Requirements:
 * 1. Node.js 18+
 * 2. google-auth-library installed
 * 3. Firebase service-account JSON file OR inline Firebase env vars
 *
 * Usage:
 * 1. Edit the CONFIG object below.
 * 2. Run:
 *    node scripts/send_fcm_test.js
 *
 * Supported credential sources:
 * - CONFIG.credentialsPath
 * - FIREBASE_SERVICE_ACCOUNT_PATH
 * - GOOGLE_APPLICATION_CREDENTIALS
 * - inline env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PRIVATE_KEY_ID
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

const CONFIG = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'pulse-wise-app',
  deviceToken: '',
  credentialsPath:
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    '',
  origin: 'https://pulsewisetest.vercel.app',
  route: '/home',
  title: 'Tes notifikasi PulseWise',
  body: 'Ini adalah push notification test untuk web app PulseWise.',
  iconPath: '/icons/Icon-192.png',
  badgePath: '/icons/Icon-192.png',
  channelId: process.env.FCM_ANDROID_CHANNEL_ID || 'pulsewise_reminders',
  extraData: {
    action: 'open_notification_test',
    source: 'pulsewise-test-script',
    platformHint: 'web',
  },
};

function maskToken(value) {
  if (!value) return '<empty>';
  if (value.length <= 16) return `${value.slice(0, 6)}...`;
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}

function resolveUrl(baseOrigin, maybeRelativePath) {
  return new URL(maybeRelativePath, baseOrigin).toString();
}

function normalizePrivateKey(value) {
  return value ? value.replace(/\\n/g, '\n') : '';
}

function resolveCredentialsPath(rawPath) {
  const trimmed = String(rawPath || '').trim();
  if (!trimmed) {
    return '';
  }

  return path.resolve(trimmed);
}

function resolveAuthConfig({ projectId, credentialsPath }) {
  const resolvedCredentialsPath = resolveCredentialsPath(credentialsPath);

  if (resolvedCredentialsPath) {
    if (!fs.existsSync(resolvedCredentialsPath)) {
      throw new Error(`Firebase service-account file not found: ${resolvedCredentialsPath}`);
    }

    return {
      auth: new GoogleAuth({
        keyFile: resolvedCredentialsPath,
        projectId,
        scopes: [FCM_SCOPE],
      }),
      credentialsSource: resolvedCredentialsPath,
    };
  }

  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || '');
  const privateKeyId = String(process.env.FIREBASE_PRIVATE_KEY_ID || '').trim();

  if (projectId && clientEmail && privateKey) {
    return {
      auth: new GoogleAuth({
        projectId,
        credentials: {
          type: 'service_account',
          project_id: projectId,
          private_key_id: privateKeyId || undefined,
          private_key: privateKey,
          client_email: clientEmail,
        },
        scopes: [FCM_SCOPE],
      }),
      credentialsSource: 'inline-env:FIREBASE_*',
    };
  }

  return {
    auth: new GoogleAuth({
      projectId,
      scopes: [FCM_SCOPE],
    }),
    credentialsSource: 'ADC / environment default credentials',
  };
}

async function getAccessToken(auth) {
  const client = await auth.getClient();
  const accessTokenResponse = await client.getAccessToken();
  const accessToken =
    typeof accessTokenResponse === 'string'
      ? accessTokenResponse
      : accessTokenResponse?.token || null;

  if (!accessToken) {
    throw new Error('Failed to get Google access token.');
  }

  return accessToken;
}

function buildPayload({
  deviceToken,
  title,
  body,
  route,
  targetLink,
  iconUrl,
  badgeUrl,
  channelId,
  extraData,
}) {
  return {
    message: {
      token: deviceToken,
      notification: {
        title,
        body,
      },
      data: {
        route: String(route || ''),
        link: String(targetLink || ''),
        title: String(title || ''),
        body: String(body || ''),
        sentAt: new Date().toISOString(),
        ...Object.fromEntries(
          Object.entries(extraData || {}).map(([key, value]) => [
            key,
            value == null ? '' : String(value),
          ])
        ),
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          title,
          body,
          icon: iconUrl,
          badge: badgeUrl,
        },
        fcmOptions: {
          link: targetLink,
        },
      },
      android: {
        priority: 'high',
        notification: {
          channel_id: channelId,
        },
      },
    },
  };
}

async function main() {
  const {
    projectId,
    deviceToken,
    credentialsPath,
    title,
    body,
    route,
    origin,
    iconPath,
    badgePath,
    channelId,
    extraData,
  } = CONFIG;

  if (!projectId || !String(projectId).trim()) {
    throw new Error('Missing projectId. Fill CONFIG.projectId or FIREBASE_PROJECT_ID.');
  }

  if (!deviceToken || !String(deviceToken).trim()) {
    throw new Error('Missing deviceToken. Fill CONFIG.deviceToken first.');
  }

  if (!origin || !String(origin).trim()) {
    throw new Error('Missing origin. Fill CONFIG.origin first.');
  }

  const targetLink = resolveUrl(origin, route || '/');
  const iconUrl = resolveUrl(origin, iconPath || '/icons/Icon-192.png');
  const badgeUrl = resolveUrl(origin, badgePath || iconPath || '/icons/Icon-192.png');

  const { auth, credentialsSource } = resolveAuthConfig({
    projectId,
    credentialsPath,
  });
  const accessToken = await getAccessToken(auth);

  console.log('Sending FCM test message with config:');
  console.log(
    JSON.stringify(
      {
        projectId,
        tokenPreview: maskToken(deviceToken),
        origin,
        route,
        targetLink,
        iconUrl,
        badgeUrl,
        credentialsSource,
      },
      null,
      2
    )
  );

  const payload = buildPayload({
    deviceToken,
    title,
    body,
    route,
    targetLink,
    iconUrl,
    badgeUrl,
    channelId,
    extraData,
  });

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    console.error('FCM request failed.');
    console.error(responseText);
    process.exit(1);
  }

  console.log('FCM message sent successfully.');
  console.log(responseText);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
