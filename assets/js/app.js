(() => {
    "use strict";

    const config = window.SITE_CONFIG;

    if (!config || typeof config !== "object") {
        document.documentElement.classList.remove("no-js");
        document.documentElement.classList.add("site-config-error");
        return;
    }

    const documentElement = document.documentElement;
    const body = document.body;
    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const currentFile =
        window.location.pathname.split("/").filter(Boolean).pop() ||
        "index.html";

    let lastFocusedElement = null;
    let menuCloseTimer = null;
    let headerFrameRequested = false;

    const escapeHTML = (value) => {
        const element = document.createElement("div");

        element.textContent =
            value === undefined || value === null
                ? ""
                : String(value);

        return element.innerHTML;
    };

    const escapeAttribute = (value) => {
        return escapeHTML(value).replace(/"/g, "&quot;");
    };

    const getConfigValue = (path) => {
        if (!path || typeof path !== "string") {
            return undefined;
        }

        return path.split(".").reduce((currentValue, key) => {
            if (
                currentValue !== null &&
                currentValue !== undefined &&
                Object.prototype.hasOwnProperty.call(currentValue, key)
            ) {
                return currentValue[key];
            }

            return undefined;
        }, config);
    };

    const getLinkInformation = (href) => {
        if (!href || typeof href !== "string") {
            return {
                file: "",
                hash: ""
            };
        }

        try {
            const url = new URL(href, window.location.href);

            return {
                file:
                    url.pathname.split("/").filter(Boolean).pop() ||
                    "index.html",
                hash: url.hash
            };
        } catch (error) {
            const parts = href.split("#");

            return {
                file:
                    parts[0].split("/").filter(Boolean).pop() ||
                    currentFile,
                hash: parts[1] ? `#${parts[1]}` : ""
            };
        }
    };

    const isCurrentLink = (href) => {
        const link = getLinkInformation(href);

        if (!link.file || link.file !== currentFile) {
            return false;
        }

        if (!link.hash) {
            return true;
        }

        return window.location.hash === link.hash;
    };

    const createIconMarkup = (name, className = "") => {
        if (!name) {
            return "";
        }

        return `
      <i
        ${className ? `class="${escapeAttribute(className)}"` : ""}
        data-lucide="${escapeAttribute(name)}"
        aria-hidden="true"
      ></i>
    `;
    };

    const createBrandMarkup = (modifierClass = "") => {
        const brand = config.brand || {};
        const wordmark = brand.wordmark || {};

        const classes = ["site-brand"];

        if (modifierClass) {
            classes.push(modifierClass);
        }

        return `
      <a
        class="${classes.join(" ")}"
        href="index.html"
        aria-label="${escapeAttribute(
            `${brand.name || "Velmora Home Offers"} home`
        )}"
      >
        <img
          class="site-brand__mark"
          src="${escapeAttribute(brand.logoMark || "")}"
          alt=""
          width="72"
          height="72"
        >

        <span class="site-brand__text">
          <span class="site-brand__primary">
            ${escapeHTML(wordmark.primary || brand.name || "")}
          </span>

          <span class="site-brand__secondary">
            ${escapeHTML(wordmark.secondary || "")}
          </span>
        </span>
      </a>
    `;
    };

    const createNavigationMarkup = (
        items,
        listClass,
        itemClass,
        linkClass
    ) => {
        if (!Array.isArray(items) || !items.length) {
            return "";
        }

        return `
      <ul class="${escapeAttribute(listClass)}">
        ${items
                .map((item) => {
                    const current = isCurrentLink(item.href);

                    return `
              <li class="${escapeAttribute(itemClass)}">
                <a
                  class="${escapeAttribute(linkClass)}"
                  href="${escapeAttribute(item.href || "#")}"
                  ${current ? 'aria-current="page"' : ""}
                >
                  ${escapeHTML(item.label || "")}
                </a>
              </li>
            `;
                })
                .join("")}
      </ul>
    `;
    };

    const renderHeader = () => {
        const target = document.querySelector("[data-site-header]");

        if (!target) {
            return;
        }

        const navigation = config.navigation || {};
        const contact = config.contact || {};
        const site = config.site || {};
        const primaryCta = navigation.primaryCta || {};
        const contactCta = navigation.contactCta || {};

        target.className = "site-header";

        target.innerHTML = `
      <div class="site-header__utility">
        <div class="site-container-wide site-header__utility-inner">
          <div class="site-header__utility-group">
            <a
              class="site-header__utility-item"
              href="mailto:${escapeAttribute(
            contact.recipientEmail || ""
        )}"
            >
              ${createIconMarkup("mail")}

              <span>
                ${escapeHTML(contact.recipientEmail || "")}
              </span>
            </a>

            <span class="site-header__utility-item">
              ${createIconMarkup("circle-dot")}

              <span>
                ${escapeHTML(site.utilityStatus || "")}
              </span>
            </span>
          </div>

          <div class="site-header__utility-group">
            <address class="site-header__utility-item">
              ${createIconMarkup("map-pin")}

              <span>
                ${escapeHTML(contact.address || "")}
              </span>
            </address>

            <span class="site-header__utility-item">
              ${createIconMarkup("clipboard-check")}

              <span>
                ${escapeHTML(site.utilityContactLabel || "")}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div class="site-header__frame-wrap">
        <div class="site-header__frame">
          <nav
            class="site-header__nav site-header__nav--left"
            aria-label="Primary navigation"
          >
            <a
              class="site-button site-button--outline site-button--compact site-header__contact-cta"
              href="${escapeAttribute(contactCta.href || "contact.html")}"
            >
              ${createIconMarkup(contactCta.icon || "phone-call")}

              <span>
                ${escapeHTML(contactCta.label || "Contact")}
              </span>
            </a>

            ${createNavigationMarkup(
            navigation.desktopLeft,
            "site-header__nav-list",
            "site-header__nav-item",
            "site-header__nav-link"
        )}
          </nav>

          ${createBrandMarkup("site-header__brand")}

          <nav
            class="site-header__nav site-header__nav--right"
            aria-label="Secondary navigation"
          >
            ${createNavigationMarkup(
            navigation.desktopRight,
            "site-header__nav-list",
            "site-header__nav-item",
            "site-header__nav-link"
        )}

            <a
              class="site-button site-button--sky site-button--compact site-header__cta"
              href="${escapeAttribute(
            primaryCta.href ||
            "contact.html#property-offer-form"
        )}"
            >
              ${createIconMarkup(
            primaryCta.icon || "key-round"
        )}

              <span>
                ${escapeHTML(
            primaryCta.label || "Request an Offer"
        )}
              </span>
            </a>
          </nav>

          <button
            class="site-header__menu-button"
            type="button"
            aria-expanded="false"
            aria-controls="site-mobile-menu"
            aria-label="${escapeAttribute(
            navigation.menuOpenLabel ||
            "Open site navigation"
        )}"
            data-menu-open
          >
            <span
              class="site-header__menu-button-lines"
              aria-hidden="true"
            >
              <span></span>
            </span>
          </button>
        </div>
      </div>
    `;
    };

    const renderMobileMenu = () => {
        const target = document.querySelector("[data-mobile-menu]");

        if (!target) {
            return;
        }

        const navigation = config.navigation || {};
        const contact = config.contact || {};
        const primaryCta = navigation.primaryCta || {};
        const mobileItems = Array.isArray(navigation.mobile)
            ? navigation.mobile
            : [];

        target.className = "site-mobile-menu";
        target.id = "site-mobile-menu";
        target.hidden = true;

        target.setAttribute("role", "dialog");
        target.setAttribute("aria-modal", "true");
        target.setAttribute("aria-hidden", "true");
        target.setAttribute(
            "aria-label",
            "Site navigation"
        );

        target.innerHTML = `
      <div class="site-mobile-menu__top">
        ${createBrandMarkup("site-mobile-menu__brand")}

        <button
          class="site-mobile-menu__close"
          type="button"
          aria-label="${escapeAttribute(
            navigation.menuCloseLabel ||
            "Close site navigation"
        )}"
          data-menu-close
        >
          ${createIconMarkup("x")}
        </button>
      </div>

      <div class="site-mobile-menu__body">
        <nav
          class="site-mobile-menu__nav"
          aria-label="Mobile navigation"
        >
          <ul class="site-mobile-menu__list">
            ${mobileItems
                .map((item) => {
                    const current = isCurrentLink(item.href);

                    return `
                  <li class="site-mobile-menu__item">
                    <a
                      class="site-mobile-menu__link"
                      href="${escapeAttribute(item.href || "#")}"
                      ${current ? 'aria-current="page"' : ""}
                    >
                      <span>
                        ${escapeHTML(item.label || "")}
                      </span>

                      ${createIconMarkup("circle-dot")}
                    </a>
                  </li>
                `;
                })
                .join("")}
          </ul>
        </nav>
      </div>

      <div class="site-mobile-menu__footer">
        <div class="site-mobile-menu__contact">
          <a
            href="mailto:${escapeAttribute(
                    contact.recipientEmail || ""
                )}"
          >
            ${escapeHTML(contact.recipientEmail || "")}
          </a>

          <address>
            ${escapeHTML(contact.address || "")}
          </address>
        </div>

        <a
          class="site-button site-button--sky site-button--compact"
          href="${escapeAttribute(
                    primaryCta.href ||
                    "contact.html#property-offer-form"
                )}"
        >
          ${createIconMarkup(
                    primaryCta.icon || "key-round"
                )}

          <span>
            ${escapeHTML(
                    primaryCta.label || "Request an Offer"
                )}
          </span>
        </a>
      </div>
    `;
    };

    const createFooterLinkMarkup = (items) => {
        if (!Array.isArray(items) || !items.length) {
            return "";
        }

        return items
            .map((item) => {
                return `
          <li>
            <a
              class="site-footer__link"
              href="${escapeAttribute(item.href || "#")}"
              ${isCurrentLink(item.href)
                        ? 'aria-current="page"'
                        : ""}
            >
              ${escapeHTML(item.label || "")}
            </a>
          </li>
        `;
            })
            .join("");
    };

    const renderFooter = () => {
        const target = document.querySelector("[data-site-footer]");

        if (!target) {
            return;
        }

        const footer = config.footer || {};
        const contact = config.contact || {};
        const legal = config.legal || {};
        const services = Array.isArray(config.services)
            ? config.services
            : [];

        const serviceLinks = services.map((service) => {
            return {
                label:
                    service.shortLabel ||
                    service.label ||
                    "",
                href: service.href || "#"
            };
        });

        const legalLinks = [
            legal.privacy,
            legal.terms,
            legal.cookies
        ].filter(Boolean);

        target.className = "site-footer";

        target.innerHTML = `
      <div class="site-container-wide site-footer__main">
        <div class="site-footer__brand">
          ${createBrandMarkup("site-footer__brand-link")}

          <p class="site-footer__description">
            ${escapeHTML(footer.description || "")}
          </p>

          <p class="site-footer__disclaimer">
            ${escapeHTML(footer.disclaimer || "")}
          </p>
        </div>

        <div class="site-footer__column">
          <h2 class="site-footer__title">
            ${escapeHTML(
            footer.navigationTitle || "Explore"
        )}
          </h2>

          <ul class="site-footer__links">
            ${createFooterLinkMarkup(
            footer.navigationLinks
        )}
          </ul>
        </div>

        <div class="site-footer__column">
          <h2 class="site-footer__title">
            ${escapeHTML(
            footer.servicesTitle || "Selling Options"
        )}
          </h2>

          <ul class="site-footer__links">
            ${createFooterLinkMarkup(serviceLinks)}
          </ul>
        </div>

        <div class="site-footer__column">
          <h2 class="site-footer__title">
            ${escapeHTML(
            footer.contactTitle || "Contact"
        )}
          </h2>

          <div class="site-footer__links">
            <a
              class="site-footer__contact-item"
              href="mailto:${escapeAttribute(
            contact.recipientEmail || ""
        )}"
            >
              ${createIconMarkup("mail")}

              <span>
                ${escapeHTML(contact.recipientEmail || "")}
              </span>
            </a>

            <address class="site-footer__contact-item">
              ${createIconMarkup("map-pin")}

              <span>
                ${escapeHTML(contact.address || "")}
              </span>
            </address>
          </div>
        </div>

        <div class="site-footer__legal-group">
          <h2 class="site-footer__title">
            ${escapeHTML(
            footer.legalTitle || "Legal"
        )}
          </h2>

          <ul class="site-footer__links">
            ${createFooterLinkMarkup(legalLinks)}
          </ul>
        </div>
      </div>

      <div class="site-footer__bottom">
        <div class="site-container-wide site-footer__bottom-inner">
          <p>
            ${escapeHTML(
            footer.copyrightPrefix || "©"
        )}

            <span data-current-year></span>

            ${escapeHTML(
            footer.copyrightText || ""
        )}
          </p>
        </div>
      </div>
    `;
    };

    const getCookiePreference = () => {
        const cookie = config.cookie || {};

        if (!cookie.storageKey) {
            return null;
        }

        try {
            return window.localStorage.getItem(
                cookie.storageKey
            );
        } catch (error) {
            return null;
        }
    };

    const saveCookiePreference = (value) => {
        const cookie = config.cookie || {};

        if (!cookie.storageKey) {
            return false;
        }

        try {
            window.localStorage.setItem(
                cookie.storageKey,
                value
            );

            return true;
        } catch (error) {
            return false;
        }
    };

    const renderCookieConsent = () => {
        const target = document.querySelector(
            "[data-cookie-consent]"
        );

        if (!target) {
            return;
        }

        if (getCookiePreference()) {
            target.remove();
            return;
        }

        const cookie = config.cookie || {};

        target.className = "site-cookie";
        target.setAttribute("role", "region");
        target.setAttribute(
            "aria-label",
            cookie.regionLabel ||
            "Cookie and legal preferences"
        );

        target.innerHTML = `
      <div class="site-cookie__content">
        ${createIconMarkup(
            "shield-check",
            "site-cookie__icon"
        )}

        <p class="site-cookie__text">
          ${escapeHTML(cookie.text || "")}

          <a
            href="${escapeAttribute(
            cookie.privacyHref ||
            "privacy-policy.html"
        )}"
          >
            ${escapeHTML(
            cookie.privacyLabel || "Privacy Policy"
        )}
          </a>

          <span aria-hidden="true">·</span>

          <a
            href="${escapeAttribute(
            cookie.cookieHref ||
            "cookie-policy.html"
        )}"
          >
            ${escapeHTML(
            cookie.cookieLabel || "Cookie Policy"
        )}
          </a>
        </p>
      </div>

      <div class="site-cookie__actions">
        <button
          class="site-cookie__button"
          type="button"
          data-cookie-choice="essential"
        >
          ${escapeHTML(
            cookie.essentialLabel ||
            "Essential Only"
        )}
        </button>

        <button
          class="site-cookie__button site-cookie__button--primary"
          type="button"
          data-cookie-choice="accepted"
        >
          ${escapeHTML(
            cookie.acceptLabel || "Accept"
        )}
        </button>
      </div>
    `;

        target.addEventListener("click", (event) => {
            const button = event.target.closest(
                "[data-cookie-choice]"
            );

            if (!button) {
                return;
            }

            saveCookiePreference(
                button.dataset.cookieChoice || "essential"
            );

            target.remove();
        });
    };

    const hydrateConfigBindings = (scope = document) => {
        scope.querySelectorAll("[data-site-text]").forEach(
            (element) => {
                const value = getConfigValue(
                    element.dataset.siteText
                );

                if (
                    value !== undefined &&
                    value !== null &&
                    typeof value !== "object"
                ) {
                    element.textContent = String(value);
                }
            }
        );

        scope.querySelectorAll("[data-site-href]").forEach(
            (element) => {
                const value = getConfigValue(
                    element.dataset.siteHref
                );

                if (typeof value === "string" && value) {
                    element.setAttribute("href", value);
                }
            }
        );

        scope.querySelectorAll("[data-site-src]").forEach(
            (element) => {
                const value = getConfigValue(
                    element.dataset.siteSrc
                );

                if (typeof value === "string" && value) {
                    element.setAttribute("src", value);
                }
            }
        );

        scope.querySelectorAll("[data-site-mailto]").forEach(
            (element) => {
                const value = getConfigValue(
                    element.dataset.siteMailto
                );

                if (typeof value !== "string" || !value) {
                    return;
                }

                element.setAttribute("href", `mailto:${value}`);
                element.textContent = value;
            }
        );

        scope.querySelectorAll("[data-current-year]").forEach(
            (element) => {
                element.textContent = String(
                    new Date().getFullYear()
                );
            }
        );
    };

    const refreshIcons = () => {
        if (
            !window.lucide ||
            typeof window.lucide.createIcons !== "function"
        ) {
            return;
        }

        window.lucide.createIcons({
            attrs: {
                "aria-hidden": "true"
            },
            nameAttr: "data-lucide"
        });
    };

    const setFavicon = () => {
        const faviconPath = config.brand?.favicon;

        if (!faviconPath) {
            return;
        }

        let favicon = document.querySelector(
            'link[rel="icon"]'
        );

        if (!favicon) {
            favicon = document.createElement("link");
            favicon.rel = "icon";
            document.head.appendChild(favicon);
        }

        favicon.type = "image/svg+xml";
        favicon.href = faviconPath;
    };

    const setCanonicalMetadata = () => {
        const canonicalBase = String(
            config.site?.canonicalBase || ""
        ).replace(/\/+$/, "");

        if (!canonicalBase) {
            return;
        }

        const pagePath =
            currentFile === "index.html"
                ? ""
                : `/${currentFile}`;

        const canonicalUrl =
            `${canonicalBase}${pagePath}`;

        let canonical = document.querySelector(
            'link[rel="canonical"]'
        );

        if (!canonical) {
            canonical = document.createElement("link");
            canonical.rel = "canonical";
            document.head.appendChild(canonical);
        }

        canonical.href = canonicalUrl;

        const ogUrl = document.querySelector(
            'meta[property="og:url"]'
        );

        if (ogUrl) {
            ogUrl.setAttribute("content", canonicalUrl);
        }

        const defaultOgImage =
            config.site?.defaultOgImage;

        if (defaultOgImage) {
            const normalizedImage = String(
                defaultOgImage
            ).replace(/^\/+/, "");

            const absoluteImage =
                `${canonicalBase}/${normalizedImage}`;

            document
                .querySelectorAll(
                    'meta[property="og:image"], meta[name="twitter:image"]'
                )
                .forEach((meta) => {
                    meta.setAttribute("content", absoluteImage);
                });
        }
    };

    const setOrganizationSchema = () => {
        const existingSchema = document.querySelector(
            'script[data-generated-schema="organization"]'
        );

        if (existingSchema) {
            existingSchema.remove();
        }

        const canonicalBase =
            config.site?.canonicalBase || "";

        const logoPath =
            config.brand?.logoMark || "";

        const logoUrl =
            canonicalBase && logoPath
                ? `${String(canonicalBase).replace(/\/+$/, "")}/${String(
                    logoPath
                ).replace(/^\/+/, "")}`
                : logoPath;

        const schema = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": config.brand?.name || "",
            "legalName": config.brand?.legalName || "",
            "url": canonicalBase,
            "logo": logoUrl,
            "email": config.contact?.recipientEmail || "",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": config.contact?.address || "",
                "addressLocality": "Charlotte",
                "addressRegion": "NC",
                "postalCode": "28203",
                "addressCountry": "US"
            },
            "areaServed": {
                "@type": "Place",
                "name":
                    config.contact?.primaryMarket ||
                    "Charlotte, NC"
            }
        };

        const script = document.createElement("script");

        script.type = "application/ld+json";
        script.dataset.generatedSchema = "organization";
        script.textContent = JSON.stringify(schema);

        document.head.appendChild(script);
    };

    const setSourcePage = () => {
        document
            .querySelectorAll('input[name="sourcePage"]')
            .forEach((input) => {
                input.value =
                    `${currentFile}${window.location.hash || ""}`;
            });
    };

    const setPageIdentity = () => {
        const pageName = currentFile
            .replace(/\.html$/i, "")
            .replace(/[^a-z0-9]+/gi, "-");

        body.dataset.page = pageName || "home";
        body.classList.add(`page-${pageName || "home"}`);
    };

    const updateHeaderState = () => {
        const header = document.querySelector(
            "[data-site-header]"
        );

        if (!header) {
            return;
        }

        header.classList.toggle(
            "is-scrolled",
            window.scrollY > 28
        );
    };

    const requestHeaderUpdate = () => {
        if (headerFrameRequested) {
            return;
        }

        headerFrameRequested = true;

        window.requestAnimationFrame(() => {
            updateHeaderState();
            headerFrameRequested = false;
        });
    };

    const getFocusableElements = (container) => {
        if (!container) {
            return [];
        }

        return Array.from(
            container.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter((element) => {
            return (
                !element.hidden &&
                element.getAttribute("aria-hidden") !== "true" &&
                element.offsetParent !== null
            );
        });
    };

    const openMobileMenu = () => {
        const menu = document.querySelector(
            "[data-mobile-menu]"
        );

        const openButton = document.querySelector(
            "[data-menu-open]"
        );

        const header = document.querySelector(
            "[data-site-header]"
        );

        if (!menu || !openButton) {
            return;
        }

        if (menuCloseTimer) {
            window.clearTimeout(menuCloseTimer);
            menuCloseTimer = null;
        }

        lastFocusedElement = document.activeElement;

        menu.hidden = false;
        menu.setAttribute("aria-hidden", "false");

        openButton.setAttribute("aria-expanded", "true");
        openButton.setAttribute(
            "aria-label",
            config.navigation?.menuCloseLabel ||
            "Close site navigation"
        );

        body.classList.add("is-menu-open");
        header?.classList.add("is-menu-active");

        window.requestAnimationFrame(() => {
            menu.classList.add("is-open");

            const closeButton = menu.querySelector(
                "[data-menu-close]"
            );

            closeButton?.focus();
        });
    };

    const closeMobileMenu = (
        restoreFocus = true
    ) => {
        const menu = document.querySelector(
            "[data-mobile-menu]"
        );

        const openButton = document.querySelector(
            "[data-menu-open]"
        );

        const header = document.querySelector(
            "[data-site-header]"
        );

        if (!menu || !openButton || menu.hidden) {
            return;
        }

        menu.classList.remove("is-open");
        menu.setAttribute("aria-hidden", "true");

        openButton.setAttribute("aria-expanded", "false");
        openButton.setAttribute(
            "aria-label",
            config.navigation?.menuOpenLabel ||
            "Open site navigation"
        );

        body.classList.remove("is-menu-open");
        header?.classList.remove("is-menu-active");

        const delay = reducedMotionQuery.matches
            ? 0
            : 340;

        menuCloseTimer = window.setTimeout(() => {
            menu.hidden = true;
            menuCloseTimer = null;
        }, delay);

        if (
            restoreFocus &&
            lastFocusedElement &&
            typeof lastFocusedElement.focus === "function"
        ) {
            lastFocusedElement.focus();
        }
    };

    const trapMobileMenuFocus = (event) => {
        const menu = document.querySelector(
            "[data-mobile-menu]"
        );

        if (
            !menu ||
            menu.hidden ||
            event.key !== "Tab"
        ) {
            return;
        }

        const focusableElements =
            getFocusableElements(menu);

        if (!focusableElements.length) {
            event.preventDefault();
            return;
        }

        const firstElement = focusableElements[0];
        const lastElement =
            focusableElements[
            focusableElements.length - 1
            ];

        if (
            event.shiftKey &&
            document.activeElement === firstElement
        ) {
            event.preventDefault();
            lastElement.focus();
            return;
        }

        if (
            !event.shiftKey &&
            document.activeElement === lastElement
        ) {
            event.preventDefault();
            firstElement.focus();
        }
    };

    const bindMobileMenu = () => {
        const openButton = document.querySelector(
            "[data-menu-open]"
        );

        const menu = document.querySelector(
            "[data-mobile-menu]"
        );

        if (!openButton || !menu) {
            return;
        }

        openButton.addEventListener("click", () => {
            const expanded =
                openButton.getAttribute("aria-expanded") ===
                "true";

            if (expanded) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        menu.addEventListener("click", (event) => {
            if (event.target.closest("[data-menu-close]")) {
                closeMobileMenu();
                return;
            }

            const link = event.target.closest("a[href]");

            if (link) {
                closeMobileMenu(false);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !menu.hidden) {
                event.preventDefault();
                closeMobileMenu();
                return;
            }

            trapMobileMenuFocus(event);
        });

        window.addEventListener(
            "resize",
            () => {
                if (
                    window.innerWidth > 1024 &&
                    !menu.hidden
                ) {
                    closeMobileMenu(false);
                }
            },
            {
                passive: true
            }
        );
    };

    const bindSamePageLinks = () => {
        document.addEventListener("click", (event) => {
            const link = event.target.closest(
                'a[href*="#"]'
            );

            if (!link) {
                return;
            }

            let url;

            try {
                url = new URL(link.href, window.location.href);
            } catch (error) {
                return;
            }

            if (
                url.pathname !== window.location.pathname ||
                !url.hash ||
                url.hash === "#"
            ) {
                return;
            }

            const target = document.querySelector(url.hash);

            if (!target) {
                return;
            }

            event.preventDefault();

            target.scrollIntoView({
                behavior: reducedMotionQuery.matches
                    ? "auto"
                    : "smooth",
                block: "start"
            });

            window.history.pushState(
                null,
                "",
                url.hash
            );

            if (!target.hasAttribute("tabindex")) {
                target.setAttribute("tabindex", "-1");
                target.classList.add("site-focus-target");
            }

            window.setTimeout(() => {
                target.focus({
                    preventScroll: true
                });
            }, reducedMotionQuery.matches ? 0 : 420);
        });
    };

    const initializeServiceTabs = () => {
        document
            .querySelectorAll("[data-service-tabs]")
            .forEach((root) => {
                const rows = Array.from(
                    root.querySelectorAll("[data-service-tabs-row]")
                );

                const activateRow = (row) => {
                    const targetId = row.dataset.serviceTabsRow;

                    rows.forEach((otherRow) => {
                        const isTarget = otherRow === row;

                        otherRow.classList.toggle(
                            "is-active",
                            isTarget
                        );

                        const button = otherRow.querySelector(
                            "[data-service-tabs-button]"
                        );

                        if (button) {
                            button.setAttribute(
                                "aria-selected",
                                isTarget ? "true" : "false"
                            );
                            button.setAttribute(
                                "tabindex",
                                isTarget ? "0" : "-1"
                            );
                        }
                    });

                    root
                        .querySelectorAll("[data-service-tabs-panel]")
                        .forEach((panel) => {
                            panel.classList.toggle(
                                "is-active",
                                panel.dataset.serviceTabsPanel === targetId
                            );
                        });
                };

                rows.forEach((row) => {
                    const button = row.querySelector(
                        "[data-service-tabs-button]"
                    );

                    if (!button) {
                        return;
                    }

                    button.addEventListener("mouseenter", () => {
                        activateRow(row);
                    });

                    button.addEventListener("focus", () => {
                        activateRow(row);
                    });

                    button.addEventListener("click", () => {
                        activateRow(row);
                    });

                    button.addEventListener("keydown", (event) => {
                        const currentIndex = rows.indexOf(row);
                        let nextIndex = null;

                        if (event.key === "ArrowDown") {
                            nextIndex = (currentIndex + 1) % rows.length;
                        } else if (event.key === "ArrowUp") {
                            nextIndex =
                                (currentIndex - 1 + rows.length) %
                                rows.length;
                        }

                        if (nextIndex === null) {
                            return;
                        }

                        event.preventDefault();

                        const nextButton = rows[
                            nextIndex
                        ].querySelector(
                            "[data-service-tabs-button]"
                        );

                        if (nextButton) {
                            nextButton.focus();
                        }
                    });
                });
            });
    };

    const initializeAOS = () => {
        if (
            reducedMotionQuery.matches ||
            !window.AOS ||
            typeof window.AOS.init !== "function" ||
            window.__VELMORA_AOS_INITIALIZED__
        ) {
            return;
        }

        window.AOS.init({
            once: true,
            offset: 90,
            duration: 760,
            delay: 0,
            easing: "ease-out-cubic",
            anchorPlacement: "top-bottom",
            mirror: false
        });

        window.__VELMORA_AOS_INITIALIZED__ = true;
    };

    const refreshAOS = () => {
        if (
            !window.__VELMORA_AOS_INITIALIZED__ ||
            !window.AOS
        ) {
            return;
        }

        if (typeof window.AOS.refreshHard === "function") {
            window.AOS.refreshHard();
            return;
        }

        if (typeof window.AOS.refresh === "function") {
            window.AOS.refresh();
        }
    };

    const dispatchReadyEvent = () => {
        document.dispatchEvent(
            new CustomEvent("velmora:ready", {
                detail: {
                    config,
                    currentFile
                }
            })
        );
    };

    const initialize = () => {
        documentElement.classList.remove("no-js");
        documentElement.classList.add("js");

        setPageIdentity();
        renderHeader();
        renderMobileMenu();
        renderFooter();
        renderCookieConsent();
        hydrateConfigBindings();
        setFavicon();
        setCanonicalMetadata();
        setOrganizationSchema();
        setSourcePage();
        bindMobileMenu();
        bindSamePageLinks();
        updateHeaderState();
        refreshIcons();
        initializeServiceTabs();
        initializeAOS();

        window.addEventListener(
            "scroll",
            requestHeaderUpdate,
            {
                passive: true
            }
        );

        window.addEventListener(
            "load",
            () => {
                refreshIcons();
                refreshAOS();
            },
            {
                once: true
            }
        );

        dispatchReadyEvent();
    };

    window.VelmoraSite = Object.freeze({
        config,
        currentFile,
        escapeHTML,
        getConfigValue,
        hydrateConfigBindings,
        refreshIcons,
        refreshAOS,
        openMobileMenu,
        closeMobileMenu
    });

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );
    } else {
        initialize();
    }
})();
