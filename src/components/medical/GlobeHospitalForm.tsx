import type { MedicalTestFormData } from '../../types'

const GLOBE_DOCTORS: { name: string; detail: string }[] = [
  {
    name: 'Dr. V.K. Shukla',
    detail:
      'M.B.B.S., M.D. (Medicine)\n(Managing Director & Consultant Physician)\nTiming: 10am to 12pm & 06pm pm to 08pm',
  },
  { name: 'Dr. Umesh Bhardwaj', detail: 'Administrative Officer' },
  {
    name: 'Dr. Harsh Lamba',
    detail: 'B.A.M.S., E & T.C, MBA in Hospital\nAdministration (MANAGING DIRECTOR)',
  },
  { name: 'Dr. Saumya Bajpai Kaur', detail: 'M.B.B.S., M.D. (Obst. & Gyna)\nK.G.M.U., Lko.' },
  { name: 'Dr. Anand Agarwal', detail: 'M.B.B.S., MMA (Gold Medalist)\nK.G.M.U., Lko.' },
  { name: 'Dr. V.K. Rajbhar', detail: 'M.B.B.S.\nConsultant Physician' },
  { name: 'Dr. Sparsh Bhalla', detail: 'M.D. Medicine (KGMU)\nDM Cardiology (IPPS Kanpur)' },
  { name: 'Dr. Bhawan Nangarwal', detail: 'M.B.B.S., Mch., (Neuro Surgeon)\nS.G.P.G.I., Lko.' },
  { name: 'Dr. S.K. Tiwari', detail: 'M.D. D.M. Gastro (K.G.M.U. Lko.)' },
  { name: 'Dr. Alok Maurya', detail: 'M.B.B.S., MS, Mch. (Urology)' },
  { name: 'Dr. Gaurav Gupta', detail: 'M.B.B.S., MS, (KGMU, Lko.)' },
  { name: 'Dr. Vinay Tripathi', detail: 'MS. Ortho\nBones & Joint Replacement Specialist' },
  { name: 'Dr. Ramakant Chaudhary', detail: 'M.B.B.S., M.D. (Ped.)' },
  { name: 'Dr. Manoj Kumar Srivastava', detail: 'MS..Oncologist (Cancer Specialist)' },
  {
    name: 'Dr. A.K. Srivastava',
    detail: 'M.B.B.S., M.D. (Pulmonary Chest)\n& I.C.U. Critical Care- 8:00 to 9:00 p.m',
  },
  { name: 'Dr. S.P. Singh Maurya', detail: 'M.B.B.S., PGPem (USA)\nICU, Critical Care' },
  { name: 'Dr. Deeban George', detail: 'MS (Gastroenterology Surgeon)\nKGMU, Lko.' },
  { name: 'Dr. Jilani A. Q', detail: 'MD, DNB, DM\nNeuro Psychiatry' },
]

/** Three-column Hindi facilities (reference order, row-major) */
const GLOBE_SERVICES: [string, string, string][] = [
  ['जनरल एवं लैप्रोस्कोपिक सर्जरी', 'कैंसर सर्जरी एवं कीमोथेरेपी', 'पित्त एवं गुर्दे की पथरी की दूरबीन द्वारा ऑपरेशन'],
  ['नाक, कान गला सर्जरी', 'पीडियाट्रिक सर्जरी', 'स्त्री एवं प्रसूति रोग, नार्मल एवं सिजेरियन (ऑपरेशन)'],
  ['यूरो मूत्राशय सर्जरी', 'आर्थोपेडिक सर्जरी', 'न्यूरो सर्जरी'],
]

type Props = {
  form: MedicalTestFormData
  onChange: <K extends keyof MedicalTestFormData>(key: K, value: MedicalTestFormData[K]) => void
}

function Field({
  label,
  value,
  onChange,
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div className={`gh-field ${className}`}>
      <span className="gh-label">{label}</span>
      <span className="gh-rule">
        <input className="gh-input" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </div>
  )
}

function BlankRule() {
  return <div className="gh-blank-rule" />
}

