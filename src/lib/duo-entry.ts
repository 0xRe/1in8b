/** Invitation secrets are capabilities. Reject malformed fragments before persistence or transport. */
export const validDuoSecret = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function duoEntryChoice(input: { fragment: string | null; pending: boolean; tabCredential: string | null; localCredential: string | null; acceptedInvite?: string | null; incomplete?: boolean }) {
 const validFragment = validDuoSecret(input.fragment);
 const malformed = input.fragment !== null ? !validFragment : input.incomplete === true;
 // An explicit invitation always gets its own admission path; never adopt another tab's seat.
 const ownAccepted = validFragment && input.fragment === input.acceptedInvite && !!input.tabCredential;
 const pending = !ownAccepted && (validFragment || !malformed && input.pending);
 const credential = !pending ? input.tabCredential ?? (input.fragment === null && !malformed ? input.localCredential : null) : null;
 return { pending, credential, malformed };
}
