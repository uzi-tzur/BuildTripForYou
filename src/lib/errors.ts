/** Thrown by provider/service/agent stubs that are scaffolded but not yet implemented. */
export class NotImplementedError extends Error {
  constructor(feature: string) {
    super(`${feature} is not implemented yet.`);
    this.name = "NotImplementedError";
  }
}
