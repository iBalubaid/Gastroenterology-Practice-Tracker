# v1.6.5
- Replaced the inline Book action with delegated click handling for reliable local iPhone use.
- Forces the quick booking sheet to display and updates its accessibility state.

# HMG GI Tracker Phone v1.6.3

- Rebuilt the four Pending tabs with equal widths and an integrated label/count flex layout.
- Removed floating/overlapping count positioning; labels remain fully visible on narrow iPhones.
- Added a distinct quick **Book** bottom sheet for Booking cases (date, time, duration only).
- Kept **Edit** separate for case details; scheduling fields are hidden when editing a Booking case.
- Booking a patient automatically returns the case to Queue, Today, or Week.
- Preserved all existing records, storage keys, calendar export, and Pending workflow.

## v1.6.4
- Fixed the Booking Book button by loading app.js after the quick-booking modal markup.
- The Book sheet now initializes correctly and opens with Date, Start time, and Duration.
- No layout, storage-key, or workflow changes.
