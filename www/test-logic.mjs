#!/usr/bin/env node
/**
 * Treino Forca — testes de unidade da logica de treino.
 *
 * Executa sem dependencias externas (assert + vm nativos do Node).
 *   node www/test-logic.mjs
 *
 * Carrega app.js num contexto VM isolado (mock de navegador) e usa a
 * interface exposta em globalThis.__treinoForcaTest para injetar estado
 * e chamar as funcoes puras.
 */

import assert from 'node:assert/strict'
import { createContext, runInContext } from 'node:vm'
import { readFileSync } from 'node:fs'

// ── Mock de localStorage ──────────────────────────────────────────
const store = {}
const localStorageMock = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: (k) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
}

// Elemento fake compartilhado.
const fakeEl = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
  classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {}, replace: () => {} },
  style: {},
  get innerHTML() { return '' },
  set innerHTML(v) {},
  get textContent() { return '' },
  set textContent(v) {},
  appendChild: () => fakeEl,
  removeChild: () => {},
  setAttribute: () => {},
  getAttribute: () => null,
  removeAttribute: () => {},
  querySelector: () => fakeEl,
  querySelectorAll: () => [fakeEl],
  click: () => {},
  focus: () => {},
  blur: () => {},
  get hidden() { return false },
  set hidden(v) {},
  get value() { return '' },
  set value(v) {},
  dataset: {},
  get checked() { return false },
  set checked(v) {},
  options: [],
  selectedIndex: 0,
  files: [],
  play: () => {},
  pause: () => {},
  load: () => {},
}

// ── Contexto de execucao (navegador fake) ─────────────────────────
const sandbox = {
  assert,
  console,
  localStorage: localStorageMock,
  Date,
  Object, Array, String, Number, Boolean, Math, JSON, Error,
  parseInt, parseFloat, isNaN, isFinite,
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  Promise,
  window: {
    localStorage: localStorageMock,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  },
  navigator: { onLine: true, userAgent: 'test' },
  __NODE_TEST__: true,
  document: {
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => fakeEl,
    querySelectorAll: () => [fakeEl],
    getElementById: () => fakeEl,
    getElementsByClassName: () => [fakeEl],
    getElementsByTagName: () => [fakeEl],
    createElement: () => fakeEl,
    createDocumentFragment: () => ({ appendChild: () => {} }),
    body: fakeEl,
    head: fakeEl,
  },
}

const context = createContext(sandbox)

const src = readFileSync(new URL('./app.js', import.meta.url), 'utf8')

// Substitui referencias a navegador por versoes seguras no contexto.
const safeSrc = src
  .replace(/window\.navigator/g, '{}')
  .replace(/window\.matchMedia/g, '() => ({ matches: false })')
  .replace(/window\.Capacitor/g, 'undefined')

runInContext(safeSrc, context)

const tf = sandbox.__treinoForcaTest
if (!tf) {
  console.log('not ok - __treinoForcaTest nao exposto (app.js mudou?)')
  process.exit(1)
}

const {
  clampInt, esc, roundHalf, incrementFor, dateKey, parseDateKey,
  nextLoadAdvice, deloadAlerts, prMap, initialState,
} = tf

let failures = 0
function check(name, fn) {
  try {
    fn()
    console.log(`ok  - ${name}`)
  } catch (e) {
    failures += 1
    console.log(`not ok - ${name}: ${e.message}`)
  }
}

