import crypto from "node:crypto";

/**
 * Password hashing via Node's built-in scrypt — no native compilation
 * required (important for Termux / constrained environments where bcrypt
 * can be painful to install). Each password gets a random salt.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,24}$/;

export function validateUsername(username) {
  const u = String(username || "").trim();
  if (!USERNAME_RE.test(u)) {
    return { ok: false, message: "نام کاربری باید ۳ تا ۲۴ کاراکتر و فقط شامل حروف انگلیسی، عدد، نقطه یا _ باشد." };
  }
  return { ok: true, value: u };
}

export function validatePassword(password) {
  const p = String(password || "");
  if (p.length < 8) return { ok: false, message: "رمز عبور باید حداقل ۸ کاراکتر باشد." };
  if (!/[a-z]/.test(p)) return { ok: false, message: "رمز عبور باید حداقل یک حرف کوچک انگلیسی داشته باشد." };
  if (!/[A-Z]/.test(p)) return { ok: false, message: "رمز عبور باید حداقل یک حرف بزرگ انگلیسی داشته باشد." };
  if (!/[0-9]/.test(p)) return { ok: false, message: "رمز عبور باید حداقل یک عدد داشته باشد." };
  if (!/[^a-zA-Z0-9]/.test(p)) return { ok: false, message: "رمز عبور باید حداقل یک نویسه خاص (!@#$...) داشته باشد." };
  return { ok: true };
}

export function validateContact({ email, phone }) {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "فرمت ایمیل معتبر نیست." };
  }
  if (phone && !/^[0-9+\-\s]{7,20}$/.test(phone)) {
    return { ok: false, message: "فرمت شماره تلفن معتبر نیست." };
  }
  return { ok: true };
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, passwordSalt, ...rest } = user;
  return rest;
}
