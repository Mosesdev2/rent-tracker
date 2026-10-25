import { useEffect, useState } from 'react';
import { supabase, supabaseReady } from './supabase.js';

const page = { fontFamily: 'sans-serif', padding: '24px', maxWidth: '520px', margin: '0 auto' };
const field = { display: 'block', width: '100%', padding: '10px', margin: '8px 0', fontSize: '16px', boxSizing: 'border-box' };
const btn = { padding: '10px 16px', fontSize: '16px' };

export default function App() {
  if (!supabaseReady) {
    return (
      <main style={page}>
        <h1>Rent Tracker</h1>
        <p>Supabase keys are missing. Check the Environment Variables in Vercel, then redeploy.</p>
      </main>
    );
  }
  return <Gate />;
}

function Gate() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return <main style={page}><p>Loading...</p></main>;
  return session ? <Tenants /> : <AuthForm />;
}

function AuthForm() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    const { data, error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else if (mode === 'signup' && !data.session) {
      setMessage('Account created. Check your email to confirm, then sign in.');
    }
    setBusy(false);
  }

  return (
    <main style={page}>
      <h1>Rent Tracker</h1>
      <h2>{mode === 'signup' ? 'Create account' : 'Sign in'}</h2>
      <form onSubmit={submit}>
        <input style={field} type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input style={field} type="password" placeholder="Password (6+ characters)" value={password}
          onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        <button style={btn} type="submit" disabled={busy}>
          {busy ? 'Please wait...' : mode === 'signup' ? 'Sign up' : 'Sign in'}
        </button>
      </form>
      {message && <p>{message}</p>}
      <p>
        <button style={btn} type="button"
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage(''); }}>
          {mode === 'signup' ? 'I already have an account' : 'Create a new account'}
        </button>
      </p>
    </main>
  );
}

function Tenants() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [rent, setRent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const { data, error: err } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setRows(data);
  }

  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (busy) return;
    const amount = Number(rent);
    if (!name.trim() || !Number.isFinite(amount) || amount < 0) {
      setError('Enter a name and a valid rent amount.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: err } = await supabase.from('tenants').insert({
      name: name.trim(),
      unit: unit.trim() || null,
      rent_amount: amount,
    });
    if (err) setError(err.message);
    else {
      setName(''); setUnit(''); setRent('');
      await load();
    }
    setBusy(false);
  }

  async function remove(id) {
    const { error: err } = await supabase.from('tenants').delete().eq('id', id);
    if (err) setError(err.message);
    else await load();
  }

  const total = rows.reduce((sum, r) => sum + Number(r.rent_amount), 0);

  return (
    <main style={page}>
      <h1>Rent Tracker</h1>
      <p><button style={btn} onClick={() => supabase.auth.signOut()}>Sign out</button></p>

      <form onSubmit={add}>
        <input style={field} placeholder="Tenant name" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={field} placeholder="Unit (optional)" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <input style={field} type="number" inputMode="decimal" min="0" placeholder="Monthly rent (KES)"
          value={rent} onChange={(e) => setRent(e.target.value)} />
        <button style={btn} type="submit" disabled={busy}>{busy ? 'Saving...' : 'Add tenant'}</button>
      </form>
      {error && <p>{error}</p>}

      <h2>Tenants ({rows.length})</h2>
      {rows.length === 0 && <p>No tenants yet.</p>}
      <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
        {rows.map((r) => (
          <li key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid #ccc' }}>
            <strong>{r.name}</strong>{r.unit ? ` (${r.unit})` : ''}<br />
            KES {Number(r.rent_amount).toLocaleString('en-KE')}{' '}
            <button type="button" onClick={() => remove(r.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <p><strong>Total monthly rent: KES {total.toLocaleString('en-KE')}</strong></p>
    </main>
  );
}