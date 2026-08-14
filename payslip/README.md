# HMG GI Payslip Review — Desktop v2.5

This version uses MRN-centered code-family reconciliation based on the actual HMG July 2026 payslip structures supplied by the user.

## Matching order
1. Hospital + Patient ID/MRN
2. Main procedure code family
3. Additional procedure/intervention code family and quantity
4. Associated/bundled codes
5. Invoice date is supporting information only and is not required to equal the tracker procedure date.

## Confirmed HMG code families
- 01002003 / 1002003 → outpatient consultation
- 01002043 / 1002043 → inpatient consultation (excluded from outpatient count)
- 01002052 / 1002052 → inpatient consultation referral (excluded)
- 05060079 / 5060079 → IV sedation (associated only)
- 05060108 / 5060108 → Colonoscopy
- 05060012 / 5060012 → Colonoscopy with biopsy
- 05060021 / 5060021 → EGD with biopsy
- 05060039 / 5060039 → Gastroscopy / EGD
- 05060074 / 5060074 → Polypectomy
- 05100068 / 5100068 → Polypectomy alternative code
- 05060121 / 5060121 → Clip
- 05060068 / 5060068 → PEG
- 07008850 / 7008850 → Variceal banding
- 050080136 / 50080136 → FibroScan
- 50080043 → ERCP + sphincterotomy
- 50080044 → ERCP + sphincterotomy + stent (bundle)
- 50080038 → Therapeutic EUS
- 03008085 / 3008085 → US-guided FNA (associated)
- 030080139 / 30080139 → Metallic biliary stenting

The code mapping page remains editable so new HMG codes can be added later.
