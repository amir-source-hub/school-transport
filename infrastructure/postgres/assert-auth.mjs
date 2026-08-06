import { readFileSync } from 'node:fs';

const [path] = process.argv.slice(2);
if (!path) throw new Error('usage: node assert-auth.mjs <pg_hba.conf>');

const rules = readFileSync(path, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.replace(/#.*$/, '').trim())
  .filter(Boolean)
  .map((line) => line.split(/\s+/));

function method(rule) {
  return rule[0] === 'local' ? rule[3] : rule[4];
}

if (rules.length === 0) throw new Error('pg_hba.conf has no active rules');
if (rules.some((rule) => method(rule) === 'trust')) {
  throw new Error('pg_hba.conf must not contain an active trust rule');
}
if (rules.some((rule) => !['scram-sha-256', 'reject'].includes(method(rule)))) {
  throw new Error('pg_hba.conf contains an unapproved authentication method');
}

const hosts = rules.filter((rule) => rule[0].startsWith('host'));
if (hosts.length < 2 || hosts.some((rule) => method(rule) !== 'scram-sha-256')) {
  throw new Error('all IPv4/IPv6 host rules must require scram-sha-256');
}
if (rules.filter((rule) => rule[0] === 'local').some((rule) => method(rule) !== 'scram-sha-256')) {
  throw new Error('all local rules must require scram-sha-256');
}

console.log(`validated ${rules.length} PostgreSQL client-authentication rules`);
