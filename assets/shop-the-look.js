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
}

customElements.define('shop-the-look', ShopTheLook);