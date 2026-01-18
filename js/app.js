// Load products and populate the grid
let products = [];
let currentProductIndex = 0;

// Simple cart functionality
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
let productModal = null;
let productModalElements = null;
const productModalState = {
    productId: null,
    productName: '',
    images: [],
    index: 0
};

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function showCartToast(productName) {
    const name = productName || 'Product';
    let toast = document.getElementById('cart-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'cart-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }
    toast.textContent = `${name} is added to the basket.`;
    toast.classList.add('is-visible');
    window.clearTimeout(showCartToast.hideTimer);
    showCartToast.hideTimer = window.setTimeout(() => {
        toast.classList.remove('is-visible');
    }, 2200);
}

function getProductDescription(product) {
    if (product.description) {
        return product.description;
    }
    if (product.type === 'hoodie') {
        return 'A heavyweight hoodie with a soft brushed interior, built for warmth and structure. The artwork is laid in with precise line work so the graphic stays crisp through everyday wear.';
    }
    return 'A smooth cotton-blend tee with a clean drape and soft hand feel. The print is layered carefully for sharp detail and lasting color through repeated washes.';
}

function buildGalleryCandidates(product) {
    if (Array.isArray(product.gallery) && product.gallery.length) {
        const list = product.gallery.slice();
        if (!list.includes(product.image)) {
            list.unshift(product.image);
        }
        return list;
    }
    const folder = `images/gallery/${product.id}`;
    const candidates = [product.image];
    for (let i = 1; i <= 4; i += 1) {
        candidates.push(`${folder}/${i}.jpg`);
        candidates.push(`${folder}/${i}.png`);
    }
    return [...new Set(candidates)];
}

function loadGalleryImages(candidates) {
    const unique = [...new Set(candidates)];
    return Promise.all(
        unique.map((src) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => resolve(null);
            img.src = src;
        }))
    ).then((results) => results.filter(Boolean));
}

function updateProductModalImage() {
    if (!productModalElements) {
        return;
    }
    const images = productModalState.images;
    if (!images.length) {
        return;
    }
    const index = productModalState.index % images.length;
    const src = images[index];
    productModalElements.image.src = src;
    productModalElements.image.alt = `${productModalState.productName} image ${index + 1}`;
    const hasMultiple = images.length > 1;
    productModalElements.prev.disabled = !hasMultiple;
    productModalElements.next.disabled = !hasMultiple;
    productModalElements.prev.classList.toggle('is-disabled', !hasMultiple);
    productModalElements.next.classList.toggle('is-disabled', !hasMultiple);
}

function stepProductGallery(step) {
    const count = productModalState.images.length;
    if (count < 2) {
        return;
    }
    productModalState.index = (productModalState.index + step + count) % count;
    updateProductModalImage();
}

function closeProductModal() {
    if (!productModal) {
        return;
    }
    productModal.classList.remove('is-open');
    productModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
}

