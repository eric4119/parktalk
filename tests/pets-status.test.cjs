const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'pets.js'), 'utf8');
const DAY = 24 * 60 * 60 * 1000;

function petApp(initial, start) {
  let now = start;
  const values = new Map([['parktalk-pets-v1', JSON.stringify({ demo: initial })]]);
  const listeners = {};
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const view = { innerHTML: '' };
  const document = {
    addEventListener(type, listener) { (listeners[type] ||= []).push(listener); },
    querySelector() { return view; }
  };
  const window = {
    ParkAuth: { id: () => 'demo', role: () => 'cast' },
    scrollTo() {}
  };
  vm.runInNewContext(source, {
    window, document, Date: ClockDate,
    localStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value)
    },
    setTimeout: () => 1,
    clearTimeout() {}
  });
  return {
    render: () => window.ParkPets.render(),
    advance: ms => { now += ms; },
    state: () => JSON.parse(values.get('parktalk-pets-v1')).demo,
    act: type => listeners.click[0]({target:{closest:()=>({dataset:{petAction:type}})}}),
    feed: () => listeners.click[0]({
      target: { dataset: { petAction: 'feed' }, closest: () => ({ dataset: { petAction: 'feed' } }) }
    })
  };
}

test('pet status decreases only after complete 24-hour periods and preserves leftover hours', () => {
  const now = Date.parse('2026-11-23T12:00:00Z');
  const app = petApp({ animal: 'panda', name: '콩이', hunger: 80, mood: 70, lastCare: now - 2.5 * DAY }, now);
  app.render();
  assert.equal(app.state().hunger, 60);
  assert.equal(app.state().mood, 60);
  app.advance(DAY / 2);
  app.render();
  assert.equal(app.state().hunger, 50);
  assert.equal(app.state().mood, 55);
});

test('pet status stops at 30 and feeding does not restart the daily timer', () => {
  const now = Date.parse('2026-11-23T12:00:00Z');
  const app = petApp({ animal: 'panda', name: '콩이', hunger: 35, mood: 31, lastStatusAt: now - 20 * DAY }, now);
  app.render();
  assert.equal(app.state().hunger, 30);
  assert.equal(app.state().mood, 30);
  app.advance(DAY / 2);
  app.feed();
  assert.equal(app.state().hunger, 48);
  app.advance(DAY / 2);
  app.render();
  assert.equal(app.state().hunger, 38);
  assert.equal(app.state().mood, 30);
});


test('care reactions expire after ten seconds and sleeping survives until wake or deadline', () => {
  const now = Date.parse('2026-11-23T12:00:00Z');
  const initial = { animal: 'panda', name: '콩이', hunger: 50, mood: 50, lastStatusAt: now, furniture: ['bed'] };
  const app = petApp(initial, now);
  for (const action of ['feed', 'play', 'pet']) {
    app.act(action);
    assert.equal(app.state().action, action);
    app.advance(9999); app.render();
    assert.equal(app.state().action, action);
    app.advance(1); const html = app.render();
    assert.equal(app.state().action, '');
    assert.ok(!html.includes('class="pet-notice"'));
  }
  app.act('sleep');
  assert.ok([1,3,5].includes(app.state().sleepHours));
  const sleeping = app.state();
  const reopened = petApp(sleeping, now + 40000);
  assert.ok(reopened.render().includes('pet-sleeping'));
  reopened.act('feed');
  assert.equal(reopened.state().action, 'sleep');
  reopened.act('wake');
  assert.equal(reopened.state().action, '');
  const expired = petApp(sleeping, sleeping.sleepUntil);
  expired.render();
  assert.equal(expired.state().action, '');
});
