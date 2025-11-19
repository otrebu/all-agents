import graphqlPlugin from "@graphql-eslint/eslint-plugin";

/**
 * @type {import('eslint').Linter.Config}
 */
const graphqlConfig = [
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx", "**/*.jsx"],
    processor: graphqlPlugin.processor,
  },
  {
    files: ["**/*.graphql"],
    languageOptions: { parser: graphqlPlugin.parser },
    plugins: { "@graphql-eslint": graphqlPlugin },
    rules: {
      "@graphql-eslint/alphabetize": [
        2,
        {
          arguments: [
            "FieldDefinition",
            "Field",
            "DirectiveDefinition",
            "Directive",
          ],
          fields: [
            "ObjectTypeDefinition",
            "InterfaceTypeDefinition",
            "InputObjectTypeDefinition",
          ],
          selections: ["OperationDefinition", "FragmentDefinition"],
          values: true,
          variables: true,
        },
      ],
      "@graphql-eslint/description-style": 2,
      "@graphql-eslint/executable-definitions": 2,
      "@graphql-eslint/fields-on-correct-type": 2,
      "@graphql-eslint/fragments-on-composite-type": 2,
      "@graphql-eslint/input-name": 2,
      "@graphql-eslint/known-argument-names": 2,
      "@graphql-eslint/known-directives": 2,
      "@graphql-eslint/known-fragment-names": 2,
      "@graphql-eslint/known-type-names": 2,
      "@graphql-eslint/lone-anonymous-operation": 2,
      "@graphql-eslint/lone-executable-definition": 0,
      "@graphql-eslint/lone-schema-definition": 0,
      "@graphql-eslint/match-document-filename": 0,
      "@graphql-eslint/naming-convention": [
        2,
        {
          FieldDefinition: { style: "camelCase" },
          "FieldDefinition[parent.name.value=Query]": {
            forbiddenPrefixes: ["get"],
          },

          types: { style: "PascalCase" },
        },
      ],
      "@graphql-eslint/no-anonymous-operations": 2,
      "@graphql-eslint/no-deprecated": 0,
      "@graphql-eslint/no-duplicate-fields": 2,
      "@graphql-eslint/no-fragment-cycles": 2,
      "@graphql-eslint/no-hashtag-description": 2,
      "@graphql-eslint/no-root-type": 0,
      "@graphql-eslint/no-scalar-result-type-on-mutation": 0,
      "@graphql-eslint/no-typename-prefix": 0,
      "@graphql-eslint/no-undefined-variables": 2,
      "@graphql-eslint/no-unreachable-types": 0,
      "@graphql-eslint/unique-enum-value-names": 2,
    },
  },
];

export default graphqlConfig;
