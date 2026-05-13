import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createFRA, getCategories } from '../../lib/api';
import FundraiserHeader from '../../components/FundraiserHeader';

const STEP_LABELS = [
  'Campaign details',
  'Beneficiary',
  'Proof / docs',
  'Payment',
  'Review',
];

const BENEFICIARY_TYPES = [
  { value: 'individual', label: 'An individual' },
  { value: 'group', label: 'A group / community' },
  { value: 'ngo', label: 'A registered NGO' },
];

const BANKS = ['DBS', 'OCBC', 'UOB', 'Standard Chartered', 'Citibank', 'HSBC', 'Other'];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  done || active
                    ? 'bg-gray-900 text-white'
                    : 'border-2 border-gray-300 text-gray-400'
                }`}
              >
                {done ? '✓' : step}
              </div>
              <span className="text-xs text-gray-500 mt-1 w-20 text-center leading-tight">
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`h-px w-12 mx-1 mb-5 ${
                  step < current ? 'bg-gray-900' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CreateFRA() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [photo, setPhoto] = useState(null);
  const photoInputRef = useRef(null);
  const [docs, setDocs] = useState({});
  const docInputRefs = useRef({});

  const [details, setDetails] = useState({
    title: '',
    category_id: '',
    target_amount: '',
    location_text: '',
    country: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  const [beneficiary, setBeneficiary] = useState({
    type: 'individual',
    full_name: '',
    relationship: '',
    dob: '',
    contact: '',
    address: '',
    story: '',
  });

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : data?.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  function setDetail(field) {
    return (e) => setDetails((d) => ({ ...d, [field]: e.target.value }));
  }

  function setBene(field) {
    return (e) => setBeneficiary((b) => ({ ...b, [field]: e.target.value }));
  }

  async function handlePublish() {
    if (!confirmed) {
      setError('Please confirm the accuracy of information.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const fra = await createFRA({
        title: details.title,
        category_id: details.category_id || null,
        target_amount: Number(details.target_amount),
        location_text: details.location_text,
        end_date: details.end_date,
        description: details.description,
        fund_raiser_id: user?.id,
      });
      if (photo && fra?.id) {
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            localStorage.setItem(`fra_img_${fra.id}`, reader.result);
            resolve();
          };
          reader.readAsDataURL(photo);
        });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FundraiserHeader />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 mb-4 inline-block">
          ← My campaigns
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Create FRA — step {step} of 5
        </h1>
        <p className="text-sm text-gray-500 mb-6">{STEP_LABELS[step - 1]}</p>

        <StepIndicator current={step} />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign title *
                </label>
                <input
                  type="text"
                  required
                  value={details.title}
                  onChange={setDetail('title')}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="Give your campaign a clear title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={details.category_id}
                    onChange={setDetail('category_id')}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white"
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target amount (S$) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={details.target_amount}
                    onChange={setDetail('target_amount')}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="e.g. 10000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={details.location_text}
                    onChange={setDetail('location_text')}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="City / Region"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={details.country}
                    onChange={setDetail('country')}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="e.g. Singapore"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                  <input
                    type="date"
                    value={details.start_date}
                    onChange={setDetail('start_date')}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End date *</label>
                  <input
                    type="date"
                    required
                    value={details.end_date}
                    onChange={setDetail('end_date')}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={details.description}
                  onChange={setDetail('description')}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
                  placeholder="Tell supporters about this campaign (max 200 words)"
                />
              </div>

              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file && file.size <= 5 * 1024 * 1024) setPhoto(file);
                  }}
                />
                <div
                  onClick={() => photoInputRef.current.click()}
                  className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm cursor-pointer hover:border-gray-400 transition-colors"
                >
                  {photo ? (
                    <span className="text-gray-700">📷 {photo.name}</span>
                  ) : (
                    <span>📷 Attach photo (optional) — JPEG, PNG, WebP up to 5 MB</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Beneficiary type</p>
                <div className="grid grid-cols-3 gap-3">
                  {BENEFICIARY_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBeneficiary((b) => ({ ...b, type: value }))}
                      className={`border rounded-lg p-3 text-sm font-medium transition-colors ${
                        beneficiary.type === value
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
                  <input
                    type="text"
                    required
                    value={beneficiary.full_name}
                    onChange={setBene('full_name')}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                  <select
                    value={beneficiary.relationship}
                    onChange={setBene('relationship')}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white"
                  >
                    <option value="">Select</option>
                    <option>Self</option>
                    <option>Family member</option>
                    <option>Friend</option>
                    <option>Community member</option>
                    <option>Organisation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                  <input
                    type="date"
                    value={beneficiary.dob}
                    onChange={setBene('dob')}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                  <input
                    type="text"
                    value={beneficiary.contact}
                    onChange={setBene('contact')}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="+65 ..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={beneficiary.address}
                  onChange={setBene('address')}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Their story</label>
                <textarea
                  rows={4}
                  value={beneficiary.story}
                  onChange={setBene('story')}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
                  placeholder="Share their story to help donors connect"
                />
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-xs text-gray-400">
                🔒 Privacy notice: Beneficiary information is kept confidential and only shared with verified platform staff.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3">REQUIRED</p>
                {['Beneficiary ID (NRIC/Passport)', 'Your own ID (NRIC/Passport)'].map((doc) => (
                  <div key={doc} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 mb-2">
                    <span className="text-sm text-gray-700">
                      {docs[doc] ? `✓ ${docs[doc].name}` : doc}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      ref={(el) => { docInputRefs.current[doc] = el; }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) setDocs((d) => ({ ...d, [doc]: file }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => docInputRefs.current[doc]?.click()}
                      className={`text-xs px-3 py-1 rounded transition-colors ${
                        docs[doc]
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-900 text-white hover:bg-gray-700'
                      }`}
                    >
                      {docs[doc] ? 'Uploaded ✓' : 'Upload'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">OPTIONAL — increases impact score</p>
                {['Medical report', 'Hospital bill', 'Supportive photos', 'Letter from authority'].map((doc) => (
                  <div key={doc} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-500">
                      {docs[doc] ? docs[doc].name : doc}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      ref={(el) => { docInputRefs.current[doc] = el; }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) setDocs((d) => ({ ...d, [doc]: file }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => docInputRefs.current[doc]?.click()}
                      className={`text-xs px-3 py-1 rounded transition-colors ${
                        docs[doc]
                          ? 'border border-green-500 text-green-700'
                          : 'border border-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {docs[doc] ? 'Uploaded ✓' : 'Upload'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Current impact score</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">6.2</p>
                </div>
                <p className="text-xs text-gray-500 text-right max-w-xs">
                  Upload 2 more documents to reach 8+ and boost your campaign visibility
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Account holder</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'beneficiary', label: 'The beneficiary', sub: 'Recommended' },
                    { value: 'self', label: 'Me (the fundraiser)', sub: '' },
                  ].map(({ value, label, sub }) => (
                    <div
                      key={value}
                      className="border border-gray-200 rounded-lg p-3 bg-gray-50 cursor-not-allowed opacity-60"
                    >
                      <p className="text-sm font-medium text-gray-700">{label}</p>
                      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Payment details are collected during disbursement</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                  <select className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white">
                    <option value="">Select bank</option>
                    {BANKS.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account number</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="XXX-XXXXX-X"
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Disbursement milestones</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Milestone</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Trigger</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[25, 50, 75, 100].map((pct) => (
                        <tr key={pct}>
                          <td className="px-4 py-2 text-gray-700">{pct}%</td>
                          <td className="px-4 py-2 text-gray-500">Goal reached</td>
                          <td className="px-4 py-2 text-gray-700">
                            S${((Number(details.target_amount) || 0) * pct / 100).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-xs text-gray-500">
                Platform fee: 5% of total raised. Disbursed upon milestone verification.
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              {[
                {
                  title: 'Campaign details',
                  step: 1,
                  items: [
                    ['Title', details.title],
                    ['Category', categories.find((c) => String(c.id) === String(details.category_id))?.name || '—'],
                    ['Target', details.target_amount ? `S$${Number(details.target_amount).toLocaleString()}` : '—'],
                    ['End date', details.end_date || '—'],
                    ['Location', details.location_text || '—'],
                  ],
                },
                {
                  title: 'Beneficiary',
                  step: 2,
                  items: [
                    ['Type', beneficiary.type],
                    ['Name', beneficiary.full_name || '—'],
                    ['Relationship', beneficiary.relationship || '—'],
                  ],
                },
                { title: 'Proof / docs', step: 3, items: [['Documents', 'See uploaded files']] },
                { title: 'Payment', step: 4, items: [['Disbursement', 'Milestone-based (4 stages)']] },
              ].map(({ title, step: s, items }) => (
                <div key={title} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                    <button
                      onClick={() => setStep(s)}
                      className="text-xs text-indigo-700 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <dl className="space-y-1">
                    {items.map(([k, v]) => (
                      <div key={k} className="flex gap-4 text-sm">
                        <dt className="text-gray-500 w-24 flex-shrink-0">{k}</dt>
                        <dd className="text-gray-900">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-2">What happens next</p>
                <ol className="space-y-1 list-decimal list-inside text-gray-500 text-xs">
                  <li>Your FRA will be reviewed within 24 hours</li>
                  <li>Once approved, it goes live and accepts donations</li>
                  <li>Donors can find your campaign via search and recommendations</li>
                  <li>Funds are disbursed at each 25% milestone</li>
                </ol>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700">
                  I confirm all information is accurate and I agree to the platform terms.
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="border border-gray-200 px-4 py-2 rounded text-sm text-gray-700 hover:border-gray-400 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={() => {
                if (step === 1 && (!details.title || !details.target_amount || !details.end_date)) {
                  setError('Please fill in all required fields.');
                  return;
                }
                setError('');
                setStep((s) => s + 1);
              }}
              className="bg-gray-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              {step === 4 ? 'Preview' : 'Next'}
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={submitting}
              className="bg-indigo-700 text-white px-6 py-2 rounded text-sm font-medium hover:bg-indigo-800 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Publishing…' : 'Publish FRA'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
