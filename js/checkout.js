const paymentToggle = document.querySelector('.checkout-toggle');
const paymentDetails = document.getElementById('payment-details');
const checkoutForm = document.getElementById('checkout-form');
const checkoutStatus = document.getElementById('checkout-status');

if (paymentToggle && paymentDetails) {
    const paymentInputs = paymentDetails.querySelectorAll('input');
    const setExpanded = (expanded) => {
        paymentToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        if (expanded) {
            paymentDetails.hidden = false;
            paymentDetails.classList.add('is-open');
            paymentDetails.style.maxHeight = `${paymentDetails.scrollHeight}px`;
        } else {
            paymentDetails.classList.remove('is-open');
            paymentDetails.style.maxHeight = '0px';
        }
        paymentInputs.forEach((input) => {
            input.disabled = !expanded;
        });
    };

    setExpanded(false);
    paymentToggle.addEventListener('click', () => {
        const isExpanded = paymentToggle.getAttribute('aria-expanded') === 'true';
        setExpanded(!isExpanded);
    });

    paymentDetails.addEventListener('transitionend', () => {
        if (paymentDetails.classList.contains('is-open')) {
            paymentDetails.style.maxHeight = 'none';
        } else {
            paymentDetails.hidden = true;
        }
    });
}

const setStatus = (message, isError = false) => {
    if (!checkoutStatus) {
        return;
    }
    checkoutStatus.textContent = message;
    checkoutStatus.dataset.state = isError ? 'error' : 'success';
};

const setButtonLoading = (button, isLoading) => {
    if (!button) {
        return;
    }
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Redirecting…' : 'Pay with Stripe';
};

const getCartItems = () => {
    const raw = localStorage.getItem('cart');
    if (!raw) {
        return [];
    }
    try {
        const items = JSON.parse(raw);
        if (!Array.isArray(items)) {
            return [];
        }
        return items.map((item) => ({
            id: item.id,
            size: item.size,
            quantity: item.quantity || 1
        }));
    } catch {
        return [];
    }
};

const fetchWithFallback = async (path, options) => {
    const endpoints = [path, `http://localhost:3000${path}`];
    let lastError = null;

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, options);
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || `Request failed: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Stripe API unavailable');
};

let stripeInstance = null;
const getStripe = async () => {
    if (stripeInstance) {
        return stripeInstance;
    }
    if (typeof Stripe === 'undefined') {
        throw new Error('Stripe.js failed to load');
    }
    const { publishableKey } = await fetchWithFallback('/api/stripe-key', { method: 'GET' });
    stripeInstance = Stripe(publishableKey);
    return stripeInstance;
};

const params = new URLSearchParams(window.location.search);
if (params.get('success')) {
    localStorage.removeItem('cart');
    setStatus('Payment confirmed. Thank you for your order.');
}
if (params.get('canceled')) {
    setStatus('Payment canceled. Your cart is still saved.', true);
}

if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = checkoutForm.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);

        try {
            const items = getCartItems();
            if (!items.length) {
                throw new Error('Your cart is empty.');
            }

            const shipping = {
                name: document.getElementById('name')?.value?.trim(),
                address: document.getElementById('address')?.value?.trim(),
                city: document.getElementById('city')?.value?.trim(),
                postcode: document.getElementById('postcode')?.value?.trim(),
                country: document.getElementById('country')?.value?.trim()
            };

            const payload = await fetchWithFallback('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items, shipping })
            });

            const stripe = await getStripe();
            const result = await stripe.redirectToCheckout({ sessionId: payload.id });
            if (result.error) {
                throw new Error(result.error.message);
            }
        } catch (error) {
            setStatus(error.message || 'Unable to start checkout.', true);
            setButtonLoading(submitButton, false);
        }
    });
}
