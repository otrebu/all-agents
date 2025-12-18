export default class SyncContextError extends Error {
  override name = "SyncContextError";
  constructor(
    message: string,
    public override cause?: Error,
  ) {
    super(message);
  }
}
