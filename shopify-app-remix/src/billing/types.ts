import {
  AppSubscription,
  BillingCheckParams,
  BillingCheckResponseObject,
  BillingRequestParams,
} from "@shopify/shopify-api";

import { AppConfigArg } from "../config-types";

export interface RequireBillingOptions<Config extends AppConfigArg>
  extends Omit<BillingCheckParams, "session" | "plans" | "returnObject"> {
  /**
   * The plans to check for. Must be one of the values defined in the `billing` config option.
   */
  plans: (keyof Config["billing"])[];
  /**
   * How to handle the request if the shop does not have an active payment for any of the given plans.
   */
  onFailure: (error: any) => Promise<Response>;
}

export interface RequestBillingOptions<Config extends AppConfigArg>
  extends Omit<BillingRequestParams, "session" | "plan" | "returnObject"> {
  /**
   * The plan to request. Must be one of the values defined in the `billing` config option.
   */
  plan: keyof Config["billing"];
}

export interface CancelBillingOptions {
  /**
   * The ID of the subscription to cancel.
   */
  subscriptionId: string;
  /**
   * Whether to prorate the cancellation.
   *
   * {@link https://shopify.dev/docs/apps/billing/subscriptions/cancel-recurring-charges}
   */
  prorate?: boolean;
  isTest?: boolean;
}

export interface BillingContext<Config extends AppConfigArg> {
  /**
   * Checks if the shop has an active payment for any the given plans defined in the `billing` config option.
   *
   * @returns A promise that resolves to an object containing the active purchases for the shop.
   *
   * @example
   * Requesting billing right away
   * ```ts
   * // app/routes/**\/.ts
   * import { LoaderArgs } from "@remix-run/node";
   * import { shopify, MY_PLAN_1 } from "../shopify.server";
   *
   * export const loader = async ({ request }: LoaderArgs) => {
   *   const { billing } = await shopify.authenticate.admin(request);
   *   await billing.require({
   *     plans: [MY_PLAN_1],
   *     isTest: true,
   *     onFailure: async () => billing.request({ plan: MY_PLAN_1 }),
   *   });
   *
   *   // App logic
   * };
   * ```
   *
   * @example
   * Redirecting to a page where the merchant can select a plan
   * ```ts
   * // app/routes/**\/.ts
   * import { LoaderArgs, redirect } from "@remix-run/node";
   * import { shopify, MY_PLAN_1, MY_PLAN_2 } from "../shopify.server";
   *
   * export const loader = async ({ request }: LoaderArgs) => {
   *   const { billing } = await shopify.authenticate.admin(request);
   *   const billingCheck = await billing.require({
   *     plans: [MY_PLAN_1, MY_PLAN_2],
   *     isTest: true,
   *     onFailure: () => redirect('/select-plan'),
   *   });
   *
   *   const subscription = billingCheck.appSubscriptions[0];
   *   console.log(`Shop is on ${subscription.name} (id ${subscription.id})`);
   *
   *   // App logic
   * };
   * ```
   */
  require: (
    options: RequireBillingOptions<Config>
  ) => Promise<BillingCheckResponseObject>;

  /**
   * Requests payment for the given plan.
   *
   * @returns Redirects to the confirmation URL for the payment.
   *
   * @example
   * Requesting billing when there is no payment with a custom return URL
   * ```ts
   * // app/routes/**\/.ts
   * import { LoaderArgs } from "@remix-run/node";
   * import { shopify, MY_PLAN_1 } from "../shopify.server";
   *
   * export const loader = async ({ request }: LoaderArgs) => {
   *   const { billing } = await shopify.authenticate.admin(request);
   *   await billing.require({
   *     plans: [MY_PLAN_1],
   *     onFailure: async () => billing.request({
   *       plan: MY_PLAN_1,
   *       isTest: true,
   *       returnUrl: '/billing-complete',
   *     }),
   *   });
   *
   *   // App logic
   * };
   * ```
   */
  request: (options: RequestBillingOptions<Config>) => Promise<never>;

  /**
   * Cancels an ongoing subscription, given its id.
   *
   * @returns The cancelled subscription.
   *
   * @example
   * Cancelling a subscription
   * ```ts
   * // app/routes/cancel-subscription.ts
   * import { LoaderArgs } from "@remix-run/node";
   * import { shopify, MY_PLAN_1 } from "../shopify.server";
   *
   * export const loader = async ({ request }: LoaderArgs) => {
   *   const { billing } = await shopify.authenticate.admin(request);
   *   const billingCheck = await billing.require({
   *     plans: [MY_PLAN_1],
   *     onFailure: async () => billing.request({ plan: MY_PLAN_1 }),
   *   });
   *
   *   const subscription = billingCheck.appSubscriptions[0];
   *   const cancelledSubscription = await billing.cancel({
   *     subscriptionId: subscription.id,
   *     isTest: true,
   *     prorate: true,
   *    });
   *
   *   // App logic
   * };
   * ```
   */
  cancel: (options: CancelBillingOptions) => Promise<AppSubscription>;
}
