const appUrl = (process.env.BACKUP_APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
const secret = process.env.CRON_SECRET || '';

if (!appUrl) {
  console.error('BACKUP_APP_URL is required. Example: https://ptt-smokehouse-control.onrender.com');
  process.exit(1);
}
if (!secret || secret.length < 12) {
  console.error('CRON_SECRET is required and must be at least 12 characters.');
  process.exit(1);
}

const endpoint = `${appUrl}/api/admin/backups/weekly`;
console.log(`Running weekly backup against ${endpoint}`);
const res = await fetch(endpoint, {
  method: 'GET',
  headers: { authorization: `Bearer ${secret}` }
});
const text = await res.text();
if (!res.ok) {
  console.error(`Weekly backup failed with HTTP ${res.status}`);
  console.error(text);
  process.exit(1);
}
console.log(text);
