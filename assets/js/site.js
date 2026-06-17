const DATA_URL = "assets/data/site-data.json?v=20260617-8";

let siteData = null;
const state = {
  publicationCategory: "all"
};

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = text;
  return element;
}

function createLink(item, className) {
  const link = document.createElement("a");
  const rawHref = item.href || item.url;
  link.href = rawHref;
  link.textContent = item.label || item.title;
  if (className) link.className = className;
  if (item.external !== false && /^https?:\/\//i.test(rawHref)) {
    link.target = "_blank";
    link.rel = "noopener";
  }
  return link;
}

function setText(selector, text) {
  const element = $(selector);
  if (element) element.textContent = text || "";
}

function appendIcon(parent, iconClass) {
  if (!iconClass) return null;
  const icon = document.createElement("i");
  icon.className = iconClass;
  icon.setAttribute("aria-hidden", "true");
  parent.appendChild(icon);
  return icon;
}

function createButtonLink(item, extraClass = "") {
  const link = createLink(item, `btn ${extraClass}`.trim());
  link.textContent = "";
  appendIcon(link, item.icon);
  link.append(document.createTextNode(item.label));
  return link;
}

function highlightName(text) {
  const fragment = document.createDocumentFragment();
  const name = siteData.site.name;
  const parts = String(text).split(name);

  parts.forEach((part, index) => {
    if (part) fragment.append(document.createTextNode(part));
    if (index < parts.length - 1) {
      const strong = document.createElement("strong");
      strong.textContent = name;
      fragment.append(strong);
    }
  });

  return fragment;
}

function renderNavigation() {
  const navLinks = $("#nav-links");
  navLinks.innerHTML = "";
  setText("[data-brand]", siteData.site.name);

  siteData.navigation.forEach((item) => {
    const link = createLink({ ...item, external: false });
    navLinks.appendChild(link);
  });

  navLinks.appendChild(createButtonLink(siteData.cvLink));
}

function renderHero() {
  const hero = siteData.hero;
  const background = $("#hero-bg");
  const actions = $("#hero-actions");

  background.innerHTML = "";
  hero.images.forEach((image, index) => {
    const img = document.createElement("img");
    img.src = image.src;
    img.alt = image.alt;
    img.decoding = "async";
    img.loading = index === 0 ? "eager" : "lazy";
    if (index === 0) img.classList.add("active");
    background.appendChild(img);
  });

  setText("#hero-subtitle", hero.subtitle);
  setText("#hero-title", hero.title);
  setText("#hero-summary", hero.summary);

  actions.innerHTML = "";
  hero.actions.forEach((action, index) => {
    actions.appendChild(createButtonLink(action, index === 0 ? "btn-ghost" : ""));
  });
}

function renderBio() {
  const bio = siteData.bio;
  const imageHolder = $("#bio-image");
  const copy = $("#bio-copy");
  const img = document.createElement("img");

  img.src = bio.image.src;
  img.alt = bio.image.alt;
  img.loading = "lazy";
  img.decoding = "async";

  imageHolder.innerHTML = "";
  imageHolder.appendChild(img);

  setText("#bio-title", bio.title);
  copy.innerHTML = "";
  bio.paragraphs.forEach((paragraph) => {
    copy.appendChild(createElement("p", null, paragraph));
  });
}

function renderTimeline(selector, items, animation = "fade-right") {
  const timeline = $(selector);
  timeline.innerHTML = "";

  items.forEach((item, index) => {
    const entry = createElement("div", "timeline-item");
    entry.dataset.aos = animation;
    if (index > 2 && selector === "#education-timeline") entry.classList.add("timeline-spaced");

    entry.appendChild(createElement("span", "timeline-date", item.date));
    entry.appendChild(createElement("h3", null, item.title));
    entry.appendChild(createElement("h4", null, item.organization));
    if (item.description) entry.appendChild(createElement("p", null, item.description));
    timeline.appendChild(entry);
  });
}

function renderResearch() {
  setText("#research-title", siteData.research.title);
  const grid = $("#research-grid");
  grid.innerHTML = "";

  siteData.research.items.forEach((item, index) => {
    const card = createElement("article", "research-card");
    card.dataset.aos = "zoom-in";
    card.dataset.aosDelay = String((index + 1) * 100);
    appendIcon(card, item.icon);
    card.appendChild(createElement("h3", null, item.title));
    card.appendChild(createElement("p", null, item.description));
    grid.appendChild(card);
  });
}

