import {
  ConfigParams as ApiConfigArg,
  ConfigInterface as ApiConfig,
  ShopifyRestResources,
  HttpWebhookHandler,
  PubSubWebhookHandler,
  EventBridgeWebhookHandler,
  Shopify,
  Session,
  ApiVersion,
} from "@shopify/shopify-api";
import { SessionStorage } from "@shopify/shopify-app-session-storage";

export interface AppConfigArg<
  Resources extends ShopifyRestResources = ShopifyRestResources,
  Storage extends SessionStorage = SessionStorage
> extends Omit<
    ApiConfigArg<Resources>,
    "hostName" | "hostScheme" | "isEmbeddedApp" | "apiVersion"
  > {
  /**
   * The URL your app is running on.
   *
   * The `@shopify/cli` provides this URL as `process.env.SHOPIFY_APP_URL`.  For development this is probably a tunnel URL that points to your local machine.  If production this is your production URL.
   */
  appUrl: string;

  /**
   * An adaptor for storing sessions in your database of choice.
   *
   * Shopify provides multiple session storage adaptors ans you can create your own. {@link https://github.com/Shopify/shopify-app-js/blob/main/README.md#session-storage-options}
   *
   * @defaultValue `new SQLiteSessionStorage("database.sqlite")`
   *
   * @example
   * Using Prisma
   * ```ts
   * import { shopifyApp } from "@shopify/shopify-app-remix";
   * import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
   *
   * import prisma from "~/db.server";
   *
   * export const shopify = shopifyApp({
   *   // ... etc
   *   sessionStorage: new PrismaSessionStorage(prisma),
   * });
   * ```
   */
  sessionStorage?: Storage;

  /**
   * Does your app use online or just offline tokens.
   *
   * If your app uses online tokens both online and offline tokens will be saved to your database.  This ensures your app can perform background jobs
   *
   * {@link https://shopify.dev/docs/apps/auth/oauth/access-modes}
   *
   * @defaultValue `false`
   */
  useOnlineTokens?: boolean;

  /**
   * The config for the webhook topics your app would like to subscribe to.
   *
   * {@link https://shopify.dev/docs/apps/webhooks}
   *
   * This can be in used in conjunction with the afterAuth hook to register webhook topics when a user installs your app.  Or you can use this function in other processes such as background jobs.
   *
   * @example
   * Registering for a webhook when a merchant uninstalls your app.
   * ```ts
   * // app/shopify.server.ts
   * import { DeliveryMethod, shopifyApp } from "@shopify/shopify-app-remix";
   *
   * export const shopify = shopifyApp({
   *   webhooks: {
   *     APP_UNINSTALLED: {
   *       deliveryMethod: DeliveryMethod.Http,
   *        callbackUrl: "/webhooks",
   *     },
   *   },
   *   hooks: {
   *     afterAuth: async ({ session }) => {
   *       shopify.registerWebhooks({ session });
   *     }
   *   },
   *   // ...etc
   * });
   *
   * // app/routes/webhooks.jsx
   * import { ActionArgs } from "@remix-run/node";
   *
   * import { shopify } from "../shopify.server";
   * import db from "../db.server";
   *
   * export const action = async ({ request }: ActionArgs) => {
   *   const { topic, shop } = await shopify.authenticate.webhook(request);
   *
   *   switch (topic) {
   *     case "APP_UNINSTALLED":
   *       await db.session.deleteMany({ where: { shop } });
   *       break;
   *     case "CUSTOMERS_DATA_REQUEST":
   *     case "CUSTOMERS_REDACT":
   *     case "SHOP_REDACT":
   *     default:
   *       throw new Response("Unhandled webhook topic", { status: 404 });
   *   }
   *   throw new Response();
   * };
   * ```
   */
  webhooks?: WebhookConfig;

  /**
   * Functions to call at key places during your apps lifecycle.
   *
   * These functions are called in the context of the request that triggered them.  This means you can access the session.
   *
   * @example
   * Seeding your database custom data when a merchant installs your app.
   * ```ts
   * import { DeliveryMethod, shopifyApp } from "@shopify/shopify-app-remix";
   * import { seedStoreData } from "~/db/seeds"
   *
   * export const shopify = shopifyApp({
   *   hooks: {
   *     afterAuth: async ({ session }) => {
   *       seedStoreData({session})
   *     }
   *   },
   *   // ...etc
   * });
   * ```
   */
  hooks?: HooksConfig;

  /**
   * Does your app render embedded inside the Shopify Admin or on its own.
   *
   * Unless you have very specific needs, this should be true.
   *
   * @defaultValue `true`
   */
  isEmbeddedApp?: boolean;

  /**
   * What version of Shopify's Admin API's would you like to use.
   *
   * {@link https://shopify.dev/docs/api/}
   *
   * @defaultValue `LATEST_API_VERSION` from `@shopify/shopify-app-remix`
   *
   * @example
   * Using the latest API Version (Recommended)
   * ```ts
   * import { LATEST_API_VERSION, shopifyApp } from "@shopify/shopify-app-remix";
   *
   * export const shopify = shopifyApp({
   *   // ...etc
   *   apiVersion: LATEST_API_VERSION,
   * });
   * ```
   */
  apiVersion?: ApiVersion;

  /**
   * A path that Shopify can reserve for auth related endpoints.
   *
   * This must match a $ route in your Remix app.  That route must export a loader function that calls `shopify.authenticate.admin(request)`.
   *
   * @default `"/auth"`
   *
   * @example
   * Using the latest API Version (Recommended)
   * ```ts
   * // app/shopify.server.ts
   * import { LATEST_API_VERSION, shopifyApp } from "@shopify/shopify-app-remix";
   *
   * export const shopify = shopifyApp({
   *   // ...etc
   *   apiVersion: LATEST_API_VERSION,
   * });
   *
   * // app/routes/auth/$.jsx
   * import { LoaderArgs } from "@remix-run/node";
   * import { shopify } from "../../shopify.server";
   *
   * export async function loader({ request }: LoaderArgs) {
   *   return shopify.authenticate.admin(request);
   * }
   * ```
   */
  authPathPrefix?: string;
}

