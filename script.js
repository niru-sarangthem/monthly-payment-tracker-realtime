// script.js
// Firebase + app logic (modular SDK)
// Replace FIREBASE_CONFIG placeholders with your project's actual config before deploying.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc, deleteDoc, collection
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* =========================
   FIREBASE CONFIG (PLACEHOLDERS)
   =========================
   Paste your actual config object here from Firebase Console -> Project Settings -> Your apps
*/

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD9LXg59ZNcjUKa4vmAps7w0nnp6fedgOg",
  authDomain: "payment-tracker-57c73.firebaseapp.com",
  projectId: "payment-tracker-57c73",
  storageBucket: "payment-tracker-57c73.firebasestorage.app",
  messagingSenderId: "30074536523",
  appId: "1:30074536523:web:eda6a6ccd9fdd2924d83ce",
  measurementId: "G-6HHVQBVHVX"
};

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const auth = getAuth(app);

// Sign in users anonymously (so we get a UID to identify creators)
let currentUid = null;
signInAnonymously(auth).catch(err => {
  console.error("Anonymous sign-in failed:", err);
});
onAuthStateChanged(auth, user => {
  if (user) currentUid = user.uid;
});

// ==== PARTICIPANTS + ROTATION (hardcoded per your list) ====
const participants = [
  "Rajesh","Priyanka","victo","thoibicha 1","Nene","Merina1","winton1","kabita","Winto 2",
  "Merina2","thoibicha 2","kaka Robindro","Thoibicha Mom","Kajan","victo 2","warli","sonia 1",
  "Sonia 2","Landoni sarang","kullachandra ba","nirupama","Memma"
];

// Start month/year fixed as Aug 2025
const START_MONTH = 8; // 1-based month (August)
const START_YEAR = 2025;
const BASE_AMOUNT = 10000;
const INCREASE = 500;
const MONTH_COUNT = participants.length; // number of months = number of participants

