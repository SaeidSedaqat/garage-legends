// Thin wrapper around web-portal SDKs (Poki, CrazyGames, Playgama, ...).
// The game only talks to this object, so adding a portal later means filling in
// these hooks for that SDK without touching gameplay code. Locally they do nothing.
export const platform = {
  name: 'local',
  async init() {},
  gameplayStart() {},
  gameplayStop() {},
  async commercialBreak() {},
};
