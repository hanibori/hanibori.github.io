global.window = global;
require('../js/lunar-data.js');
const S = require('../js/saju.js');
require('../js/fortune.js');
require('../js/themes.js');
const T = global.Themes;
let bad = 0, n = 0;
const charts = [];
for (const y of [1952, 1975, 1988, 1999, 2004, 2012, 2020]) {
  for (const g of ['m', 'f']) {
    charts.push(S.build({ year: y, month: (y % 12) + 1, day: 18, hour: (y % 24), minute: 0, gender: g, calendar: 'solar' }));
    charts.push(S.build({ year: y, month: (y % 12) + 1, day: 18, hour: null, minute: 0, gender: g, calendar: 'solar' }));
  }
}
T.list.forEach(t => {
  if (t.href) return;
  charts.forEach(c => {
    const s = T.intro(t, c); n++;
    if (/undefined|NaN|\[object/.test(s)) { bad++; console.log('BAD', t.key, c.input.year, c.input.gender, s); }
  });
});
console.log('checked', n, 'bad', bad);
