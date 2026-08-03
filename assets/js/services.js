(() => {
    "use strict";

    const config = window.SITE_CONFIG;
    const siteAPI = window.VelmoraSite;

    if (!config || typeof config !== "object") {
        return;
    }

    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const desktopMotionQuery = window.matchMedia(
        "(min-width: 769px)"
    );

    const currentFile =
        window.location.pathname.split("/").filter(Boolean).pop() ||
        "index.html";

    let initialized = false;
    let resizeFrameRequested = false;
    let scrollFrameRequested = false;

    const heroSliders = [];
    const cardsSliders = [];

    const escapeHTML = (value) => {
        if (
            siteAPI &&
            typeof siteAPI.escapeHTML === "function"
        ) {
            return siteAPI.escapeHTML(value);
        }

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

    const getCurrentServiceSlug = () => {
        const page = document.querySelector(
            "[data-service-page]"
        );

        if (page?.dataset.serviceSlug) {
            return page.dataset.serviceSlug;
        }

        if (document.body.dataset.serviceSlug) {
            return document.body.dataset.serviceSlug;
        }

        return currentFile.replace(/\.html$/i, "");
    };

    const getCurrentService = () => {
        const services = Array.isArray(config.services)
            ? config.services
            : [];

        const slug = getCurrentServiceSlug();

        return (
            services.find((service) => {
                return service.slug === slug;
            }) ||
            services.find((service) => {
                return service.href === currentFile;
            }) ||
            null
        );
    };

    const getCurrentInformationPage = () => {
        const pageMap = {
            "how-it-works.html": config.howItWorksPage,
            "compare-to-listing.html": config.comparePage,
            "frequently-asked-questions.html": config.faqPage
        };

        return pageMap[currentFile] || null;
    };

    const setText = (
        selector,
        value,
        scope = document
    ) => {
        if (
            value === undefined ||
            value === null
        ) {
            return;
        }

        scope.querySelectorAll(selector).forEach(
            (element) => {
                element.textContent = String(value);
            }
        );
    };

    const setHref = (
        selector,
        value,
        scope = document
    ) => {
        if (!value) {
            return;
        }

        scope.querySelectorAll(selector).forEach(
            (element) => {
                element.setAttribute(
                    "href",
                    String(value)
                );
            }
        );
    };

    const setMetaContent = (
        selector,
        value
    ) => {
        if (!value) {
            return;
        }

        const element =
            document.querySelector(selector);

        if (element) {
            element.setAttribute(
                "content",
                String(value)
            );
        }
    };

    const updatePageMetadata = (
        title,
        description
    ) => {
        if (title) {
            document.title = title;

            setMetaContent(
                'meta[property="og:title"]',
                title
            );

            setMetaContent(
                'meta[name="twitter:title"]',
                title
            );
        }

        if (description) {
            setMetaContent(
                'meta[name="description"]',
                description
            );

            setMetaContent(
                'meta[property="og:description"]',
                description
            );

            setMetaContent(
                'meta[name="twitter:description"]',
                description
            );
        }
    };

    const hydrateServiceImages = (service) => {
        if (
            !service ||
            !Array.isArray(service.heroImages)
        ) {
            return;
        }

        const images = Array.from(
            document.querySelectorAll(
                "[data-service-hero-image]"
            )
        );

        images.forEach((image, index) => {
            const configuredIndex =
                Number.parseInt(
                    image.dataset.imageIndex ||
                    String(index),
                    10
                );

            const source =
                service.heroImages[configuredIndex] ||
                service.heroImages[index] ||
                service.heroImages[0];

            if (!source) {
                return;
            }

            image.setAttribute("src", source);

            if (index === 0) {
                image.setAttribute(
                    "alt",
                    `${service.label || "Property"} in the Charlotte area`
                );
            } else {
                image.setAttribute("alt", "");
                image.setAttribute(
                    "loading",
                    "lazy"
                );
            }
        });
    };

    const hydrateServicePage = () => {
        const service = getCurrentService();

        if (!service) {
            return;
        }

        updatePageMetadata(
            service.metaTitle,
            service.metaDescription
        );

        hydrateServiceImages(service);

        setText(
            "[data-service-label]",
            service.label
        );

        setText(
            "[data-service-short-label]",
            service.shortLabel
        );

        setText(
            "[data-service-summary]",
            service.summary
        );

        setText(
            "[data-service-hero-eyebrow]",
            service.heroEyebrow
        );

        setText(
            "[data-service-hero-title]",
            service.heroTitle
        );

        setText(
            "[data-service-hero-text]",
            service.heroText
        );

        const primaryCta =
            config.navigation?.primaryCta || {};

        setText(
            "[data-service-primary-cta-label]",
            primaryCta.label ||
            "Request an Offer"
        );

        setHref(
            "[data-service-primary-cta]",
            primaryCta.href ||
            "contact.html#property-offer-form"
        );

        setText(
            "[data-service-primary-market]",
            config.markets?.primary ||
            config.contact?.primaryMarket ||
            "Charlotte, NC"
        );

        setText(
            "[data-service-disclaimer]",
            config.legal?.offerDisclaimer || ""
        );
    };

    const hydrateInformationPage = () => {
        const page = getCurrentInformationPage();

        if (!page) {
            return;
        }

        updatePageMetadata(
            page.metaTitle,
            page.metaDescription
        );

        setText(
            "[data-page-hero-eyebrow]",
            page.heroEyebrow
        );

        setText(
            "[data-page-hero-title]",
            page.heroTitle
        );

        setText(
            "[data-page-hero-text]",
            page.heroText
        );
    };

    const createHeroSliderStructure = (
        slider
    ) => {
        slider.classList.add(
            "swiper",
            "service-hero__swiper"
        );

        let wrapper =
            slider.querySelector(":scope > .swiper-wrapper");

        const directSlides = Array.from(
            slider.children
        ).filter((element) => {
            return element.matches(
                "[data-service-hero-slide]"
            );
        });

        if (!wrapper && directSlides.length) {
            wrapper =
                document.createElement("div");

            wrapper.className = "swiper-wrapper";

            directSlides.forEach((slide) => {
                wrapper.appendChild(slide);
            });

            slider.prepend(wrapper);
        }

        if (!wrapper) {
            return {
                wrapper: null,
                slides: []
            };
        }

        const slides = Array.from(
            wrapper.querySelectorAll(
                ":scope > [data-service-hero-slide], :scope > .swiper-slide"
            )
        );

        slides.forEach((slide) => {
            slide.classList.add(
                "swiper-slide",
                "service-hero__slide"
            );
        });

        return {
            wrapper,
            slides
        };
    };

    const ensureHeroPagination = (
        slider,
        slides
    ) => {
        if (slides.length <= 1) {
            return null;
        }

        let pagination =
            slider.querySelector(
                "[data-service-hero-pagination]"
            );

        if (!pagination) {
            pagination =
                document.createElement("div");

            pagination.className =
                "service-hero__pagination swiper-pagination";

            pagination.dataset.serviceHeroPagination =
                "";

            slider.appendChild(pagination);
        }

        pagination.classList.add(
            "swiper-pagination"
        );

        return pagination;
    };

    const updateHeroSlideAccessibility = (
        swiper
    ) => {
        if (!swiper || !swiper.slides) {
            return;
        }

        swiper.slides.forEach(
            (slide, index) => {
                const active =
                    index === swiper.activeIndex;

                slide.setAttribute(
                    "aria-hidden",
                    active ? "false" : "true"
                );

                if ("inert" in slide) {
                    slide.inert = !active;
                }
            }
        );
    };

    const updateHeroParallax = (swiper) => {
        if (
            !swiper ||
            !swiper.slides
        ) {
            return;
        }

        swiper.slides.forEach((slide) => {
            const image = slide.querySelector(
                "[data-service-hero-image]"
            );

            if (!image) {
                return;
            }

            if (
                reducedMotionQuery.matches ||
                !desktopMotionQuery.matches
            ) {
                image.style.removeProperty(
                    "--service-slide-x"
                );

                return;
            }

            const progress =
                Number.isFinite(slide.progress)
                    ? slide.progress
                    : 0;

            const offset = progress * -72;

            image.style.setProperty(
                "--service-slide-x",
                `${offset.toFixed(2)}px`
            );
        });
    };

    const initializeHeroSlider = (
        slider,
        index
    ) => {
        if (
            !slider ||
            slider.dataset.swiperInitialized ===
            "true"
        ) {
            return;
        }

        const structure =
            createHeroSliderStructure(slider);

        const slides = structure.slides;

        if (!slides.length) {
            slider
                .closest("[data-service-hero]")
                ?.classList.add("is-ready");

            return;
        }

        if (typeof window.Swiper !== "function") {
            slides.forEach((slide, slideIndex) => {
                slide.hidden = slideIndex !== 0;
            });

            slider
                .closest("[data-service-hero]")
                ?.classList.add("is-ready");

            return;
        }

        const pagination =
            ensureHeroPagination(
                slider,
                slides
            );

        slider.setAttribute(
            "aria-label",
            slider.getAttribute("aria-label") ||
            "Property photographs"
        );

        const swiper = new window.Swiper(
            slider,
            {
                slidesPerView: 1,
                speed: reducedMotionQuery.matches
                    ? 0
                    : 860,
                loop: false,
                rewind: false,
                grabCursor: slides.length > 1,
                watchOverflow: true,
                watchSlidesProgress: true,
                resistanceRatio: 0.78,
                threshold: 8,
                nested: true,
                keyboard: {
                    enabled: true,
                    onlyInViewport: true
                },
                pagination: pagination
                    ? {
                        el: pagination,
                        clickable: true,
                        dynamicBullets: false
                    }
                    : undefined,
                a11y: {
                    enabled: true,
                    containerMessage:
                        "Property image gallery",
                    firstSlideMessage:
                        "This is the first property image",
                    lastSlideMessage:
                        "This is the last property image",
                    paginationBulletMessage:
                        "Show property image {{index}}"
                },
                on: {
                    init(instance) {
                        updateHeroSlideAccessibility(
                            instance
                        );

                        updateHeroParallax(instance);

                        slider
                            .closest("[data-service-hero]")
                            ?.classList.add("is-ready");
                    },

                    progress(instance) {
                        updateHeroParallax(instance);
                    },

                    setTranslate(instance) {
                        updateHeroParallax(instance);
                    },

                    slideChange(instance) {
                        updateHeroSlideAccessibility(
                            instance
                        );
                    },

                    resize(instance) {
                        updateHeroParallax(instance);
                    }
                }
            }
        );

        slider.dataset.swiperInitialized =
            "true";

        slider.dataset.serviceHeroIndex =
            String(index);

        slider.swiper = swiper;

        heroSliders.push(swiper);
    };

    const initializeHeroSliders = () => {
        document
            .querySelectorAll(
                "[data-service-hero-slider], [data-service-hero-carousel]"
            )
            .forEach((slider, index) => {
                initializeHeroSlider(
                    slider,
                    index
                );
            });
    };

    const setExpandableCardState = (
        cards,
        activeCard
    ) => {
        cards.forEach((card) => {
            const active =
                card === activeCard;

            const button = card.querySelector(
                "[data-expand-card-button]"
            );

            card.classList.toggle(
                "is-active",
                active
            );

            if (button) {
                button.setAttribute(
                    "aria-expanded",
                    active ? "true" : "false"
                );
            }
        });
    };

    const initializeExpandableCards = () => {
        document
            .querySelectorAll(
                "[data-service-expand-list]"
            )
            .forEach((container) => {
                const cards = Array.from(
                    container.querySelectorAll(
                        "[data-expand-card]"
                    )
                );

                if (!cards.length) {
                    return;
                }

                const initialCard =
                    cards.find((card) => {
                        return card.classList.contains(
                            "is-active"
                        );
                    }) || cards[0];

                setExpandableCardState(
                    cards,
                    initialCard
                );

                cards.forEach((card) => {
                    const button = card.querySelector(
                        "[data-expand-card-button]"
                    );

                    if (!button) {
                        return;
                    }

                    button.addEventListener(
                        "click",
                        () => {
                            setExpandableCardState(
                                cards,
                                card
                            );

                            siteAPI?.refreshAOS?.();
                        }
                    );

                    button.addEventListener(
                        "focus",
                        () => {
                            setExpandableCardState(
                                cards,
                                card
                            );
                        }
                    );

                    card.addEventListener(
                        "pointerenter",
                        () => {
                            if (
                                window.matchMedia(
                                    "(hover: hover)"
                                ).matches
                            ) {
                                setExpandableCardState(
                                    cards,
                                    card
                                );
                            }
                        }
                    );
                });
            });
    };

    const setFlipCardState = (
        card,
        flipped
    ) => {
        const button = card.querySelector(
            "[data-flip-card-button]"
        );

        card.classList.toggle(
            "is-flipped",
            flipped
        );

        if (button) {
            button.setAttribute(
                "aria-pressed",
                flipped ? "true" : "false"
            );
        }
    };

    const initializeFlipCards = () => {
        document
            .querySelectorAll(
                "[data-flip-card]"
            )
            .forEach((card) => {
                const button = card.querySelector(
                    "[data-flip-card-button]"
                );

                if (!button) {
                    return;
                }

                setFlipCardState(
                    card,
                    card.classList.contains(
                        "is-flipped"
                    )
                );

                button.addEventListener(
                    "click",
                    () => {
                        setFlipCardState(
                            card,
                            !card.classList.contains(
                                "is-flipped"
                            )
                        );
                    }
                );

                button.addEventListener(
                    "keydown",
                    (event) => {
                        if (event.key !== "Escape") {
                            return;
                        }

                        setFlipCardState(card, false);
                        button.focus();
                    }
                );
            });
    };

    const createCardsSliderStructure = (
        slider
    ) => {
        slider.classList.add("swiper");

        let wrapper =
            slider.querySelector(
                ":scope > .swiper-wrapper"
            );

        const directSlides = Array.from(
            slider.children
        ).filter((element) => {
            return element.matches(
                "[data-service-cards-slide]"
            );
        });

        if (!wrapper && directSlides.length) {
            wrapper =
                document.createElement("div");

            wrapper.className = "swiper-wrapper";

            directSlides.forEach((slide) => {
                wrapper.appendChild(slide);
            });

            slider.prepend(wrapper);
        }

        if (!wrapper) {
            return [];
        }

        const slides = Array.from(
            wrapper.children
        );

        slides.forEach((slide) => {
            slide.classList.add(
                "swiper-slide"
            );
        });

        return slides;
    };

    const initializeCardsSlider = (
        slider
    ) => {
        if (
            !slider ||
            slider.dataset.swiperInitialized ===
            "true"
        ) {
            return;
        }

        const slides =
            createCardsSliderStructure(slider);

        if (
            !slides.length ||
            typeof window.Swiper !== "function"
        ) {
            return;
        }

        const section = slider.closest(
            "[data-service-cards-section]"
        );

        let pagination =
            section?.querySelector(
                "[data-service-cards-pagination]"
            );

        if (
            !pagination &&
            slides.length > 1 &&
            section
        ) {
            pagination =
                document.createElement("div");

            pagination.className =
                "service-cards__pagination swiper-pagination";

            pagination.dataset.serviceCardsPagination =
                "";

            section.appendChild(pagination);
        }

        const swiper = new window.Swiper(
            slider,
            {
                slidesPerView: 1,
                spaceBetween: 18,
                speed: reducedMotionQuery.matches
                    ? 0
                    : 680,
                loop: false,
                grabCursor: slides.length > 1,
                watchOverflow: true,
                keyboard: {
                    enabled: true,
                    onlyInViewport: true
                },
                pagination: pagination
                    ? {
                        el: pagination,
                        clickable: true
                    }
                    : undefined,
                breakpoints: {
                    720: {
                        slidesPerView: 2,
                        spaceBetween: 22
                    },
                    1080: {
                        slidesPerView: 3,
                        spaceBetween: 26
                    }
                },
                a11y: {
                    enabled: true,
                    containerMessage:
                        "Property information cards",
                    paginationBulletMessage:
                        "Show information card {{index}}"
                }
            }
        );

        slider.dataset.swiperInitialized =
            "true";

        slider.swiper = swiper;

        cardsSliders.push(swiper);
    };

    const initializeCardsSliders = () => {
        document
            .querySelectorAll(
                "[data-service-cards-slider]"
            )
            .forEach((slider) => {
                initializeCardsSlider(slider);
            });
    };

    const setAccordionState = (
        button,
        panel,
        open
    ) => {
        button.setAttribute(
            "aria-expanded",
            open ? "true" : "false"
        );

        panel.classList.toggle(
            "is-open",
            open
        );

        panel.setAttribute(
            "aria-hidden",
            open ? "false" : "true"
        );

        if ("inert" in panel) {
            panel.inert = !open;
        }
    };

    const initializeAccordions = () => {
        document
            .querySelectorAll(
                "[data-service-faq], [data-page-faq]"
            )
            .forEach((accordion, groupIndex) => {
                const buttons = Array.from(
                    accordion.querySelectorAll(
                        "[data-service-faq-button], [data-page-faq-button]"
                    )
                );

                buttons.forEach(
                    (button, buttonIndex) => {
                        let panelId =
                            button.getAttribute(
                                "aria-controls"
                            );

                        let panel = panelId
                            ? document.getElementById(panelId)
                            : null;

                        if (!panel) {
                            panel =
                                button
                                    .closest(
                                        ".service-faq-item, .page-faq-item"
                                    )
                                    ?.querySelector(
                                        ".service-faq-item__panel, .page-faq-item__panel"
                                    ) || null;
                        }

                        if (!panel) {
                            return;
                        }

                        if (!button.id) {
                            button.id =
                                `page-faq-button-${groupIndex + 1}-${buttonIndex + 1}`;
                        }

                        if (!panel.id) {
                            panel.id =
                                `page-faq-panel-${groupIndex + 1}-${buttonIndex + 1}`;
                        }

                        button.setAttribute(
                            "aria-controls",
                            panel.id
                        );

                        panel.setAttribute(
                            "aria-labelledby",
                            button.id
                        );

                        const initiallyOpen =
                            button.getAttribute(
                                "aria-expanded"
                            ) === "true";

                        setAccordionState(
                            button,
                            panel,
                            initiallyOpen
                        );

                        button.addEventListener(
                            "click",
                            () => {
                                const open =
                                    button.getAttribute(
                                        "aria-expanded"
                                    ) !== "true";

                                setAccordionState(
                                    button,
                                    panel,
                                    open
                                );

                                window.setTimeout(
                                    () => {
                                        siteAPI?.refreshAOS?.();
                                    },
                                    reducedMotionQuery.matches
                                        ? 0
                                        : 320
                                );
                            }
                        );
                    }
                );
            });
    };

    const renderServiceAreas = () => {
        const targets =
            document.querySelectorAll(
                "[data-service-area-list]"
            );

        if (!targets.length) {
            return;
        }

        const markets = config.markets || {};

        const areas = Array.isArray(
            markets.areas
        )
            ? markets.areas
            : [];

        targets.forEach((target) => {
            target.innerHTML = areas
                .map((area) => {
                    return `
            <li class="service-areas__item">
              <i
                data-lucide="map-pin"
                aria-hidden="true"
              ></i>

              <span>
                ${escapeHTML(area)}
              </span>
            </li>
          `;
                })
                .join("");
        });

        setText(
            "[data-service-areas-heading]",
            markets.heading || ""
        );

        setText(
            "[data-service-areas-intro]",
            markets.intro || ""
        );
    };

    const renderHowItWorksSteps = () => {
        const target = document.querySelector(
            "[data-how-it-works-steps]"
        );

        const steps =
            config.howItWorksPage?.steps;

        if (
            !target ||
            !Array.isArray(steps)
        ) {
            return;
        }

        target.innerHTML = steps
            .map((step) => {
                return `
          <article class="service-process-item">
            <span class="service-process-item__icon">
              <i
                data-lucide="${escapeAttribute(
                    step.icon ||
                    "clipboard-check"
                )}"
                aria-hidden="true"
              ></i>
            </span>

            <div class="service-process-item__content">
              <h2 class="service-process-item__title">
                ${escapeHTML(step.title || "")}
              </h2>

              <p class="service-process-item__text">
                ${escapeHTML(step.text || "")}
              </p>
            </div>
          </article>
        `;
            })
            .join("");
    };

    const renderComparisonRows = () => {
        const target = document.querySelector(
            "[data-compare-page-rows]"
        );

        const comparison =
            config.home?.comparison;

        const rows = comparison?.rows;

        if (
            !target ||
            !Array.isArray(rows)
        ) {
            return;
        }

        target.innerHTML = rows
            .map((row) => {
                return `
          <article class="service-comparison-row">
            <h2 class="service-comparison-row__topic">
              ${escapeHTML(row.topic || "")}
            </h2>

            <div class="service-comparison-row__option service-comparison-row__option--direct">
              <span class="service-comparison-row__label">
                ${escapeHTML(
                    comparison.directTitle ||
                    "Direct Cash Sale"
                )}
              </span>

              <p>
                ${escapeHTML(row.direct || "")}
              </p>
            </div>

            <div class="service-comparison-row__option service-comparison-row__option--listing">
              <span class="service-comparison-row__label">
                ${escapeHTML(
                    comparison.listingTitle ||
                    "Traditional Listing"
                )}
              </span>

              <p>
                ${escapeHTML(row.listing || "")}
              </p>
            </div>
          </article>
        `;
            })
            .join("");
    };

    const renderFAQPage = () => {
        const target = document.querySelector(
            "[data-faq-page-list]"
        );

        const items =
            config.home?.faq?.items;

        if (
            !target ||
            !Array.isArray(items)
        ) {
            return;
        }

        target.innerHTML = items
            .map((item, index) => {
                const buttonId =
                    `faq-page-button-${index + 1}`;

                const panelId =
                    `faq-page-panel-${index + 1}`;

                return `
          <article class="service-faq-item">
            <h2>
              <button
                class="service-faq-item__button"
                id="${buttonId}"
                type="button"
                aria-expanded="false"
                aria-controls="${panelId}"
                data-page-faq-button
              >
                <span class="service-faq-item__question">
                  ${escapeHTML(
                    item.question || ""
                )}
                </span>

                <span
                  class="service-faq-item__icon"
                  aria-hidden="true"
                >
                  <i data-lucide="plus"></i>
                  <i data-lucide="minus"></i>
                </span>
              </button>
            </h2>

            <div
              class="service-faq-item__panel"
              id="${panelId}"
              aria-hidden="true"
            >
              <div class="service-faq-item__panel-inner">
                <p class="service-faq-item__answer">
                  ${escapeHTML(
                    item.answer || ""
                )}
                </p>
              </div>
            </div>
          </article>
        `;
            })
            .join("");
    };

    const updateBackgroundParallax = () => {
        document
            .querySelectorAll(
                "[data-service-parallax]"
            )
            .forEach((section) => {
                if (
                    reducedMotionQuery.matches ||
                    !desktopMotionQuery.matches
                ) {
                    section.style.removeProperty(
                        "--service-parallax-y"
                    );

                    return;
                }

                const rect =
                    section.getBoundingClientRect();

                const viewportHeight =
                    window.innerHeight ||
                    document.documentElement.clientHeight;

                if (
                    rect.bottom < 0 ||
                    rect.top > viewportHeight
                ) {
                    return;
                }

                const progress =
                    (viewportHeight - rect.top) /
                    (viewportHeight + rect.height);

                const normalizedProgress =
                    Math.min(
                        Math.max(progress, 0),
                        1
                    );

                const offset =
                    (normalizedProgress - 0.5) * 76;

                section.style.setProperty(
                    "--service-parallax-y",
                    `${offset.toFixed(2)}px`
                );
            });
    };

    const updateMotionEffects = () => {
        heroSliders.forEach((swiper) => {
            updateHeroParallax(swiper);
        });

        updateBackgroundParallax();
    };

    const requestScrollUpdate = () => {
        if (scrollFrameRequested) {
            return;
        }

        scrollFrameRequested = true;

        window.requestAnimationFrame(() => {
            updateMotionEffects();
            scrollFrameRequested = false;
        });
    };

    const requestResizeUpdate = () => {
        if (resizeFrameRequested) {
            return;
        }

        resizeFrameRequested = true;

        window.requestAnimationFrame(() => {
            heroSliders.forEach((swiper) => {
                swiper.update();
            });

            cardsSliders.forEach((swiper) => {
                swiper.update();
            });

            updateMotionEffects();

            resizeFrameRequested = false;
        });
    };

    const handleMotionPreferenceChange = () => {
        heroSliders.forEach((swiper) => {
            swiper.params.speed =
                reducedMotionQuery.matches
                    ? 0
                    : 860;

            swiper.update();
        });

        cardsSliders.forEach((swiper) => {
            swiper.params.speed =
                reducedMotionQuery.matches
                    ? 0
                    : 680;

            swiper.update();
        });

        requestResizeUpdate();
    };

    const bindGlobalEvents = () => {
        window.addEventListener(
            "scroll",
            requestScrollUpdate,
            {
                passive: true
            }
        );

        window.addEventListener(
            "resize",
            requestResizeUpdate,
            {
                passive: true
            }
        );

        if (
            typeof reducedMotionQuery.addEventListener ===
            "function"
        ) {
            reducedMotionQuery.addEventListener(
                "change",
                handleMotionPreferenceChange
            );
        } else if (
            typeof reducedMotionQuery.addListener ===
            "function"
        ) {
            reducedMotionQuery.addListener(
                handleMotionPreferenceChange
            );
        }

        if (
            typeof desktopMotionQuery.addEventListener ===
            "function"
        ) {
            desktopMotionQuery.addEventListener(
                "change",
                requestResizeUpdate
            );
        } else if (
            typeof desktopMotionQuery.addListener ===
            "function"
        ) {
            desktopMotionQuery.addListener(
                requestResizeUpdate
            );
        }
    };

    const initialize = () => {
        if (initialized) {
            return;
        }

        initialized = true;

        hydrateServicePage();
        hydrateInformationPage();
        renderServiceAreas();
        renderHowItWorksSteps();
        renderComparisonRows();
        renderFAQPage();

        initializeHeroSliders();
        initializeExpandableCards();
        initializeFlipCards();
        initializeCardsSliders();
        initializeAccordions();

        bindGlobalEvents();
        updateMotionEffects();

        siteAPI?.refreshIcons?.();
        siteAPI?.refreshAOS?.();
    };

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