export interface AppConfig<S extends SessionStorage = SessionStorage>
  extends ApiConfig {
  appUrl: string;
  auth: AuthConfig;
  sessionStorage: S;
  useOnlineTokens: boolean;
  hooks: HooksConfig;
}

interface AuthConfig {
  path: string;
  callbackPath: string;
  exitIframePath: string;
  patchSessionTokenPath: string;
}

// TODO: The callbackUrl field should be optional (and eventually removed) in the library
// https://github.com/Shopify/shopify-app-template-remix/issues/31
type TempWebhookHandler =
  | Omit<HttpWebhookHandler, "callback">
  | PubSubWebhookHandler
  | EventBridgeWebhookHandler;

export interface WebhookConfig {
  [key: string]: TempWebhookHandler | TempWebhookHandler[];
}

interface HooksConfig {
  /**
   * A function to call after a merchant installs your app
   *
   * @param context - An object with context about the request that triggered the hook.
   * @param context.session - The session of the merchant that installed your app. This is the output of sessionStorage.loadSession in case people want to load their own.
   * @param context.admin - An object with access to the Shopify Admin API's.
   *
   * @example
   * Registering webhooks and seeding data when a merchant installs your app.
   * ```ts
   * import { DeliveryMethod, shopifyApp } from "@shopify/shopify-app-remix";
   * import { seedStoreData } from "~/db/seeds"
   *
   * export const shopify = shopifyApp({
   *   hooks: {
   *     afterAuth: async ({ session }) => {
   *       shopify.registerWebhooks({ session });
   *       seedStoreData({session})
   *     }
   *   },
   *   webhooks: {
   *     APP_UNINSTALLED: {
   *       deliveryMethod: DeliveryMethod.Http,
   *        callbackUrl: "/webhooks",
   *     },
   *   },
   *   // ...etc
   * });
   * ```
   */
  afterAuth?: (options: AfterAuthOptions) => void | Promise<void>;
}

export interface AfterAuthOptions<
  R extends ShopifyRestResources = ShopifyRestResources
> {
  session: Session;
  admin: AdminApiContext<R>;
}

export interface AdminApiContext<
  R extends ShopifyRestResources = ShopifyRestResources
> {
  rest: InstanceType<Shopify["clients"]["Rest"]> & R;
  // TODO: Improve the public API in @shopify/shopify-api GraphQL client
  // https://github.com/orgs/Shopify/projects/6899/views/1?pane=issue&itemId=28352645
  graphql: InstanceType<Shopify["clients"]["Graphql"]>;
}
