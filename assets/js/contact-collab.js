/*
  Ambient particle background for the "Advertise & Collaborate" section on
  the contact page. Vanilla JS, no external libraries: drifting dots linked
  by thin lines, rendered on a canvas that sits behind the section content.

  Markup contract:

    <section class="contact-collab" data-contact-collab>
      <canvas class="contact-collab__particles" data-contact-collab-canvas></canvas>
      ...
    </section>
*/
(() => {
    "use strict";

    const PARTICLE_COLOR = "88, 199, 255";
    const LINK_COLOR = "169, 231, 255";
    const LINK_DISTANCE = 130;
    const MIN_PARTICLES = 26;
    const MAX_PARTICLES = 64;
    const RESIZE_DEBOUNCE_MS = 150;

    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const section = document.querySelector("[data-contact-collab]");
    const canvas = document.querySelector("[data-contact-collab-canvas]");

    if (!section || !canvas || typeof canvas.getContext !== "function") {
        return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
        return;
    }

    let width = 0;
    let height = 0;
    let particles = [];
    let animationFrame = null;
    let isVisible = false;
    let resizeTimer = null;

    const random = (min, max) => min + Math.random() * (max - min);

    const createParticles = () => {
        const area = width * height;
        const count = Math.round(
            Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, area / 16000))
        );

        particles = Array.from({ length: count }, () => ({
            x: random(0, width),
            y: random(0, height),
            vx: reducedMotionQuery.matches ? 0 : random(-0.18, 0.18),
            vy: reducedMotionQuery.matches ? 0 : random(-0.14, 0.14),
            radius: random(1, 2.2)
        }));
    };

    const draw = () => {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i += 1) {
            const particle = particles[i];

            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${PARTICLE_COLOR}, 0.65)`;
            ctx.fill();

            for (let j = i + 1; j < particles.length; j += 1) {
                const other = particles[j];
                const dx = particle.x - other.x;
                const dy = particle.y - other.y;
                const distance = Math.sqrt((dx * dx) + (dy * dy));

                if (distance >= LINK_DISTANCE) {
                    continue;
                }

                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(other.x, other.y);
                ctx.strokeStyle =
                    `rgba(${LINK_COLOR}, ${0.35 * (1 - (distance / LINK_DISTANCE))})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    };

    const resize = () => {
        const rect = section.getBoundingClientRect();
        const dpr = Math.max(1, window.devicePixelRatio || 1);

        width = Math.max(1, Math.round(rect.width));
        height = Math.max(1, Math.round(rect.height));

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        createParticles();
        draw();
    };

    const step = () => {
        particles.forEach((particle) => {
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0) {
                particle.x = width;
            } else if (particle.x > width) {
                particle.x = 0;
            }

            if (particle.y < 0) {
                particle.y = height;
            } else if (particle.y > height) {
                particle.y = 0;
            }
        });

        draw();
        animationFrame = window.requestAnimationFrame(step);
    };

    const startAnimation = () => {
        if (animationFrame || reducedMotionQuery.matches) {
            return;
        }

        animationFrame = window.requestAnimationFrame(step);
    };

    const stopAnimation = () => {
        if (!animationFrame) {
            return;
        }

        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
    };

    const handleResize = () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resize, RESIZE_DEBOUNCE_MS);
    };

    resize();

    if (!reducedMotionQuery.matches) {
        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver(
                (entries) => {
                    const entry = entries[0];

                    isVisible = Boolean(entry?.isIntersecting);

                    if (isVisible && document.visibilityState !== "hidden") {
                        startAnimation();
                    } else {
                        stopAnimation();
                    }
                },
                {
                    rootMargin: "80px 0px",
                    threshold: 0.01
                }
            );

            observer.observe(section);
        } else {
            isVisible = true;
            startAnimation();
        }

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
                stopAnimation();
            } else if (isVisible) {
                startAnimation();
            }
        });
    }

    window.addEventListener("resize", handleResize);
})();
