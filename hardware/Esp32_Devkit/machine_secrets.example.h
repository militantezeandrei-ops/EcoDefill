#pragma once
// Copy to machine_secrets.h (gitignored) and provision securely before flashing.
// Must match the server's MACHINE_SECRET; at least 32 random characters.
const char* ECO_MACHINE_SECRET = "";
// PEM root CA for the deployed HTTPS server. Never replace verification with setInsecure().
const char* ECO_BACKEND_ROOT_CA = R"PEM(
-----BEGIN CERTIFICATE-----
REPLACE_WITH_THE_ISSUING_ROOT_CA_PEM
-----END CERTIFICATE-----
)PEM";
