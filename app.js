const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".page-section");

function setActive(pageId) {
  navItems.forEach((item) => {
    const isActive = item.dataset.page === pageId;
    item.classList.toggle("active", isActive);
  });

  sections.forEach((section) => {
    section.classList.toggle("active", section.id === pageId);
  });
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const pageId = item.dataset.page;
    setActive(pageId);
  });
});
