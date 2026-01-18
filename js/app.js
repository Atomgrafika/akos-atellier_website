// Load products and populate the grid
let products = [];
let currentProductIndex = 0;

// Simple cart functionality
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

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
    if (!exceptId) {
        document.body.classList.remove('size-menu-open');
    }
}

// Populate product grid
function populateGrid() {
    const productGrid = document.getElementById('product-grid');
    productGrid.innerHTML = '';
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';

        const image = document.createElement('img');
        image.src = product.image;
        image.alt = product.name;
        image.onerror = function() {
            this.src = 'https://via.placeholder.com/250x200?text=No+Image';
        };

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
                document.body.classList.remove('size-menu-open');
            });
            sizeMenu.appendChild(sizeButton);
        });

        buyButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const isOpen = !sizeMenu.hidden;
            closeSizeMenus(sizeMenu.id);
            sizeMenu.hidden = isOpen;
            buyButton.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            document.body.classList.toggle('size-menu-open', !isOpen);
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

        if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
            return;
        }
        if (!products.length) {
            return;
        }

        if (deltaX < 0) {
            currentProductIndex = (currentProductIndex + 1) % products.length;
        } else {
            currentProductIndex = (currentProductIndex - 1 + products.length) % products.length;
        }
        updateHero();
    };

    if ('PointerEvent' in window) {
        hero.addEventListener('pointerdown', (event) => {
            if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
                return;
            }
            startX = event.clientX;
            startY = event.clientY;
            isTracking = true;
        });

        hero.addEventListener('pointerup', (event) => {
            if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
                return;
            }
            handleSwipeEnd(event.clientX, event.clientY);
        });

        hero.addEventListener('pointercancel', () => {
            isTracking = false;
        });
    } else {
        hero.addEventListener('touchstart', (event) => {
            if (event.touches.length !== 1) {
                return;
            }
            const touch = event.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            isTracking = true;
        }, { passive: true });

        hero.addEventListener('touchend', (event) => {
            if (!event.changedTouches.length) {
                return;
            }
            const touch = event.changedTouches[0];
            handleSwipeEnd(touch.clientX, touch.clientY);
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
