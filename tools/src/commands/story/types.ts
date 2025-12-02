export default class StoryError extends Error {
  override name = "StoryError";

  constructor(
    message: string,
    public override cause?: Error,
  ) {
    super(message);
  }
}
