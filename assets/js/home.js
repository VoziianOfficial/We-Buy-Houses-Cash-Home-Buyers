(() => {
    "use strict";

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopParallaxQuery = window.matchMedia("(min-width: 769px)");
    const filterTimers = new WeakMap();

    let initialized = false;
    let scrollFrameRequested = false;
    let textPathFrame = 0;
    let textPathVisible = false;
    let textPathStartTime = 0;
    let pageVisible = !document.hidden;

    const clamp = (value, minimum, maximum) => {
        return Math.min(Math.max(value, minimum), maximum);
    };

    const setStyleProperty = (element, property, value) => {
        if (!element) {
            return;
        }

        element.style.setProperty(property, value);
    };

    const clearStyleProperty = (element, property) => {
        if (!element) {
            return;
        }

        element.style.removeProperty(property);
    };

    const getSectionProgress = (element) => {
        if (!element) {
            return 0;
        }

        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const totalDistance = viewportHeight + rect.height;

        if (totalDistance <= 0) {
            return 0;
        }

        return clamp((viewportHeight - rect.top) / totalDistance, 0, 1);
    };

    const updateHeroParallax = () => {
        const hero = document.querySelector("[data-home-hero]");

        if (!hero) {
            return;
        }

        if (reducedMotionQuery.matches || !desktopParallaxQuery.matches) {
            [
                "--home-hero-sky-y",
                "--home-hero-distant-x",
                "--home-hero-distant-y",
                "--home-hero-house-x",
                "--home-hero-house-y",
                "--home-hero-foreground-x",
                "--home-hero-foreground-y",
                "--home-hero-content-y"
            ].forEach((property) => {
                clearStyleProperty(hero, property);
            });

            return;
        }

        const rect = hero.getBoundingClientRect();
        const maximumScroll = Math.max(hero.offsetHeight, window.innerHeight);
        const distance = clamp(-rect.top, 0, maximumScroll);
        const progress = clamp(distance / maximumScroll, 0, 1);

        setStyleProperty(hero, "--home-hero-sky-y", `${distance * 0.08}px`);
        setStyleProperty(hero, "--home-hero-distant-x", `${distance * -0.035}px`);
        setStyleProperty(hero, "--home-hero-distant-y", `${distance * 0.11}px`);
        setStyleProperty(hero, "--home-hero-house-x", `${distance * 0.018}px`);
        setStyleProperty(hero, "--home-hero-house-y", `${distance * 0.16}px`);
        setStyleProperty(hero, "--home-hero-foreground-x", `${distance * 0.045}px`);
        setStyleProperty(hero, "--home-hero-foreground-y", `${distance * 0.22}px`);
        setStyleProperty(hero, "--home-hero-content-y", `${progress * 78}px`);
    };

    const updateSectionParallax = () => {
        const processSection = document.querySelector("[data-home-process]");
        const testimonialSection = document.querySelector("[data-home-testimonials]");

        if (reducedMotionQuery.matches || !desktopParallaxQuery.matches) {
            clearStyleProperty(processSection, "--home-process-y");
            clearStyleProperty(testimonialSection, "--home-testimonial-y");
            return;
        }

        if (processSection) {
            const processProgress = getSectionProgress(processSection);
            const processOffset = (processProgress - 0.5) * 92;

            setStyleProperty(
                processSection,
                "--home-process-y",
                `${processOffset.toFixed(2)}px`
            );
        }

        if (testimonialSection) {
            const testimonialProgress = getSectionProgress(testimonialSection);
            const testimonialOffset = (testimonialProgress - 0.5) * 86;

            setStyleProperty(
                testimonialSection,
                "--home-testimonial-y",
                `${testimonialOffset.toFixed(2)}px`
            );
        }
    };

    const updateScrollEffects = () => {
        updateHeroParallax();
        updateSectionParallax();
    };

    const requestScrollUpdate = () => {
        if (scrollFrameRequested) {
            return;
        }

        scrollFrameRequested = true;

        window.requestAnimationFrame(() => {
            updateScrollEffects();
            scrollFrameRequested = false;
        });
    };

    const activateExclusiveItem = (items, activeItem, className) => {
        items.forEach((item) => {
            item.classList.toggle(className, item === activeItem);
        });
    };

    const initializeExpandableOptions = () => {
        const container = document.querySelector("[data-home-options]");

        if (!container) {
            return;
        }

        const cards = Array.from(container.querySelectorAll("[data-option-card]"));

        if (!cards.length) {
            return;
        }

        const activateCard = (card) => {
            activateExclusiveItem(cards, card, "is-active");
        };

        const deactivateCards = () => {
            if (container.matches(":hover") || container.contains(document.activeElement)) {
                return;
            }

            cards.forEach((card) => {
                card.classList.remove("is-active");
            });
        };

        cards.forEach((card) => {
            card.addEventListener("pointerenter", () => {
                if (window.matchMedia("(hover: hover)").matches) {
                    activateCard(card);
                }
            });

            card.addEventListener(
                "touchstart",
                () => {
                    activateCard(card);
                },
                {
                    passive: true
                }
            );

            card.addEventListener("focusin", () => {
                activateCard(card);
            });

            card.addEventListener("focusout", () => {
                window.requestAnimationFrame(deactivateCards);
            });
        });

        container.addEventListener("pointerleave", deactivateCards);
    };

    const initializeProcessStages = () => {
        const container = document.querySelector("[data-process-stages]");

        if (!container) {
            return;
        }

        const stages = Array.from(container.querySelectorAll("[data-process-stage]"));

        if (!stages.length) {
            return;
        }

        const initialStage =
            stages.find((stage) => stage.classList.contains("is-active")) || stages[0];

        activateExclusiveItem(stages, initialStage, "is-active");

        stages.forEach((stage) => {
            const activate = () => {
                activateExclusiveItem(stages, stage, "is-active");
            };

            stage.addEventListener("pointerenter", () => {
                if (window.matchMedia("(hover: hover)").matches) {
                    activate();
                }
            });

            stage.addEventListener("focusin", activate);
            stage.addEventListener("click", activate);

            stage.addEventListener(
                "touchstart",
                activate,
                {
                    passive: true
                }
            );
        });
    };

    const normalizeFilterValue = (value) => {
        return String(value || "")
            .trim()
            .toLowerCase();
    };

    const getItemCategories = (item) => {
        return String(item.dataset.galleryCategory || "")
            .split(/\s+/)
            .map(normalizeFilterValue)
            .filter(Boolean);
    };

    const hideGalleryItem = (item) => {
        const existingTimer = filterTimers.get(item);

        if (existingTimer) {
            window.clearTimeout(existingTimer);
        }

        item.classList.add("is-filtered-out");
        item.setAttribute("aria-hidden", "true");

        const delay = reducedMotionQuery.matches ? 0 : 330;

        const timer = window.setTimeout(() => {
            item.hidden = true;
            filterTimers.delete(item);
        }, delay);

        filterTimers.set(item, timer);
    };

    const showGalleryItem = (item) => {
        const existingTimer = filterTimers.get(item);

        if (existingTimer) {
            window.clearTimeout(existingTimer);
            filterTimers.delete(item);
        }

        item.hidden = false;
        item.setAttribute("aria-hidden", "false");

        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                item.classList.remove("is-filtered-out");
            });
        });
    };

    const initializeGalleryFilters = () => {
        const gallery = document.querySelector("[data-home-gallery]");

        if (!gallery) {
            return;
        }

        const filterButtons = Array.from(
            gallery.querySelectorAll("[data-gallery-filter]")
        );

        const galleryItems = Array.from(
            gallery.querySelectorAll("[data-gallery-item]")
        );

        if (!filterButtons.length || !galleryItems.length) {
            return;
        }

        const applyFilter = (filterValue, activeButton) => {
            const normalizedFilter = normalizeFilterValue(filterValue) || "all";

            filterButtons.forEach((button) => {
                const selected = button === activeButton;

                button.classList.toggle("is-active", selected);
                button.setAttribute("aria-pressed", selected ? "true" : "false");
            });

            galleryItems.forEach((item) => {
                const categories = getItemCategories(item);
                const shouldShow =
                    normalizedFilter === "all" || categories.includes(normalizedFilter);

                if (shouldShow) {
                    showGalleryItem(item);
                } else {
                    hideGalleryItem(item);
                }
            });

            const announcement = gallery.querySelector("[data-gallery-status]");

            if (announcement) {
                const visibleCount = galleryItems.filter((item) => {
                    const categories = getItemCategories(item);

                    return (
                        normalizedFilter === "all" ||
                        categories.includes(normalizedFilter)
                    );
                }).length;

                const label =
                    activeButton?.textContent?.trim() ||
                    normalizedFilter.replace(/-/g, " ");

                announcement.textContent = `${visibleCount} property situation ${visibleCount === 1 ? "item" : "items"
                    } shown for ${label}.`;
            }

            window.setTimeout(() => {
                window.VelmoraSite?.refreshAOS?.();
            }, reducedMotionQuery.matches ? 0 : 360);
        };

        filterButtons.forEach((button) => {
            button.addEventListener("click", () => {
                applyFilter(button.dataset.galleryFilter, button);
            });
        });

        const activeButton =
            filterButtons.find(
                (button) =>
                    button.classList.contains("is-active") ||
                    button.getAttribute("aria-pressed") === "true"
            ) || filterButtons[0];

        applyFilter(activeButton.dataset.galleryFilter, activeButton);
    };

    const setTextPathOffset = (offset) => {
        document.querySelectorAll("[data-text-path-track]").forEach((textPath) => {
            const direction =
                String(textPath.dataset.textPathDirection || "forward") === "reverse"
                    ? -1
                    : 1;

            const baseOffset = Number.parseFloat(textPath.dataset.textPathOffset || "0");
            const resolvedOffset = baseOffset + offset * direction;

            textPath.setAttribute("startOffset", `${resolvedOffset}%`);
        });
    };

    const stopTextPathAnimation = () => {
        if (textPathFrame) {
            window.cancelAnimationFrame(textPathFrame);
            textPathFrame = 0;
        }
    };

    const animateTextPath = (time) => {
        if (
            reducedMotionQuery.matches ||
            !textPathVisible ||
            !pageVisible
        ) {
            stopTextPathAnimation();
            return;
        }

        if (!textPathStartTime) {
            textPathStartTime = time;
        }

        const elapsed = time - textPathStartTime;
        const cycleDuration = 34000;
        const offset = -((elapsed % cycleDuration) / cycleDuration) * 100;

        setTextPathOffset(offset);
        textPathFrame = window.requestAnimationFrame(animateTextPath);
    };

    const startTextPathAnimation = () => {
        if (
            reducedMotionQuery.matches ||
            !textPathVisible ||
            !pageVisible ||
            textPathFrame
        ) {
            return;
        }

        textPathStartTime = performance.now();
        textPathFrame = window.requestAnimationFrame(animateTextPath);
    };

    const initializeTextPath = () => {
        const panel = document.querySelector("[data-text-path-panel]");
        const textPaths = document.querySelectorAll("[data-text-path-track]");

        if (!panel || !textPaths.length) {
            return;
        }

        if (reducedMotionQuery.matches) {
            setTextPathOffset(0);
            return;
        }

        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver(
                (entries) => {
                    const entry = entries[0];

                    textPathVisible = Boolean(entry?.isIntersecting);

                    if (textPathVisible) {
                        startTextPathAnimation();
                    } else {
                        stopTextPathAnimation();
                    }
                },
                {
                    rootMargin: "120px 0px",
                    threshold: 0.02
                }
            );

            observer.observe(panel);
            return;
        }

        textPathVisible = true;
        startTextPathAnimation();
    };

    const initializeTestimonials = () => {
        const slider = document.querySelector("[data-home-testimonial-slider]");

        if (
            !slider ||
            slider.dataset.swiperInitialized === "true" ||
            typeof window.Swiper !== "function"
        ) {
            return;
        }

        const pagination = slider
            .closest("[data-home-testimonials]")
            ?.querySelector("[data-testimonial-pagination]");

        const instance = new window.Swiper(slider, {
            slidesPerView: 1,
            spaceBetween: 18,
            speed: reducedMotionQuery.matches ? 0 : 720,
            loop: false,
            autoHeight: true,
            grabCursor: true,
            watchOverflow: true,
            keyboard: {
                enabled: true,
                onlyInViewport: true
            },
            a11y: {
                enabled: true,
                prevSlideMessage: "Previous seller experience",
                nextSlideMessage: "Next seller experience",
                firstSlideMessage: "This is the first seller experience",
                lastSlideMessage: "This is the last seller experience",
                paginationBulletMessage: "Go to seller experience {{index}}"
            },
            pagination: pagination
                ? {
                    el: pagination,
                    clickable: true
                }
                : undefined
        });

        slider.dataset.swiperInitialized = "true";
        slider.swiper = instance;
    };

    const setPanelState = (button, panel, open) => {
        button.setAttribute("aria-expanded", open ? "true" : "false");
        panel.classList.toggle("is-open", open);
        panel.setAttribute("aria-hidden", open ? "false" : "true");

        if ("inert" in panel) {
            panel.inert = !open;
        }
    };

    const initializeFAQ = () => {
        const faq = document.querySelector("[data-home-faq]");

        if (!faq) {
            return;
        }

        const buttons = Array.from(faq.querySelectorAll("[data-faq-button]"));

        buttons.forEach((button, index) => {
            const panelId = button.getAttribute("aria-controls");
            const panel = panelId ? document.getElementById(panelId) : null;

            if (!panel) {
                return;
            }

            if (!button.id) {
                button.id = `home-faq-button-${index + 1}`;
            }

            panel.setAttribute("aria-labelledby", button.id);

            const initiallyOpen = button.getAttribute("aria-expanded") === "true";

            setPanelState(button, panel, initiallyOpen);

            button.addEventListener("click", () => {
                const open = button.getAttribute("aria-expanded") !== "true";

                setPanelState(button, panel, open);

                window.setTimeout(() => {
                    window.VelmoraSite?.refreshAOS?.();
                }, reducedMotionQuery.matches ? 0 : 340);
            });
        });
    };

    const initializeImageLoading = () => {
        const hero = document.querySelector("[data-home-hero]");

        if (!hero) {
            return;
        }

        const layers = Array.from(hero.querySelectorAll(".home-hero__layer"));
        let loadedCount = 0;

        const markLoaded = () => {
            loadedCount += 1;

            if (loadedCount >= layers.length) {
                hero.classList.add("is-ready");
            }
        };

        if (!layers.length) {
            hero.classList.add("is-ready");
            return;
        }

        layers.forEach((image) => {
            if (image.complete) {
                markLoaded();
                return;
            }

            image.addEventListener("load", markLoaded, {
                once: true
            });

            image.addEventListener("error", markLoaded, {
                once: true
            });
        });
    };

    const handleMotionPreferenceChange = () => {
        stopTextPathAnimation();
        textPathStartTime = 0;

        if (reducedMotionQuery.matches) {
            setTextPathOffset(0);
        } else {
            startTextPathAnimation();
        }

        requestScrollUpdate();
    };

    const bindGlobalEvents = () => {
        window.addEventListener("scroll", requestScrollUpdate, {
            passive: true
        });

        window.addEventListener("resize", requestScrollUpdate, {
            passive: true
        });

        document.addEventListener("visibilitychange", () => {
            pageVisible = !document.hidden;

            if (pageVisible) {
                startTextPathAnimation();
                requestScrollUpdate();
            } else {
                stopTextPathAnimation();
            }
        });

        if (typeof reducedMotionQuery.addEventListener === "function") {
            reducedMotionQuery.addEventListener(
                "change",
                handleMotionPreferenceChange
            );
        } else if (typeof reducedMotionQuery.addListener === "function") {
            reducedMotionQuery.addListener(handleMotionPreferenceChange);
        }

        if (typeof desktopParallaxQuery.addEventListener === "function") {
            desktopParallaxQuery.addEventListener("change", requestScrollUpdate);
        } else if (typeof desktopParallaxQuery.addListener === "function") {
            desktopParallaxQuery.addListener(requestScrollUpdate);
        }
    };

    const initialize = () => {
        if (initialized) {
            return;
        }

        initialized = true;

        initializeImageLoading();
        initializeExpandableOptions();
        initializeProcessStages();
        initializeGalleryFilters();
        initializeTextPath();
        initializeTestimonials();
        initializeFAQ();
        bindGlobalEvents();
        updateScrollEffects();

        window.VelmoraSite?.refreshIcons?.();
        window.VelmoraSite?.refreshAOS?.();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, {
            once: true
        });
    } else {
        initialize();
    }
})();