const STORAGE_KEYS = {
    profile: 'accountProfile',
    tracking: 'accountTracking',
    registrations: 'registrationSubmissions',
    lastUpdated: 'accountLastUpdated'
};

const profileFields = ['fullName', 'email', 'phone', 'address', 'city', 'postcode', 'country'];

function readStorage(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) {
        return fallback;
    }
    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn('Unable to parse storage key', key, error);
        return fallback;
    }
}

function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function updateLastUpdated() {
    const timestamp = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.lastUpdated, timestamp);
    renderLastUpdated();
    return timestamp;
}

function renderLastUpdated() {
    const target = document.getElementById('account-last-updated');
    if (!target) {
        return;
    }
    const timestamp = localStorage.getItem(STORAGE_KEYS.lastUpdated);
    if (!timestamp) {
        target.textContent = 'No updates yet';
        return;
    }
    const date = new Date(timestamp);
    target.textContent = `Updated ${date.toLocaleString()}`;
}

function updateAccountHeading(fullName) {
    const title = document.getElementById('account-title');
    if (!title) {
        return;
    }
    const firstName = fullName ? String(fullName).trim().split(/\s+/)[0] : '';
    title.textContent = firstName ? `${firstName}'s Account` : 'Your Account';
}

function updateStatus(targetId, message, isError = false) {
    const target = document.getElementById(targetId);
    if (!target) {
        return;
    }
    target.textContent = message;
    target.dataset.state = isError ? 'error' : 'success';
}

function clearStatus(targetId) {
    const target = document.getElementById(targetId);
    if (!target) {
        return;
    }
    target.textContent = '';
    delete target.dataset.state;
}

function renderProfile(profile) {
    const data = profile || {};
    document.querySelectorAll('[data-field]').forEach((field) => {
        const key = field.dataset.field;
        const value = data[key];
        field.textContent = value ? value : 'Not set';
    });

    updateAccountHeading(data.fullName);

    const profileForm = document.getElementById('profile-form');
    if (!profileForm) {
        return;
    }

    profileFields.forEach((key) => {
        const input = profileForm.querySelector(`[name="${key}"]`);
        if (input) {
            input.value = data[key] || '';
        }
    });
}

function setProfileEditing(isEditing) {
    const profileForm = document.getElementById('profile-form');
    const editButton = document.getElementById('edit-profile');
    const saveButton = document.getElementById('save-profile');
    const cancelButton = document.getElementById('cancel-profile');
    const profileView = document.querySelector('[data-profile-view]');

    if (!profileForm || !editButton || !saveButton || !cancelButton || !profileView) {
        return;
    }

    profileForm.hidden = !isEditing;
    profileView.hidden = isEditing;
    editButton.hidden = isEditing;
    saveButton.hidden = !isEditing;
    cancelButton.hidden = !isEditing;
}

