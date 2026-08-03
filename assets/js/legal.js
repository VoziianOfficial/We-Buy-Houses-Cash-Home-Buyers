(() => {
    "use strict";

    const legalNav = document.querySelector("[data-legal-nav]");
    const legalSections = Array.from(
        document.querySelectorAll("[data-legal-section][id]")
    );

    if (!legalNav || legalSections.length === 0) {
        return;
    }

    const legalLinks = Array.from(
        legalNav.querySelectorAll("[data-legal-nav-link]")
    );

    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    let sectionObserver = null;
    let resizeTimer = 0;
    let scrollFrame = 0;
    let hashScrollTimer = 0;
    let isProgrammaticScroll = false;

    const getHeaderOffset = () => {
        const rootStyles = getComputedStyle(
            document.documentElement
        );

        const configuredHeight = parseFloat(
            rootStyles.getPropertyValue(
                "--header-total-height"
            )
        );

        if (
            Number.isFinite(configuredHeight) &&
            configuredHeight > 0
        ) {
            return configuredHeight + 24;
        }

        const siteHeader = document.querySelector(
            "[data-site-header]"
        );

        if (siteHeader instanceof HTMLElement) {
            return siteHeader.getBoundingClientRect().height + 24;
        }

        return 130;
    };

    const getSectionFromLink = (link) => {
        if (!(link instanceof HTMLAnchorElement)) {
            return null;
        }

        const href = link.getAttribute("href");

        if (!href || !href.startsWith("#")) {
            return null;
        }

        const sectionId = decodeURIComponent(
            href.slice(1)
        );

        return legalSections.find(
            (section) => section.id === sectionId
        ) || null;
    };

    const getLinkFromSection = (section) => {
        if (!(section instanceof HTMLElement)) {
            return null;
        }

        return legalLinks.find((link) => {
            return getSectionFromLink(link) === section;
        }) || null;
    };

    const setActiveSection = (
        section,
        updateAddress = false
    ) => {
        if (!(section instanceof HTMLElement)) {
            return;
        }

        legalSections.forEach((item) => {
            item.classList.toggle(
                "is-current",
                item === section
            );
        });

        legalLinks.forEach((link) => {
            const linkedSection = getSectionFromLink(link);
            const isActive = linkedSection === section;

            link.classList.toggle(
                "is-active",
                isActive
            );

            if (isActive) {
                link.setAttribute(
                    "aria-current",
                    "location"
                );
            } else {
                link.removeAttribute("aria-current");
            }
        });

        if (
            updateAddress &&
            window.location.hash !== `#${section.id}`
        ) {
            const nextUrl =
                `${window.location.pathname}` +
                `${window.location.search}` +
                `#${encodeURIComponent(section.id)}`;

            window.history.replaceState(
                null,
                "",
                nextUrl
            );
        }
    };

    const focusSection = (section) => {
        if (!(section instanceof HTMLElement)) {
            return;
        }

        const hadTabindex =
            section.hasAttribute("tabindex");

        if (!hadTabindex) {
            section.setAttribute(
                "tabindex",
                "-1"
            );
        }

        section.focus({
            preventScroll: true
        });

        if (!hadTabindex) {
            section.addEventListener(
                "blur",
                () => {
                    section.removeAttribute("tabindex");
                },
                {
                    once: true
                }
            );
        }
    };

    const scrollToSection = (
        section,
        options = {}
    ) => {
        if (!(section instanceof HTMLElement)) {
            return;
        }

        const {
            updateHistory = true,
            focusAfterScroll = true
        } = options;

        const sectionTop =
            window.scrollY +
            section.getBoundingClientRect().top -
            getHeaderOffset();

        isProgrammaticScroll = true;

        window.scrollTo({
            top: Math.max(0, sectionTop),
            behavior: reducedMotionQuery.matches
                ? "auto"
                : "smooth"
        });

        setActiveSection(
            section,
            false
        );

        if (updateHistory) {
            const nextUrl =
                `${window.location.pathname}` +
                `${window.location.search}` +
                `#${encodeURIComponent(section.id)}`;

            window.history.pushState(
                null,
                "",
                nextUrl
            );
        }

        window.clearTimeout(hashScrollTimer);

        hashScrollTimer = window.setTimeout(
            () => {
                isProgrammaticScroll = false;

                if (focusAfterScroll) {
                    focusSection(section);
                }
            },
            reducedMotionQuery.matches ? 40 : 650
        );
    };

    const getClosestVisibleSection = () => {
        const offset = getHeaderOffset();
        const activationLine = offset + 80;

        let currentSection = legalSections[0];
        let smallestDistance = Number.POSITIVE_INFINITY;

        legalSections.forEach((section) => {
            const rect = section.getBoundingClientRect();
            const distance = Math.abs(
                rect.top - activationLine
            );

            if (
                rect.top <= activationLine &&
                rect.bottom > activationLine
            ) {
                currentSection = section;
                smallestDistance = -1;
                return;
            }

            if (
                smallestDistance !== -1 &&
                distance < smallestDistance
            ) {
                smallestDistance = distance;
                currentSection = section;
            }
        });

        return currentSection;
    };

    const updateActiveFromScroll = () => {
        scrollFrame = 0;

        if (isProgrammaticScroll) {
            return;
        }

        const section = getClosestVisibleSection();

        if (section) {
            setActiveSection(
                section,
                true
            );
        }
    };

    const requestScrollUpdate = () => {
        if (scrollFrame) {
            return;
        }

        scrollFrame = window.requestAnimationFrame(
            updateActiveFromScroll
        );
    };

    const createSectionObserver = () => {
        sectionObserver?.disconnect();
        sectionObserver = null;

        if (!("IntersectionObserver" in window)) {
            window.addEventListener(
                "scroll",
                requestScrollUpdate,
                {
                    passive: true
                }
            );

            requestScrollUpdate();
            return;
        }

        const topMargin = -getHeaderOffset();
        const bottomMargin = -55;

        sectionObserver = new IntersectionObserver(
            (entries) => {
                if (isProgrammaticScroll) {
                    return;
                }

                const visibleEntries = entries
                    .filter(
                        (entry) =>
                            entry.isIntersecting &&
                            entry.intersectionRatio > 0
                    )
                    .sort((first, second) => {
                        const firstDistance = Math.abs(
                            first.boundingClientRect.top -
                            getHeaderOffset()
                        );

                        const secondDistance = Math.abs(
                            second.boundingClientRect.top -
                            getHeaderOffset()
                        );

                        return firstDistance - secondDistance;
                    });

                if (visibleEntries.length > 0) {
                    const section =
                        visibleEntries[0].target;

                    if (section instanceof HTMLElement) {
                        setActiveSection(
                            section,
                            true
                        );
                    }

                    return;
                }

                requestScrollUpdate();
            },
            {
                root: null,
                rootMargin:
                    `${topMargin}px 0px ${bottomMargin}% 0px`,
                threshold: [
                    0,
                    0.08,
                    0.2,
                    0.45,
                    0.7
                ]
            }
        );

        legalSections.forEach((section) => {
            sectionObserver?.observe(section);
        });
    };

    const handleNavigationClick = (event) => {
        const link = event.target.closest(
            "[data-legal-nav-link]"
        );

        if (
            !(link instanceof HTMLAnchorElement) ||
            !legalNav.contains(link)
        ) {
            return;
        }

        const section = getSectionFromLink(link);

        if (!section) {
            return;
        }

        event.preventDefault();

        scrollToSection(section, {
            updateHistory: true,
            focusAfterScroll: true
        });
    };

    const handleHashChange = () => {
        const hash = decodeURIComponent(
            window.location.hash.replace(/^#/, "")
        );

        if (!hash) {
            return;
        }

        const section = legalSections.find(
            (item) => item.id === hash
        );

        if (!section) {
            return;
        }

        scrollToSection(section, {
            updateHistory: false,
            focusAfterScroll: true
        });
    };

    const handleResize = () => {
        window.clearTimeout(resizeTimer);

        resizeTimer = window.setTimeout(
            () => {
                createSectionObserver();
                requestScrollUpdate();
            },
            180
        );
    };

    const handleInitialHash = () => {
        const hash = decodeURIComponent(
            window.location.hash.replace(/^#/, "")
        );

        if (!hash) {
            const initialSection =
                getClosestVisibleSection();

            if (initialSection) {
                setActiveSection(
                    initialSection,
                    false
                );
            }

            return;
        }

        const section = legalSections.find(
            (item) => item.id === hash
        );

        if (!section) {
            return;
        }

        window.setTimeout(
            () => {
                scrollToSection(section, {
                    updateHistory: false,
                    focusAfterScroll: false
                });
            },
            120
        );
    };

    legalLinks.forEach((link) => {
        const section = getSectionFromLink(link);

        if (!section) {
            link.remove();
        }
    });

    legalNav.addEventListener(
        "click",
        handleNavigationClick
    );

    window.addEventListener(
        "hashchange",
        handleHashChange
    );

    window.addEventListener(
        "resize",
        handleResize,
        {
            passive: true
        }
    );

    window.addEventListener(
        "orientationchange",
        handleResize,
        {
            passive: true
        }
    );

    document.addEventListener(
        "visibilitychange",
        () => {
            if (!document.hidden) {
                requestScrollUpdate();
            }
        }
    );

    createSectionObserver();
    handleInitialHash();

    const initialCurrentSection =
        legalSections.find((section) => {
            const link = getLinkFromSection(section);

            return link?.classList.contains(
                "is-active"
            );
        }) || legalSections[0];

    if (initialCurrentSection) {
        setActiveSection(
            initialCurrentSection,
            false
        );
    }
})();