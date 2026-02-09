import type { CommandUnknownOpts } from "@commander-js/extra-typings";

type CommandOption = CommandUnknownOpts["options"][number];

interface CommandOptionMatrixRow {
  arguments: string;
  command: string;
  commandDescription: string;
  option: string;
  optionDescription: string;
  optionRequired: boolean;
  optionTakesValue: boolean;
}
type CommandTableFormat = "json" | "markdown";

function collectCommandOptionMatrix(
  rootCommand: CommandUnknownOpts,
): Array<CommandOptionMatrixRow> {
  const rows: Array<CommandOptionMatrixRow> = [];
  const queue: Array<CommandUnknownOpts> = [rootCommand];

  while (queue.length > 0) {
    const command = queue.shift();
    if (command === undefined) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const commandPath = getCommandPath(command);
    const commandDescription = command.description();
    const commandArguments = formatRegisteredArguments(command);
    const options = getVisibleOptions(command);

    if (options.length === 0) {
      rows.push({
        arguments: commandArguments,
        command: commandPath,
        commandDescription,
        option: "-",
        optionDescription: "-",
        optionRequired: false,
        optionTakesValue: false,
      });
    } else {
      for (const option of options) {
        rows.push({
          arguments: commandArguments,
          command: commandPath,
          commandDescription,
          option: option.flags,
          optionDescription: option.description,
          optionRequired: option.mandatory,
          optionTakesValue: option.required || option.optional,
        });
      }
    }

    queue.push(...getVisibleSubcommands(command));
  }

  rows.sort(
    (a, b) =>
      a.command.localeCompare(b.command) || a.option.localeCompare(b.option),
  );

  return rows;
}

function escapeMarkdownCell(value: string): string {
  return value.replaceAll("|", "\\|");
}

function formatRegisteredArguments(command: CommandUnknownOpts): string {
  const tokens = command.registeredArguments.map((argument) => {
    const argumentName = argument.variadic
      ? `${argument.name()}...`
      : argument.name();
    return argument.required ? `<${argumentName}>` : `[${argumentName}]`;
  });

  return tokens.length === 0 ? "-" : tokens.join(" ");
}

function getCommandPath(command: CommandUnknownOpts): string {
  const pathSegments: Array<string> = [];
  let current: CommandUnknownOpts | null = command;

  while (current !== null) {
    const commandName = current.name();
    if (commandName.length > 0) {
      pathSegments.push(commandName);
    }
    current = current.parent;
  }

  return pathSegments.reverse().join(" ");
}

function getVisibleOptions(command: CommandUnknownOpts): Array<CommandOption> {
  return command.options.filter(
    (option) => !option.hidden && option.long !== "--help",
  );
}

function getVisibleSubcommands(
  command: CommandUnknownOpts,
): Array<CommandUnknownOpts> {
  return command
    .createHelp()
    .visibleCommands(command)
    .filter((subcommand) => subcommand.name() !== "help");
}

function renderCommandOptionMatrix(
  rows: Array<CommandOptionMatrixRow>,
  format: CommandTableFormat,
): string {
  if (format === "json") {
    return JSON.stringify(rows, null, 2);
  }

  return toMarkdownTable(rows);
}

function toMarkdownTable(rows: Array<CommandOptionMatrixRow>): string {
  const lines = [
    "| Command | Args | Option | Takes Value | Required | Option Description | Command Description |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of rows) {
    lines.push(
      `| \`${escapeMarkdownCell(row.command)}\` | ${escapeMarkdownCell(
        row.arguments,
      )} | ${row.option === "-" ? "-" : `\`${escapeMarkdownCell(row.option)}\``} | ${row.optionTakesValue ? "yes" : "no"} | ${row.optionRequired ? "yes" : "no"} | ${escapeMarkdownCell(row.optionDescription)} | ${escapeMarkdownCell(row.commandDescription)} |`,
    );
  }

  return lines.join("\n");
}

export type { CommandOptionMatrixRow, CommandTableFormat };
export { collectCommandOptionMatrix, renderCommandOptionMatrix };
