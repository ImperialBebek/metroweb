const th = [[6.933,78.3],[6.983,59.5],[7.017,49.7],[7.067,37.4],[7.117,26.6],[7.183,18.4],[7.25,8.3],[7.30,3.9],[7.333,1.3],[7.4,0],[7.5,0]];
const ot = [[6.933,818],[6.983,633],[7.017,529],[7.067,405],[7.117,309],[7.183,237],[7.25,150],[7.3,114],[7.333,94],[7.367,86],[7.383,72],[7.417,65],[7.433,54],[7.467,48],[7.5,40],[7.517,36],[7.55,29],[7.567,23],[7.6,21],[7.633,16],[7.65,14],[7.683,11],[7.717,8],[7.75,6],[7.783,4],[7.817,1],[7.85,0],[7.9,0]];
const os = [[7.283,169],[7.317,142],[7.35,118],[7.383,89],[7.417,81],[7.45,66],[7.483,60],[7.517,44],[7.55,36],[7.583,28],[7.617,25],[7.65,17],[7.683,13],[7.717,9],[7.75,7],[7.783,4],[7.817,2],[7.85,0],[7.9,0]];
const eases = {
  expo: (k) => (x) => (1 - Math.exp(-k * x)) / (1 - Math.exp(-k)),
  pow: (n) => (x) => 1 - Math.pow(1 - x, n),
};
function fit(data, name, ks, v0s, t0s) {
  let best = null;
  for (const [fam, mk] of Object.entries(eases)) for (const k of ks[fam]) {
    const E = mk(k);
    for (const t0 of t0s) for (let D = 0.2; D <= 1.6; D += 0.01) for (const v0 of v0s) {
      let err = 0;
      for (const [t, v] of data) {
        const x = Math.min(1, Math.max(0, (t - t0) / D));
        const p = v0 * (1 - E(x));
        err += (p - v) ** 2;
      }
      if (!best || err < best.err) best = { fam, k, t0: +t0.toFixed(3), D: +D.toFixed(2), v0, err };
    }
  }
  const per = {};
  for (const [fam, mk] of Object.entries(eases)) for (const k of ks[fam]) {
    const E = mk(k); let b = null;
    for (const t0 of t0s) for (let D = 0.2; D <= 1.6; D += 0.01) for (const v0 of v0s) {
      let err = 0;
      for (const [t, v] of data) { const x = Math.min(1, Math.max(0, (t - t0) / D)); err += (v0 * (1 - E(x)) - v) ** 2; }
      if (!b || err < b.err) b = { t0: +t0.toFixed(3), D: +D.toFixed(2), v0, err, rms: +Math.sqrt(err / data.length).toFixed(2) };
    }
    delete b.err; per[fam + k] = b;
  }
  console.log(name); for (const [k2, v] of Object.entries(per)) console.log('  ', k2, JSON.stringify(v));
}
const range = (a, b, s) => { const r = []; for (let x = a; x <= b + 1e-9; x += s) r.push(+x.toFixed(4)); return r; };
const ks = { expo: [2, 3, 4, 5, 6, 7, 8], pow: [2, 3, 4, 5] };
fit(th, 'theta', ks, range(70, 95, 2.5), range(6.80, 6.95, 0.01));
fit(ot, 'titleOffset', ks, range(700, 1400, 25), range(6.80, 6.95, 0.01));
fit(os, 'sectionOffsetFlat', ks, range(700, 1800, 50), range(6.80, 6.95, 0.01));