function renderLanguages() {
  setText("#languages-title", siteData.languages.title);
  const table = $("#languages-table");
  table.innerHTML = "";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  siteData.languages.columns.forEach((column) => headRow.appendChild(createElement("th", null, column)));
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  siteData.languages.rows.forEach((row) => {
    const tableRow = document.createElement("tr");
    row.forEach((cell, index) => {
      const td = document.createElement("td");
      if (index === 0) {
        const strong = document.createElement("strong");
        strong.textContent = cell.primary;
        td.appendChild(strong);
        if (cell.note) td.append(document.createTextNode(` (${cell.note})`));
      } else {
        td.textContent = cell;
      }
      tableRow.appendChild(td);
    });
    tbody.appendChild(tableRow);
  });

  table.append(thead, tbody);
}

function certificateType(file) {
  if (!file) return "none";
  return /\.pdf($|\?)/i.test(file) ? "pdf" : "image";
}

function openCertificateModal(item) {
  const modal = $("#certificate-modal");
  const title = $("#certificate-modal-title");
  const body = $("#certificate-modal-body");
  const fullLink = $("#certificate-modal-link");
  const type = certificateType(item.file);

  title.textContent = item.title;
  body.innerHTML = "";
  fullLink.href = item.file;

  if (type === "pdf") {
    const frame = document.createElement("iframe");
    frame.src = item.file;
    frame.title = item.title;
    body.appendChild(frame);
  } else {
    const image = document.createElement("img");
    image.src = item.file;
    image.alt = item.title;
    image.decoding = "async";
    body.appendChild(image);
  }

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeCertificateModal() {
  const modal = $("#certificate-modal");
  const body = $("#certificate-modal-body");
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  body.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function revealCertificates(options = {}) {
  const section = $("#certificates");
  if (!section) return;

  document.body.classList.add("certificate-view");
  section.classList.remove("is-hidden");
  section.setAttribute("aria-hidden", "false");

  if (options.updateHash) {
    history.pushState(null, "", "#certificates");
  }

  if (window.AOS) {
    window.AOS.refreshHard();
  }

  window.setTimeout(() => {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 30);
}

function hideCertificates() {
  const section = $("#certificates");
  if (!section) return;

  document.body.classList.remove("certificate-view");
  section.classList.add("is-hidden");
  section.setAttribute("aria-hidden", "true");
}

function renderCertificates() {
  const certificates = siteData.certificates;
  const grid = $("#certificate-grid");

  setText("#certificates-title", certificates.title);
  setText("#certificates-subtitle", certificates.subtitle);
  grid.innerHTML = "";

  if (!certificates.items.length) {
    grid.appendChild(createElement("p", "empty-state", certificates.emptyMessage));
    return;
  }

  certificates.items.forEach((item) => {
    const card = createElement("article", "certificate-card");
    const preview = createElement("div", "certificate-preview");
    const meta = createElement("div", "certificate-meta");
    const button = document.createElement("button");

    if (item.thumbnail) {
      const image = document.createElement("img");
      image.src = item.thumbnail;
      image.alt = item.title;
      image.loading = "lazy";
      image.decoding = "async";
      preview.appendChild(image);
    } else {
      appendIcon(preview, certificateType(item.file) === "pdf" ? "fas fa-file-pdf" : "fas fa-certificate");
    }

    meta.appendChild(createElement("h3", null, item.title));
    if (item.issuer) meta.appendChild(createElement("p", "certificate-issuer", item.issuer));
    if (item.date) meta.appendChild(createElement("span", "certificate-date", item.date));
    if (item.description) meta.appendChild(createElement("p", null, item.description));

    button.type = "button";
    button.className = "btn";
    button.appendChild(document.createTextNode(item.file ? (item.buttonLabel || "View Certificate") : "Certificate Pending"));
    button.disabled = !item.file;
    if (item.file) {
      button.addEventListener("click", () => openCertificateModal(item));
    }

    card.append(preview, meta, button);
    grid.appendChild(card);
  });
}

function categoryCounts() {
  return siteData.publications.items.reduce((counts, item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    counts.all += 1;
    return counts;
  }, { all: 0 });
}

function renderPublicationTabs() {
  const tabs = $("#publication-tabs");
  const counts = categoryCounts();
  tabs.innerHTML = "";

  siteData.publications.categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab-btn";
    button.dataset.category = category.id;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(category.id === state.publicationCategory));
    button.textContent = `${category.label} (${counts[category.id] || 0})`;
    if (category.id === state.publicationCategory) button.classList.add("active");
    button.addEventListener("click", () => {
      state.publicationCategory = category.id;
      renderPublications();
    });
    tabs.appendChild(button);
  });
}

