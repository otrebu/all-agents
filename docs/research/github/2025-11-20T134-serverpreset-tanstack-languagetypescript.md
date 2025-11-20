# GitHub Code Search Results

**Query:** `server.preset tanstack language:typescript`
**Found:** 27 results, showing top 10
**Execution:** 2.1s

---

### 1. [RocketChat/Rocket.Chat](https://github.com/RocketChat/Rocket.Chat) ⭐ 43.9k

**Path:** `apps/meteor/jest.config.ts`
**Language:** typescript | **Lines:** 88
**Link:** https://github.com/RocketChat/Rocket.Chat/blob/8596daf01ac84864caa63dd937971e557933d401/apps/meteor/jest.config.ts

```typescript
import type { Config } from 'jest';

export default {
	projects: [
		{
			displayName: 'client',
			preset: client.preset,
			setupFilesAfterEnv: [...client.setupFilesAfterEnv],

			testMatch: [
				'<rootDir>/client/**/**.spec.[jt]s?(x)',
				'<rootDir>/ee/client/**/**.spec.[jt]s?(x)',
				'<rootDir>/app/ui-message/client/**/**.spec.[jt]s?(x)',
				'<rootDir>/tests/unit/client/views/**/*.spec.{ts,tsx}',
				'<rootDir>/tests/unit/client/providers/**/*.spec.{ts,tsx}',
			],

			moduleNameMapper: {
				'^react($|/.+)': '<rootDir>/node_modules/react$1',
				'^react-dom($|/.+)': '<rootDir>/node_modules/react-dom$1',
				'^react-i18next($|/.+)': '<rootDir>/node_modules/react-i18next$1',
				'^@tanstack/(.+)': '<rootDir>/node_modules/@tanstack/$1',
				'^meteor/(.*)': '<rootDir>/tests/mocks/client/meteor.ts',
			},

			coveragePathIgnorePatterns: ['<rootDir>/tests/', '/node_modules/'],
		},
		{
			displayName: 'server',
			preset: server.preset,
			testMatch: [
				'<rootDir>/app/livechat/server/business-hour/**/*.spec.ts?(x)',
				'<rootDir>/app/livechat/server/api/**/*.spec.ts',
				'<rootDir>/ee/app/authorization/server/validateUserRoles.spec.ts',
				'<rootDir>/ee/app/license/server/**/*.spec.ts',
				'<rootDir>/ee/server/patches/**/*.spec.ts',
				'<rootDir>/app/cloud/server/functions/supportedVersionsToken/**.spec.ts',
				'<rootDir>/app/utils/lib/**.spec.ts',
				'<rootDir>/server/lib/auditServerEvents/**.spec.ts',
				'<rootDir>/server/cron/**.spec.ts',
// ... truncated ...
```

---

### 2. [sst/sst](https://github.com/sst/sst) ⭐ 24.9k

**Path:** `platform/src/components/aws/tan-stack-start.ts`
**Language:** typescript | **Lines:** 89
**Link:** https://github.com/sst/sst/blob/13b5cc0ecb3e820d0aec1bbe951930d06c0c0abd/platform/src/components/aws/tan-stack-start.ts

```typescript
*
   * :::note
   * CloudFront has a limit of 20 cache policies per account, though you can request a limit
   * increase.
   * :::
   *
   * By default, a new cache policy is created for it. This allows you to reuse an existing
   * policy instead of creating a new one.
   *
   * @default A new cache policy is created
   * @example
   * ```js
   * {
   *   cachePolicy: "658327ea-f89d-4fab-a63d-7e88639e58f6"
   * }
   * ```
   */
  cachePolicy?: SsrSiteArgs["cachePolicy"];
}

/**
 * The `TanStackStart` component lets you deploy a [TanStack Start](https://tanstack.com/start/latest) app to AWS.
 *
 * :::note
 * You need to make sure the `server.preset` value in the `app.config.ts` is set to `aws-lambda`.
 * :::
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a TanStack Start app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.TanStackStart("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the TanStack Start app in the `my-app/` directory.
// ... truncated ...
```

---

### 3. [michaelcuneo/markdown-editor](https://github.com/michaelcuneo/markdown-editor) ⭐ 3

**Path:** `.sst/platform/src/components/aws/tan-stack-start.ts`
**Language:** typescript | **Lines:** 89
**Link:** https://github.com/michaelcuneo/markdown-editor/blob/18562525343b801f450cb51525d3cc0dc7601408/.sst/platform/src/components/aws/tan-stack-start.ts

```typescript
*
   * :::note
   * CloudFront has a limit of 20 cache policies per account, though you can request a limit
   * increase.
   * :::
   *
   * By default, a new cache policy is created for it. This allows you to reuse an existing
   * policy instead of creating a new one.
   *
   * @default A new cache policy is created
   * @example
   * ```js
   * {
   *   cachePolicy: "658327ea-f89d-4fab-a63d-7e88639e58f6"
   * }
   * ```
   */
  cachePolicy?: SsrSiteArgs["cachePolicy"];
}

/**
 * The `TanStackStart` component lets you deploy a [TanStack Start](https://tanstack.com/start/latest) app to AWS.
 *
 * :::note
 * You need to make sure the `server.preset` value in the `app.config.ts` is set to `aws-lambda`.
 * :::
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a TanStack Start app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.TanStackStart("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the TanStack Start app in the `my-app/` directory.
// ... truncated ...
```

