<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

const SUCCESS_MESSAGE = 'Thank you! We have successfully received your request. Our team will review your information and get back to you shortly.';
const MAX_REQUEST_SIZE = 100000;

function respond(int $statusCode, array $payload): void
{
    http_response_code($statusCode);

    echo json_encode(
        $payload,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );

    exit;
}

function getRequestPayload(): array
{
    $contentType = strtolower(
        (string) ($_SERVER['CONTENT_TYPE'] ?? '')
    );

    if (str_contains($contentType, 'application/json')) {
        $rawBody = file_get_contents('php://input');

        if ($rawBody === false || trim($rawBody) === '') {
            return [];
        }

        $decoded = json_decode($rawBody, true);

        return is_array($decoded) ? $decoded : [];
    }

    return is_array($_POST) ? $_POST : [];
}

function normalizeSingleLine(mixed $value): string
{
    if (!is_scalar($value)) {
        return '';
    }

    $text = trim((string) $value);
    $text = strip_tags($text);
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/u', '', $text) ?? '';
    $text = preg_replace('/\s+/u', ' ', $text) ?? '';

    return trim($text);
}

function normalizeMultiline(mixed $value): string
{
    if (!is_scalar($value)) {
        return '';
    }

    $text = trim((string) $value);
    $text = strip_tags($text);
    $text = str_replace(["\r\n", "\r"], "\n", $text);
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/u', '', $text) ?? '';
    $text = preg_replace('/[ \t]+/u', ' ', $text) ?? '';
    $text = preg_replace('/\n{3,}/u', "\n\n", $text) ?? '';

    return trim($text);
}

function textLength(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }

    return strlen($value);
}

function isAcceptedConsent(mixed $value): bool
{
    if (is_bool($value)) {
        return $value;
    }

    if (!is_scalar($value)) {
        return false;
    }

    $normalized = strtolower(trim((string) $value));

    return in_array(
        $normalized,
        ['1', 'true', 'yes', 'on', 'accepted'],
        true
    );
}

function readSiteConfig(): array
{
    $configPath = __DIR__ . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'config.js';

    if (!is_file($configPath) || !is_readable($configPath)) {
        throw new RuntimeException('The website configuration file is unavailable.');
    }

    $configSource = file_get_contents($configPath);

    if ($configSource === false || trim($configSource) === '') {
        throw new RuntimeException('The website configuration file is empty.');
    }

    $matched = preg_match(
        '/window\.SITE_CONFIG\s*=\s*Object\.freeze\s*\(\s*(\{.*\})\s*\)\s*;?\s*$/s',
        trim($configSource),
        $matches
    );

    if ($matched !== 1 || empty($matches[1])) {
        throw new RuntimeException('The website configuration format is invalid.');
    }

    $config = json_decode($matches[1], true);

    if (!is_array($config)) {
        throw new RuntimeException('The website configuration could not be decoded.');
    }

    return $config;
}

function getConfigValue(array $config, array $path, string $fallback = ''): string
{
    $current = $config;

    foreach ($path as $key) {
        if (!is_array($current) || !array_key_exists($key, $current)) {
            return $fallback;
        }

        $current = $current[$key];
    }

    if (!is_scalar($current)) {
        return $fallback;
    }

    return trim((string) $current);
}

function buildEmailBody(array $fields, string $brandName): string
{
    $lines = [
        'New property review request',
        '',
        'Website: ' . $brandName,
        'Source page: ' . $fields['sourcePage'],
        '',
        'CONTACT INFORMATION',
        'Full name: ' . $fields['fullName'],
        'Email: ' . $fields['email'],
        '',
        'PROPERTY INFORMATION',
        'Property address: ' . $fields['propertyAddress'],
        'City, state and ZIP: ' . $fields['cityStateZip'],
        'Property type: ' . $fields['propertyType'],
        'Property condition: ' . $fields['propertyCondition'],
        'Occupancy status: ' . $fields['occupancyStatus'],
        'Desired timeline: ' . $fields['desiredTimeline'],
        'Optional asking price: ' . (
            $fields['askingPrice'] !== ''
            ? $fields['askingPrice']
            : 'Not provided'
        ),
        '',
        'ADDITIONAL INFORMATION',
        $fields['message'] !== ''
            ? $fields['message']
            : 'No additional message was provided.',
        '',
        'PRIVACY CONSENT',
        'The sender confirmed that they reviewed the Privacy Policy and consented to the processing of the submitted information.'
    ];

    return implode("\r\n", $lines);
}

