## 3.10.10
- Made the Endoscopy Activity Log compact on iPhone.
- Endoscopy entries now show date, MRN, hospital, and procedures by default.
- Tap an entry to reveal additional procedures, notes, Edit, and Delete.
- Preserved all storage keys and existing record structures.

## 3.10-9
- Minimized the Clinic Activity Log on iPhone with compact summary rows.
- Tap a clinic row to reveal duration, new/follow-up counts, and actions.
- Preserved all storage keys and clinic record formats.

# Changelog

## v3.12
- Changed Pending planned procedures to compact quick-select style tabs.
- Preserved multi-selection, editing, saved values, and all storage keys.

## 3.6.0
- Made Main procedures and Additional procedures compact chip-style selectors, matching Quick select.
- Preserved all procedure values and storage behavior.

## 3.5.0
- Pending hospital selector now uses the same segmented-button design as Clinic and Endoscopy.
- Preserved separate Fayhaa and Mohammadiya queue counts and behavior.

# Version 3.4.0

- Added monthly on-call coverage nights in the private Income Dashboard.
- Added an editable On-call Night fee with a default of SAR 500.
- On-call income is displayed separately and excluded from practice-income totals, target progress, and hospital comparison.
- Existing data and storage keys remain compatible.

## 3.3.0
- Added Outpatient/Inpatient clinic entry modes.
- Added fast inpatient consultation count entry.
- Replaced the Endoscopy hospital dropdown with two touch-friendly hospital buttons.
- Preserved existing clinic and endoscopy storage keys.

# Version 3.2.0

- Simplified clinic entry to Date, Hospital, New consultations, and Follow-ups.
- Total patients calculated automatically.
- Added large iPhone-friendly hospital buttons and number fields.
- Added three-level feedback for Clinic, Pending, and Endoscopy saves:
  - Saving state with disabled button.
  - Success toast and saved status.
  - Error toast while preserving the form data.
- Added header save-status indicator.
- Preserved existing localStorage keys and existing records.

## 3.7.0
- Removed instructional helper text from Clinic and Endoscopy headings.
- Removed the Pending Endoscopy instruction panel.
- Added optional outpatient clinic duration selection in 0.5-hour increments, defaulting to 4 hours.
- Reordered Additional Procedures with Polypectomy and Clip first, followed by the requested sequence.

## 3.11
- Added Queue, Today, and Week views inside Pending.
- Views are display-only filters and preserve the existing pending storage key and record format.
- Added per-view counts and date-range summaries.

## 3.13
- Rebuilt Pending as a compact iPhone queue.
- Added one-line patient rows with tap-to-expand details and actions.
- Added a floating add button and full-screen mobile add/edit form.
- Preserved all existing storage keys and pending-record structure.

## 3.10-8
- Fixed Pending hospital switching on iPhone by keeping Fayhaa and Mohammadiya selectors visible above the queue.
- Preserved existing Pending storage and add/edit behavior.

## 3.10.11
- Added a unified Dashboard module for Clinic and Endoscopy statistics.
- Removed large statistics blocks from the daily Clinic and Endoscopy activity pages.
- Added compact, collapsible Clinic Statistics and Endoscopy Statistics sections.
- Added two-column iPhone statistic grids and compact hospital breakdowns.
- Preserved all existing element IDs, calculations, record structures, and storage keys.