function publicationMatches(item) {
  return state.publicationCategory === "all" || item.category === state.publicationCategory;
}

function createPublicationItem(item) {
  const article = createElement("article", "pub-item");
  article.dataset.category = item.category;

  if (item.status) {
    article.appendChild(createElement("span", `status-badge status-${item.statusType}`, item.status));
  }

  const title = item.url
    ? createLink({ href: item.url, label: item.title }, "pub-title")
    : createElement("span", "pub-title", item.title);
  article.appendChild(title);
  article.appendChild(createElement("span", "pub-meta", item.venue));

  const authors = createElement("p", "pub-authors");
  authors.appendChild(highlightName(item.authors));
  article.appendChild(authors);

  if (item.note) {
    const note = createElement("p", "pub-note");
    const emphasis = document.createElement("em");
    emphasis.textContent = item.note;
    note.appendChild(emphasis);
    article.appendChild(note);
  }

  if (item.url) {
    const link = createLink({ href: item.url, label: item.linkLabel || "Read Article" }, "pub-link");
    link.append(document.createTextNode(" "));
    appendIcon(link, "fas fa-external-link-alt");
    article.appendChild(link);
  }

  return article;
}

function renderPublications() {
  renderPublicationTabs();
  const list = $("#publication-list");
  const matches = siteData.publications.items.filter(publicationMatches);
  list.innerHTML = "";

  if (!matches.length) {
    list.appendChild(createElement("p", "empty-state", "No publications match the selected filters."));
    return;
  }

  matches.forEach((item) => list.appendChild(createPublicationItem(item)));
}

function renderSoftware() {
  const software = siteData.software;
  const showcase = $("#software-showcase");
  const info = createElement("div", "software-info");
  const frame = createElement("div", "slideshow-frame");

  setText("#software-title", software.title);
  setText("#projects-title", software.projectsTitle);

  info.dataset.aos = "fade-right";
  info.appendChild(createElement("span", "badge", software.featured.badge));
  info.appendChild(createElement("h3", null, software.featured.title));
  info.appendChild(createElement("p", null, software.featured.description));

  const features = createElement("ul", "feature-list");
  software.featured.features.forEach((feature) => {
    const li = document.createElement("li");
    appendIcon(li, "fas fa-check-circle");
    li.append(document.createTextNode(feature));
    features.appendChild(li);
  });
  info.appendChild(features);
  info.appendChild(createButtonLink(software.featured.cta));

  frame.dataset.aos = "fade-left";
  software.featured.images.forEach((image, index) => {
    const img = document.createElement("img");
    img.src = image.src;
    img.alt = image.alt;
    img.loading = "lazy";
    img.decoding = "async";
    if (index === 0) img.classList.add("active");
    frame.appendChild(img);
  });

  showcase.innerHTML = "";
  showcase.append(info, frame);

  const projectGrid = $("#project-grid");
  projectGrid.innerHTML = "";
  software.projects.forEach((project) => {
    const card = createElement("article", "project-card");
    card.appendChild(createElement("h3", null, project.title));
    card.appendChild(createElement("p", "project-role", project.role));
    card.appendChild(createElement("p", "pub-meta", project.meta));
    projectGrid.appendChild(card);
  });
}