// Build months array (objects with label like "Aug 25", monthIndex 0..)
function buildMonths() {
  const months = [];
  let y = START_YEAR;
  let m = START_MONTH - 1; // JS Date month is 0-based
  for (let i = 0; i < MONTH_COUNT; i++) {
    const d = new Date(y, m, 1);
    const label = d.toLocaleString('en', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(-2);
    months.push({ index: i, label, year: d.getFullYear(), month: d.getMonth() + 1, receiver: participants[i] });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return months;
}
const months = buildMonths();

// DOM refs
const thead = document.getElementById('thead');
const tbody = document.getElementById('tbody');
const resetBtn = document.getElementById('resetBtn');
const seedBtn = document.getElementById('seedBtn');

// Compute amount for person pIndex at month mIndex
// rule: participant at index j gets +INCREASE permanently starting from monthIndex >= j+1
function computeAmountFor(mIndex, pIndex) {
  return BASE_AMOUNT + (mIndex >= (pIndex + 1) ? INCREASE : 0);
}

// Build header and empty table
function buildHeader() {
  let html = '<tr><th>Sl. No</th><th>Month-Year</th>';
  for (const p of participants) html += `<th>${escapeHtml(p)}</th>`;
  html += '<th>Total to Receive</th></tr>';
  thead.innerHTML = html;
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

function renderEmpty() {
  let html = '';
  for (let i = 0; i < months.length; i++) {
    const m = months[i];
    html += `<tr data-month-index="${i}" data-month-label="${m.label}" data-receiver="${escapeHtml(m.receiver)}">`;
    html += `<td>${i+1}</td><td>${m.label}</td>`;
    for (let p = 0; p < participants.length; p++) {
      const amt = computeAmountFor(i, p);
      html += `<td><button class="payBtn not-paid" data-month-index="${i}" data-person-index="${p}" data-amount="${amt}">Not Paid</button></td>`;
    }
    html += `<td class="total-cell" data-month-index="${i}">Pending: 0 / Expected: 0</td>`;
    html += `</tr>`;
  }
  tbody.innerHTML = html;
}

// Highlight Aug row after 15 Aug 2025
function applyAugHighlight() {
  const now = new Date();
  const cutoff = new Date(2025, 7, 15, 0, 0, 0); // Aug is month 7 (0-based)
  if (now >= cutoff) {
    document.querySelectorAll('tr[data-month-label="Aug 25"]').forEach(r => r.classList.add('aug-row'));
  }
}

// Highlight current month receiver (based on today's month-year matching months label)
function highlightCurrentReceiver() {
  const now = new Date();
  const labelNow = now.toLocaleString('en', { month: 'short' }) + ' ' + String(now.getFullYear()).slice(-2);
  document.querySelectorAll('tr[data-month-label]').forEach(row => {
    const label = row.dataset.monthLabel;
    // Remove previous receiver-cell styling on buttons
    row.querySelectorAll('button.payBtn').forEach(b => b.classList.remove('receiver-cell'));
    if (label === labelNow) {
      // highlight the receiver button in that row
      const receiver = row.dataset.receiver;
      row.querySelectorAll('button.payBtn').forEach(btn => {
        if (btn.dataset.personIndex && participants[btn.dataset.personIndex] === receiver) {
          btn.classList.add('receiver-cell');
        }
      });
      // also ensure the whole row is visible (no further action needed)
    }
  });
}

// Initialize UI
buildHeader();
renderEmpty();
applyAugHighlight();
highlightCurrentReceiver();

/* =========================
   Firestore integration
   =========================
   We'll store documents under collection 'payments' with id: `${monthIndex}_${personIndex}`
   Document fields:
     - monthIndex (number)
     - personIndex (number)
     - amount (number)
     - paid (boolean)
     - creatorId (string) // UID of the creator (from anonymous auth)
*/
const paymentsColl = collection(db, 'payments');

// Listen for realtime updates and refresh UI
onSnapshot(paymentsColl, (snapshot) => {
  // map doc ids -> data
  const data = {};
  snapshot.forEach(docSnap => {
    data[docSnap.id] = docSnap.data();
  });
  // Update buttons/table based on data
  document.querySelectorAll('button.payBtn').forEach(btn => {
    const mi = btn.dataset.monthIndex;
    const pi = btn.dataset.personIndex;
    const docId = `${mi}_${pi}`;
    const rec = data[docId];
    btn.classList.remove('not-paid','amount-shown','paid');
    if (rec && rec.paid === true) {
      btn.classList.add('paid');
      btn.textContent = 'Paid';
    } else {
      // default state: Not Paid
      btn.classList.add('not-paid');
      btn.textContent = 'Not Paid';
    }
  });
  // Update totals
  updateAllTotals(data);
});

/* Button click handling:
   - If Not Paid (red) clicked -> locally show amount (orange) (no DB write)
   - If amount shown (orange) clicked -> commit Paid to Firestore (set paid=true, creatorId=currentUid, amount)
   - If Paid (green) clicked -> unmark paid (set paid=false i.e. delete or update to paid:false). We will update doc to paid:false (or remove doc).
*/
tbody.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('button.payBtn');
  if (!btn) return;
  const mi = parseInt(btn.dataset.monthIndex,10);
  const pi = parseInt(btn.dataset.personIndex,10);
  const amount = parseInt(btn.dataset.amount,10);
  const docRef = doc(db, 'payments', `${mi}_${pi}`);

  if (btn.classList.contains('not-paid')) {
    // show amount locally
    btn.classList.remove('not-paid');
    btn.classList.add('amount-shown');
    btn.textContent = amount;
    return;
  }

  if (btn.classList.contains('amount-shown')) {
    // commit Paid -> write doc
    try {
      await setDoc(docRef, {
        monthIndex: mi,
        personIndex: pi,
        amount: amount,
        paid: true,
        creatorId: currentUid || null,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error("Write failed:", err);
      alert("Failed to mark paid. Check Firebase config and rules.");
    }
    return;
  }

  if (btn.classList.contains('paid')) {
    // unmark paid -> set paid false (we update the doc)
    try {
      // we will remove 'paid' field or set paid:false; here we set paid:false
      await setDoc(docRef, { paid: false, updatedAt: new Date() }, { merge: true });
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to unmark paid. Check Firebase config and rules.");
    }
    return;
  }
});

// Compute and update totals (expected vs paid) for each month row
async function updateAllTotals(latestData = {}) {
  document.querySelectorAll('tr[data-month-index]').forEach(row => {
    const mi = parseInt(row.dataset.monthIndex,10);
    const receiver = row.dataset.receiver;
    // expected sum (excluding receiver)
    let expected = 0;
    participants.forEach((p, pi) => {
      if (p === receiver) return; // exclude receiver
      expected += computeAmountFor(mi, pi);
    });
    // paid sum
    let paid = 0;
    participants.forEach((p, pi) => {
      if (p === receiver) return;
      const docId = `${mi}_${pi}`;
      const rec = latestData[docId];
      if (rec && rec.paid === true) paid += rec.amount || computeAmountFor(mi, pi);
    });
    const pending = Math.max(0, expected - paid);
    const cell = row.querySelector('.total-cell');
    cell.textContent = `Pending: ${pending} / Expected: ${expected}`;
    if (pending === 0) cell.classList.add('total-full'); else cell.classList.remove('total-full');
  });
}

// Reset button - clears all payments (use with caution). Only allowed by project rules.
resetBtn.addEventListener('click', async () => {
  if (!confirm('Clear all payment marks for everyone? This will set all to Not Paid.')) return;
  // This action will set all docs' paid to false
  // We iterate months x participants and set paid:false for each doc
  try {
    for (let mi=0; mi<MONTH_COUNT; mi++) {
      for (let pi=0; pi<participants.length; pi++) {
        const docRef = doc(db, 'payments', `${mi}_${pi}`);
        await setDoc(docRef, { paid: false, updatedAt: new Date() }, { merge: true });
      }
    }
    alert('All payment marks cleared (set to Not Paid).');
  } catch (err) {
    console.error('Reset failed', err);
    alert('Reset failed: ' + err);
  }
});

// Seed default entries - optional convenience (creates docs with paid:false and amount values)
seedBtn.addEventListener('click', async () => {
  if (!confirm('Seed payments documents with default amounts (Not Paid)?')) return;
  try {
    for (let mi=0; mi<MONTH_COUNT; mi++) {
      for (let pi=0; pi<participants.length; pi++) {
        const amount = computeAmountFor(mi, pi);
        const docRef = doc(db, 'payments', `${mi}_${pi}`);
        await setDoc(docRef, {
          monthIndex: mi,
          personIndex: pi,
          amount: amount,
          paid: false,
          creatorId: currentUid || null,
          createdAt: new Date()
        }, { merge: true });
      }
    }
    alert('Seeded default payment entries (Not Paid).');
  } catch (err) {
    console.error('Seeding failed', err);
    alert('Seeding failed: ' + err);
  }
});
