(() => {
    "use strict";

    const SUCCESS_MESSAGE =
        "Thank you! We have successfully received your request. Our team will review your information and get back to you shortly.";

    const form = document.querySelector("[data-contact-form]");

    if (!form) {
        return;
    }

    const submitButton = form.querySelector("[data-submit-button]");
    const submitLabel = form.querySelector("[data-submit-label]");
    const submitLoader = form.querySelector("[data-submit-loader]");
    const formStatus = form.querySelector("[data-form-status]");
    const successPanel = form.querySelector("[data-form-success]");
    const sourcePageInput = form.querySelector("[data-source-page]");
    const messageField = form.elements.message;
    const messageCount = form.querySelector("[data-message-count]");

    const requiredFieldNames = [
        "fullName",
        "email",
        "propertyAddress",
        "cityStateZip",
        "propertyType",
        "propertyCondition",
        "occupancyStatus",
        "desiredTimeline",
        "privacyConsent"
    ];

    const fieldLimits = {
        fullName: 120,
        email: 254,
        propertyAddress: 220,
        cityStateZip: 140,
        propertyType: 100,
        propertyCondition: 120,
        occupancyStatus: 120,
        desiredTimeline: 120,
        askingPrice: 80,
        message: 5000
    };

    let isSubmitting = false;
    let activeRequest = null;

    const getPageSource = () => {
        const pathname = window.location.pathname || "";
        const pageName = pathname.split("/").filter(Boolean).pop();

        return pageName || "contact.html";
    };

    const getField = (name) => {
        const field = form.elements.namedItem(name);

        if (
            field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement ||
            field instanceof HTMLTextAreaElement
        ) {
            return field;
        }

        return null;
    };

    const getErrorElement = (name) => {
        return form.querySelector(`[data-error-for="${name}"]`);
    };

    const normalizeSingleLine = (value) => {
        return String(value ?? "")
            .replace(/\s+/g, " ")
            .trim();
    };

    const normalizeMultiline = (value) => {
        return String(value ?? "")
            .replace(/\r\n?/g, "\n")
            .replace(/[ \t]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    };

    const setFieldError = (name, message) => {
        const field = getField(name);
        const errorElement = getErrorElement(name);

        if (field) {
            field.setAttribute("aria-invalid", "true");

            const fieldContainer = field.closest(".contact-field");
            const consentContainer = field.closest(".contact-form__consent");

            fieldContainer?.classList.add("has-error");
            consentContainer?.classList.add("has-error");
        }

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add("is-visible");
        }
    };

    const clearFieldError = (name) => {
        const field = getField(name);
        const errorElement = getErrorElement(name);

        if (field) {
            field.setAttribute("aria-invalid", "false");

            const fieldContainer = field.closest(".contact-field");
            const consentContainer = field.closest(".contact-form__consent");

            fieldContainer?.classList.remove("has-error");
            consentContainer?.classList.remove("has-error");
        }

        if (errorElement) {
            errorElement.textContent = "";
            errorElement.classList.remove("is-visible");
        }
    };

    const clearAllFieldErrors = () => {
        const errorElements = form.querySelectorAll("[data-error-for]");

        errorElements.forEach((errorElement) => {
            const name = errorElement.getAttribute("data-error-for");

            if (name) {
                clearFieldError(name);
            }
        });
    };

    const showFormStatus = (message, type = "error") => {
        if (!formStatus) {
            return;
        }

        formStatus.textContent = message;
        formStatus.classList.remove(
            "is-error",
            "is-success",
            "is-visible"
        );

        if (message) {
            formStatus.classList.add(
                "is-visible",
                type === "success" ? "is-success" : "is-error"
            );
        }
    };

    const clearFormStatus = () => {
        showFormStatus("");
    };

    const validateEmail = (value) => {
        const email = normalizeSingleLine(value);

        if (!email || email.length > fieldLimits.email) {
            return false;
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const validateField = (name) => {
        const field = getField(name);

        if (!field) {
            return true;
        }

        const rawValue =
            field instanceof HTMLInputElement &&
                field.type === "checkbox"
                ? field.checked
                : field.value;

        const value =
            field instanceof HTMLTextAreaElement
                ? normalizeMultiline(rawValue)
                : normalizeSingleLine(rawValue);

        let message = "";

        if (name === "fullName") {
            if (!value) {
                message = "Please enter your full name.";
            } else if (value.length < 2) {
                message = "Please enter a valid full name.";
            } else if (value.length > fieldLimits.fullName) {
                message = "Your full name is too long.";
            }
        }

        if (name === "email") {
            if (!value) {
                message = "Please enter your email address.";
            } else if (!validateEmail(value)) {
                message = "Please enter a valid email address.";
            }
        }

        if (name === "propertyAddress") {
            if (!value) {
                message = "Please enter the property address.";
            } else if (value.length < 4) {
                message = "Please enter a complete property address.";
            } else if (value.length > fieldLimits.propertyAddress) {
                message = "The property address is too long.";
            }
        }

        if (name === "cityStateZip") {
            if (!value) {
                message = "Please enter the city, state, and ZIP code.";
            } else if (value.length < 4) {
                message = "Please enter a complete city, state, and ZIP code.";
            } else if (value.length > fieldLimits.cityStateZip) {
                message = "The city, state, and ZIP information is too long.";
            }
        }

        if (name === "propertyType") {
            if (!value) {
                message = "Please select the property type.";
            } else if (value.length > fieldLimits.propertyType) {
                message = "The selected property type is invalid.";
            }
        }

        if (name === "propertyCondition") {
            if (!value) {
                message = "Please select the property condition.";
            } else if (value.length > fieldLimits.propertyCondition) {
                message = "The selected property condition is invalid.";
            }
        }

        if (name === "occupancyStatus") {
            if (!value) {
                message = "Please select the occupancy status.";
            } else if (value.length > fieldLimits.occupancyStatus) {
                message = "The selected occupancy status is invalid.";
            }
        }

        if (name === "desiredTimeline") {
            if (!value) {
                message = "Please select your desired timeline.";
            } else if (value.length > fieldLimits.desiredTimeline) {
                message = "The selected timeline is invalid.";
            }
        }

        if (name === "askingPrice") {
            if (value.length > fieldLimits.askingPrice) {
                message = "The asking price information is too long.";
            }
        }

        if (name === "message") {
            if (value.length > fieldLimits.message) {
                message =
                    "Please shorten your message to 5,000 characters or fewer.";
            }
        }

        if (name === "privacyConsent") {
            if (rawValue !== true) {
                message =
                    "Please confirm that you have reviewed the Privacy Policy.";
            }
        }

        if (message) {
            setFieldError(name, message);
            return false;
        }

        clearFieldError(name);
        return true;
    };

    const validateForm = () => {
        const fieldNames = [
            ...requiredFieldNames,
            "askingPrice",
            "message"
        ];

        let firstInvalidField = null;
        let isValid = true;

        fieldNames.forEach((name) => {
            const fieldIsValid = validateField(name);

            if (!fieldIsValid) {
                isValid = false;

                if (!firstInvalidField) {
                    firstInvalidField = getField(name);
                }
            }
        });

        if (!isValid) {
            showFormStatus(
                "Please review the highlighted fields and try again."
            );

            firstInvalidField?.focus({
                preventScroll: true
            });

            firstInvalidField?.scrollIntoView({
                behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches
                    ? "auto"
                    : "smooth",
                block: "center"
            });
        }

        return isValid;
    };

    const updateMessageState = () => {
        if (
            !(messageField instanceof HTMLTextAreaElement) ||
            !messageCount
        ) {
            return;
        }

        const length = messageField.value.length;
        const limit = fieldLimits.message;

        messageCount.classList.remove(
            "is-warning",
            "is-limit"
        );

        if (length >= limit) {
            messageCount.textContent =
                "Maximum message length reached";
            messageCount.classList.add("is-limit");
            return;
        }

        if (length >= limit * 0.8) {
            messageCount.textContent =
                "Your message is approaching the maximum length";
            messageCount.classList.add("is-warning");
            return;
        }

        messageCount.textContent =
            length > 0
                ? "Additional property details added"
                : "Additional details are optional";
    };

    const setSubmittingState = (submitting) => {
        isSubmitting = submitting;

        if (submitButton) {
            submitButton.disabled = submitting;
            submitButton.setAttribute(
                "aria-busy",
                submitting ? "true" : "false"
            );
            submitButton.classList.toggle(
                "is-loading",
                submitting
            );
        }

        if (submitLabel) {
            submitLabel.textContent = submitting
                ? "Sending Request"
                : "Submit Property Request";
        }

        if (submitLoader) {
            submitLoader.hidden = !submitting;
        }
    };

    const safelyReadJson = async (response) => {
        const contentType =
            response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            return null;
        }

        try {
            return await response.json();
        } catch {
            return null;
        }
    };

    const applyServerErrors = (errors) => {
        if (!errors || typeof errors !== "object") {
            return false;
        }

        let firstInvalidField = null;
        let applied = false;

        Object.entries(errors).forEach(
            ([name, message]) => {
                if (typeof message !== "string") {
                    return;
                }

                const field = getField(name);

                if (!field) {
                    return;
                }

                setFieldError(name, message);
                applied = true;

                if (!firstInvalidField) {
                    firstInvalidField = field;
                }
            }
        );

        if (firstInvalidField) {
            firstInvalidField.focus({
                preventScroll: true
            });

            firstInvalidField.scrollIntoView({
                behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches
                    ? "auto"
                    : "smooth",
                block: "center"
            });
        }

        return applied;
    };

    const showSuccess = (message) => {
        clearAllFieldErrors();
        showFormStatus("", "success");

        form.reset();
        updateMessageState();

        form.classList.add("is-complete");

        if (successPanel) {
            const successParagraph =
                successPanel.querySelector("p");

            if (successParagraph) {
                successParagraph.textContent =
                    message || SUCCESS_MESSAGE;
            }

            successPanel.hidden = false;

            successPanel.focus({
                preventScroll: true
            });

            successPanel.scrollIntoView({
                behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches
                    ? "auto"
                    : "smooth",
                block: "center"
            });
        }

        if (submitButton) {
            submitButton.hidden = true;
        }
    };

    const hideSuccess = () => {
        form.classList.remove("is-complete");

        if (successPanel) {
            successPanel.hidden = true;
        }

        if (submitButton) {
            submitButton.hidden = false;
        }
    };

    const prepareFormData = () => {
        const formData = new FormData(form);

        const singleLineFields = [
            "fullName",
            "email",
            "propertyAddress",
            "cityStateZip",
            "propertyType",
            "propertyCondition",
            "occupancyStatus",
            "desiredTimeline",
            "askingPrice",
            "sourcePage",
            "company"
        ];

        singleLineFields.forEach((name) => {
            const value = formData.get(name);

            if (typeof value === "string") {
                formData.set(
                    name,
                    normalizeSingleLine(value)
                );
            }
        });

        const message = formData.get("message");

        if (typeof message === "string") {
            formData.set(
                "message",
                normalizeMultiline(message)
            );
        }

        return formData;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        hideSuccess();
        clearFormStatus();
        clearAllFieldErrors();

        if (!validateForm()) {
            return;
        }

        activeRequest?.abort();
        activeRequest = new AbortController();

        setSubmittingState(true);

        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: prepareFormData(),
                headers: {
                    Accept: "application/json"
                },
                signal: activeRequest.signal,
                credentials: "same-origin"
            });

            const payload = await safelyReadJson(response);

            if (
                response.ok &&
                payload &&
                payload.success === true
            ) {
                showSuccess(
                    typeof payload.message === "string"
                        ? payload.message
                        : SUCCESS_MESSAGE
                );

                return;
            }

            const serverErrors =
                payload &&
                    typeof payload.errors === "object"
                    ? payload.errors
                    : null;

            const errorsApplied =
                applyServerErrors(serverErrors);

            const fallbackMessage =
                response.status >= 500
                    ? "We could not send your request right now. Please try again shortly or contact us by email."
                    : "Please review the submitted information and try again.";

            showFormStatus(
                payload &&
                    typeof payload.message === "string"
                    ? payload.message
                    : fallbackMessage
            );

            if (!errorsApplied && formStatus) {
                formStatus.focus?.();
            }
        } catch (error) {
            if (
                error instanceof DOMException &&
                error.name === "AbortError"
            ) {
                return;
            }

            showFormStatus(
                "We could not connect to the form service. Please check your connection and try again, or contact us by email."
            );
        } finally {
            activeRequest = null;
            setSubmittingState(false);
        }
    };

    const handleFieldInteraction = (event) => {
        const target = event.target;

        if (
            !(
                target instanceof HTMLInputElement ||
                target instanceof HTMLSelectElement ||
                target instanceof HTMLTextAreaElement
            )
        ) {
            return;
        }

        if (!target.name) {
            return;
        }

        if (
            target.getAttribute("aria-invalid") === "true"
        ) {
            validateField(target.name);
        }

        if (target.name === "message") {
            updateMessageState();
        }

        clearFormStatus();
    };

    const handleFieldBlur = (event) => {
        const target = event.target;

        if (
            !(
                target instanceof HTMLInputElement ||
                target instanceof HTMLSelectElement ||
                target instanceof HTMLTextAreaElement
            )
        ) {
            return;
        }

        if (!target.name || target.name === "company") {
            return;
        }

        if (
            requiredFieldNames.includes(target.name) ||
            normalizeSingleLine(target.value) !== ""
        ) {
            validateField(target.name);
        }
    };

    form.noValidate = true;

    if (sourcePageInput) {
        sourcePageInput.value = getPageSource();
    }

    updateMessageState();
    setSubmittingState(false);
    hideSuccess();

    form.addEventListener("submit", handleSubmit);
    form.addEventListener(
        "input",
        handleFieldInteraction
    );
    form.addEventListener(
        "change",
        handleFieldInteraction
    );
    form.addEventListener(
        "focusout",
        handleFieldBlur
    );

    window.addEventListener("pageshow", () => {
        setSubmittingState(false);
    });

    window.addEventListener("beforeunload", () => {
        activeRequest?.abort();
    });
})();