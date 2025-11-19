import * as _typescript_eslint_utils_ts_eslint from '@typescript-eslint/utils/ts-eslint';
import { RuleModule } from '@typescript-eslint/utils/ts-eslint';
import { ExtraRuleDocs } from './types.cjs';
import { rules } from './rules.cjs';
import { ESLint, Linter } from 'eslint';
import '@typescript-eslint/utils';

type RuleKey = keyof typeof rules;
interface Plugin extends Omit<ESLint.Plugin, 'rules'> {
    rules: Record<RuleKey, RuleModule<any, any, any>>;
    configs: {
        recommended: ESLint.ConfigData;
        'flat/recommended': Array<Linter.Config>;
    };
}
declare const plugin: {
    meta: {
        name: string;
    };
    configs: {
        recommended: {
            plugins: string[];
            rules: {
                '@tanstack/query/exhaustive-deps': "error";
                '@tanstack/query/no-rest-destructuring': "warn";
                '@tanstack/query/stable-query-client': "error";
                '@tanstack/query/no-unstable-deps': "error";
                '@tanstack/query/infinite-query-property-order': "error";
                '@tanstack/query/no-void-query-fn': "error";
                '@tanstack/query/mutation-property-order': "error";
            };
        };
        'flat/recommended': {
            name: string;
            plugins: {
                '@tanstack/query': {};
            };
            rules: {
                '@tanstack/query/exhaustive-deps': "error";
                '@tanstack/query/no-rest-destructuring': "warn";
                '@tanstack/query/stable-query-client': "error";
                '@tanstack/query/no-unstable-deps': "error";
                '@tanstack/query/infinite-query-property-order': "error";
                '@tanstack/query/no-void-query-fn': "error";
                '@tanstack/query/mutation-property-order': "error";
            };
        }[];
    };
    rules: Record<string, RuleModule<string, readonly unknown[], ExtraRuleDocs, _typescript_eslint_utils_ts_eslint.RuleListener>>;
};

export { type Plugin, plugin as default, plugin };