if (
    isset($_SERVER['REQUEST_METHOD'])
    && strtoupper((string) $_SERVER['REQUEST_METHOD']) !== 'POST'
) {
    header('Allow: POST');

    respond(405, [
        'success' => false,
        'message' => 'This endpoint only accepts property form submissions.'
    ]);
}

$contentLength = isset($_SERVER['CONTENT_LENGTH'])
    ? (int) $_SERVER['CONTENT_LENGTH']
    : 0;

if ($contentLength > MAX_REQUEST_SIZE) {
    respond(413, [
        'success' => false,
        'message' => 'The submitted request is too large. Please shorten the message and try again.'
    ]);
}

$payload = getRequestPayload();

$honeypot = normalizeSingleLine($payload['company'] ?? '');

if ($honeypot !== '') {
    respond(200, [
        'success' => true,
        'message' => SUCCESS_MESSAGE
    ]);
}

$fields = [
    'fullName' => normalizeSingleLine($payload['fullName'] ?? ''),
    'email' => normalizeSingleLine($payload['email'] ?? ''),
    'propertyAddress' => normalizeSingleLine($payload['propertyAddress'] ?? ''),
    'cityStateZip' => normalizeSingleLine($payload['cityStateZip'] ?? ''),
    'propertyType' => normalizeSingleLine($payload['propertyType'] ?? ''),
    'propertyCondition' => normalizeSingleLine($payload['propertyCondition'] ?? ''),
    'occupancyStatus' => normalizeSingleLine($payload['occupancyStatus'] ?? ''),
    'desiredTimeline' => normalizeSingleLine($payload['desiredTimeline'] ?? ''),
    'askingPrice' => normalizeSingleLine($payload['askingPrice'] ?? ''),
    'message' => normalizeMultiline($payload['message'] ?? ''),
    'sourcePage' => normalizeSingleLine($payload['sourcePage'] ?? '')
];

if ($fields['sourcePage'] === '') {
    $referer = normalizeSingleLine($_SERVER['HTTP_REFERER'] ?? '');

    $fields['sourcePage'] = $referer !== ''
        ? $referer
        : 'contact.html';
}

$privacyConsent = isAcceptedConsent(
    $payload['privacyConsent'] ?? null
);

$errors = [];

if ($fields['fullName'] === '') {
    $errors['fullName'] = 'Please enter your full name.';
} elseif (textLength($fields['fullName']) < 2) {
    $errors['fullName'] = 'Please enter a valid full name.';
} elseif (textLength($fields['fullName']) > 120) {
    $errors['fullName'] = 'Your full name is too long.';
}

if ($fields['email'] === '') {
    $errors['email'] = 'Please enter your email address.';
} elseif (
    textLength($fields['email']) > 254
    || filter_var($fields['email'], FILTER_VALIDATE_EMAIL) === false
) {
    $errors['email'] = 'Please enter a valid email address.';
}

if ($fields['propertyAddress'] === '') {
    $errors['propertyAddress'] = 'Please enter the property address.';
} elseif (textLength($fields['propertyAddress']) < 4) {
    $errors['propertyAddress'] = 'Please enter a complete property address.';
} elseif (textLength($fields['propertyAddress']) > 220) {
    $errors['propertyAddress'] = 'The property address is too long.';
}

if ($fields['cityStateZip'] === '') {
    $errors['cityStateZip'] = 'Please enter the city, state, and ZIP code.';
} elseif (textLength($fields['cityStateZip']) < 4) {
    $errors['cityStateZip'] = 'Please enter a complete city, state, and ZIP code.';
} elseif (textLength($fields['cityStateZip']) > 140) {
    $errors['cityStateZip'] = 'The city, state, and ZIP information is too long.';
}

