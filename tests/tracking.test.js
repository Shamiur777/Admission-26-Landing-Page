// Run: node --test tests/tracking.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, buildEvent, cleanParams, createTracker, browserAdapter } from '../assets/js/tracking.js';
import { TRACKING } from '../assets/js/config.js';

/** The second adapter: records every call instead of touching window. */
function recordingAdapter() {
  const calls = [];
  return {
    calls,
    metaInit: (id) => calls.push(['metaInit', id]),
    metaTrack: (method, name, data) => calls.push(['metaTrack', method, name, data]),
    gtmInit: (id) => calls.push(['gtmInit', id]),
    gtmPush: (obj) => calls.push(['gtmPush', obj]),
  };
}

const names = { courseClick: 'InitiateCheckout', bookClick: 'InitiateCheckout', couponCopy: 'CopyCoupon', liveClick: 'JoinLive' };
const config = { metaPixelId: '123456789012345', gtmContainerId: 'GTM-ABCD12', events: names };
const clickInfo = { id: 'c1', name: 'Course', category: 'varsity' };
const product = { content_ids: ['c1'], content_name: 'Course', content_category: 'varsity', content_type: 'product' };

test('EVENTS covers every kind named in config', () => {
  assert.deepEqual(Object.keys(EVENTS).sort(), Object.keys(TRACKING.events).sort());
  assert.deepEqual(Object.keys(EVENTS).filter((k) => EVENTS[k].click).sort(), ['bookClick', 'courseClick', 'liveClick']);
});

test('buildEvent maps each kind', () => {
  assert.deepEqual(buildEvent('courseClick', clickInfo, names),
    { kind: 'courseClick', data: product, meta: { method: 'track', name: 'InitiateCheckout' } });
  assert.equal(buildEvent('bookClick', clickInfo, names).meta.method, 'track');
  assert.deepEqual(buildEvent('liveClick', clickInfo, names).meta, { method: 'trackCustom', name: 'JoinLive' });
  assert.deepEqual(buildEvent('couponCopy', { code: 'REVENGE' }, names), {
    kind: 'couponCopy',
    data: { content_name: 'REVENGE', content_category: 'coupon', content_ids: ['REVENGE'] },
    meta: { method: 'trackCustom', name: 'CopyCoupon' },
  });
});

test('buildEvent: unknown kind is null, bad Meta name drops only Meta', () => {
  assert.equal(buildEvent('nope', {}, names), null);
  assert.equal(buildEvent('__proto__', {}, names), null);
  assert.equal(buildEvent('liveClick', clickInfo, { liveClick: 'bad name!' }).meta, null);
  assert.equal(buildEvent('liveClick', clickInfo, {}).meta, null);
});

test('cleanParams keeps only whitelisted, typed, bounded values', () => {
  const out = cleanParams({
    content_name: 'x'.repeat(300), content_ids: ['a', 5, 'b'.repeat(300)], currency: 'bdt', value: -1,
    email: 'a@b.c', phone: '0170', content_type: 'product',
  });
  assert.deepEqual(Object.keys(out).sort(), ['content_ids', 'content_name', 'content_type']);
  assert.equal(out.content_name.length, 100);
  assert.deepEqual(out.content_ids.map((s) => s.length), [1, 100]);
  assert.deepEqual(cleanParams({ currency: 'BDT', value: 10 }), { currency: 'BDT', value: 10 });
  assert.deepEqual(cleanParams({ value: NaN, content_ids: 'x' }), {});
  assert.deepEqual(cleanParams(null), {});
});

