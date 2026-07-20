import { getFolioUiBaseUrl } from '../lib/okapi'
import type { AgreementOrg } from '../lib/folioApi'
import styles from './OrganizationLink.module.css'

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
      href={`${folioUiBase}/erm/organizations/${orgId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.link}
    >
      {content}
    </a>
  )
}
