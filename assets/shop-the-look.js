class ShopTheLook extends HTMLElement {
    constructor() {
        super();
        // Bind all methods to ensure 'this' always refers to the web component
        this.handleHotspotClick = this.handleHotspotClick.bind(this);
        this.handleCloseClick = this.handleCloseClick.bind(this);
        this.handleDropdownToggle = this.handleDropdownToggle.bind(this);
        this.handleOptionSelect = this.handleOptionSelect.bind(this);
        this.handleColorChange = this.handleColorChange.bind(this);
        this.handleOverlayClick = this.handleOverlayClick.bind(this);
        this.addToCart = this.addToCart.bind(this);
    }

    connectedCallback() {
        // Attach listeners
        this.querySelectorAll('.hotspot-btn').forEach((button) => {
            button.addEventListener('click', this.handleHotspotClick);
        });

        this.querySelectorAll('.modal-close').forEach((button) => {
            button.addEventListener('click', this.handleCloseClick);
        });

        this.querySelectorAll('.custom-select-trigger').forEach((trigger) => {
            trigger.addEventListener('click', this.handleDropdownToggle);
        });

        this.querySelectorAll('.custom-select-option').forEach((option) => {
            option.addEventListener('click', this.handleOptionSelect);
        });

        this.querySelectorAll('.color-swatch input[type="radio"]').forEach((radio) => {
            radio.addEventListener('change', this.handleColorChange);
        });

        this.querySelectorAll('.add-to-cart-button').forEach((btn) => {
            btn.addEventListener('click', this.addToCart);
        });

        const overlay = this.querySelector('.modal-overlay');
        if (overlay) overlay.addEventListener('click', this.handleOverlayClick);

        // Run the state machine once on load for every card to guarantee accurate initial UI
        this.querySelectorAll('.look-card').forEach((card) => {
            this.updateVariantState(card);
        });
    }

    disconnectedCallback() {
        // Cleanup listeners (Best Practice)
        this.querySelectorAll('.hotspot-btn').forEach(btn => btn.removeEventListener('click', this.handleHotspotClick));
        this.querySelectorAll('.modal-close').forEach(btn => btn.removeEventListener('click', this.handleCloseClick));
        this.querySelectorAll('.custom-select-trigger').forEach(btn => btn.removeEventListener('click', this.handleDropdownToggle));
        this.querySelectorAll('.custom-select-option').forEach(btn => btn.removeEventListener('click', this.handleOptionSelect));
        this.querySelectorAll('.color-swatch input[type="radio"]').forEach(btn => btn.removeEventListener('change', this.handleColorChange));
        this.querySelectorAll('.add-to-cart-button').forEach((btn) => {
            btn.removeEventListener('click', this.addToCart);
        });
        const overlay = this.querySelector('.modal-overlay');
        if (overlay) overlay.removeEventListener('click', this.handleOverlayClick);
    }

    /** @param {Event} event */
    handleHotspotClick(event) {
        const card = event.currentTarget.closest('.look-card');

        // Close any other open modals
        this.querySelectorAll('.look-card.is-active').forEach((activeCard) => {
            if (activeCard !== card) {
                activeCard.classList.remove('is-active');
            }
        });

        if (card) {
            card.classList.toggle('is-active');
        }
    }

    /** @param {Event} event */
    handleCloseClick(event) {
        const card = event.currentTarget.closest('.look-card');
        if (card) {
            card.classList.remove('is-active');
        }
    }

    /** @param {Event} event */
    handleDropdownToggle(event) {
        const wrapper = event.currentTarget.closest('.custom-select-wrapper');
        if (wrapper) {
            wrapper.classList.toggle('is-open');
        }
    }

    /** @param {Event} event */
    handleOptionSelect(event) {
        const option = event.currentTarget;

        // Prevent interaction if the size is struck out
        if (option.classList.contains('is-unavailable')) return;

        const wrapper = option.closest('.custom-select-wrapper');
        const value = option.dataset.value;

        if (wrapper) {
            // Update UI and hidden input
            wrapper.querySelector('.selected-value').textContent = value;
            wrapper.querySelector('input[type="hidden"]').value = value;
            wrapper.classList.remove('is-open');

            // Trigger the state machine
            const card = option.closest('.look-card');
            if (card) {
                this.updateVariantState(card);
            }
        }
    }

    /** @param {Event} event */
    handleColorChange(event) {
        const card = event.currentTarget.closest('.look-card');
        if (card) {
            this.updateVariantState(card);
        }
    }

    /** @param {HTMLElement} card */
    updateVariantState(card) {
        const variantsJson = card.querySelector('.product-variants-data');
        if (!variantsJson) return;

        let variants = [];
        try {
            variants = JSON.parse(variantsJson.textContent || '[]');
        } catch (error) {
            console.error('Variant parsing failed', error);
            return;
        }

        // 1. Read Current State
        const selectedColorInput = card.querySelector('.color-swatch input[type="radio"]:checked');
        const selectedColor = selectedColorInput ? selectedColorInput.value : null;

        const selectedValueElement = card.querySelector('.selected-value');
        const hiddenInput = card.querySelector('input[type="hidden"]');
        let currentSize = hiddenInput ? hiddenInput.value : null;

        // Handle initial state if "Choose your size" is still present
        if (!currentSize || currentSize === 'Choose your size') {
            const firstOpt = card.querySelector('.custom-select-option');
            currentSize = firstOpt ? firstOpt.dataset.value : null;
        }

        // 2. Filter valid sizes based on selected color
        const validVariantsForColor = variants.filter(v => v.option2 === selectedColor && v.available !== false);
        const availableSizes = validVariantsForColor.map(v => v.option1);

        // 3. Update the Dropdown UI (Strike out unavailable sizes)
        const sizeOptions = Array.from(card.querySelectorAll('.custom-select-option'));
        sizeOptions.forEach((option) => {
            const sizeVal = option.dataset.value;
            if (availableSizes.includes(sizeVal)) {
                option.classList.remove('is-unavailable');
            } else {
                option.classList.add('is-unavailable');
            }
        });

        // 4. Auto-correct if current size became invalid after a color change
        const currentOptionEl = sizeOptions.find(opt => opt.dataset.value === currentSize);

        if (!currentOptionEl || currentOptionEl.classList.contains('is-unavailable')) {
            // Find the first size that is NOT unavailable
            const firstAvailable = sizeOptions.find(opt => !opt.classList.contains('is-unavailable'));

            if (firstAvailable) {
                currentSize = firstAvailable.dataset.value;
                if (selectedValueElement) selectedValueElement.textContent = currentSize;
                if (hiddenInput) hiddenInput.value = currentSize;
            } else {
                // Complete Sold Out state
                currentSize = null;
                if (selectedValueElement) selectedValueElement.textContent = "Sold Out";
            }
        } else {
            // Ensure UI text perfectly matches valid size
            if (selectedValueElement) selectedValueElement.textContent = currentSize;
            if (hiddenInput) hiddenInput.value = currentSize;
        }

        // 5. Secure the Final Variant ID & Update Price
        const finalVariant = variants.find(v => v.option2 === selectedColor && v.option1 === currentSize);
        const addToCartBtn = card.querySelector('.add-to-cart-button');
        const priceElement = card.querySelector('.product-price');

        if (finalVariant) {
            if (priceElement) {
                const formattedPrice = (finalVariant.price / 100).toFixed(2);
                // Smart regex swap: changes the numbers but keeps the native currency symbol format
                priceElement.innerHTML = priceElement.innerHTML.replace(/[\d.,]+/, formattedPrice);
            }

            if (addToCartBtn) {
                addToCartBtn.dataset.variantId = finalVariant.id;
                addToCartBtn.classList.remove('is-unavailable');
                const btnText = addToCartBtn.querySelector('.btn-text');
                if (btnText) btnText.textContent = 'ADD TO CART';
            }
        } else {
            // Failsafe if absolutely no variant exists
            if (addToCartBtn) {
                addToCartBtn.dataset.variantId = '';
                addToCartBtn.classList.add('is-unavailable');
                const btnText = addToCartBtn.querySelector('.btn-text');
                if (btnText) btnText.textContent = 'UNAVAILABLE';
            }
        }
    }


    /** @param {Event} event */
    handleOverlayClick(event) {
        // Finds any open modal and closes it
        this.querySelectorAll('.look-card.is-active').forEach((activeCard) => {
            activeCard.classList.remove('is-active');
        });
    }



    /** @param {Event} event */
    async addToCart(event) {
        event.preventDefault();
        const button = event.currentTarget;
        const card = button.closest('.look-card');
        const variantId = button.dataset.variantId;

        if (!variantId) return; // Failsafe

        // 1. Read current state for the "Gotcha" test
        const selectedColor = card.querySelector('.color-swatch input[type="radio"]:checked')?.value;
        const selectedSize = card.querySelector('input[type="hidden"]')?.value;

        // 2. Build the Payload Array
        let itemsPayload = [{ id: parseInt(variantId), quantity: 1 }];

        // 3. Execute the Gotcha Check (Black & Medium -> Add Jacket)
        if (selectedColor === 'Black' && selectedSize === 'M') {
            const shopTheLookWrapper = this.closest('shop-the-look');
            const bonusVariantId = shopTheLookWrapper.dataset.bonusVariantId;

            if (bonusVariantId) {
                itemsPayload.push({ id: parseInt(bonusVariantId), quantity: 1 });
            }
        }

        // 4. Trigger UI Loading State
        button.classList.add('is-loading');
        const btnText = button.querySelector('.btn-text');
        const originalText = btnText.textContent;
        btnText.textContent = 'ADDING...';

        try {
            // 5. Fire the Request & Demand the Updated Sections from Shopify
            // FIX: Requesting the 'header' section instead of 'cart-icon-bubble'
            const response = await fetch(window.Shopify.routes.root + 'cart/add.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: itemsPayload,
                    sections: 'header,cart-drawer',
                    sections_url: window.location.pathname
                })
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.description || 'Error adding item to cart.');
            }

            // 6. Handle Success UI
            button.classList.remove('is-loading');
            button.classList.add('is-success');
            btnText.textContent = 'ADDED!';

            // 7. Inject Native Cart Sections (Surgical DOM Extraction)
            if (responseData.sections) {
                const parser = new DOMParser();

                // A. Update the Bubble Count by plucking it out of the fresh Header
                if (responseData.sections['header']) {
                    const freshHeader = parser.parseFromString(responseData.sections['header'], 'text/html');

                    // Look for the standard Dawn ID, fallback to the standard class
                    const newCartBubble = freshHeader.getElementById('cart-icon-bubble') || freshHeader.querySelector('.header__icon--cart');
                    const oldCartBubble = document.getElementById('cart-icon-bubble') || document.querySelector('.header__icon--cart');

                    if (newCartBubble && oldCartBubble) {
                        oldCartBubble.innerHTML = newCartBubble.innerHTML;
                    }
                }

                // B. Update the Drawer Content Safely
                if (responseData.sections['cart-drawer']) {
                    const freshDrawer = parser.parseFromString(responseData.sections['cart-drawer'], 'text/html');

                    // Look for the web component tag, fallback to the section wrapper ID
                    const newDrawerInner = freshDrawer.querySelector('cart-drawer') || freshDrawer.getElementById('CartDrawer') || freshDrawer.body.firstElementChild;
                    const oldDrawerWrapper = document.querySelector('cart-drawer') || document.getElementById('shopify-section-cart-drawer');

                    if (newDrawerInner && oldDrawerWrapper) {
                        if (oldDrawerWrapper.tagName.toLowerCase() === 'cart-drawer') {
                            oldDrawerWrapper.innerHTML = newDrawerInner.innerHTML;
                        } else {
                            oldDrawerWrapper.innerHTML = freshDrawer.body.firstElementChild.innerHTML;
                        }
                    }
                }

                // C. Command the Web Component to Slide Open
                const drawerComponent = document.querySelector('cart-drawer');
                if (drawerComponent) {
                    if (typeof drawerComponent.open === 'function') {
                        drawerComponent.open();
                    } else if (drawerComponent.classList) {
                        // Fallback for older drawer architectures
                        drawerComponent.classList.add('active');
                        document.body.classList.add('overflow-hidden');
                    }
                }
            }

            // 8. Reset Button after 2 seconds
            setTimeout(() => {
                button.classList.remove('is-success');
                btnText.textContent = originalText;
            }, 2000);

        } catch (error) {
            // Handle Failure UI
            button.classList.remove('is-loading');
            btnText.textContent = originalText;
            this.showToast(error.message);
        }
    }

    /** @param {string} message */
    showToast(message) {
        let toast = document.querySelector('.stl-toast');

        // Create the toast node if it doesn't exist yet
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'stl-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;

        // Force browser reflow to ensure animation triggers
        void toast.offsetWidth;
        toast.classList.add('is-visible');

        // Auto-vanish after 3 seconds
        setTimeout(() => {
            toast.classList.remove('is-visible');
        }, 3000);
    }


}

customElements.define('shop-the-look', ShopTheLook);