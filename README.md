# Clinic & Endoscopy Tracker

A responsive local web application for:

- Daily clinic and inpatient consultation tracking
- HMG endoscopy procedure tracking
- Multiple procedures per patient
- Polypectomy and clipping counters
- Additional therapeutic intervention tracking
- Automatic day display
- Local browser storage
- CSV export
- Dark mode

Open `index.html` in a modern browser. Data stays on the browser/device where it was entered.

- Optional note field for each endoscopy patient record; included in search, editing, display, and CSV export.

Statistics filters
------------------
The statistics period and hospital filters update dashboard cards, hospital breakdowns, and monthly graphs only. They do not change or hide the saved activity logs.

## Automatic backups

- A local backup snapshot is created every time clinic records, procedure records, income settings, approximate fees, or the income password are saved. The latest 20 snapshots are retained in the same browser.
- Manual JSON download and restore are available inside the hidden Income Dashboard.
- Daily Google Drive backup can be enabled in the same backup panel. It runs at or shortly after 12:00 AM Saudi time while the webpage is open. If the webpage was closed at midnight, the missed backup is attempted when it is next opened.
- Google Drive requires a Web OAuth Client ID created in Google Cloud Console. Add the deployed GitHub Pages origin as an Authorized JavaScript origin, enable the Google Drive API, then paste the client ID into the webpage and connect.
- Static webpages cannot run when the browser/device is completely closed, so truly unattended midnight backups require a hosted backend or scheduled cloud service.


## Outpatient clinic monthly activity
The monthly activity chart is limited to outpatient clinic records only. It has Overall, Fayhaa, and Mohammadiya tabs and displays monthly new consultations and follow-up visits. Inpatient consultations and endoscopy procedures are excluded from this chart.

## iPhone single-column update
This build preserves the existing application screens, data structure, storage keys, and navigation. On iPhone-sized displays, forms, cards, filters, hospital tabs, private-dashboard metrics, and record lists are shown in a clean single-column layout without overlapping tabs.

## Private income dashboard
Press and hold the practice logo for 2 seconds, then enter the private-section password. A normal tap does nothing.


Private dashboard access: tap the discreet lock icon beside the module tabs, then enter the existing password.

## Supabase synchronization

This build is configured for the supplied Supabase project URL and publishable browser key.

1. Open `SUPABASE_SETUP.sql`.
2. Run it in Supabase Dashboard → SQL Editor.
3. In Supabase Authentication → Users, create your email/password user, or use Create account in the tracker.
4. Upload this project to GitHub Pages.
5. Open it first on the laptop that contains the complete local records.
6. Sign in, unlock Private → Sync, download a JSON backup, then choose **Upload local data**.
7. Open the same GitHub Pages link on the iPhone and sign in with the same account.

The original localStorage keys are unchanged and remain the offline cache. Never place a service-role key in these files.


## Switching accounts

Use the **Sign out** button in the header or in Private → Sync. The tracker creates a local backup, clears the signed-in user's device cache, and returns to the login screen. Cloud records are not deleted. Sign in with another Supabase account to load only that user's data.
