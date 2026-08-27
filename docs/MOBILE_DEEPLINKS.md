# Mobile Deeplinks

This project supports mobile deeplinks for email verification and password reset through HTTPS Universal Links/App Links plus an optional native-only custom scheme.

## Supported Links

Canonical HTTPS links:

- `https://cab.example.com/verify-email?token=...`
- `https://cab.example.com/reset-password?token=...`

Native custom scheme links:

- `<mobile-scheme>://verify-email?token=...`
- `<mobile-scheme>://reset-password?token=...`

Use HTTPS links in emails when browser fallback matters. Use custom scheme links only where the native app is expected to be installed or the message includes a fallback HTTPS link.

## Configuration

The custom scheme must not be hardcoded in business logic. Configure it per environment or brand:

```env
VITE_MOBILE_DEEPLINK_SCHEME=app
```

Association files are generated at build time from these values:

```env
MOBILE_DEEPLINK_PATHS=/verify-email*,/reset-password*
MOBILE_IOS_APP_IDS=TEAM_ID.com.example.app
MOBILE_ANDROID_PACKAGE_NAME=com.example.app
MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS=AA:BB:CC:...
```

`MOBILE_IOS_APP_IDS` and `MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS` accept comma-separated values.

## Route Policy

Initial deep-linkable routes:

- `/verify-email`
- `/reset-password`

Routes outside the initial scope, including `/auth/oauth/callback`, `/auto-login`, `/admin/*`, `/connect`, and `/add`, should not be added to the mobile app association files until the native app has a safe handler for them.

`/connect` and `/add` are reserved for opening VPN clients from the web cabinet and are not entry points for the native cabinet app.

## Native Parsing

Normalize HTTPS and custom scheme URLs to the same internal actions:

- `verify-email` with `token` -> email verification
- `reset-password` with `token` -> password reset

For custom scheme URLs like `<mobile-scheme>://verify-email?token=...`, most URL parsers treat `verify-email` as the host, not the pathname. Native handlers should read both host and path when deciding the action.

Tokens should be treated as short-lived secrets: avoid logging full URLs and clear sensitive query parameters after successful handling where possible.

## iOS

Add Associated Domains:

```text
applinks:cab.example.com
```

Add a URL Type for the configured custom scheme, for example:

Use the configured `VITE_MOBILE_DEEPLINK_SCHEME` value, for example `bitnet` for the current app.

The deployed `/.well-known/apple-app-site-association` file is generated from `MOBILE_IOS_APP_IDS` and `MOBILE_DEEPLINK_PATHS`.

The app should route both Universal Links and custom scheme links through the same parser. Keep the scheme value in build settings/config so rebranding does not require code changes.

## Android

Add verified HTTPS intent filters for:

```text
https://cab.example.com/verify-email*
https://cab.example.com/reset-password*
```

Add a separate custom scheme intent filter for:

```text
<mobile-scheme>://verify-email
<mobile-scheme>://reset-password
```

The deployed `/.well-known/assetlinks.json` file is generated from `MOBILE_ANDROID_PACKAGE_NAME` and `MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS`.

Intent filters should be scoped to the supported hosts and paths. Example shape:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="cab.example.com" android:pathPrefix="/verify-email" />
    <data android:scheme="https" android:host="cab.example.com" android:pathPrefix="/reset-password" />
</intent-filter>

<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="${mobileDeeplinkScheme}" android:host="verify-email" />
    <data android:scheme="${mobileDeeplinkScheme}" android:host="reset-password" />
</intent-filter>
```

## Verification

After deployment, verify:

- `https://cab.example.com/.well-known/apple-app-site-association` returns JSON with no redirect.
- `https://cab.example.com/.well-known/assetlinks.json` returns JSON with no redirect.
- HTTPS links open the installed app on real iOS and Android devices.
- HTTPS links fall back to the web pages when the app is not installed.
- Custom scheme links open the app and preserve the `token` query parameter.
- `/connect` and `/add` still open VPN client links from the web cabinet.
