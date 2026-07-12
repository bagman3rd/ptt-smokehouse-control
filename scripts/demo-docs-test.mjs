import fs from 'node:fs';

const required = [
  ['app/tour/page.tsx', 'Today Command Center'],
  ['app/tour/page.tsx', 'Daily operating loop'],
  ['app/sales/page.tsx', 'Prevent sellouts'],
  ['app/sales/page.tsx', 'Forecast Proof'],
  ['app/help/page.tsx', 'What if Wi-Fi fails during EOD?'],
  ['app/help/page.tsx', 'How do I add smokers?'],
  ['app/demo/page.tsx', '90 days of fake EOD history'],
  ['docs/archive/DOCUMENTATION_AND_DEMO_BUILD_5_4_0.md', 'Build 5.4.0']
];

for (const [path, needle] of required) {
  const text = fs.readFileSync(path, 'utf8');
  if (!text.includes(needle)) {
    console.error(`Build 5.4.0 demo/docs test failed: ${path} missing ${needle}`);
    process.exit(1);
  }
}
console.log('Build 5.4.0 demo/docs checks completed.');
