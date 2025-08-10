# Monthly Payment Tracker (GitHub Pages + Firebase Firestore)

A lightweight, mobile-friendly monthly payment tracker.  
Start month: **August 2025**. Rotation and participants are hardcoded (Aug 2025 → Apr 2027).  
This app uses **Firebase Firestore** for real-time sync so everyone with the link can update payments live.

## Files
- `index.html` — main web page (UI + styles)
- `script.js` — Firebase + application logic (replace the placeholders with your Firebase config)
- `README.md` — this file

## Participants & Rotation (hardcoded)
1. Rajesh — Aug 2025  
2. Priyanka — Sep 2025  
3. victo — Oct 2025  
4. thoibicha 1 — Nov 2025  
5. Nene — Dec 2025  
6. Merina1 — Jan 2026  
7. winton1 — Feb 2026  
8. kabita — Mar 2026  
9. Winto 2 — Apr 2026  
10. Merina2 — May 2026  
11. thoibicha 2 — Jun 2026  
12. kaka Robindro — Jul 2026  
13. Thoibicha Mom — Aug 2026  
14. Kajan — Sep 2026  
15. victo 2 — Oct 2026  
16. warli — Nov 2026  
17. sonia 1 — Dec 2026  
18. Sonia 2 — Jan 2027  
19. Landoni sarang — Feb 2027  
20. kullachandra ba — Mar 2027  
21. nirupama — Apr 2027  
22. Memma — May 2027

> Note: The number of months equals the number of participants. Each month the next participant in the list is the receiver.

## Behavior & Rules
- Every participant starts at **₹10,000**.
- Each participant gets a **₹500 increase** starting from the month after their position in the list (applies permanently to subsequent months).
  - Example: Rajesh's increase applies from Sep 2025 onward; Priyanka's increase applies from Oct 2025 onward; etc.
- **August 2025 row** turns yellow after **15 Aug 2025** (client-side).
- Each cell shows a **Not Paid** red button → click once to show amount → click again to mark **Paid** (green).
- **Total to Receive** per month is shown and updates live. (By default the receiver is excluded from paying; change code if you'd like the receiver to also pay.)
- The receiver cell for the current month is highlighted automatically.

## Firebase Setup (step-by-step)
1. Create a Firebase project at https://console.firebase.google.com/
2. In the project, go to **Authentication** → Sign-in method → enable **Anonymous** provider.
3. Go to **Firestore Database** → Create Database → start in **test mode** (or set rules as shown below).
4. In the **Project settings → General**, add a **Web app** and copy the Firebase config object.
5. Open `script.js` and replace the `FIREBASE_CONFIG` placeholders with your copied config.
6. OPTIONAL: From Firebase Console → Firestore → create a collection named `payments` (the app will create documents automatically if you use the Seed button).

## Recommended Firestore Rules
If you want:
- Public read & create/update
- Deletion restricted to authenticated users (creator) only

Use these rules (adjust if you change structure):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /payments/{docId} {
      // anyone can read
      allow read: if true;
      // anyone can create or update (anonymous auth is used in client)
      allow create, update: if true;
      // deletion only allowed by authenticated users (e.g., the creator)
      allow delete: if request.auth != null && request.auth.uid == resource.data.creatorId;
    }
  }
}
