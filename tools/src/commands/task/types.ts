export default class TaskError extends Error {
  override name = "TaskError";

  constructor(
    message: string,
    public override cause?: Error,
  ) {
    super(message);
  }
}
