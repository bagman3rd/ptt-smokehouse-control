export const scenarios = [
  { name: 'Conservative weekday', sales: 13000, meat: 31, labor: 25 },
  { name: 'Normal weekend', sales: 20000, meat: 30, labor: 23 },
  { name: 'Peak event day', sales: 28000, meat: 29, labor: 22 }
];

export const checks = [
  ['Pit', 'Brisket load verified'],
  ['Pit', 'Pork shoulder load verified'],
  ['Holding', 'Hot box above 140°F'],
  ['Expo', 'Sauce, pickles, onions stocked'],
  ['Front', 'Register and online ordering tested'],
  ['Close', 'Waste, labor, and sales entered']
];
