class ShopTheLook extends HTMLElement {
  constructor() {
    super();
    this.handleHotspotClick = this.handleHotspotClick.bind(this);
    this.handleCloseClick = this.handleCloseClick.bind(this);
    this.handleDropdownToggle = this.handleDropdownToggle.bind(this);
    this.handleOptionSelect = this.handleOptionSelect.bind(this);
  }

  connectedCallback() {
    // 1. Hotspot Toggles
    this.querySelectorAll('.hotspot-btn').forEach((button) => {
      button.addEventListener('click', this.handleHotspotClick);
    });

    this.querySelectorAll('.modal-close').forEach((button) => {
      button.addEventListener('click', this.handleCloseClick);
    });

    // 2. Custom Select Dropdown UI
    this.querySelectorAll('.custom-select-trigger').forEach((trigger) => {
      trigger.addEventListener('click', this.handleDropdownToggle);
    });

    this.querySelectorAll('.custom-select-option').forEach((option) => {
      option.addEventListener('click', this.handleOptionSelect);
    });
  }

  /** @param {Event} event */
  handleHotspotClick(event) {
    const card = event.currentTarget.closest('.look-card');
    
    // UX FIX: Close all other active modals first
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
    const wrapper = option.closest('.custom-select-wrapper');
    const value = option.dataset.value;

    if (wrapper) {
      // Update UI Text
      wrapper.querySelector('.selected-value').textContent = value;
      // Update Hidden Input (Crucial for Add to Cart)
      wrapper.querySelector('input[type="hidden"]').value = value;
      // Close Dropdown
      wrapper.classList.remove('is-open');
    }
  }
}

customElements.define('shop-the-look', ShopTheLook); 