if ($fields['propertyType'] === '') {
    $errors['propertyType'] = 'Please select the property type.';
} elseif (textLength($fields['propertyType']) > 100) {
    $errors['propertyType'] = 'The selected property type is invalid.';
}

if ($fields['propertyCondition'] === '') {
    $errors['propertyCondition'] = 'Please select the property condition.';
} elseif (textLength($fields['propertyCondition']) > 120) {
    $errors['propertyCondition'] = 'The selected property condition is invalid.';
}

if ($fields['occupancyStatus'] === '') {
    $errors['occupancyStatus'] = 'Please select the occupancy status.';
} elseif (textLength($fields['occupancyStatus']) > 120) {
    $errors['occupancyStatus'] = 'The selected occupancy status is invalid.';
}

if ($fields['desiredTimeline'] === '') {
    $errors['desiredTimeline'] = 'Please select your desired timeline.';
} elseif (textLength($fields['desiredTimeline']) > 120) {
    $errors['desiredTimeline'] = 'The selected timeline is invalid.';
}

if (textLength($fields['askingPrice']) > 80) {
    $errors['askingPrice'] = 'The asking price information is too long.';
}

if (textLength($fields['message']) > 5000) {
    $errors['message'] = 'Please shorten your message to 5,000 characters or fewer.';
}

if (textLength($fields['sourcePage']) > 500) {
    $fields['sourcePage'] = 'contact.html';
}

if (!$privacyConsent) {
    $errors['privacyConsent'] = 'Please confirm that you have reviewed the Privacy Policy.';
}

if ($errors !== []) {
    respond(422, [
        'success' => false,
        'message' => 'Please review the highlighted fields and try again.',
        'errors' => $errors
    ]);
}

try {
    $config = readSiteConfig();

    $recipientEmail = getConfigValue(
        $config,
        ['contact', 'recipientEmail']
    );

    $brandName = getConfigValue(
        $config,
        ['brand', 'name'],
        'Velmora Home Offers'
    );

    if (
        $recipientEmail === ''
        || filter_var($recipientEmail, FILTER_VALIDATE_EMAIL) === false
    ) {
        throw new RuntimeException('The configured recipient email address is invalid.');
    }

    $subjectAddress = preg_replace(
        '/[\r\n]+/',
        ' ',
        $fields['propertyAddress']
    ) ?? 'Property request';

    $subjectAddress = trim($subjectAddress);

    if (textLength($subjectAddress) > 90) {
        if (function_exists('mb_substr')) {
            $subjectAddress = mb_substr(
                $subjectAddress,
                0,
                90,
                'UTF-8'
            );
        } else {
            $subjectAddress = substr(
                $subjectAddress,
                0,
                90
            );
        }
    }

    $subject = 'New property review request - ' . $subjectAddress;

    if (function_exists('mb_encode_mimeheader')) {
        $subject = mb_encode_mimeheader(
            $subject,
            'UTF-8',
            'B',
            "\r\n"
        );
    }

    $safeBrandName = preg_replace(
        '/[\r\n]+/',
        ' ',
        $brandName
    ) ?? 'Velmora Home Offers';

    $safeRecipientEmail = str_replace(
        ["\r", "\n"],
        '',
        $recipientEmail
    );

    $safeReplyTo = str_replace(
        ["\r", "\n"],
        '',
        $fields['email']
    );

    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'From: ' . $safeBrandName . ' <' . $safeRecipientEmail . '>',
        'Reply-To: ' . $safeReplyTo,
        'X-Mailer: PHP/' . PHP_VERSION
    ];

    $messageBody = buildEmailBody(
        $fields,
        $brandName
    );

    $sent = mail(
        $recipientEmail,
        $subject,
        $messageBody,
        implode("\r\n", $headers)
    );

    if (!$sent) {
        throw new RuntimeException('The server could not send the property request.');
    }

    respond(200, [
        'success' => true,
        'message' => SUCCESS_MESSAGE
    ]);
} catch (Throwable $error) {
    error_log(
        'Velmora contact form error: ' . $error->getMessage()
    );

    respond(500, [
        'success' => false,
        'message' => 'We could not send your request right now. Please try again shortly or contact us by email.'
    ]);
}