function ensureProductModal() {
    if (productModal) {
        return;
    }
    productModal = document.createElement('div');
    productModal.id = 'product-modal';
    productModal.className = 'product-modal';
    productModal.setAttribute('aria-hidden', 'true');
    productModal.innerHTML = `
        <div class="product-modal-content" role="dialog" aria-modal="true" aria-label="Product details">
            <div class="product-modal-gallery">
                <button class="product-modal-close" type="button" aria-label="Close">×</button>
                <button class="product-modal-arrow product-modal-arrow--prev" type="button" aria-label="Previous image">‹</button>
                <img class="product-modal-image" alt="">
                <button class="product-modal-arrow product-modal-arrow--next" type="button" aria-label="Next image">›</button>
            </div>
            <div class="product-modal-details">
                <h2 class="product-modal-title"></h2>
                <p class="product-modal-price"></p>
                <p class="product-modal-description"></p>
                <div class="product-modal-actions">
                    <select class="product-modal-size" aria-label="Select size"></select>
                    <button class="product-modal-buy" type="button">Buy 🛒</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(productModal);

    const content = productModal.querySelector('.product-modal-content');
    productModalElements = {
        close: productModal.querySelector('.product-modal-close'),
        prev: productModal.querySelector('.product-modal-arrow--prev'),
        next: productModal.querySelector('.product-modal-arrow--next'),
        image: productModal.querySelector('.product-modal-image'),
        title: productModal.querySelector('.product-modal-title'),
        price: productModal.querySelector('.product-modal-price'),
        description: productModal.querySelector('.product-modal-description'),
        sizeSelect: productModal.querySelector('.product-modal-size'),
        buyButton: productModal.querySelector('.product-modal-buy'),
        gallery: productModal.querySelector('.product-modal-gallery'),
        content
    };

    productModal.addEventListener('click', (event) => {
        if (event.target === productModal) {
            closeProductModal();
        }
    });

    productModalElements.close.addEventListener('click', closeProductModal);
    productModalElements.prev.addEventListener('click', () => stepProductGallery(-1));
    productModalElements.next.addEventListener('click', () => stepProductGallery(1));

    let startX = 0;
    let startY = 0;
    let isTracking = false;
    const handleSwipeEnd = (endX, endY) => {
        if (!isTracking) {
            return;
        }
        isTracking = false;
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        if (Math.abs(deltaX) < 25 || Math.abs(deltaX) < Math.abs(deltaY)) {
            return;
        }
        stepProductGallery(deltaX < 0 ? 1 : -1);
    };

    if ('PointerEvent' in window) {
        productModalElements.gallery.addEventListener('pointerdown', (event) => {
            if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
                return;
            }
            startX = event.clientX;
            startY = event.clientY;
            isTracking = true;
        });

        productModalElements.gallery.addEventListener('pointerup', (event) => {
            if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
                return;
            }
            handleSwipeEnd(event.clientX, event.clientY);
        });

        productModalElements.gallery.addEventListener('pointercancel', () => {
            isTracking = false;
        });
    } else {
        productModalElements.gallery.addEventListener('touchstart', (event) => {
            if (event.touches.length !== 1) {
                return;
            }
            const touch = event.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            isTracking = true;
        }, { passive: true });

        productModalElements.gallery.addEventListener('touchend', (event) => {
            if (!event.changedTouches.length) {
                return;
            }
            const touch = event.changedTouches[0];
            handleSwipeEnd(touch.clientX, touch.clientY);
        });

        productModalElements.gallery.addEventListener('touchcancel', () => {
            isTracking = false;
        });
    }

    document.addEventListener('keydown', (event) => {
        if (!productModal.classList.contains('is-open')) {
            return;
        }
        if (event.key === 'Escape') {
            closeProductModal();
        }
        if (event.key === 'ArrowLeft') {
            stepProductGallery(-1);
        }
        if (event.key === 'ArrowRight') {
            stepProductGallery(1);
        }
    });
}

function openProductModal(product) {
    ensureProductModal();
    closeSizeMenus();
    productModalState.productId = product.id;
    productModalState.productName = product.name;
    productModalState.images = [product.image];
    productModalState.index = 0;

    productModalElements.title.textContent = product.name;
    productModalElements.price.textContent = `£${product.price}`;
    productModalElements.description.textContent = getProductDescription(product);
    productModalElements.sizeSelect.innerHTML = '';
    product.sizes.forEach((size) => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        productModalElements.sizeSelect.appendChild(option);
    });
    productModalElements.buyButton.onclick = () => {
        const size = productModalElements.sizeSelect.value || product.sizes[0];
        addToCart(product.id, product.name, product.price, size);
    };

    updateProductModalImage();

    productModal.classList.add('is-open');
    productModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    const candidates = buildGalleryCandidates(product);
    loadGalleryImages(candidates).then((images) => {
        if (!productModal.classList.contains('is-open') || productModalState.productId !== product.id) {
            return;
        }
        productModalState.images = images.length ? images : [product.image];
        productModalState.index = 0;
        updateProductModalImage();
    });
}

async function loadProducts() {
    try {
        const response = await fetch('data/products.json');
        products = await response.json();
        populateGrid();
        updateHero();
        populateHeroThumbnails();
        updateCartButton();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Update hero section
function updateHero() {
    if (!products.length) {
        return;
    }
    const product = products[currentProductIndex];
    const hero = document.getElementById('hero');
    hero.style.backgroundImage = `url(${product.image})`;
    document.getElementById('product-name').textContent = product.name;
    const materialElement = document.getElementById('product-material');
    if (materialElement) {
        materialElement.textContent = getMaterialDescription(product);
    }
    document.getElementById('product-price').textContent = `£${product.price}`;
    const sizeSelect = document.getElementById('size-select');
    sizeSelect.innerHTML = '';
    product.sizes.forEach(size => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        sizeSelect.appendChild(option);
    });
    updateHeroThumbs();
}

function populateHeroThumbnails() {
    const heroThumbs = document.getElementById('hero-thumbnails');
    if (!heroThumbs) {
        return;
    }
    heroThumbs.innerHTML = '';
    products.forEach((product, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hero-thumb';
        button.setAttribute('role', 'listitem');
        button.setAttribute('aria-label', `View ${product.name}`);

        const image = document.createElement('img');
        image.className = 'hero-thumb-image';
        image.src = product.image;
        image.alt = product.name;
        image.onerror = function() {
            this.src = 'https://via.placeholder.com/80?text=No+Image';
        };

        const label = document.createElement('span');
        label.className = 'hero-thumb-label';
        label.textContent = getHeroLabel(product);

        button.appendChild(image);
        button.appendChild(label);
        button.addEventListener('click', () => {
            currentProductIndex = index;
            updateHero();
        });

        heroThumbs.appendChild(button);
    });
    updateHeroThumbs();
}

function updateHeroThumbs() {
    const heroThumbs = document.querySelectorAll('.hero-thumb');
    if (!heroThumbs.length) {
        return;
    }
    heroThumbs.forEach((thumb, index) => {
        const isActive = index === currentProductIndex;
        thumb.classList.toggle('is-active', isActive);
        if (isActive) {
            thumb.setAttribute('aria-current', 'true');
        } else {
            thumb.removeAttribute('aria-current');
        }
    });
}

function getHeroLabel(product) {
    const designMatch = product.name.match(/Design\s*\d+/i);
    const designLabel = designMatch ? designMatch[0] : '';
    const typeLabel = product.type
        ? product.type.charAt(0).toUpperCase() + product.type.slice(1)
        : '';
    const label = [typeLabel, designLabel].filter(Boolean).join(' ');
    return label || product.name;
}

function getMaterialDescription(product) {
    if (product.type === 'hoodie') {
        return 'Polyester 20% Cotton 80%';
    }
    return 'Polyester 30% Cotton 70%';
}

function closeSizeMenus(exceptId) {
    document.querySelectorAll('.size-menu').forEach((menu) => {
        if (exceptId && menu.id === exceptId) {
            return;
        }
        menu.hidden = true;
        const button = menu.closest('.product-card')?.querySelector('.buy-button');
        if (button) {
            button.setAttribute('aria-expanded', 'false');
        }
    });
}

// Populate product grid
function populateGrid() {
    const productGrid = document.getElementById('product-grid');
    productGrid.innerHTML = '';
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';

        const image = document.createElement('img');
        image.className = 'product-card-image';
        image.src = product.image;
        image.alt = product.name;
        image.onerror = function() {
            this.src = 'https://via.placeholder.com/250x200?text=No+Image';
        };
        image.setAttribute('role', 'button');
        image.setAttribute('tabindex', '0');
        image.setAttribute('aria-label', `Open ${product.name} details`);
        image.addEventListener('click', () => {
            openProductModal(product);
        });
        image.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openProductModal(product);
            }
        });

        const content = document.createElement('div');
        content.className = 'content';

        const title = document.createElement('h3');
        title.textContent = product.name;

        const material = document.createElement('p');
        material.className = 'product-material';
        material.textContent = getMaterialDescription(product);

        const price = document.createElement('p');
        price.className = 'product-price';
        price.textContent = `£${product.price}`;

        const buyButton = document.createElement('button');
        buyButton.type = 'button';
        buyButton.className = 'buy-button';
        buyButton.textContent = 'Buy';
        buyButton.setAttribute('aria-expanded', 'false');

        const sizeMenu = document.createElement('div');
        sizeMenu.className = 'size-menu';
        sizeMenu.hidden = true;
        sizeMenu.id = `size-menu-${product.id}`;
        buyButton.setAttribute('aria-controls', sizeMenu.id);

        product.sizes.forEach((size) => {
            const sizeButton = document.createElement('button');
            sizeButton.type = 'button';
            sizeButton.className = 'size-option';
            sizeButton.textContent = size;
            sizeButton.addEventListener('click', () => {
                addToCart(product.id, product.name, product.price, size);
                sizeMenu.hidden = true;
                buyButton.setAttribute('aria-expanded', 'false');
            });
            sizeMenu.appendChild(sizeButton);
        });

        buyButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const isOpen = !sizeMenu.hidden;
            closeSizeMenus(sizeMenu.id);
            sizeMenu.hidden = isOpen;
            buyButton.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        });

        content.appendChild(title);
        content.appendChild(material);
        content.appendChild(price);
        content.appendChild(buyButton);
        content.appendChild(sizeMenu);

        productCard.appendChild(image);
        productCard.appendChild(content);
        productGrid.appendChild(productCard);
    });
}

function addToCart(id, name, price, size) {
    cart.push({ id, name, price, size });
    cartTotal += price;
    updateCartButton();
    saveCart();
    showCartToast(name);
}

function updateCartButton() {
    const cartButton = document.getElementById('cart-button');
    cartButton.textContent = `Cart (${cart.length})`;
}

function updateCartModal() {
    const cartItems = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');

    cartItems.innerHTML = '';
    cart.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';

        const info = document.createElement('span');
        info.className = 'cart-item-info';
        info.textContent = `${item.name} - Size: ${item.size} - £${item.price.toFixed(2)}`;

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'cart-remove';
        removeButton.setAttribute('aria-label', `Remove ${item.name}`);
        removeButton.textContent = '×';
        removeButton.addEventListener('click', () => {
            removeFromCart(index);
        });

        itemElement.appendChild(info);
        itemElement.appendChild(removeButton);
        cartItems.appendChild(itemElement);
    });

    cartTotalElement.textContent = cartTotal.toFixed(2);
}

function removeFromCart(index) {
    const item = cart[index];
    if (!item) {
        return;
    }
    cart.splice(index, 1);
    cartTotal = cart.reduce((sum, entry) => sum + entry.price, 0);
    updateCartButton();
    saveCart();
    updateCartModal();
}

function initHeroSwipe() {
    const hero = document.getElementById('hero');
    if (!hero) {
        return;
    }

    const isMobileView = () => window.matchMedia('(max-width: 768px)').matches;

    let startX = 0;
    let startY = 0;
    let isTracking = false;

    const handleSwipeEnd = (deltaX, deltaY) => {
        if (!isMobileView()) {
            return;
        }
        if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
            return;
        }
        if (!products.length) {
            return;
        }
        currentProductIndex = deltaX < 0
            ? (currentProductIndex + 1) % products.length
            : (currentProductIndex - 1 + products.length) % products.length;
        updateHero();
    };

    if ('PointerEvent' in window) {
        hero.addEventListener('pointerdown', (event) => {
            if (!isMobileView()) {
                return;
            }
            if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
                return;
            }
            startX = event.clientX;
            startY = event.clientY;
            isTracking = true;
        });

        hero.addEventListener('pointerup', (event) => {
            if (!isTracking || (event.pointerType !== 'touch' && event.pointerType !== 'pen')) {
                return;
            }
            isTracking = false;
            handleSwipeEnd(event.clientX - startX, event.clientY - startY);
        });

        hero.addEventListener('pointercancel', () => {
            isTracking = false;
        });
    } else {
        hero.addEventListener('touchstart', (event) => {
            if (!isMobileView()) {
                return;
            }
            if (event.touches.length !== 1) {
                return;
            }
            const touch = event.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            isTracking = true;
        }, { passive: true });

        hero.addEventListener('touchend', (event) => {
            if (!isTracking || !event.changedTouches.length) {
                return;
            }
            const touch = event.changedTouches[0];
            isTracking = false;
            handleSwipeEnd(touch.clientX - startX, touch.clientY - startY);
        });

        hero.addEventListener('touchcancel', () => {
            isTracking = false;
        });
    }
}

// Modal functionality
const modal = document.getElementById('cart-modal');
const cartButton = document.getElementById('cart-button');
const closeButton = document.querySelector('.close');

cartButton.onclick = function() {
    updateCartModal();
    modal.style.display = 'block';
}

closeButton.onclick = function() {
    modal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Checkout
document.getElementById('checkout-button').onclick = function() {
    window.location.href = 'checkout.html';
}

// Buy button in hero
document.getElementById('buy-button').onclick = function() {
    const product = products[currentProductIndex];
    const size = document.getElementById('size-select').value;
    addToCart(product.id, product.name, product.price, size);
}

// Arrows
const leftArrow = document.getElementById('left-arrow');
const rightArrow = document.getElementById('right-arrow');

document.addEventListener('mousemove', function(event) {
    const x = event.clientX;
    const width = window.innerWidth;
    if (x < 100) {
        leftArrow.style.display = 'block';
    } else {
        leftArrow.style.display = 'none';
    }
    if (x > width - 100) {
        rightArrow.style.display = 'block';
    } else {
        rightArrow.style.display = 'none';
    }
});

leftArrow.onclick = function() {
    currentProductIndex = (currentProductIndex - 1 + products.length) % products.length;
    updateHero();
}

rightArrow.onclick = function() {
    currentProductIndex = (currentProductIndex + 1) % products.length;
    updateHero();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    initHeroSwipe();
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.product-card')) {
            closeSizeMenus();
        }
    });
});
