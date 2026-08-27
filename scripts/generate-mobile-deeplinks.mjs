import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const wellKnownDir = resolve(repoRoot, 'public/.well-known');

const DEFAULT_PATHS = ['/verify-email*', '/reset-password*'];

function parseList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

const paths = parseList(process.env.MOBILE_DEEPLINK_PATHS).length
  ? parseList(process.env.MOBILE_DEEPLINK_PATHS)
  : DEFAULT_PATHS;

const iosAppIds = parseList(process.env.MOBILE_IOS_APP_IDS);
const androidPackageName = process.env.MOBILE_ANDROID_PACKAGE_NAME?.trim();
const androidFingerprints = parseList(process.env.MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS);

mkdirSync(wellKnownDir, { recursive: true });

writeJson(resolve(wellKnownDir, 'apple-app-site-association'), {
  applinks: {
    apps: [],
    details: iosAppIds.map((appID) => ({
      appID,
      paths,
    })),
  },
});

writeJson(
  resolve(wellKnownDir, 'assetlinks.json'),
  androidPackageName && androidFingerprints.length
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: androidPackageName,
            sha256_cert_fingerprints: androidFingerprints,
          },
        },
      ]
    : [],
);

if (!iosAppIds.length) {
  console.warn('MOBILE_IOS_APP_IDS is empty; Apple Universal Links will not verify.');
}

if (!androidPackageName || !androidFingerprints.length) {
  console.warn(
    'MOBILE_ANDROID_PACKAGE_NAME or MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS is empty; Android App Links will not verify.',
  );
}
