/*
 * The "or" divider between the primary action and the social button: a hairline
 * on either side of the word, in Border/Default and Text/Tertiary.
 */
export function AuthDivider() {
  return (
    <div className="flex w-full items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-border-default" />
      <span className="text-[13px] leading-[1.5] text-text-tertiary">or</span>
      <span className="h-px flex-1 bg-border-default" />
    </div>
  );
}
