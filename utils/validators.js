exports.isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
exports.isPhone = (v) => /^\+?[0-9]{9,15}$/.test(v);
exports.strongPassword = (v) => typeof v === 'string' && v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v);