# Changelog

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
