/*
  3D trivision billboard hero slider with rotating vertical triangular slats.
  One universal, vanilla-JS component. No external libraries.

  Markup contract (see index.html / service pages for real usage):

    <section class="trivision-hero" data-trivision-hero data-trivision-hero-key="home|service">
      <div class="trivision-hero__stage" data-trivision-stage aria-hidden="true">
        <img class="trivision-hero__fallback" data-trivision-fallback ...>
        <div class="trivision-hero__slats" data-trivision-slats></div>
      </div>
      <div class="trivision-hero__overlay" aria-hidden="true"></div>
      <div class="trivision-hero__content-wrap">
        <div class="trivision-hero__content" data-trivision-content>
          <span data-trivision-eyebrow></span>
          <h1 data-trivision-title></h1>
          <p data-trivision-text></p>
          <div class="trivision-hero__actions">
            <a data-trivision-primary><span data-trivision-primary-label></span></a>
            <a data-trivision-secondary><span data-trivision-secondary-label></span></a>
          </div>
        </div>
      </div>
      <div class="trivision-hero__dots" data-trivision-dots>
        <button data-trivision-dot="0"></button>
        <button data-trivision-dot="1"></button>
        <button data-trivision-dot="2"></button>
      </div>
    </section>

  Slide data comes from window.SITE_CONFIG, either config.home.heroSlides
  (data-trivision-hero-key="home") or config.services[].heroSlides matched
  against the current page's service slug (data-trivision-hero-key="service").
  Each slide: { image, eyebrow, title, text, primaryButton:{label,href},
  secondaryButton:{label,href} }.
*/
(() => {
    "use strict";

    const DEFAULT_AUTOPLAY_MS = 6500;
    const DEFAULT_DURATION_MS = 1150;
    const DEFAULT_STAGGER_MS = 16;
    const DEFAULT_SLAT_COUNT = 18;
    const CONTENT_FADE_MS = 380;
    const REDUCED_MOTION_FADE_MS = 900;
    const MIN_REMAINING_MS = 250;
    const RESIZE_DEBOUNCE_MS = 120;
    const IMAGE_ASPECT = 1920 / 1080;
    const FACE_MAP = [
        { local: 0, slideOffset: 0 },
        { local: 120, slideOffset: 2 },
        { local: 240, slideOffset: 1 }
    ];

    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const readInt = (raw, fallback) => {
        const value = Number.parseInt(raw, 10);
        return Number.isFinite(value) && value > 0 ? value : fallback;
    };

    const readMs = (raw, fallback) => {
        const value = Number.parseFloat(raw);
        return Number.isFinite(value) ? value : fallback;
    };

    const resolveSlides = (root) => {
        const config = window.SITE_CONFIG;

        if (!config) {
            return [];
        }

        const key = root.dataset.trivisionHeroKey;

        if (key === "service") {
            const slug =
                document.querySelector("[data-service-page]")?.dataset
                    .serviceSlug || document.body.dataset.serviceSlug;

            const service = Array.isArray(config.services)
                ? config.services.find((item) => item.slug === slug)
                : null;

            return Array.isArray(service?.heroSlides)
                ? service.heroSlides
                : [];
        }

        const section = config[key];

        return Array.isArray(section?.heroSlides) ? section.heroSlides : [];
    };

    class TrivisionHero {
        constructor(root, slides) {
            this.root = root;
            this.slides = slides;

            this.stage = root.querySelector("[data-trivision-stage]");
            this.slatsHost = root.querySelector("[data-trivision-slats]");
            this.fallback = root.querySelector("[data-trivision-fallback]");
            this.content = root.querySelector("[data-trivision-content]");
            this.eyebrowEl = root.querySelector("[data-trivision-eyebrow]");
            this.titleEl = root.querySelector("[data-trivision-title]");
            this.textEl = root.querySelector("[data-trivision-text]");
            this.primaryEl = root.querySelector("[data-trivision-primary]");
            this.primaryLabelEl = root.querySelector(
                "[data-trivision-primary-label]"
            );
            this.secondaryEl = root.querySelector(
                "[data-trivision-secondary]"
            );
            this.secondaryLabelEl = root.querySelector(
                "[data-trivision-secondary-label]"
            );
            this.dots = Array.from(
                root.querySelectorAll("[data-trivision-dot]")
            );

            this.currentIndex = 0;
            this.slatCount = 0;
            this.slats = [];
            this.isAnimating = false;
            this.isHovered = false;
            this.isHidden = document.hidden;
            this.timerId = null;
            this.remainingMs = DEFAULT_AUTOPLAY_MS;
            this.cycleStart = 0;
            this.resizeTimeout = null;
            this.activeFallbackLayer = this.fallback;
            this.secondFallback = null;

            this.handleMouseEnter = this.handleMouseEnter.bind(this);
            this.handleMouseLeave = this.handleMouseLeave.bind(this);
            this.handleVisibility = this.handleVisibility.bind(this);
            this.handleReducedMotionChange =
                this.handleReducedMotionChange.bind(this);
            this.handleResizeObserved =
                this.handleResizeObserved.bind(this);

            this.init();
        }

        readVar(name, fallback, parser) {
            const raw = getComputedStyle(this.root).getPropertyValue(name);
            return parser(raw, fallback);
        }

        getAutoplayMs() {
            return this.readVar("--trivision-autoplay", DEFAULT_AUTOPLAY_MS, readMs);
        }

        getSlatCount() {
            return this.readVar(
                "--trivision-slat-count",
                DEFAULT_SLAT_COUNT,
                readInt
            );
        }

        getDuration() {
            return this.readVar(
                "--trivision-duration",
                DEFAULT_DURATION_MS,
                readMs
            );
        }

        getStagger() {
            return this.readVar(
                "--trivision-stagger",
                DEFAULT_STAGGER_MS,
                readMs
            );
        }

        init() {
            if (!this.slides.length || !this.stage || !this.slatsHost) {
                return;
            }

            this.remainingMs = this.getAutoplayMs();

            this.preloadImages();

            if (!reducedMotionQuery.matches) {
                this.buildSlats();
                this.layout();
            }

            this.bindEvents();
            this.scheduleNext();
        }

        preloadImages() {
            this.slides.slice(1).forEach((slide) => {
                if (!slide?.image) {
                    return;
                }

                const image = new Image();
                image.src = slide.image;
            });
        }

        buildSlats() {
            if (this.slides.length < 3) {
                return;
            }

            this.slatsHost.innerHTML = "";
            this.slats = [];

            const count = this.getSlatCount();
            this.slatCount = count;

            for (let i = 0; i < count; i += 1) {
                const slatEl = document.createElement("div");
                slatEl.className = "trivision-hero__slat";

                const faces = FACE_MAP.map((mapping) => {
                    const faceEl = document.createElement("div");
                    faceEl.className = "trivision-hero__face";
                    slatEl.appendChild(faceEl);

                    return {
                        el: faceEl,
                        local: mapping.local,
                        slideOffset: mapping.slideOffset
                    };
                });

                this.slatsHost.appendChild(slatEl);
                this.slats.push({ el: slatEl, faces });
            }
        }

        layout() {
            if (!this.slats.length) {
                return;
            }

            const stageWidth = this.stage.clientWidth;
            const stageHeight = this.stage.clientHeight;

            if (!stageWidth || !stageHeight) {
                return;
            }

            const stageAspect = stageWidth / stageHeight;

            let renderedWidth;
            let renderedHeight;

            if (stageAspect > IMAGE_ASPECT) {
                renderedWidth = stageWidth;
                renderedHeight = stageWidth / IMAGE_ASPECT;
            } else {
                renderedHeight = stageHeight;
                renderedWidth = stageHeight * IMAGE_ASPECT;
            }

            const offsetX = (stageWidth - renderedWidth) / 2;
            const offsetY = (stageHeight - renderedHeight) / 2;

            const slatWidth = stageWidth / this.slats.length;
            const radius = slatWidth / (2 * Math.tan(Math.PI / 3));

            this.slats.forEach((slat, index) => {
                const left = index * slatWidth;

                slat.faces.forEach((face) => {
                    const slideIndex =
                        (face.slideOffset) % this.slides.length;
                    const slide = this.slides[slideIndex];

                    if (!slide?.image) {
                        return;
                    }

                    face.el.style.transform = `rotateY(${face.local}deg) translateZ(${radius.toFixed(2)}px)`;
                    face.el.style.backgroundImage = `url("${slide.image}")`;
                    face.el.style.backgroundSize = `${renderedWidth.toFixed(2)}px ${renderedHeight.toFixed(2)}px`;
                    face.el.style.backgroundPosition = `${(offsetX - left).toFixed(2)}px ${offsetY.toFixed(2)}px`;
                });
            });
        }

        applyRotation(index, instant) {
            if (!this.slats.length) {
                return;
            }

            const duration = this.getDuration();
            const stagger = this.getStagger();

            this.slats.forEach((slat, i) => {
                if (instant) {
                    slat.el.style.transitionDuration = "0ms";
                    slat.el.style.transitionDelay = "0ms";
                } else {
                    slat.el.style.transitionDuration = `${duration}ms`;
                    slat.el.style.transitionDelay = `${i * stagger}ms`;
                }

                slat.el.style.transform = `rotateY(${index * 120}deg)`;
            });

            if (instant) {
                void this.slatsHost.offsetHeight;

                this.slats.forEach((slat) => {
                    slat.el.style.transitionDuration = "";
                    slat.el.style.transitionDelay = "";
                });
            }
        }

        crossfadeFallback(activeSlide) {
            const slide = this.slides[activeSlide];

            if (!slide?.image || !this.fallback) {
                return;
            }

            if (!this.secondFallback) {
                this.secondFallback = this.fallback.cloneNode(false);
                this.secondFallback.removeAttribute(
                    "data-trivision-fallback"
                );
                this.secondFallback.removeAttribute("fetchpriority");
                this.secondFallback.setAttribute("loading", "lazy");
                this.secondFallback.style.opacity = "0";
                this.stage.insertBefore(
                    this.secondFallback,
                    this.slatsHost
                );
            }

            const incoming =
                this.activeFallbackLayer === this.fallback
                    ? this.secondFallback
                    : this.fallback;

            const outgoing =
                incoming === this.fallback
                    ? this.secondFallback
                    : this.fallback;

            incoming.src = slide.image;
            incoming.style.transition = `opacity ${REDUCED_MOTION_FADE_MS}ms ease`;
            outgoing.style.transition = `opacity ${REDUCED_MOTION_FADE_MS}ms ease`;

            requestAnimationFrame(() => {
                incoming.style.opacity = "1";
                outgoing.style.opacity = "0";
            });

            this.activeFallbackLayer = incoming;
        }

        updateContent(activeSlide) {
            const slide = this.slides[activeSlide];

            if (!slide) {
                return;
            }

            if (this.eyebrowEl && slide.eyebrow !== undefined) {
                this.eyebrowEl.textContent = slide.eyebrow;
            }

            if (this.titleEl && slide.title !== undefined) {
                this.titleEl.textContent = slide.title;
            }

            if (this.textEl && slide.text !== undefined) {
                this.textEl.textContent = slide.text || "";
                this.textEl.hidden = !slide.text;
            }

            if (this.primaryLabelEl && slide.primaryButton?.label) {
                this.primaryLabelEl.textContent = slide.primaryButton.label;
            }

            if (this.primaryEl && slide.primaryButton?.href) {
                this.primaryEl.setAttribute(
                    "href",
                    slide.primaryButton.href
                );
            }

            if (this.secondaryLabelEl && slide.secondaryButton?.label) {
                this.secondaryLabelEl.textContent =
                    slide.secondaryButton.label;
            }

            if (this.secondaryEl && slide.secondaryButton?.href) {
                this.secondaryEl.setAttribute(
                    "href",
                    slide.secondaryButton.href
                );
            }
        }

        updateDots(activeSlide) {
            this.dots.forEach((dot, index) => {
                const active = index === activeSlide;

                dot.classList.toggle("is-active", active);

                if (active) {
                    dot.setAttribute("aria-current", "true");
                } else {
                    dot.removeAttribute("aria-current");
                }
            });
        }

        goTo(nextIndex) {
            if (this.isAnimating || !this.slides.length) {
                return;
            }

            if (nextIndex === this.currentIndex) {
                return;
            }

            this.isAnimating = true;

            if (this.content) {
                this.content.classList.add("is-hidden");
            }

            window.setTimeout(() => {
                this.currentIndex = nextIndex;

                const total = this.slides.length;
                const activeSlide =
                    ((nextIndex % total) + total) % total;

                const usingSlats =
                    !reducedMotionQuery.matches && this.slats.length > 0;

                if (usingSlats) {
                    this.applyRotation(nextIndex, false);
                } else {
                    this.crossfadeFallback(activeSlide);
                }

                this.updateContent(activeSlide);
                this.updateDots(activeSlide);

                const settleMs = usingSlats
                    ? this.getDuration() +
                      (this.slatCount - 1) * this.getStagger()
                    : REDUCED_MOTION_FADE_MS * 0.55;

                window.setTimeout(() => {
                    if (this.content) {
                        this.content.classList.remove("is-hidden");
                    }

                    this.isAnimating = false;
                }, settleMs);
            }, CONTENT_FADE_MS);
        }

        clearTimer() {
            if (this.timerId) {
                window.clearTimeout(this.timerId);
                this.timerId = null;
            }
        }

        scheduleNext() {
            this.clearTimer();

            if (this.isHidden || this.isHovered) {
                return;
            }

            this.cycleStart = Date.now();

            this.timerId = window.setTimeout(() => {
                this.goTo(this.currentIndex + 1);
                this.remainingMs = this.getAutoplayMs();
                this.scheduleNext();
            }, this.remainingMs);
        }

        pauseTimer() {
            if (!this.timerId) {
                return;
            }

            const elapsed = Date.now() - this.cycleStart;

            this.remainingMs = Math.max(
                this.remainingMs - elapsed,
                MIN_REMAINING_MS
            );

            this.clearTimer();
        }

        resumeTimer() {
            if (this.isHidden || this.isHovered || this.timerId) {
                return;
            }

            this.scheduleNext();
        }

        handleMouseEnter() {
            this.isHovered = true;
            this.pauseTimer();
        }

        handleMouseLeave() {
            this.isHovered = false;
            this.resumeTimer();
        }

        handleVisibility() {
            if (document.hidden) {
                this.isHidden = true;
                this.pauseTimer();
            } else {
                this.isHidden = false;
                this.resumeTimer();
            }
        }

        handleReducedMotionChange() {
            if (reducedMotionQuery.matches) {
                this.slatsHost.innerHTML = "";
                this.slats = [];

                if (this.fallback) {
                    this.fallback.style.opacity = "";
                }
            } else {
                this.buildSlats();
                this.layout();
                this.applyRotation(this.currentIndex, true);
            }
        }

        handleResizeObserved() {
            if (this.resizeTimeout) {
                window.clearTimeout(this.resizeTimeout);
            }

            this.resizeTimeout = window.setTimeout(() => {
                if (reducedMotionQuery.matches) {
                    return;
                }

                const nextCount = this.getSlatCount();

                if (nextCount !== this.slatCount) {
                    this.buildSlats();
                }

                this.layout();
                this.applyRotation(this.currentIndex, true);
            }, RESIZE_DEBOUNCE_MS);
        }

        bindEvents() {
            this.root.addEventListener(
                "mouseenter",
                this.handleMouseEnter
            );

            this.root.addEventListener(
                "mouseleave",
                this.handleMouseLeave
            );

            document.addEventListener(
                "visibilitychange",
                this.handleVisibility
            );

            if (typeof reducedMotionQuery.addEventListener === "function") {
                reducedMotionQuery.addEventListener(
                    "change",
                    this.handleReducedMotionChange
                );
            } else if (typeof reducedMotionQuery.addListener === "function") {
                reducedMotionQuery.addListener(
                    this.handleReducedMotionChange
                );
            }

            if (typeof ResizeObserver === "function") {
                const observer = new ResizeObserver(
                    this.handleResizeObserved
                );

                observer.observe(this.stage);
            } else {
                window.addEventListener(
                    "resize",
                    this.handleResizeObserved,
                    { passive: true }
                );
            }

            this.dots.forEach((dot, index) => {
                dot.addEventListener("click", () => {
                    const total = this.slides.length;
                    const active =
                        ((this.currentIndex % total) + total) % total;

                    const delta = (index - active + total) % total;

                    if (delta === 0) {
                        return;
                    }

                    this.pauseTimer();
                    this.goTo(this.currentIndex + delta);
                    this.remainingMs = this.getAutoplayMs();
                    this.resumeTimer();
                });
            });
        }
    }

    const initTrivisionHeroes = () => {
        document
            .querySelectorAll("[data-trivision-hero]")
            .forEach((root) => {
                const slides = resolveSlides(root);
                // eslint-disable-next-line no-new
                new TrivisionHero(root, slides);
            });
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initTrivisionHeroes,
            { once: true }
        );
    } else {
        initTrivisionHeroes();
    }
})();
