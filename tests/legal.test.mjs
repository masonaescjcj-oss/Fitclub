// The privacy policy and terms: their public addresses, and both languages
// saying the same things.
const { LEGAL, LEGAL_UPDATED, legalFromPath } = await import('../src/lib/legal.js');

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log('✗', name, got !== undefined ? `(got ${JSON.stringify(got)})` : ''); };

check('/privacy opens the privacy policy', legalFromPath('/privacy') === 'privacy');
check('/terms opens the terms', legalFromPath('/terms') === 'terms');
check('a trailing slash or capitals still work', legalFromPath('/Privacy/') === 'privacy' && legalFromPath('/TERMS') === 'terms');
check('anything else is not a legal page', [null, '', '/', '/privacy-x', '/app/terms'].every((p) => legalFromPath(p) === null));
check('both languages carry an update date', !!LEGAL_UPDATED.en && !!LEGAL_UPDATED.fa);

for (const kind of ['privacy', 'terms']) {
  const { en, fa } = LEGAL[kind];
  check(`${kind}: a title and a lead in both languages`, !!(en.title && en.lead && fa.title && fa.lead));
  check(`${kind}: the same sections in both languages`, en.sections.length === fa.sections.length && en.sections.length > 0, [en.sections.length, fa.sections.length]);
  check(`${kind}: the same number of paragraphs in each section`,
    en.sections.every((s, i) => s.p.length === fa.sections[i].p.length), en.sections.map((s, i) => [s.p.length, fa.sections[i].p.length]));
  check(`${kind}: no empty heading or paragraph`, [...en.sections, ...fa.sections].every((s) => s.h && s.p.every((x) => x.trim().length > 20)));
}
const privacy = JSON.stringify(LEGAL.privacy);
check('the privacy policy names every service that handles data', ['Supabase', 'Vercel', 'You.com', 'Anthropic'].every((s) => privacy.includes(s)));
check('the terms carry the health notice first', LEGAL.terms.en.sections[0].h === 'Health notice');

console.log(`legal: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
