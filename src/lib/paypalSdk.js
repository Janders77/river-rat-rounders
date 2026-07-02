let loadPromise = null;

export function loadPaypalSdk() {
  if (window.paypal) return Promise.resolve(window.paypal);
  if (loadPromise) return loadPromise;

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  if (!clientId) {
    return Promise.reject(new Error("PayPal is not configured (missing VITE_PAYPAL_CLIENT_ID)"));
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
    script.onload = () => resolve(window.paypal);
    script.onerror = () => reject(new Error("Failed to load the PayPal SDK"));
    document.body.appendChild(script);
  });

  return loadPromise;
}