// ── Utilitários puros ──
check('clampInt limita ao intervalo', () => {
  assert.strictEqual(clampInt(5, 1, 10, 0), 5)
  assert.strictEqual(clampInt(-1, 1, 10, 0), 1)
  assert.strictEqual(clampInt(100, 1, 10, 0), 10)
  assert.strictEqual(clampInt('abc', 1, 10, 3), 3)
})
check('esc escapa HTML', () => {
  assert.strictEqual(esc('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;')
  assert.strictEqual(esc('a&b'), 'a&amp;b')
})
check('roundHalf arredonda para meio', () => {
  assert.strictEqual(roundHalf(1.2), 1)
  assert.strictEqual(roundHalf(1.3), 1.5)
  assert.strictEqual(roundHalf(1.7), 1.5)
  assert.strictEqual(roundHalf(1.8), 2)
})
check('incrementFor retorna incremento por grupo', () => {
  assert.strictEqual(incrementFor('upper'), 2.5)
  assert.strictEqual(incrementFor('lower'), 5)
})
check('dateKey formata YYYY-MM-DD', () => {
  assert.strictEqual(dateKey(new Date(2026, 0, 5)), '2026-01-05')
})
check('parseDateKey converte volta para Date', () => {
  const d = parseDateKey('2026-01-05')
  assert.strictEqual(d.getFullYear(), 2026)
  assert.strictEqual(d.getMonth(), 0)
  assert.strictEqual(d.getDate(), 5)
})

// ── Logica de progressao (dupla progressao) ──
function makeStateWithSession(exName, reps, rir, weight) {
  const state = initialState()
  state.sessions = [{
    id: 's1', templateId: 'tpl-push', templateTitle: 'Push', date: '2026-01-01',
    startedAt: '2026-01-01T08:00:00Z', finishedAt: '2026-01-01T09:00:00Z',
    notes: '', cardio: { done: false, minutes: 0 },
    exercises: [{
      id: 'e1', name: exName, type: 'basico', loadGroup: 'upper',
      repMin: 3, repMax: 5, restSec: 150, note: '', tips: [], progress: true,
      sets: [{ id: 'se1', weight, reps, rir, note: '', savedAt: Date.now() }],
    }],
  }]
  return state
}

check('nextLoadAdvice sugere incremento ao bater topo com RIR>=2', () => {
  tf.state = makeStateWithSession('Supino reto', 5, 2, 100)
  const advice = nextLoadAdvice({ name: 'Supino reto', type: 'basico', loadGroup: 'upper', repMin: 3, repMax: 5, progress: true })
  assert.ok(advice.hit)
  assert.strictEqual(advice.weight, 102.5) // +2.5 superior
})
check('nextLoadAdvice nao incrementa se abaixo do topo', () => {
  tf.state = makeStateWithSession('Supino reto', 4, 2, 100)
  const advice = nextLoadAdvice({ name: 'Supino reto', type: 'basico', loadGroup: 'upper', repMin: 3, repMax: 5, progress: true })
  assert.ok(!advice.hit)
  assert.strictEqual(advice.weight, 100)
})
check('nextLoadAdvice exercicio tecnico (progress=false) repete carga', () => {
  tf.state = makeStateWithSession('Agachamento leve', 5, 2, 80)
  const advice = nextLoadAdvice({ name: 'Agachamento leve', type: 'acessorio', loadGroup: 'lower', repMin: 5, repMax: 5, progress: false })
  assert.ok(!advice.hit)
  assert.ok(advice.text.includes('80'))
})

// ── Deload ──
check('deloadAlerts detecta dois treinos abaixo do topo', () => {
  tf.state = initialState()
  tf.state.sessions = [
    {
      id: 's1', date: '2026-01-01', startedAt: '2026-01-01T08:00:00Z',
      finishedAt: '2026-01-01T09:00:00Z', notes: '', cardio: { done: false, minutes: 0 },
      exercises: [{ name: 'Supino reto', type: 'basico', repMax: 5, sets: [{ weight: 100, reps: 4, rir: 2, savedAt: Date.now() }] }],
    },
    {
      id: 's2', date: '2026-01-08', startedAt: '2026-01-08T08:00:00Z',
      finishedAt: '2026-01-08T09:00:00Z', notes: '', cardio: { done: false, minutes: 0 },
      exercises: [{ name: 'Supino reto', type: 'basico', repMax: 5, sets: [{ weight: 100, reps: 4, rir: 2, savedAt: Date.now() }] }],
    },
  ]
  const alerts = deloadAlerts()
  assert.strictEqual(alerts.length, 1)
  assert.strictEqual(alerts[0].name, 'Supino reto')
  assert.strictEqual(alerts[0].suggested, 90) // 10% menos de 100
})
check('deloadAlerts nao dispara se bateu o topo', () => {
  tf.state = initialState()
  tf.state.sessions = [
    {
      id: 's1', date: '2026-01-01', startedAt: '2026-01-01T08:00:00Z',
      finishedAt: '2026-01-01T09:00:00Z', notes: '', cardio: { done: false, minutes: 0 },
      exercises: [{ name: 'Supino reto', type: 'basico', repMax: 5, sets: [{ weight: 100, reps: 5, rir: 2, savedAt: Date.now() }] }],
    },
    {
      id: 's2', date: '2026-01-08', startedAt: '2026-01-08T08:00:00Z',
      finishedAt: '2026-01-08T09:00:00Z', notes: '', cardio: { done: false, minutes: 0 },
      exercises: [{ name: 'Supino reto', type: 'basico', repMax: 5, sets: [{ weight: 100, reps: 5, rir: 2, savedAt: Date.now() }] }],
    },
  ]
  const alerts = deloadAlerts()
  assert.strictEqual(alerts.length, 0)
})

// ── PR e 1RM (Epley) ──
check('prMap retorna maior carga e 1RM estimado', () => {
  tf.state = initialState()
  tf.state.sessions = [{
    id: 's1', date: '2026-01-01', startedAt: '2026-01-01T08:00:00Z',
    finishedAt: '2026-01-01T09:00:00Z', notes: '', cardio: { done: false, minutes: 0 },
    exercises: [{
      name: 'Supino reto', type: 'basico', sets: [
        { weight: 100, reps: 5, rir: 2, savedAt: Date.now() }, // 1RM ~ 116.7
        { weight: 90, reps: 8, rir: 1, savedAt: Date.now() },   // 1RM ~ 114
      ],
    }],
  }]
  const prs = prMap()
  assert.ok(prs['Supino reto'])
  assert.strictEqual(prs['Supino reto'].weight, 100)
  assert.ok(prs['Supino reto'].e1rm > 116 && prs['Supino reto'].e1rm < 117)
})

console.log(`\n${failures === 0 ? 'Todos os testes passaram' : failures + ' falha(s)'}`)
process.exit(failures === 0 ? 0 : 1)
