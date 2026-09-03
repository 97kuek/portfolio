import expressiveCode, { ExpressiveCodeBlock } from "satteri-expressive-code"
import { ecRenderer } from "./config"
import { inlineExpressiveCode } from "./inline"

export const blockExpressiveCode = expressiveCode({
  customCreateRenderer: () => ecRenderer,
  // A fence with no language arrives with an empty one, which matches no key
  // in `overridesByLang`, so an unlabelled block would keep the line numbers
  // meant for real code. Naming it plaintext lets that override apply.
  customCreateBlock: ({ input }) =>
    new ExpressiveCodeBlock({
      ...input,
      language: input.language || "plaintext",
    }),
})

export { inlineExpressiveCode }
