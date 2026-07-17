class CustomAnnouncementBar extends HTMLElement {
  constructor() {
    super();
    const toggleButton = this.querySelector('.mobile-toggle');

    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        this.classList.toggle('is-open');
        const expanded = this.classList.contains('is-open');
        toggleButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
    }
  }
}

customElements.define('custom-announcement-bar', CustomAnnouncementBar);