---

### 4. [ayoubben18/next-starter](https://github.com/ayoubben18/next-starter) ⭐ 1

**Path:** `.sst/platform/src/components/aws/tan-stack-start.ts`
**Language:** typescript | **Lines:** 89
**Link:** https://github.com/ayoubben18/next-starter/blob/2edf1395eb3fefcd660702f85dadb13f76d6e6d2/.sst/platform/src/components/aws/tan-stack-start.ts

```typescript
*
   * :::note
   * CloudFront has a limit of 20 cache policies per account, though you can request a limit
   * increase.
   * :::
   *
   * By default, a new cache policy is created for it. This allows you to reuse an existing
   * policy instead of creating a new one.
   *
   * @default A new cache policy is created
   * @example
   * ```js
   * {
   *   cachePolicy: "658327ea-f89d-4fab-a63d-7e88639e58f6"
   * }
   * ```
   */
  cachePolicy?: SsrSiteArgs["cachePolicy"];
}

/**
 * The `TanStackStart` component lets you deploy a [TanStack Start](https://tanstack.com/start/latest) app to AWS.
 *
 * :::note
 * You need to make sure the `server.preset` value in the `app.config.ts` is set to `aws-lambda`.
 * :::
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a TanStack Start app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.TanStackStart("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the TanStack Start app in the `my-app/` directory.
// ... truncated ...
```

---

### 5. [michaelcuneo/codename-gen](https://github.com/michaelcuneo/codename-gen) ⭐ 0

**Path:** `.sst/platform/src/components/aws/tan-stack-start.ts`
**Language:** typescript | **Lines:** 89
**Link:** https://github.com/michaelcuneo/codename-gen/blob/597dc85740ffe3ee94e8d79a4f454ec85a5e90e2/.sst/platform/src/components/aws/tan-stack-start.ts

```typescript
*
   * :::note
   * CloudFront has a limit of 20 cache policies per account, though you can request a limit
   * increase.
   * :::
   *
   * By default, a new cache policy is created for it. This allows you to reuse an existing
   * policy instead of creating a new one.
   *
   * @default A new cache policy is created
   * @example
   * ```js
   * {
   *   cachePolicy: "658327ea-f89d-4fab-a63d-7e88639e58f6"
   * }
   * ```
   */
  cachePolicy?: SsrSiteArgs["cachePolicy"];
}

/**
 * The `TanStackStart` component lets you deploy a [TanStack Start](https://tanstack.com/start/latest) app to AWS.
 *
 * :::note
 * You need to make sure the `server.preset` value in the `app.config.ts` is set to `aws-lambda`.
 * :::
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a TanStack Start app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.TanStackStart("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the TanStack Start app in the `my-app/` directory.
// ... truncated ...
```

---

### 6. [johnhkchen/game-royale-dev-superMarioBros](https://github.com/johnhkchen/game-royale-dev-superMarioBros) ⭐ 0

**Path:** `.sst/platform/src/components/aws/tan-stack-start.ts`
**Language:** typescript | **Lines:** 89
**Link:** https://github.com/johnhkchen/game-royale-dev-superMarioBros/blob/76f9b26cf7b55215b68bf5b62bfd554ef971850f/.sst/platform/src/components/aws/tan-stack-start.ts

```typescript
*
   * :::note
   * CloudFront has a limit of 20 cache policies per account, though you can request a limit
   * increase.
   * :::
   *
   * By default, a new cache policy is created for it. This allows you to reuse an existing
   * policy instead of creating a new one.
   *
   * @default A new cache policy is created
   * @example
   * ```js
   * {
   *   cachePolicy: "658327ea-f89d-4fab-a63d-7e88639e58f6"
   * }
   * ```
   */
  cachePolicy?: SsrSiteArgs["cachePolicy"];
}

/**
 * The `TanStackStart` component lets you deploy a [TanStack Start](https://tanstack.com/start/latest) app to AWS.
 *
 * :::note
 * You need to make sure the `server.preset` value in the `app.config.ts` is set to `aws-lambda`.
 * :::
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a TanStack Start app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.TanStackStart("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the TanStack Start app in the `my-app/` directory.
// ... truncated ...
```

---

### 7. [johnhkchen/game-royale-dev-TicTacToe](https://github.com/johnhkchen/game-royale-dev-TicTacToe) ⭐ 0

**Path:** `.sst/platform/src/components/aws/tan-stack-start.ts`
**Language:** typescript | **Lines:** 89
**Link:** https://github.com/johnhkchen/game-royale-dev-TicTacToe/blob/c9414789ae1aa281aa42d12979999315bee984c3/.sst/platform/src/components/aws/tan-stack-start.ts

