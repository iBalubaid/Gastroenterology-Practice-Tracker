# Gastroenterology Practice Tracker v2.0.1

Clinic and Endoscopy are directly accessible. The Practice Dashboard, including income, performance, hospital comparison, fees, and backup, is protected by a locally stored password.


## Google Drive backup setup
1. In Google Cloud Console, create or select a project.
2. Enable the Google Drive API.
3. Configure the OAuth consent screen and add your Google account as a test user if the app remains in testing.
4. Create an OAuth 2.0 Client ID of type **Web application**.
5. Add your GitHub Pages origin, for example `https://YOURNAME.github.io`, under Authorized JavaScript origins.
6. Copy the Client ID ending in `.apps.googleusercontent.com`.
7. In the tracker, unlock the private dashboard, open **Backup**, paste the Client ID, and tap **Connect**.

Google Drive is used for backup/restore only. The tracker remains local-first. Daily backup runs only while the webpage is open and Drive authorization is active; otherwise tap Connect/Backup Now after reopening.


## Version 3.0 update safety
This release preserves the existing clinic, endoscopy, pending, income, password, theme, Google Drive, and Face ID storage keys. Export a JSON backup before replacing GitHub files as an additional safeguard.

Haptic vibration uses the browser vibration API when available. iPhone Safari may not expose vibration to webpages; toast feedback always remains available.


### v3.10-9 mobile update
The Clinic Activity Log is compact on iPhone. Tap any row to expand its details and actions.

### v3.10.13 mobile hospital comparison
Hospital breakdown panels remain side by side on iPhone for faster Fayhaa-versus-Mohammadiya comparison. The layout is compact and does not change saved data or storage keys.