export default function GlobeHospitalForm({ form, onChange }: Props) {
  return (
    <div className="hospital-form" id="hospital-form-print">
      {/* HEADER */}
      <header className="gh-header">
        <div className="gh-header-grid">
          <div className="gh-logo-col">
            <img src="/medical/globe-logo.png" alt="" className="gh-logo" />
            <div className="gh-reg">Reg. No.: RMEE2122200</div>
          </div>

          <div className="gh-header-mid">
            <div className="gh-phones">Hospital : 0522-2410951, 9451384215, 7800349822</div>
            <img src="/medical/globe-title.png" alt="GLOBE HOSPITAL" className="gh-title-img" />
            <div className="gh-trust">Run by (Ayushmaan Health &amp; Educational Trust)</div>
            <div className="gh-addr">
              Add.: Sector 10- C-Block, 4022, Jal Sansthan T.W.O. No.-10, Omkarshwar Temple,
              M.I.S. Chauraha Road,
              <br />
              Meena Bakery, Rajajipuram, Lucknow
            </div>
            <div className="gh-slogan">
              (24 HOUR&apos;S EMERGENCY, ALL TYPE OF MEDICAL &amp; AMBULANCE FACILITIES)
            </div>
          </div>

          <div className="gh-lucent-col">
            <img src="/medical/lucent-on-form.png" alt="Lucent Technology" className="gh-lucent" />
          </div>
        </div>
        <div className="gh-hline" />
      </header>

      {/* BODY */}
      <div className="gh-body">
        <aside className="gh-docs">
          {GLOBE_DOCTORS.map((d) => (
            <div key={d.name} className="gh-doc">
              <div className="gh-doc-name">{d.name}</div>
              {d.detail.split('\n').map((line) => (
                <div key={line} className="gh-doc-detail">
                  {line}
                </div>
              ))}
            </div>
          ))}
        </aside>

        <section className="gh-form">
          <div className="gh-date-row">
            <div className="gh-field gh-date">
              <span className="gh-label">Date</span>
              <span className="gh-rule gh-rule-dotted">
                <input
                  className="gh-input"
                  value={form.exam_date || ''}
                  onChange={(e) => onChange('exam_date', e.target.value)}
                />
              </span>
            </div>
          </div>

          <Field
            label="NAME OF COMPANY-"
            value={form.company_name || ''}
            onChange={(v) => onChange('company_name', v)}
          />
          <Field
            label="PATIENT NAME:-"
            value={form.patient_name}
            onChange={(v) => {
              onChange('patient_name', v)
              if (!form.certified_name || form.certified_name === form.patient_name) {
                onChange('certified_name', v)
              }
            }}
          />

          <div className="gh-pair">
            <Field
              label="AGE-"
              value={form.age == null ? '' : String(form.age)}
              onChange={(v) => onChange('age', v === '' ? null : Number(v))}
              className="gh-age"
            />
            <Field
              label="SEX-"
              value={form.gender || ''}
              onChange={(v) => onChange('gender', v)}
              className="gh-sex"
            />
          </div>

          <div className="gh-pair">
            <Field
              label="HEIGHT-"
              value={form.height || ''}
              onChange={(v) => onChange('height', v)}
              className="gh-hw"
            />
            <Field
              label="WEIGHT-"
              value={form.weight || ''}
              onChange={(v) => onChange('weight', v)}
              className="gh-hw"
            />
          </div>

          <Field
            label="CHEST (EXPIRATION/INSPIRATION)-"
            value={form.chest || ''}
            onChange={(v) => onChange('chest', v)}
          />
          <Field
            label="BLOOD PRESSURE -"
            value={form.blood_pressure || ''}
            onChange={(v) => onChange('blood_pressure', v)}
          />
          <Field label="PULSE-" value={form.pulse || ''} onChange={(v) => onChange('pulse', v)} />
          <Field
            label="BLOOD SUGAR -"
            value={form.blood_sugar || ''}
            onChange={(v) => onChange('blood_sugar', v)}
          />

          <div className="gh-block gh-block-lab">
            <div className="gh-field">
              <span className="gh-label">LAB INVESTIGATION REPORT</span>
              <span className="gh-rule">
                <input
                  className="gh-input"
                  value={(form.lab_investigation || '').split('\n')[0] || ''}
                  onChange={(e) => {
                    const rest = (form.lab_investigation || '').split('\n').slice(1)
                    const next = [e.target.value, ...rest].join('\n')
                    onChange('lab_investigation', next.replace(/\n+$/, '') || e.target.value)
                  }}
                />
              </span>
            </div>
            <div className="gh-blank-rule">
              <input
                className="gh-input"
                value={(form.lab_investigation || '').split('\n').slice(1).join(' ') || ''}
                onChange={(e) => {
                  const first = (form.lab_investigation || '').split('\n')[0] || ''
                  onChange(
                    'lab_investigation',
                    e.target.value ? `${first}\n${e.target.value}` : first,
                  )
                }}
              />
            </div>
          </div>

          <div className="gh-block gh-block-final">
            <div className="gh-field">
              <span className="gh-label">FINAL IMPRESSION :</span>
              <span className="gh-rule">
                <input
                  className="gh-input"
                  value={(form.final_impression || '').split('\n')[0] || ''}
                  onChange={(e) => onChange('final_impression', e.target.value)}
                />
              </span>
            </div>
            <BlankRule />
          </div>

          <div className="gh-cert">
            <p>
              CERTIFIED THAT I EXAMINED{' '}
              <span className="gh-inline-rule gh-rule-dotted">
                <input
                  className="gh-input"
                  value={form.certified_name || ''}
                  onChange={(e) => onChange('certified_name', e.target.value)}
                />
              </span>
            </p>
            <p>PRESENTLY IN GOOD HEALTH AND FREE FROM ANY CARDIO-RESPIRATORY</p>
            <p>/COMMUNICABLE ALIMENT, HE/SHE IS FIT FOR ORGANISATION.</p>
          </div>

          <div className="gh-dots" aria-hidden="true" />

          <div className="gh-sign">
            <div className="gh-field">
              <span className="gh-label">SIGNATURE OF MEDICAL EXAMINER</span>
              <span className="gh-rule" />
            </div>
            <Field
              label="NAME &"
              value={form.examiner_name || ''}
              onChange={(v) => onChange('examiner_name', v)}
            />
            <div className="gh-field">
              <span className="gh-label">
                QUALIFICATION<span className="gh-leaders">....................</span>
              </span>
              <span className="gh-rule">
                <input
                  className="gh-input"
                  value={form.examiner_qualification || ''}
                  onChange={(e) => onChange('examiner_qualification', e.target.value)}
                />
              </span>
            </div>
            <div className="gh-field">
              <span className="gh-label">
                PLACE<span className="gh-leaders">..............................</span>
              </span>
              <span className="gh-rule">
                <input
                  className="gh-input"
                  value={form.examiner_place || ''}
                  onChange={(e) => onChange('examiner_place', e.target.value)}
                />
              </span>
            </div>
            <div className="gh-legal">(Not Valid For Medical Legal Use)</div>
          </div>
        </section>
      </div>

      {/* FACILITIES + FOOTER */}
      <footer className="gh-footer">
        <div className="gh-foot-line" />
        <div className="gh-services">
          {GLOBE_SERVICES.map((row, i) => (
            <div key={i} className="gh-svc-row">
              {row.map((text) => (
                <div key={text} className="gh-svc">
                  <span className="gh-diamond">◆</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="gh-pills">
          <span className="gh-pill gh-pill-icu">I.C.U.</span>
          <span className="gh-pill gh-pill-nicu">N.I.C.U.</span>
          <span className="gh-pill gh-pill-vent">VENTILATOR</span>
          <span className="gh-pill gh-pill-cancer">CANCER</span>
        </div>

        <div className="gh-em-line" />

        <div className="gh-emergency">
          <span className="gh-cross">✚</span>
          <div className="gh-em-mid">
            <div className="gh-em-title">
              <span className="gh-24">24X7</span>{' '}
              <span className="gh-em-hi">इमरजेन्सी एण्ड ट्रामा केयर</span>
            </div>
            <div className="gh-em-phones">EMERGENCY CONTACT NO.: 9307467795, 9305238541</div>
          </div>
          <span className="gh-cross">✚</span>
        </div>
      </footer>
    </div>
  )
}
