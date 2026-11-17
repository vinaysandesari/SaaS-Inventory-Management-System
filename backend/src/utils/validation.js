const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requiredText(value, max) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

function optionalNumber(value) {
  return value === '' || value === null || value === undefined ||
    (Number.isFinite(Number(value)) && Number(value) >= 0);
}

module.exports = { emailPattern, requiredText, optionalNumber };
