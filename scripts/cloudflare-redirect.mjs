// Sets up the switch that forwards https://hulkenstein.com/admission26... to the official page
// on edgecoursebd.com, as a Cloudflare Redirect Rule the owner turns on or off in the dashboard.
// Run: node --env-file=.env.cloudflare scripts/cloudflare-redirect.mjs
// The token needs Zone > Single Redirect > Edit on hulkenstein.com. It is read from the env and never printed.
// Steps: 1) a temporary rule on /admission26-redirect-test proves a redirect beats the Worker and keeps
// the query string, 2) the test rule is removed, 3) the real rule is added switched OFF.
// Safe to re-run: it replaces only rules whose description starts with "admission26".
const API = 'https://api.cloudflare.com/client/v4';
const ZONE_NAME = 'hulkenstein.com';
const PHASE = 'http_request_dynamic_redirect';
const TARGET = 'concat("https://edgecoursebd.com", http.request.uri.path)';

function redirectRule(pathPrefix, { enabled, description }) {
  return {
    description,
    enabled,
    expression: `(http.host eq "${ZONE_NAME}" and starts_with(http.request.uri.path, "${pathPrefix}"))`,
    action: 'redirect',
    action_parameters: { from_value: { status_code: 301, target_url: { expression: TARGET }, preserve_query_string: true } },
  };
}

async function cf(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success && res.status !== 404) throw new Error(`${method} ${path}: ${JSON.stringify(json.errors)}`);
  return json.success ? json.result : null;
}

async function putRules(zone, ownRules) {
  const current = await cf('GET', `/zones/${zone}/rulesets/phases/${PHASE}/entrypoint`);
  const others = (current?.rules ?? [])
    .filter((r) => !r.description?.startsWith('admission26'))
    .map(({ description, enabled, expression, action, action_parameters }) => ({ description, enabled, expression, action, action_parameters }));
  return cf('PUT', `/zones/${zone}/rulesets/phases/${PHASE}/entrypoint`, { rules: [...ownRules, ...others] });
}

{
  const [zoneInfo] = await cf('GET', `/zones?name=${ZONE_NAME}`);
  const zone = zoneInfo.id;

  console.log('1. Adding a temporary test rule on /admission26-redirect-test ...');
  await putRules(zone, [redirectRule('/admission26-redirect-test', { enabled: true, description: 'admission26 TEST (temporary)' })]);
  let location = null;
  for (let i = 0; i < 10 && !location; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`https://${ZONE_NAME}/admission26-redirect-test/?utm_source=test`, { redirect: 'manual' });
    if (res.status === 301) location = res.headers.get('location');
  }
  const expected = 'https://edgecoursebd.com/admission26-redirect-test/?utm_source=test';
  console.log(location === expected ? `   PASS: 301 to ${location}` : `   FAIL: got ${location ?? 'no redirect'}, expected ${expected}`);

  console.log('2 and 3. Removing the test rule and adding the real rule, switched OFF ...');
  await putRules(zone, [redirectRule('/admission26', { enabled: false, description: 'admission26 to edgecoursebd.com' })]);
  const res = await fetch(`https://${ZONE_NAME}/admission26/`, { redirect: 'manual' });
  console.log(`   hulkenstein.com/admission26/ now answers ${res.status} (200 = still the backup page, rule is off)`);
  console.log(location === expected ? 'Done.' : 'Test failed: the rule is saved but off. Tell Claude before turning it on.');
}
