// What an error report carries (src/lib/errorReport.js): never an email,
// a sign-in token, a key or a link's query.
globalThis.window = { location: { pathname: "/today" }, localStorage: { getItem: () => null } };
globalThis.document = { scripts: [{ src: "https://fitclub-ai.vercel.app/static/js/main.e28e7ee5.js" }] };
const { scrub, toReport, reportError } = await import("../src/lib/errorReport.js");

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got)})` : ""); };

check("emails are blanked", scrub("no account for sara.j+fit@mail.example.com") === "no account for [email]");
check("a link keeps its path, loses its query and hash", scrub("GET https://x.supabase.co/auth/v1/verify?token=abc&type=signup failed") === "GET https://x.supabase.co/auth/v1/verify failed"
  && scrub("at https://fitclub-ai.vercel.app/#access_token=eyJhbGci") === "at https://fitclub-ai.vercel.app/");
check("sign-in tokens are blanked", scrub("bad jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcDEF123_-x") === "bad jwt [token]");
check("keys are blanked", ["sb_publishable_abcdefghijk123", "sk-ant-abcdefghijklmnop", "ydc-sk-16dade666b9d88ca-90E9", "sbp_0123456789abcdef", "vcp_0123456789abcdef"].every((k) => !scrub(`key ${k} here`).includes(k.slice(4, 12))));
check("long hex ids are blanked", scrub("hash 9a8a79c8e3b0c44298fc1c149afbf4c8996fb924 end") === "hash [hex] end");
const r = toReport("render", new TypeError("Cannot read properties of undefined (reading 'items')"), "    in ChecklistPage");
check("a report names the error, where, the page and the build", r.kind === "render" && r.message === "TypeError: Cannot read properties of undefined (reading 'items')"
  && r.stack.includes("in ChecklistPage") && r.page === "/today" && r.build === "e28e7ee5", r);
check("anything thrown becomes a message", toReport("rejection", { code: "x" }).message === '{"code":"x"}' && toReport("error", "plain").message === "plain");
check("long messages are cut", toReport("error", "m".repeat(900)).message.length === 500);
check("the demo build (no backend) sends nothing", reportError("error", new Error("boom")) === false);

console.log(`error report: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
