export const getEventArgs = (events: any, eventName: string) => {
  const event = events.find((v: any) => v.event === eventName);
  return event.args;
};
