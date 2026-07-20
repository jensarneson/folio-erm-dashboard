import { getFolioUiBaseUrl } from '../lib/okapi'
import type { AgreementOrg } from '../lib/folioApi'
import styles from './OrganizationLink.module.css'

/**
 * Render an organization name as a link to the FOLIO UI organizations view.
 * Shows role labels and a "primary" badge when applicable.
 * Falls back to plain text when no org UUID is available.
 */
export function OrganizationLink({ org, roleLabels, isPrimary }: {
  org: AgreementOrg
  roleLabels?: string
  isPrimary?: boolean
}) {
  const folioUiBase = getFolioUiBaseUrl()
  const orgId = org.org?.orgsUuid || org.org?.id
  const displayName = org.org?.name || org.name || org.id

  const content = (
    <>
      {displayName}
      {roleLabels && (
        <span className={styles.roleLabel}>{roleLabels}</span>
      )}
      {isPrimary && <span className={styles.primaryBadge}>primary</span>}
    </>
  )

  if (!orgId) {
    return <span className={styles.text}>{content}</span>
  }

  return (
    <a
      href={`${folioUiBase}/organizations/view/${orgId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.link}
    >
      {content}
    </a>
  )
}