function renderContact() {
  const contact = siteData.contact;
  const grid = $("#contact-grid");
  const profileLinks = $("#profile-links");
  const socials = $("#footer-socials");

  setText("#contact-title", contact.title);
  setText("#contact-subtitle", contact.subtitle);
  grid.innerHTML = "";

  contact.cards.forEach((card) => {
    const wrapper = card.href ? createLink({ href: card.href, label: "" }, "contact-card") : createElement("div", "contact-card");
    appendIcon(wrapper, card.icon);
    wrapper.appendChild(createElement("h3", null, card.title));
    const text = createElement("p");
    card.lines.forEach((line, index) => {
      if (index > 0) text.appendChild(document.createElement("br"));
      text.append(document.createTextNode(line));
    });
    wrapper.appendChild(text);
    grid.appendChild(wrapper);
  });

  profileLinks.innerHTML = "";
  contact.profileLinks.forEach((item) => {
    const link = createButtonLink(item);
    if (item.color) {
      link.style.background = item.color;
      link.style.borderColor = item.color;
    }
    profileLinks.appendChild(link);
  });

  setText("#footer-copy", `Copyright ${new Date().getFullYear()} ${siteData.site.name}. All Rights Reserved.`);
  socials.innerHTML = "";
  contact.socials.forEach((item) => {
    const link = createLink({ href: item.href, label: item.label }, null);
    link.textContent = "";
    link.setAttribute("aria-label", item.label);
    appendIcon(link, item.icon);
    socials.appendChild(link);
  });
}

function startSlideshow(container, interval = 5000) {
  const images = $$("img", container);
  if (images.length < 2) return;
  let currentIndex = 0;

  window.setInterval(() => {
    images[currentIndex].classList.remove("active");
    currentIndex = (currentIndex + 1) % images.length;
    images[currentIndex].classList.add("active");
  }, interval);
}

function bindInteractions() {
  const nav = $("#navbar");
  const navLinks = $("#nav-links");
  const toggle = $("#mobile-toggle");
  const certificateModal = $("#certificate-modal");
  const certificateClose = $("#certificate-modal-close");

  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 50);
  });

  toggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("active");
    toggle.setAttribute("aria-expanded", String(isOpen));
    $("i", toggle).className = isOpen ? "fas fa-times" : "fas fa-bars";
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      navLinks.classList.remove("active");
      toggle.setAttribute("aria-expanded", "false");
      $("i", toggle).className = "fas fa-bars";
    }
  });

  document.addEventListener("click", (event) => {
    const internalLink = event.target.closest("a[href^='#']");
    if (!internalLink) return;

    if (internalLink.getAttribute("href") === "#certificates") {
      event.preventDefault();
      revealCertificates({ updateHash: true });
      return;
    }

    hideCertificates();
  });

  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#certificates") {
      revealCertificates();
    } else {
      hideCertificates();
    }
  });

  certificateClose.addEventListener("click", closeCertificateModal);
  certificateModal.addEventListener("click", (event) => {
    if (event.target === certificateModal) closeCertificateModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && certificateModal.classList.contains("active")) {
      closeCertificateModal();
    }
  });
}

function observeSections() {
  const links = $$("#nav-links a[href^='#']");
  const sections = links
    .map((link) => $(link.getAttribute("href")))
    .filter(Boolean);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: "-42% 0px -52% 0px", threshold: 0 });

  sections.forEach((section) => observer.observe(section));
}

function renderSite() {
  document.title = siteData.site.pageTitle;
  renderNavigation();
  renderHero();
  renderBio();
  setText("#education-title", siteData.education.title);
  renderTimeline("#education-timeline", siteData.education.items);
  renderCertificates();
  renderResearch();
  renderLanguages();
  setText("#publications-title", siteData.publications.title);
  renderPublications();
  renderSoftware();
  setText("#service-title", siteData.service.title);
  renderTimeline("#service-timeline", siteData.service.items, "fade-left");
  renderContact();
  bindInteractions();
  observeSections();
  startSlideshow($("#hero-bg"), 6000);
  startSlideshow($(".slideshow-frame"), 4000);

  if (window.AOS) {
    window.AOS.init({
      duration: 900,
      easing: "ease-out-cubic",
      once: true,
      offset: 50
    });
  }

  if (window.location.hash === "#certificates") {
    revealCertificates();
  }
}

async function loadData() {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${DATA_URL}`);
  return response.json();
}

loadData()
  .then((data) => {
    siteData = data;
    renderSite();
  })
  .catch((error) => {
    console.error(error);
    $("#app").innerHTML = `
      <section class="load-error">
        <h2>Content could not be loaded</h2>
        <p>Run the site through a local server or GitHub Pages so the JSON content file can be fetched.</p>
      </section>
    `;
  });