```typescript
*
   * :::note
   * CloudFront has a limit of 20 cache policies per account, though you can request a limit
   * increase.
   * :::
   *
   * By default, a new cache policy is created for it. This allows you to reuse an existing
   * policy instead of creating a new one.
   *
   * @default A new cache policy is created
   * @example
   * ```js
   * {
   *   cachePolicy: "658327ea-f89d-4fab-a63d-7e88639e58f6"
   * }
   * ```
   */
  cachePolicy?: SsrSiteArgs["cachePolicy"];
}

/**
 * The `TanStackStart` component lets you deploy a [TanStack Start](https://tanstack.com/start/latest) app to AWS.
 *
 * :::note
 * You need to make sure the `server.preset` value in the `app.config.ts` is set to `aws-lambda`.
 * :::
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a TanStack Start app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.TanStackStart("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the TanStack Start app in the `my-app/` directory.
// ... truncated ...
```

---

### 8. [smallnumbers0/game-royale-dev-memory-match](https://github.com/smallnumbers0/game-royale-dev-memory-match) ⭐ 0

**Path:** `.sst/platform/src/components/aws/tan-stack-start.ts`
**Language:** typescript | **Lines:** 89
**Link:** https://github.com/smallnumbers0/game-royale-dev-memory-match/blob/30aa72a4c8954c41eb60332906d7e04453da9c75/.sst/platform/src/components/aws/tan-stack-start.ts

```typescript
*
   * :::note
   * CloudFront has a limit of 20 cache policies per account, though you can request a limit
   * increase.
   * :::
   *
   * By default, a new cache policy is created for it. This allows you to reuse an existing
   * policy instead of creating a new one.
   *
   * @default A new cache policy is created
   * @example
   * ```js
   * {
   *   cachePolicy: "658327ea-f89d-4fab-a63d-7e88639e58f6"
   * }
   * ```
   */
  cachePolicy?: SsrSiteArgs["cachePolicy"];
}

/**
 * The `TanStackStart` component lets you deploy a [TanStack Start](https://tanstack.com/start/latest) app to AWS.
 *
 * :::note
 * You need to make sure the `server.preset` value in the `app.config.ts` is set to `aws-lambda`.
 * :::
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a TanStack Start app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.TanStackStart("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the TanStack Start app in the `my-app/` directory.
// ... truncated ...
```

---

### 9. [johnhkchen/game-royale-dev-Snake](https://github.com/johnhkchen/game-royale-dev-Snake) ⭐ 0

**Path:** `.sst/platform/src/components/aws/tan-stack-start.ts`
**Language:** typescript | **Lines:** 89
**Link:** https://github.com/johnhkchen/game-royale-dev-Snake/blob/812a60db461cfee9713acca6d32bdd9b3993993c/.sst/platform/src/components/aws/tan-stack-start.ts

```typescript
*
   * :::note
   * CloudFront has a limit of 20 cache policies per account, though you can request a limit
   * increase.
   * :::
   *
   * By default, a new cache policy is created for it. This allows you to reuse an existing
   * policy instead of creating a new one.
   *
   * @default A new cache policy is created
   * @example
   * ```js
   * {
   *   cachePolicy: "658327ea-f89d-4fab-a63d-7e88639e58f6"
   * }
   * ```
   */
  cachePolicy?: SsrSiteArgs["cachePolicy"];
}

/**
 * The `TanStackStart` component lets you deploy a [TanStack Start](https://tanstack.com/start/latest) app to AWS.
 *
 * :::note
 * You need to make sure the `server.preset` value in the `app.config.ts` is set to `aws-lambda`.
 * :::
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a TanStack Start app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.TanStackStart("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the TanStack Start app in the `my-app/` directory.
// ... truncated ...
```

---

### 10. [smallnumbers0/game-royale-dev-simon-says](https://github.com/smallnumbers0/game-royale-dev-simon-says) ⭐ 0

**Path:** `.sst/platform/src/components/aws/tan-stack-start.ts`
**Language:** typescript | **Lines:** 89
**Link:** https://github.com/smallnumbers0/game-royale-dev-simon-says/blob/581c179978311c5ec4402ba8c98f4f7b8911cb0f/.sst/platform/src/components/aws/tan-stack-start.ts

```typescript
*
   * :::note
   * CloudFront has a limit of 20 cache policies per account, though you can request a limit
   * increase.
   * :::
   *
   * By default, a new cache policy is created for it. This allows you to reuse an existing
   * policy instead of creating a new one.
   *
   * @default A new cache policy is created
   * @example
   * ```js
   * {
   *   cachePolicy: "658327ea-f89d-4fab-a63d-7e88639e58f6"
   * }
   * ```
   */
  cachePolicy?: SsrSiteArgs["cachePolicy"];
}

/**
 * The `TanStackStart` component lets you deploy a [TanStack Start](https://tanstack.com/start/latest) app to AWS.
 *
 * :::note
 * You need to make sure the `server.preset` value in the `app.config.ts` is set to `aws-lambda`.
 * :::
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy a TanStack Start app that's in the project root.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.TanStackStart("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys the TanStack Start app in the `my-app/` directory.
// ... truncated ...
```

---
