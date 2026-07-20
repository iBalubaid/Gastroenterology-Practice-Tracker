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
