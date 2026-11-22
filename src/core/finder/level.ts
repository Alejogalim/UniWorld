/**
 * The app targets high-school leavers, so a Master's / MBA / diploma / PhD is
 * not a valid Finder hit. MSci/MPharm-style integrated degrees stay allowed.
 */
const NON_BACHELOR =
  /\b(?:master\w*|magister\w*|maestr\w*|máster|msc|m\.\s?sc\.?|mba|mphil|phd|doctor\w*|diplomado|diploma|weiterbildung|postgraduate|laurea magistrale|mestrado|mag[ií]ster)\b|硕士|研究生|博士|专科/i;

export function looksNonBachelor(program: string, url?: string | null): boolean {
  return NON_BACHELOR.test(`${program} ${url ?? ''}`);
}