async function saveRegistrationToTmp(payload) {
    const endpoints = ['/api/tmp-registrations', 'http://localhost:3000/api/tmp-registrations'];
    let lastError = null;

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Registration API unavailable at ${endpoint}`);
            }
            return response.json();
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Registration API unavailable');
}

function initRegistration() {
    const form = document.getElementById('registration-form');
    if (!form) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearStatus('registration-status');

        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        payload.createdAt = new Date().toISOString();

        const registrations = readStorage(STORAGE_KEYS.registrations, []);
        registrations.unshift(payload);
        writeStorage(STORAGE_KEYS.registrations, registrations);
        writeStorage(STORAGE_KEYS.profile, payload);

        renderProfile(payload);
        updateLastUpdated();
        form.reset();

        try {
            await saveRegistrationToTmp(payload);
            updateStatus('registration-status', 'Saved locally and queued to tmp folder.');
        } catch (error) {
            console.warn(error);
            updateStatus('registration-status', 'Saved locally. Start the API to write to tmp folder.', true);
        }
    });
}

function initProfile() {
    const profile = readStorage(STORAGE_KEYS.profile, null);
    renderProfile(profile);

    const editButton = document.getElementById('edit-profile');
    const cancelButton = document.getElementById('cancel-profile');
    const deleteButton = document.getElementById('delete-profile');
    const profileForm = document.getElementById('profile-form');

    if (editButton) {
        editButton.addEventListener('click', () => {
            clearStatus('profile-status');
            setProfileEditing(true);
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            clearStatus('profile-status');
            setProfileEditing(false);
            renderProfile(readStorage(STORAGE_KEYS.profile, null));
        });
    }

    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            const ok = window.confirm('Delete your account details and tracking history?');
            if (!ok) {
                return;
            }
            localStorage.removeItem(STORAGE_KEYS.profile);
            localStorage.removeItem(STORAGE_KEYS.tracking);
            localStorage.removeItem(STORAGE_KEYS.lastUpdated);
            renderProfile(null);
            renderTracking(readStorage(STORAGE_KEYS.tracking, { shipments: [], returns: [] }));
            renderLastUpdated();
            setProfileEditing(false);
            updateStatus('profile-status', 'Account details removed.');
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(profileForm);
            const payload = Object.fromEntries(formData.entries());
            writeStorage(STORAGE_KEYS.profile, payload);
            renderProfile(payload);
            updateLastUpdated();
            setProfileEditing(false);
            updateStatus('profile-status', 'Profile updated.');
        });
    }
}

function formatCarrier(carrier) {
    if (!carrier) {
        return 'Carrier';
    }
    const normalized = String(carrier).toLowerCase();
    const labels = {
        royalmail: 'Royal Mail',
        dpd: 'DPD',
        dhl: 'DHL'
    };
    return labels[normalized] || normalized.replace(/^\w/, (char) => char.toUpperCase());
}

function renderTrackingList(list, items, emptyCopy, listType) {
    if (!list) {
        return;
    }
    list.innerHTML = '';

    if (!items.length) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'tracking-empty';
        emptyItem.textContent = emptyCopy;
        list.appendChild(emptyItem);
        return;
    }

    items.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'tracking-item';

        const meta = document.createElement('div');
        meta.className = 'tracking-meta';
        meta.innerHTML = `
            <strong>${item.trackingNumber}</strong>
            <span>${formatCarrier(item.carrier)} • ${new Date(item.createdAt).toLocaleDateString()}</span>
        `;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'account-button account-button--ghost';
        button.textContent = 'Remove';
        button.addEventListener('click', () => {
            removeTracking(item.id, listType);
        });

        li.appendChild(meta);
        li.appendChild(button);
        list.appendChild(li);
    });
}

function renderTracking(tracking) {
    const data = tracking || { shipments: [], returns: [] };
    renderTrackingList(document.getElementById('shipment-list'), data.shipments || [], 'No parcels added yet.', 'shipments');
    renderTrackingList(document.getElementById('return-list'), data.returns || [], 'No returns added yet.', 'returns');
}

function removeTracking(id, type) {
    const tracking = readStorage(STORAGE_KEYS.tracking, { shipments: [], returns: [] });
    if (type === 'shipments') {
        tracking.shipments = tracking.shipments.filter((item) => item.id !== id);
    } else {
        tracking.returns = tracking.returns.filter((item) => item.id !== id);
    }
    writeStorage(STORAGE_KEYS.tracking, tracking);
    renderTracking(tracking);
    updateLastUpdated();
}

function addTrackingEntry(type, formId, statusId) {
    const form = document.getElementById(formId);
    if (!form) {
        return;
    }
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearStatus(statusId);

        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        if (!payload.trackingNumber) {
            updateStatus(statusId, 'Add a tracking number.', true);
            return;
        }

        const tracking = readStorage(STORAGE_KEYS.tracking, { shipments: [], returns: [] });
        if (!Array.isArray(tracking[type])) {
            tracking[type] = [];
        }
        const entry = {
            id: Date.now(),
            type,
            carrier: payload.carrier,
            trackingNumber: payload.trackingNumber.trim(),
            createdAt: new Date().toISOString()
        };

        tracking[type].unshift(entry);
        writeStorage(STORAGE_KEYS.tracking, tracking);
        renderTracking(tracking);
        updateLastUpdated();
        form.reset();
        updateStatus(statusId, 'Tracking added.');
    });
}

function initTracking() {
    const tracking = readStorage(STORAGE_KEYS.tracking, { shipments: [], returns: [] });
    renderTracking(tracking);
    addTrackingEntry('shipments', 'shipment-form', 'shipment-status');
    addTrackingEntry('returns', 'return-form', 'return-status');
}

renderLastUpdated();
initRegistration();
initProfile();
initTracking();
