// Filenames of the bundled preset avatars in /public/avatars/presets/.
// Kept in a *non-server* module so it can be imported from both server
// actions and client components — putting it in the "use server" file
// makes Webpack treat it as a server action, which breaks on the client.
export const AVATAR_PRESETS = [
  "chip-orange.svg",
  "chip-navy.svg",
  "chip-ruby.svg",
  "chip-emerald.svg",
];
