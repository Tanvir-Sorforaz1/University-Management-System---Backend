import httpStatus from "http-status";
import config from "../config/index.js";
import { AppError } from "../utils/AppError.js";
import { redisClient } from "./redis.js";

const ID_TOKEN_KEY = "bkash:idToken";
const REFRESH_TOKEN_KEY = "bkash:refreshToken";

/**
 * Returns a valid bKash id token, reusing the cached one from Redis
 * whenever possible instead of hitting bKash's auth API on every request:
 *  - id token still has > 10 min left        -> reuse it as-is
 *  - id token is expired/near-expiry, but a
 *    refresh token with > 10 min left exists -> refresh (cheaper than a
 *                                                fresh grant)
 *  - neither is usable                       -> grant a brand new pair
 */
export const getBkashIdToken = async (): Promise<string> => {
  try {
    let idToken = await redisClient.get(ID_TOKEN_KEY);
    const idTokenTTL = await redisClient.ttl(ID_TOKEN_KEY);

    if (idToken && idTokenTTL > 600) {
      return idToken;
    }

    const refreshToken = await redisClient.get(REFRESH_TOKEN_KEY);
    const refreshTokenTTL = await redisClient.ttl(REFRESH_TOKEN_KEY);

    if (refreshToken && refreshTokenTTL > 600) {
      const refreshResponse = await fetch(
        `${config.bkash_base_url}/tokenized/checkout/token/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            username: config.bkash_username,
            password: config.bkash_password,
          },
          body: JSON.stringify({
            app_key: config.bkash_app_key,
            app_secret: config.bkash_app_secret,
            refresh_token: refreshToken,
          }),
        }
      );

      if (!refreshResponse.ok) {
        throw new AppError(httpStatus.BAD_GATEWAY, "bKash access token refresh failed");
      }

      const refreshResult = await refreshResponse.json();
      idToken = refreshResult.id_token as string;

      await redisClient.set(ID_TOKEN_KEY, idToken, {
        expiration: { type: "EX", value: 60 * 60 }, // 1 hour
      });

      return idToken;
    }

    // Neither a usable id token nor refresh token — grant a fresh pair.
    const grantResponse = await fetch(
      `${config.bkash_base_url}/tokenized/checkout/token/grant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          username: config.bkash_username,
          password: config.bkash_password,
        },
        body: JSON.stringify({
          app_key: config.bkash_app_key,
          app_secret: config.bkash_app_secret,
        }),
      }
    );

    if (!grantResponse.ok) {
      throw new AppError(httpStatus.BAD_GATEWAY, "bKash access token grant failed");
    }

    const grantResult = await grantResponse.json();

    await redisClient.set(ID_TOKEN_KEY, grantResult.id_token, {
      expiration: { type: "EX", value: 60 * 60 }, // 1 hour
    });

    await redisClient.set(REFRESH_TOKEN_KEY, grantResult.refresh_token, {
      expiration: { type: "EX", value: 60 * 60 * 24 * 28 }, // 28 days
    });

    return grantResult.id_token as string;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(httpStatus.BAD_GATEWAY, error.message);
  }
};

interface CreateBkashPaymentInput {
  amount: number;
  payerReference: string; // student email/phone
  merchantInvoiceNumber: string; // our own Payment.id
  callbackURL: string;
}

/**
 * Creates a bKash checkout session. Returns bKash's own paymentID (needed
 * later to execute the payment) and the bkashURL the student should be
 * redirected to.
 */
export const createBkashPayment = async (input: CreateBkashPaymentInput) => {
  const idToken = await getBkashIdToken();

  const response = await fetch(`${config.bkash_base_url}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: idToken,
      "X-App-Key": config.bkash_app_key,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: input.payerReference,
      callbackURL: input.callbackURL,
      amount: input.amount.toString(),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: input.merchantInvoiceNumber,
    }),
  });

  if (!response.ok) {
    throw new AppError(httpStatus.BAD_GATEWAY, "Failed to create bKash payment session");
  }

  const result = await response.json();

  if (!result.bkashURL || !result.paymentID) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      result.statusMessage || "bKash payment session creation failed"
    );
  }

  return result as {
    paymentID: string;
    bkashURL: string;
    merchantInvoiceNumber: string;
    [key: string]: unknown;
  };
};

/**
 * Finalizes a payment after the student completes it on bKash's hosted
 * page. Always call this from the callback handler — never trust the
 * `status` query param alone, since it's just a browser redirect.
 */
export const executeBkashPayment = async (paymentID: string) => {
  const idToken = await getBkashIdToken();

  const response = await fetch(`${config.bkash_base_url}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: idToken,
      "X-App-Key": config.bkash_app_key,
    },
    body: JSON.stringify({ paymentID }),
  });

  if (!response.ok) {
    throw new AppError(httpStatus.BAD_GATEWAY, "Failed to execute bKash payment");
  }

  return response.json() as Promise<{
    trxID?: string;
    transactionStatus?: string;
    amount?: string;
    paymentExecuteTime?: string;
    merchantInvoiceNumber?: string;
    statusMessage?: string;
    [key: string]: unknown;
  }>;
};

interface RefundBkashPaymentInput {
  paymentID: string;
  trxID: string;
  amount: number;
  sku: string;
  reason: string;
}

/** Not wired to a route yet — available for a future fee-refund/cancellation flow. */
export const refundBkashPayment = async (input: RefundBkashPaymentInput) => {
  const idToken = await getBkashIdToken();

  const response = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/payment/refund`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: idToken,
        "X-App-Key": config.bkash_app_key,
      },
      body: JSON.stringify({
        paymentID: input.paymentID,
        trxID: input.trxID,
        amount: input.amount.toString(),
        sku: input.sku,
        reason: input.reason,
      }),
    }
  );

  if (!response.ok) {
    throw new AppError(httpStatus.BAD_GATEWAY, "Failed to refund bKash payment");
  }

  return response.json();
};
