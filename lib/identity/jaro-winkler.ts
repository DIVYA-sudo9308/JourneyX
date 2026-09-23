/**
 * Jaro-Winkler similarity (TRD §7.7). Used only as a *supporting* signal for
 * probabilistic matching — a name never generates a candidate on its own
 * (SoT §4.6 step 2).
 */
export function jaroWinkler(a: string, b: string): number {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  const jaro = jaroSimilarity(s1, s2);
  if (jaro === 0) return 0;

  // Winkler bonus: up to 4 leading characters, scaling factor 0.1.
  let prefix = 0;
  const max = Math.min(4, s1.length, s2.length);
  while (prefix < max && s1[prefix] === s2[prefix]) prefix += 1;

  return jaro + prefix * 0.1 * (1 - jaro);
}

function jaroSimilarity(s1: string, s2: string): number {
  const matchWindow = Math.max(0, Math.floor(Math.max(s1.length, s2.length) / 2) - 1);
  const s1Matches = new Array<boolean>(s1.length).fill(false);
  const s2Matches = new Array<boolean>(s2.length).fill(false);

  let matches = 0;
  for (let i = 0; i < s1.length; i += 1) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    for (let j = start; j < end; j += 1) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches += 1;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < s1.length; i += 1) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k += 1;
    if (s1[i] !== s2[k]) transpositions += 1;
    k += 1;
  }

  return (
    (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3
  );
}
