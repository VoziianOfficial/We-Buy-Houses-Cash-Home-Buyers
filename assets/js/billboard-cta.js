/*
  Billboard CTA: compact horizontal CTA card that auto-flips between a
  text state and a photo state via rotating vertical slats (classic
  2-sided flip per slat, staggered left-to-right or right-to-left).
  One universal, vanilla-JS component driven entirely by data-attributes.

  Markup contract (see index.html / service pages for real usage):

    <div class="billboard-cta billboard-cta--sky" data-billboard-cta
         data-billboard-image="assets/images/..."
         data-text-duration="5500" data-photo-duration="4500"
         data-slat-direction="forward">
      <div class="billboard-cta__card">
        <div class="billboard-cta__slats" data-billboard-slats aria-hidden="true"></div>
        <div class="billboard-cta__content"> ... eyebrow/title/text/actions ... </div>
      </div>
    </div>

  Same technique as assets/js/trivision-hero.js (vertical slats, staggered
  rotateY transitions, pause on hover/focus/hidden tab, prefers-reduced-
  motion fallback) simplified from a 3-face prism (N slides) down to a
  plain 2-face flip card (2 states: accent text panel / assembled photo).
*/
(() => {
    "use strict";

    const DEFAULT_TEXT_MS = 5500;
    const DEFAULT_PHOTO_MS = 4500;
    const DURATION_MS = 1100;
    const STAGGER_MS = 45;
    const CONTENT_FADE_MS = 220;
    const REDUCED_FADE_MS = 900;
    const MIN_REMAINING_MS = 250;
    const RESIZE_DEBOUNCE_MS = 120;
    const DEFAULT_SLAT_COUNT = 16;
    const IMAGE_ASPECT = 1920 / 1080;

    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const readPositiveInt = (raw, fallback) => {
        const value = parseInt(raw, 10);
        return Number.isFinite(value) && value > 0 ? value : fallback;
    };

    class BillboardCta {
        constructor(root) {
            this.root = root;
            this.card = root.querySelector(".billboard-cta__card");
            this.slatsHost = root.querySelector("[data-billboard-slats]");
            this.content = root.querySelector(".billboard-cta__content");
            this.image = root.dataset.billboardImage || "";

            this.textDuration = readPositiveInt(
                root.dataset.textDuration,
                DEFAULT_TEXT_MS
            );
            this.photoDuration = readPositiveInt(
                root.dataset.photoDuration,
                DEFAULT_PHOTO_MS
            );
            this.baseDirection =
                root.dataset.slatDirection === "reverse"
                    ? "reverse"
                    : "forward";
            this.currentDirection = this.baseDirection;

            this.slats = [];
            this.slatCount = 0;
            this.fallback = null;

            this.isPhoto = false;
            this.isAnimating = false;
            this.isHovered = false;
            this.isFocused = false;
            this.isHidden = document.hidden;

            this.timerId = null;
            this.cycleStart = 0;
            this.remainingMs = this.textDuration;
            this.resizeTimeout = null;
            this.resizeObserver = null;

            this.handleMouseEnter = this.handleMouseEnter.bind(this);
            this.handleMouseLeave = this.handleMouseLeave.bind(this);
            this.handleFocusIn = this.handleFocusIn.bind(this);
            this.handleFocusOut = this.handleFocusOut.bind(this);
            this.handleVisibility = this.handleVisibility.bind(this);
            this.handleReducedMotionChange =
                this.handleReducedMotionChange.bind(this);
            this.handleResizeObserved = this.handleResizeObserved.bind(this);

            this.init();
        }

        init() {
            if (!this.slatsHost || !this.content || !this.image) {
                return;
            }

            this.root.style.setProperty(
                "--billboard-image-url",
                `url("${this.image}")`
            );

            this.buildFallback();

            if (!reducedMotionQuery.matches) {
                this.buildSlats();
                this.layout();
            }

            this.bindEvents();
            this.root.classList.add("is-initialized");
            this.scheduleNext();
        }

        buildFallback() {
            const fallback = document.createElement("div");
            fallback.className = "billboard-cta__photo-fallback";
            fallback.setAttribute("aria-hidden", "true");
            fallback.style.backgroundImage = `url("${this.image}")`;
            this.slatsHost.insertAdjacentElement("afterend", fallback);
            this.fallback = fallback;
        }

        getSlatCount() {
            const raw = getComputedStyle(this.root).getPropertyValue(
                "--billboard-slat-count"
            );

            return readPositiveInt(raw, DEFAULT_SLAT_COUNT);
        }

        buildSlats() {
            this.slatsHost.innerHTML = "";
            this.slats = [];

            const count = this.getSlatCount();
            this.slatCount = count;

            for (let i = 0; i < count; i += 1) {
                const slatEl = document.createElement("div");
                slatEl.className = "billboard-cta__slat";

                const front = document.createElement("div");
                front.className =
                    "billboard-cta__face billboard-cta__face--front";

                const back = document.createElement("div");
                back.className =
                    "billboard-cta__face billboard-cta__face--back";
                back.style.backgroundImage = `url("${this.image}")`;

                slatEl.appendChild(front);
                slatEl.appendChild(back);
                this.slatsHost.appendChild(slatEl);
                this.slats.push({ el: slatEl, back });
            }
        }

        layout() {
            if (!this.slats.length) {
                return;
            }

            const stageWidth = this.slatsHost.clientWidth;
            const stageHeight = this.slatsHost.clientHeight;

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

            this.slats.forEach((slat, index) => {
                const left = index * slatWidth;

                slat.back.style.backgroundSize = `${renderedWidth.toFixed(2)}px ${renderedHeight.toFixed(2)}px`;
                slat.back.style.backgroundPosition = `${(offsetX - left).toFixed(2)}px ${offsetY.toFixed(2)}px`;
            });
        }

        applyRotation(showPhoto, direction, instant) {
            if (!this.slats.length) {
                return;
            }

            const count = this.slats.length;

            this.slats.forEach((slat, i) => {
                const order = direction === "reverse" ? count - 1 - i : i;

                if (instant) {
                    slat.el.style.transitionDuration = "0ms";
                    slat.el.style.transitionDelay = "0ms";
                } else {
                    slat.el.style.transitionDuration = `${DURATION_MS}ms`;
                    slat.el.style.transitionDelay = `${order * STAGGER_MS}ms`;
                }

                slat.el.style.transform = showPhoto
                    ? "rotateY(180deg)"
                    : "rotateY(0deg)";
            });

            if (instant) {
                void this.slatsHost.offsetHeight;

                this.slats.forEach((slat) => {
                    slat.el.style.transitionDuration = "";
                    slat.el.style.transitionDelay = "";
                });
            }
        }

        getSettleMs() {
            return DURATION_MS + Math.max(this.slatCount - 1, 0) * STAGGER_MS;
        }

        toggleState() {
            if (this.isAnimating) {
                return;
            }

            this.isAnimating = true;

            const showPhoto = !this.isPhoto;

            if (this.content) {
                this.content.classList.add("is-hidden");
            }

            window.setTimeout(() => {
                const usingSlats =
                    !reducedMotionQuery.matches && this.slats.length > 0;

                if (usingSlats) {
                    this.applyRotation(showPhoto, this.currentDirection, false);
                }

                this.root.classList.toggle("is-photo", showPhoto);
                this.isPhoto = showPhoto;
                this.currentDirection = showPhoto
                    ? this.baseDirection
                    : this.baseDirection === "reverse"
                        ? "forward"
                        : "reverse";

                const settleMs = usingSlats
                    ? this.getSettleMs()
                    : REDUCED_FADE_MS * 0.6;

                window.setTimeout(() => {
                    if (this.content && !showPhoto) {
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

            if (this.isHidden || this.isHovered || this.isFocused) {
                return;
            }

            this.cycleStart = Date.now();

            this.timerId = window.setTimeout(() => {
                const nextIsPhoto = !this.isPhoto;

                this.toggleState();
                this.remainingMs = nextIsPhoto
                    ? this.photoDuration
                    : this.textDuration;
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
            if (
                this.isHidden ||
                this.isHovered ||
                this.isFocused ||
                this.timerId
            ) {
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

        handleFocusIn() {
            this.isFocused = true;
            this.pauseTimer();
        }

        handleFocusOut(event) {
            if (
                event.relatedTarget &&
                this.root.contains(event.relatedTarget)
            ) {
                return;
            }

            this.isFocused = false;
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
            } else if (!this.slats.length) {
                this.buildSlats();
                this.layout();
                this.applyRotation(this.isPhoto, this.currentDirection, true);
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
                this.applyRotation(this.isPhoto, this.currentDirection, true);
            }, RESIZE_DEBOUNCE_MS);
        }

        bindEvents() {
            this.root.addEventListener("mouseenter", this.handleMouseEnter);
            this.root.addEventListener("mouseleave", this.handleMouseLeave);
            this.root.addEventListener("focusin", this.handleFocusIn);
            this.root.addEventListener("focusout", this.handleFocusOut);

            document.addEventListener(
                "visibilitychange",
                this.handleVisibility
            );

            if (typeof reducedMotionQuery.addEventListener === "function") {
                reducedMotionQuery.addEventListener(
                    "change",
                    this.handleReducedMotionChange
                );
            } else if (
                typeof reducedMotionQuery.addListener === "function"
            ) {
                reducedMotionQuery.addListener(
                    this.handleReducedMotionChange
                );
            }

            if (typeof ResizeObserver === "function") {
                this.resizeObserver = new ResizeObserver(
                    this.handleResizeObserved
                );
                this.resizeObserver.observe(this.card || this.root);
            } else {
                window.addEventListener(
                    "resize",
                    this.handleResizeObserved,
                    { passive: true }
                );
            }
        }
    }

    const initBillboardCtas = () => {
        document.querySelectorAll("[data-billboard-cta]").forEach((root) => {
            new BillboardCta(root);
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initBillboardCtas, {
            once: true
        });
    } else {
        initBillboardCtas();
    }
})();
