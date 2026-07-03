// checkout.js — SANDBOX-ONLY fake payment processor.
// No real payment provider is contacted. This simulates network latency and
// validates card-shaped input client-side, purely for demo purposes.
// A well-known "always declines" test number is supported so the failure path
// is demonstrable, mirroring how real sandbox modes (e.g. Stripe test cards) work.

const DECLINE_TEST_CARD = "4000000000000002";
const PRICE_USD = 12;

export function getPriceUSD() {
  return PRICE_USD;
}

function luhnCheck(numStr) {
  const digits = numStr.replace(/\D/g, "");
  if (digits.length < 12) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * Validate sandbox card fields. Returns { valid: boolean, errors: {field: msg} }.
 */
export function validateCard({ number, expiry, cvc }) {
  const errors = {};
  const digits = (number || "").replace(/\D/g, "");

  if (!digits) {
    errors.number = "Enter a card number.";
  } else if (!luhnCheck(digits) && digits !== DECLINE_TEST_CARD.replace(/\D/g, "")) {
    errors.number = "That card number doesn't look valid (sandbox check).";
  }

  if (!expiry || !/^\d{2}\s*\/\s*\d{2}$/.test(expiry.trim())) {
    errors.expiry = "Use MM/YY format.";
  } else {
    const [mm, yy] = expiry.split("/").map((s) => parseInt(s.trim(), 10));
    if (mm < 1 || mm > 12) errors.expiry = "Month must be 01-12.";
  }

  if (!cvc || !/^\d{3,4}$/.test(cvc.trim())) {
    errors.cvc = "3-4 digit security code.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Simulate submitting a sandbox charge. Always resolves (never throws) after
 * a short artificial delay, with either a success or a decline result.
 * @returns {Promise<{ok: boolean, message: string, reference?: string}>}
 */
export function submitSandboxPayment({ number }) {
  const digits = (number || "").replace(/\D/g, "");
  const isDeclineCard = digits === DECLINE_TEST_CARD.replace(/\D/g, "");

  return new Promise((resolve) => {
    setTimeout(() => {
      if (isDeclineCard) {
        resolve({ ok: false, message: "Card declined (sandbox test card). Try a different number." });
      } else {
        const reference = "SANDBOX-" + Math.random().toString(36).slice(2, 10).toUpperCase();
        resolve({ ok: true, message: "Payment approved (sandbox).", reference });
      }
    }, 700);
  });
}

export { DECLINE_TEST_CARD };