test('tracker: init then each kind produces the expected call sequence', () => {
  const a = recordingAdapter();
  const t = createTracker(a, config);
  t.init();
  t.track('courseClick', clickInfo);
  t.track('couponCopy', { code: 'REVENGE' });
  t.track('liveClick', clickInfo);
  t.track('unknown', {});
  assert.deepEqual(a.calls.map((c) => c[0]),
    ['metaInit', 'gtmInit', 'metaTrack', 'gtmPush', 'metaTrack', 'gtmPush', 'metaTrack', 'gtmPush']);
  assert.deepEqual(a.calls[0], ['metaInit', '123456789012345']);
  assert.deepEqual(a.calls[1], ['gtmInit', 'GTM-ABCD12']);
  assert.deepEqual(a.calls[2], ['metaTrack', 'track', 'InitiateCheckout', product]);
  assert.deepEqual(a.calls[3], ['gtmPush', { event: 'courseClick', ...product }]);
  assert.deepEqual(a.calls[4].slice(1, 3), ['trackCustom', 'CopyCoupon']);
  assert.deepEqual(a.calls[6].slice(1, 3), ['trackCustom', 'JoinLive']);
});

test('tracker: init is idempotent; track before init sends nothing', () => {
  const a = recordingAdapter();
  const t = createTracker(a, config);
  t.track('courseClick', clickInfo);
  assert.equal(a.calls.length, 0);
  t.init();
  t.init();
  assert.equal(a.calls.filter((c) => c[0] === 'metaInit').length, 1);
  assert.equal(a.calls.filter((c) => c[0] === 'gtmInit').length, 1);
});

test('tracker: invalid IDs load nothing and send nothing', () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    for (const [pixel, gtm] of [['12345', 'GTM-x'], ['abc', 'GTM-ABCD12/../x'], ['1234567890<', ''], [undefined, 5]]) {
      const a = recordingAdapter();
      const t = createTracker(a, { metaPixelId: pixel, gtmContainerId: gtm, events: names });
      t.init();
      t.track('courseClick', clickInfo);
      assert.deepEqual(a.calls, [], `${pixel} ${gtm}`);
    }
  } finally {
    console.warn = warn;
  }
});

test('tracker: only Meta valid sends only Meta; a throwing adapter never escapes', () => {
  const a = recordingAdapter();
  const t = createTracker(a, { ...config, gtmContainerId: '' });
  t.init();
  t.track('bookClick', clickInfo);
  assert.deepEqual(a.calls.map((c) => c[0]), ['metaInit', 'metaTrack']);
  const fail = () => { throw new Error('boom'); };
  const boom = { metaInit: fail, metaTrack: fail, gtmInit: fail, gtmPush: fail };
  const t2 = createTracker(boom, config);
  assert.doesNotThrow(() => { t2.init(); t2.track('courseClick', clickInfo); });
});

test('browserAdapter: autoConfig false before init, scripts only from the two allowed hosts', () => {
  const injected = [];
  globalThis.window = {};
  globalThis.document = {
    head: { appendChild: (el) => injected.push(el) },
    createElement: () => ({}),
  };
  try {
    const t = createTracker(browserAdapter, config);
    t.init();
    t.track('courseClick', clickInfo);
    const q = window.fbq.queue.map((args) => Array.from(args));
    assert.deepEqual(q[0], ['set', 'autoConfig', false, '123456789012345']);
    assert.deepEqual(q[1], ['init', '123456789012345']);
    assert.deepEqual(q[2], ['track', 'PageView']);
    assert.deepEqual(q[3], ['track', 'InitiateCheckout', product]);
    assert.deepEqual(window.dataLayer[1], { event: 'courseClick', ...product });
    assert.deepEqual(injected.map((s) => s.src), [
      'https://connect.facebook.net/en_US/fbevents.js',
      'https://www.googletagmanager.com/gtm.js?id=GTM-ABCD12',
    ]);
    assert.ok(injected.every((s) => s.async === true));
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
});

test('browserAdapter with invalid IDs injects nothing', () => {
  const injected = [];
  globalThis.window = {};
  globalThis.document = { head: { appendChild: (el) => injected.push(el) }, createElement: () => ({}) };
  const warn = console.warn;
  console.warn = () => {};
  try {
    createTracker(browserAdapter, { metaPixelId: 'x', gtmContainerId: 'y', events: names }).init();
    assert.equal(injected.length, 0);
    assert.equal(window.fbq, undefined);
    assert.equal(window.dataLayer, undefined);
  } finally {
    console.warn = warn;
    delete globalThis.window;
    delete globalThis.document;
  }
});
