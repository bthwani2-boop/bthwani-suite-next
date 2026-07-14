// CSS module side-effect imports – allow TypeScript to resolve them without error.
declare module "*.css" {
  const stylesheet: Record<string, string>;
  export default stylesheet;
}
