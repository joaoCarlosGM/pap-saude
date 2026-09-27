export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_MAX_LENGTH = 256;

export const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
} as const;

export const SESSION_TOKEN_BYTES = 32;

export const SESSION_TTL_SECONDS = 60 * 60 * 8;

export const SESSION_LAST_SEEN_UPDATE_INTERVAL_SECONDS = 60 * 5;

export const SESSION_COOKIE_NAME = "pap_session";

export const SESSION_COOKIE_PATH = "/";


export const LOGIN_FAILURE_WINDOW_SECONDS = 60 * 15;

export const LOGIN_ORIGIN_DISTINCT_IDENTITY_LIMIT = 20;

export const LOGIN_ORIGIN_BLOCK_SECONDS = 60 * 10;


export const MFA_SECRET_KEY_ENV = "MFA_SECRET_ENCRYPTION_KEY";

export const MFA_SECRET_KEY_ID_ENV = "MFA_SECRET_ENCRYPTION_KEY_ID";

export const MFA_SECRET_CIPHER_VERSION = "v1";

export const MFA_SECRET_DEFAULT_KEY_ID = "primary";

export const MFA_SECRET_IV_BYTES = 12;

export const MFA_SECRET_AUTH_TAG_BYTES = 16;

export const MFA_SECRET_AAD = "pap-saude:mfa:totp-secret:v1";


export const MFA_TOTP_ISSUER = "PAP Saúde";

export const MFA_TOTP_ALGORITHM = "SHA1";

export const MFA_TOTP_DIGITS = 6;

export const MFA_TOTP_PERIOD_SECONDS = 30;

export const MFA_TOTP_WINDOW = 1;

export const MFA_TOTP_SECRET_BYTES = 20;

export const MFA_ENROLLMENT_TTL_SECONDS = 60 * 10;
