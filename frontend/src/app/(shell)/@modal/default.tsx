/**
 * The `@modal` slot when nothing is intercepted, which is most of the time.
 *
 * A named parallel route needs a `default.tsx` or a hard load of any URL that the
 * slot does not match renders a 404 for the whole page. Returning null is the
 * whole point: no modal is open, so the slot contributes nothing.
 */
export default function ModalDefault() {
  return null;
}
