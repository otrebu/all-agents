import { Command } from "@commander-js/extra-typings";

const helloCommand = new Command("hello")
  .description("Print a greeting message")
  .action(() => {
    console.log("Hello World");
  });

export default helloCommand;
