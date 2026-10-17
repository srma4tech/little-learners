const { test, expect } = require('@playwright/test');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

let server;
test.beforeAll(async () => {
  server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    try { const response = await fetch('http://127.0.0.1:4173/'); if (response.ok) return; } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Local static server did not start');
});
test.afterAll(() => { if (server) server.kill(); });

async function stubFirebase(page) {
  await page.route('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'export function initializeApp(config){return {config}}'
  }));
  await page.route('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      const state=globalThis.__llAuth||(globalThis.__llAuth={user:null,currentUser:null,callback:null});
      export const indexedDBLocalPersistence={},browserLocalPersistence={},inMemoryPersistence={};
      export class GoogleAuthProvider { static credential(token){return {token}} }
      export function initializeAuth(){return state}
      export function onAuthStateChanged(auth,callback){state.callback=callback;setTimeout(()=>callback(state.user),0);return ()=>{}}
      export async function signInWithCredential(auth,credential){state.user={uid:'test-parent',displayName:'Parent Name',email:'parent@example.test'};state.currentUser=state.user;if(state.callback)await state.callback(state.user);return {user:state.user}}
      export async function signOut(){state.user=null;state.currentUser=null;if(state.callback)await state.callback(null)}
      export async function deleteUser(){state.user=null;if(state.callback)await state.callback(null)}
    `
  }));
  await page.route('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      const key='__ll_firestore_mock';
      const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(_){return {}}};
      const write=data=>localStorage.setItem(key,JSON.stringify(data));
      export function initializeFirestore(){return {}}
      export function getFirestore(){return {}}
      export function persistentLocalCache(){return {}}
      export function persistentMultipleTabManager(){return {}}
      export function doc(_db,...parts){return {path:parts.join('/')}}
      export function collection(_db,...parts){return {path:parts.join('/')}}
      export function deleteField(){return {$delete:true}}
      export async function getDoc(ref){const data=read(),value=data[ref.path];return {exists:()=>!!value,data:()=>value}}
      export async function getDocs(ref){const data=read(),prefix=ref.path+'/',docs=Object.entries(data).filter(([path])=>path.startsWith(prefix)&&!path.slice(prefix.length).includes('/')).map(([path,value])=>({id:path.slice(prefix.length),ref:{path},data:()=>value}));return {docs,empty:docs.length===0}}
      export async function runTransaction(_db,callback){const transaction={async get(ref){const value=read()[ref.path];return {exists:()=>!!value,data:()=>value}},set(ref,value){const data=read();data[ref.path]=JSON.parse(JSON.stringify(value));write(data)}};return callback(transaction)}
      export async function updateDoc(ref,patch){const data=read(),next=data[ref.path]||{};for(const [key,value] of Object.entries(patch)){if(value&&value.$delete)delete next[key];else next[key]=value}data[ref.path]=next;write(data)}
      export async function deleteDoc(ref){const data=read();delete data[ref.path];write(data)}
    `
  }));
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.google={accounts:{id:{initialize(config){window.__llGisCallback=config.callback},renderButton(element){const button=document.createElement('button');button.type='button';button.id='stub-google-login';button.textContent='Sign in with Google (stub)';button.onclick=()=>window.__llGisCallback({credential:'stub-token'});element.appendChild(button)}}}};`
  }));
}

async function startGuest(page) {
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button', { name: /Let's start/i }).click();
  await page.getByRole('button', { name: /Skip, continue as guest/i }).click();
  await page.getByPlaceholder("Child's name").fill('Ari');
  await page.getByRole('button', { name: /Start learning/i }).click();
}

test('guest onboarding, quiz rewards, and section navigation work without console errors', async ({ page }) => {
  const consoleErrors=[];
  page.on('console', message=>{if(message.type()==='error')consoleErrors.push(message.text())});
  await stubFirebase(page);
  await startGuest(page);
  await expect(page.getByRole('button', { name: /Open Alphabets learning section/i })).toBeVisible();
  await page.getByRole('button', { name: /Open Alphabets learning section/i }).click();
  await page.getByRole('button', { name: /Play/i }).click();
  for (let round = 0; round < 5; round++) {
    expect(await page.locator('.opt').count()).toBeGreaterThanOrEqual(3);
    await page.locator('.opt[data-correct="true"]').click();
    if (round < 4) await expect(page.getByText(new RegExp('Round ' + (round + 2) + '/5'))).toBeVisible({ timeout: 4000 });
  }
  await expect(page.getByText(/Wonderful learning/i)).toBeVisible({ timeout: 5000 });
  expect(consoleErrors).toEqual([]);
});

test('new Google account remains on child setup until a child is saved', async ({ page }) => {
  await stubFirebase(page);
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button', { name: /Let's start/i }).click();
  await page.getByRole('button', { name: 'Sign in with Google (stub)' }).click();
  await expect(page.getByRole('heading', { name: /Who is learning/i })).toBeVisible({ timeout: 5000 });
  const rootBeforeSetup = await page.evaluate(() => JSON.parse(localStorage.getItem('__ll_firestore_mock')||'{}')['users/test-parent']);
  expect(rootBeforeSetup).toBeUndefined();
  await page.getByPlaceholder("Child's name").fill('Mira');
  await page.getByRole('button', { name: /Start learning/i }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('__ll_firestore_mock')||'{}')['users/test-parent'])).toBeTruthy();
});

test('returning Google account loads its saved child from the subcollection', async ({ page }) => {
  await stubFirebase(page);
  await page.addInitScript(() => localStorage.setItem('__ll_firestore_mock', JSON.stringify({
    'users/test-parent': {settings:{lang:'both',sound:1},settingsUpdatedAt:10,kidIds:['kid1'],schemaVersion:3,createdAt:1,updatedAt:10},
    'users/test-parent/kids/kid1': {name:'Ria',stars:4,starCounters:{deviceA:4},resetGeneration:0}
  })));
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button', { name: /Let's start/i }).click();
  await page.getByRole('button', { name: 'Sign in with Google (stub)' }).click();
  await expect(page.getByRole('heading', { name: /Hello, Ria/i })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#stars')).toContainText('4');
});

test('guest child data is not rendered as HTML', async ({ page }) => {
  await stubFirebase(page);
  await page.addInitScript(() => localStorage.setItem('kl', JSON.stringify({kids:{me:{name:'<img src=x onerror=alert(1)>',stars:0}},kid:'me',lang:'both',sound:1,ob:1,step:3})));
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await expect(page.locator('#app h1')).toContainText('<img src=x');
});

test('offline indicator appears and manifest/icons are reachable', async ({ page }) => {
  await stubFirebase(page);
  await page.goto('http://127.0.0.1:4173/');
  await page.context().setOffline(true);
  await expect(page.locator('#offline-indicator')).toBeVisible();
  await page.context().setOffline(false);
  const manifest = await page.request.get('http://127.0.0.1:4173/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  const devtools=await page.context().newCDPSession(page);
  const manifestCheck=await devtools.send('Page.getAppManifest');
  expect(manifestCheck.errors||[]).toEqual([]);
  expect((await page.request.get('http://127.0.0.1:4173/icon-192.png')).ok()).toBeTruthy();
  expect((await page.request.get('http://127.0.0.1:4173/icon-512.png')).ok()).toBeTruthy();
});

test('parent gate protects settings and relocks after leaving', async ({ page }) => {
  await stubFirebase(page);
  await startGuest(page);
  await page.locator('#kid').click();
  await expect(page.getByRole('heading', { name: /Parents only/i })).toBeVisible();
  const equation = await page.locator('.q .big').textContent();
  const match = equation.match(/(\d+)\s*\+\s*(\d+)/);
  const answer = Number(match[1]) + Number(match[2]);
  await page.locator('.opt').filter({ hasText: new RegExp('^' + answer + '$') }).click();
  await expect(page.getByRole('heading', { name: /Parent corner/i })).toBeVisible();
  await page.locator('#app .bar button').first().click();
  await page.locator('#kid').click();
  await expect(page.getByRole('heading', { name: /Parents only/i })).toBeVisible();
});

test('parent can add and safely remove a child profile', async ({ page }) => {
  await stubFirebase(page);
  await startGuest(page);
  await page.locator('#kid').click();
  await expect(page.getByRole('heading', { name: /Parents only/i })).toBeVisible();
  const equation = await page.locator('.q .big').textContent();
  const match = equation.match(/(\d+)\s*\+\s*(\d+)/);
  await page.locator('.opt').filter({ hasText: new RegExp('^' + (Number(match[1])+Number(match[2])) + '$') }).click();
  page.once('dialog', dialog => dialog.accept('Bea'));
  await page.getByRole('button', { name: /Add kid/i }).click();
  await expect(page.getByRole('button', { name: 'Bea', exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: /Remove current kid/i }).click();
  await expect(page.locator('#app')).not.toContainText('Bea');
});

test('install prompt is shown and invoked when the browser provides it', async ({ page }) => {
  await stubFirebase(page);
  await startGuest(page);
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt');
    event.prompt = () => { window.__installPrompted = true; };
    event.userChoice = Promise.resolve({outcome:'accepted'});
    window.dispatchEvent(event);
  });
  await expect(page.locator('#inst')).toBeVisible();
  await page.locator('#inst').click();
  await expect.poll(() => page.evaluate(() => window.__installPrompted)).toBeTruthy();
});

test('Gemini key stays local and can be removed', async ({ page }) => {
  await stubFirebase(page);
  await startGuest(page);
  await page.locator('#kid').click();
  await expect(page.getByRole('heading', { name: /Parents only/i })).toBeVisible();
  const equation = await page.locator('.q .big').textContent();
  const match = equation.match(/(\d+)\s*\+\s*(\d+)/);
  await page.locator('.opt').filter({ hasText: new RegExp('^' + (Number(match[1])+Number(match[2])) + '$') }).click();
  await page.getByRole('button', { name: /Enable AI helpers/i }).click();
  await page.locator('#gemini-key').fill('test-gemini-key');
  await page.getByRole('button', { name: /Save key on this device/i }).click();
  expect(await page.evaluate(() => localStorage.getItem('ll_gemini_api_key_v1'))).toBe('test-gemini-key');
  const cloudText = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('__ll_firestore_mock')||'{}')));
  expect(cloudText).not.toContain('test-gemini-key');
  await page.getByRole('button', { name: /Remove key/i }).click();
  expect(await page.evaluate(() => localStorage.getItem('ll_gemini_api_key_v1'))).toBeNull();
});

test('capture desktop and mobile app screenshots for PWA metadata', async ({ page }) => {
  await stubFirebase(page);
  await startGuest(page);
  fs.mkdirSync('artifacts/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'artifacts/screenshots/little-learners-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/screenshots/little-learners-mobile.png', fullPage: true });
});
