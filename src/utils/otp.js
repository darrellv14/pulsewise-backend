function toAsciiDigit(char) {
  const codePoint = char.codePointAt(0);

  if (codePoint >= 0x0660 && codePoint <= 0x0669) {
    return String(codePoint - 0x0660);
  }

  if (codePoint >= 0x06f0 && codePoint <= 0x06f9) {
    return String(codePoint - 0x06f0);
  }

  return char;
}

function normalizeOtp(value) {
  const normalized = String(value ?? '')
    .normalize('NFKC')
    .replace(/[\p{White_Space}\p{Cf}\p{Cc}]+/gu, '');

  return Array.from(normalized, toAsciiDigit).join('');
}

module.exports = {
  normalizeOtp,
};
